const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const bcrypt = require("bcryptjs");
if (!process.env.MONGOMS_DOWNLOAD_DIR) process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(__dirname, "../.test-cache/mongodb");
const { MongoMemoryServer } = require("mongodb-memory-server");

process.env.NODE_ENV = "test";
process.env.EMAIL_VERIFICATION_REQUIRED = "true";
process.env.JWT_SECRET = "test-secret-for-nestora-test-only-123456";
process.env.JWT_EXPIRES_IN = "1h";
process.env.SMTP_HOST = "";
process.env.RESEND_API_KEY = "";
process.env.RESEND_FROM = "";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";

let mongo;
let mongoose;
let app;
let server;
let baseUrl;
let temporaryUploadPath;
let mongoDbPath;

before(async () => {
  const testRoot = path.resolve(process.env.NESTORA_MONGO_TEST_ROOT || process.env.MONGOMS_DOWNLOAD_DIR || os.tmpdir());
  mongoDbPath = path.join(testRoot, `nestora-test-db-${process.pid}-${Date.now()}`);
  await fs.mkdir(mongoDbPath, { recursive: true });
  mongo = await MongoMemoryServer.create({ instance: { dbPath: mongoDbPath } });
  process.env.MONGO_URI = mongo.getUri("nestora_test");
  ({ mongoose } = require("../backend/config/db"));
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: true });
  app = require("../backend/app");
  const models = [
    require("../backend/models/User"), require("../backend/models/Property"),
    require("../backend/models/BrokerProfile"), require("../backend/models/Enquiry"),
    require("../backend/models/Visit"), require("../backend/models/Favorite"),
    require("../backend/models/AuditLog")
  ];
  await Promise.all(models.map(model => model.init()));
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose) await mongoose.disconnect();
  if (mongo) await mongo.stop();
  if (mongoDbPath && path.basename(mongoDbPath).startsWith("nestora-test-db-")) {
    const root = path.dirname(mongoDbPath);
    if (path.resolve(mongoDbPath).startsWith(`${root}${path.sep}`)) await fs.rm(mongoDbPath, { recursive: true, force: true });
  }
  if (temporaryUploadPath) {
    const root = path.resolve(__dirname, "../uploads");
    const candidate = path.resolve(root, path.basename(temporaryUploadPath));
    if (candidate.startsWith(`${root}${path.sep}`)) await fs.unlink(candidate).catch(() => {});
  }
});

function cookieHeader(jar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

function storeCookies(jar, response) {
  const cookies = response.headers.getSetCookie?.() || [response.headers.get("set-cookie")].filter(Boolean);
  for (const cookie of cookies) {
    const pair = cookie.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

async function request(jar, route, options = {}) {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers || {});
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, { headers: cookieHeader(jar) ? { Cookie: cookieHeader(jar) } : {} });
    storeCookies(jar, csrfResponse);
    const csrf = await csrfResponse.json();
    headers.set("X-CSRF-Token", csrf.csrfToken);
  }
  const body = options.body;
  if (body && !(body instanceof FormData) && typeof body !== "string") {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(body);
  }
  if (cookieHeader(jar)) headers.set("Cookie", cookieHeader(jar));
  const response = await fetch(`${baseUrl}${route}`, { ...options, method, headers });
  storeCookies(jar, response);
  return { response, data: await response.json().catch(() => ({})) };
}

function propertyInput(title = "Integration Test Home") {
  return {
    title, description: "A comfortable property for backend integration testing.",
    propertyType: "Apartment", listingType: "Sale", price: 4250000,
    address: "12 Test Road", location: "Baner", city: "Pune", state: "Maharashtra",
    pincode: "411045", bedrooms: 2, bathrooms: 2, balconies: 1, areaSqFt: 1100,
    furnishing: "Semi-furnished", amenities: ["Parking", "Security"]
  };
}

test("MongoDB API supports role-based property, lead, visit, and admin workflows", async () => {
  const health = await request(new Map(), "/api/health");
  assert.equal(health.response.status, 200);
  assert.equal(health.data.database, "mongodb");

  for (const page of ["/", "/index.html", "/properties.html", "/property-details.html", "/about.html", "/contact.html", "/account.html", "/login.html", "/register.html", "/forgot-password.html", "/dashboard.html"]) {
    const response = await fetch(`${baseUrl}${page}`);
    assert.equal(response.status, 200, `${page} should be served`);
    assert.match(response.headers.get("content-security-policy"), /img-src[^;]*https:/);
  }
  assert.equal((await fetch(`${baseUrl}/server.js`)).status, 404);

  const buyerJar = new Map(), brokerJar = new Map(), sellerJar = new Map();
  const previousVerificationSetting = process.env.EMAIL_VERIFICATION_REQUIRED;
  process.env.EMAIL_VERIFICATION_REQUIRED = "false";
  try {
    const demoJar = new Map();
    const demoReg = await request(demoJar, "/api/auth/register", { method: "POST", body: {
      name: "Demo Mode Buyer", email: "demo-mode@example.test", phone: "+919876543220",
      password: "StrongPass123", confirmPassword: "StrongPass123", role: "buyer"
    }});
    assert.equal(demoReg.response.status, 201);
    assert.equal(demoReg.data.emailVerificationRequired, false);
    assert.equal(demoReg.data.user.emailVerified, false);
    assert.match(demoReg.data.message, /demo mode/i);
    assert.equal(Object.hasOwn(demoReg.data, "developmentVerificationToken"), false);

    const DemoUser = require("../backend/models/User");
    const demoRecord = await DemoUser.findById(demoReg.data.user.id).select("+passwordHash +emailVerificationTokenHash +emailVerificationTokenExpires");
    assert.equal(demoRecord.emailVerified, false);
    assert.equal(demoRecord.emailVerificationTokenHash, undefined);
    assert.equal(demoRecord.emailVerificationTokenExpires, undefined);
    assert.equal(await bcrypt.compare("StrongPass123", demoRecord.passwordHash), true);

    const demoLogin = await request(new Map(), "/api/auth/login", { method: "POST", body: {
      email: "demo-mode@example.test", password: "StrongPass123", role: "buyer"
    }});
    assert.equal(demoLogin.response.status, 200);
    assert.equal(demoLogin.data.user.emailVerified, false);
    assert.equal(demoLogin.data.user.emailVerificationRequired, false);
  } finally {
    if (previousVerificationSetting === undefined) delete process.env.EMAIL_VERIFICATION_REQUIRED;
    else process.env.EMAIL_VERIFICATION_REQUIRED = previousVerificationSetting;
  }

  const buyerReg = await request(buyerJar, "/api/auth/register", { method: "POST", body: {
    name: "Test Buyer", email: "BUYER@example.test", phone: "+919876543210",
    password: "StrongPass123", confirmPassword: "StrongPass123", role: "buyer"
  }});
  assert.equal(buyerReg.response.status, 201);
  assert.equal(buyerReg.data.user.email, "buyer@example.test");
  assert.ok(buyerReg.data.developmentVerificationToken);
  assert.equal(JSON.stringify(buyerReg.data).includes("passwordHash"), false);
  const buyerRecord = await require("../backend/models/User").findById(buyerReg.data.user.id).select("+passwordHash");
  assert.notEqual(buyerRecord.passwordHash, "StrongPass123");
  assert.equal(await bcrypt.compare("StrongPass123", buyerRecord.passwordHash), true);
  const emailVerified = await request(buyerJar, "/api/auth/verify-email", { method: "POST", body: { token: buyerReg.data.developmentVerificationToken } });
  assert.equal(emailVerified.response.status, 200);
  assert.equal(emailVerified.data.user.emailVerified, true);
  assert.equal((await request(new Map(), "/api/auth/verify-email", { method: "POST", body: { token: "invalid-verification-token-that-is-long-enough" } })).response.status, 400);

  const duplicate = await request(new Map(), "/api/auth/register", { method: "POST", body: {
    name: "Another Buyer", email: "buyer@example.test", phone: "+919876543211", password: "StrongPass123", role: "buyer"
  }});
  assert.equal(duplicate.response.status, 409);
  const publicAdmin = await request(new Map(), "/api/auth/register", { method: "POST", body: {
    name: "Bad Admin", email: "bad-admin@example.test", phone: "+919876543212", password: "StrongPass123", role: "admin"
  }});
  assert.equal(publicAdmin.response.status, 400);
  const weakPassword = await request(new Map(), "/api/auth/register", { method: "POST", body: {
    name: "Weak Buyer", email: "weak@example.test", phone: "+919876543213", password: "weakpassword", role: "buyer"
  }});
  assert.equal(weakPassword.response.status, 400);

  const brokerReg = await request(brokerJar, "/api/auth/register", { method: "POST", body: {
    name: "Test Broker", email: "broker@example.test", phone: "+919876543214", password: "StrongPass123", role: "broker",
    agencyName: "Nestora Test Realty", licenseNumber: "LIC-TEST-1", experience: "4"
  }});
  assert.equal(brokerReg.response.status, 201);
  const sellerReg = await request(sellerJar, "/api/auth/register", { method: "POST", body: {
    name: "Test Seller", email: "seller@example.test", phone: "+919876543215", password: "StrongPass123", role: "seller",
    sellerType: "company", organizationName: "Test Homes Ltd"
  }});
  assert.equal(sellerReg.response.status, 201);
  assert.equal(sellerReg.data.user.sellerDetails.organizationName, "Test Homes Ltd");

  const badLogin = await request(new Map(), "/api/auth/login", { method: "POST", body: { email: "buyer@example.test", password: "wrong-password", role: "buyer" } });
  assert.equal(badLogin.response.status, 401);
  const wrongRole = await request(new Map(), "/api/auth/login", { method: "POST", body: { email: "buyer@example.test", password: "StrongPass123", role: "admin" } });
  assert.equal(wrongRole.response.status, 401);
  assert.equal((await request(buyerJar, "/api/auth/me")).data.user.role, "buyer");
  assert.equal((await request(buyerJar, "/api/admin/dashboard")).response.status, 403);
  assert.equal((await request(buyerJar, "/api/broker/properties", { method: "POST", body: propertyInput() })).response.status, 403);

  const User = require("../backend/models/User");
  const admin = await User.create({ name: "Test Admin", email: "admin@example.test", phone: "+919876543216", passwordHash: await bcrypt.hash("AdminPass123", 4), role: "admin", emailVerified: true });
  const adminJar = new Map();
  const adminLogin = await request(adminJar, "/api/auth/login", { method: "POST", body: { email: "admin@example.test", password: "AdminPass123", role: "admin" } });
  assert.equal(adminLogin.response.status, 200);

  const brokerProfile = await request(brokerJar, "/api/broker/profile");
  assert.equal(brokerProfile.data.profile.verificationStatus, "Unverified");
  assert.equal(JSON.stringify(brokerProfile.data).includes("LIC-TEST-1"), false);
  const created = await request(brokerJar, "/api/broker/properties", { method: "POST", body: propertyInput() });
  assert.equal(created.response.status, 201);
  const propertyId = created.data.property.id;
  assert.equal(created.data.property.approvalStatus, "Pending");
  assert.equal(created.data.property.listingStatus, "Draft");
  assert.equal((await request(new Map(), "/api/properties?city=Pune")).data.items.length, 0);
  assert.equal((await request(new Map(), `/api/properties/${propertyId}`)).response.status, 404);
  assert.equal((await request(new Map(), "/api/properties/not-an-object-id")).response.status, 400);
  const unverifiedApproval = await request(adminJar, `/api/admin/properties/${propertyId}/status`, { method: "PATCH", body: { approvalStatus: "Approved" } });
  assert.equal(unverifiedApproval.response.status, 400);
  assert.match(unverifiedApproval.data.message, /Verify the broker/);

  const verification = await request(adminJar, `/api/admin/brokers/${brokerReg.data.user.id}/verification`, { method: "PATCH", body: { verificationStatus: "Verified", reviewNote: "Test verified" } });
  assert.equal(verification.response.status, 200);
  const uploadForm = new FormData();
  uploadForm.append("images", new Blob([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "test.png");
  const uploaded = await request(brokerJar, `/api/broker/properties/${propertyId}/images`, { method: "POST", body: uploadForm });
  assert.equal(uploaded.response.status, 201);
  assert.match(uploaded.data.images[0].url, /^\/uploads\//);
  temporaryUploadPath = uploaded.data.images[0].url;

  const approval = await request(adminJar, `/api/admin/properties/${propertyId}/status`, { method: "PATCH", body: { approvalStatus: "Approved", featured: true } });
  assert.equal(approval.response.status, 200);
  const publicList = await request(new Map(), "/api/properties?city=Pune&sort=price");
  assert.equal(publicList.data.items.length, 1);
  assert.equal(publicList.data.items[0].featured, true);
  assert.equal("licenseNumber" in publicList.data.items[0].broker, false);
  assert.equal((await request(new Map(), "/api/properties/featured")).data.items.length, 1);

  const brokerCookie = brokerJar.get("nestora_auth");
  const csrfRejected = await fetch(`${baseUrl}/api/broker/properties/${propertyId}`, { method: "DELETE", headers: { Cookie: `nestora_auth=${brokerCookie}` } });
  assert.equal(csrfRejected.status, 403);
  const otherOwner = await request(sellerJar, `/api/broker/properties/${propertyId}`, { method: "PATCH", body: { title: "Unauthorized property change" } });
  assert.equal(otherOwner.response.status, 403);
  const edit = await request(brokerJar, `/api/broker/properties/${propertyId}`, { method: "PATCH", body: { ...propertyInput("Updated Integration Home") } });
  assert.equal(edit.response.status, 200);
  assert.equal(edit.data.property.approvalStatus, "Pending");
  assert.equal((await request(new Map(), "/api/properties?city=Pune")).data.items.length, 0);
  await request(adminJar, `/api/admin/properties/${propertyId}/status`, { method: "PATCH", body: { approvalStatus: "Approved" } });

  const favorite = await request(buyerJar, `/api/favorites/${propertyId}`, { method: "POST" });
  assert.equal(favorite.response.status, 201);
  assert.equal((await request(buyerJar, `/api/favorites/${propertyId}`, { method: "POST" })).response.status, 200);
  assert.equal((await request(buyerJar, "/api/favorites")).data.items.length, 1);
  assert.equal((await request(new Map(), "/api/favorites")).response.status, 401);
  assert.equal((await request(buyerJar, `/api/favorites/${propertyId}`, { method: "DELETE" })).response.status, 200);
  assert.equal((await request(buyerJar, "/api/favorites")).data.items.length, 0);

  const enquiry = await request(buyerJar, "/api/inquiries", { method: "POST", body: { propertyId, message: "Please share the floor plan and available viewing times." } });
  assert.equal(enquiry.response.status, 201);
  const enquiryId = enquiry.data.enquiry.id;
  assert.equal((await request(buyerJar, "/api/inquiries/mine")).data.items.length, 1);
  assert.equal((await request(brokerJar, "/api/inquiries/mine")).data.items.length, 1);
  assert.equal((await request(sellerJar, "/api/inquiries/mine")).data.items.length, 0);
  assert.equal((await request(buyerJar, `/api/inquiries/${enquiryId}/status`, { method: "PATCH", body: { status: "Closed" } })).response.status, 403);
  assert.equal((await request(brokerJar, `/api/inquiries/${enquiryId}/status`, { method: "PATCH", body: { status: "Contacted" } })).response.status, 200);

  const pastVisit = await request(buyerJar, "/api/visits", { method: "POST", body: { propertyId, visitDate: "2000-01-01", visitTime: "10:00", message: "See the apartment" } });
  assert.equal(pastVisit.response.status, 400);
  const invalidCalendarDate = await request(buyerJar, "/api/visits", { method: "POST", body: { propertyId, visitDate: "2099-02-31", visitTime: "10:00" } });
  assert.equal(invalidCalendarDate.response.status, 400);
  const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const visit = await request(buyerJar, "/api/visits", { method: "POST", body: { propertyId, visitDate: futureDate, visitTime: "10:30", message: "Please confirm this viewing." } });
  assert.equal(visit.response.status, 201);
  assert.equal((await request(buyerJar, "/api/visits/mine")).data.items.length, 1);
  const cancellableVisit = await request(buyerJar, "/api/visits", { method: "POST", body: { propertyId, visitDate: futureDate, visitTime: "11:30", message: "I may need to reschedule." } });
  assert.equal(cancellableVisit.response.status, 201);
  assert.equal((await request(buyerJar, `/api/visits/${cancellableVisit.data.visit.id}`, { method: "PATCH", body: { status: "Cancelled" } })).response.status, 200);
  assert.equal((await request(sellerJar, `/api/visits/${visit.data.visit.id}`, { method: "PATCH", body: { status: "Confirmed" } })).response.status, 403);
  assert.equal((await request(brokerJar, `/api/visits/${visit.data.visit.id}`, { method: "PATCH", body: { status: "Confirmed" } })).response.status, 200);
  assert.equal((await request(buyerJar, `/api/visits/${visit.data.visit.id}`, { method: "PATCH", body: { status: "Cancelled" } })).response.status, 403);

  const sellerListing = await request(sellerJar, "/api/broker/properties", { method: "POST", body: propertyInput("Seller Test Home") });
  assert.equal(sellerListing.response.status, 201);
  const rejected = await request(adminJar, `/api/admin/properties/${sellerListing.data.property.id}/status`, { method: "PATCH", body: { approvalStatus: "Rejected", rejectionReason: "Please provide complete listing details." } });
  assert.equal(rejected.response.status, 200);
  assert.equal((await request(new Map(), "/api/properties?city=Pune")).data.items.length, 1);

  const stats = await request(adminJar, "/api/admin/dashboard");
  assert.equal(stats.response.status, 200);
  assert.equal(stats.data.stats.totalUsers, 4);
  assert.ok((await request(adminJar, "/api/admin/users?role=seller")).data.items.length === 1);
  const sellerDetails = await request(adminJar, `/api/admin/users/${sellerReg.data.user.id}`);
  assert.equal(sellerDetails.data.user.sellerDetails.organizationName, "Test Homes Ltd");
  assert.equal("passwordHash" in sellerDetails.data.user, false);
  assert.equal((await request(buyerJar, "/api/admin/users")).response.status, 403);

  assert.equal((await request(sellerJar, `/api/broker/properties/${sellerListing.data.property.id}`, { method: "DELETE" })).response.status, 200);
  assert.equal((await request(brokerJar, `/api/broker/properties/${propertyId}`, { method: "DELETE" })).response.status, 200);

  const suspended = await request(adminJar, `/api/admin/users/${sellerReg.data.user.id}`, { method: "PATCH", body: { suspended: true } });
  assert.equal(suspended.response.status, 200);
  assert.equal((await request(sellerJar, "/api/auth/me")).response.status, 401);

  const forgot = await request(new Map(), "/api/auth/forgot-password", { method: "POST", body: { email: "buyer@example.test" } });
  assert.equal(forgot.response.status, 200);
  assert.ok(forgot.data.developmentResetToken);
  const reset = await request(new Map(), "/api/auth/reset-password", { method: "POST", body: { token: forgot.data.developmentResetToken, password: "AnotherPass123" } });
  assert.equal(reset.response.status, 200);
  const newLogin = await request(new Map(), "/api/auth/login", { method: "POST", body: { email: "buyer@example.test", password: "AnotherPass123", role: "buyer" } });
  assert.equal(newLogin.response.status, 200);
  assert.equal((await request(new Map(), "/api/auth/logout", { method: "POST" })).response.status, 401);
  assert.equal((await request(brokerJar, "/api/auth/logout", { method: "POST" })).response.status, 200);
  assert.equal((await request(brokerJar, "/api/auth/me")).response.status, 401);

});

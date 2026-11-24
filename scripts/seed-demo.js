require("dotenv").config();
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { connectDatabase, mongoose, getMongoUri, isMongoUriPlaceholder } = require("../backend/config/db");
const User = require("../backend/models/User");
const Property = require("../backend/models/Property");
const examples = [...require("./demo-properties"), ...require("./demo-budget-matrix")];

const DEMO_OWNER_EMAIL = "sample-listings@demo.nestora.invalid";

async function seed() {
  const mongoUri = getMongoUri();
  if (!mongoUri) throw new Error("Set MONGO_URI (or MONGODB_URI) before seeding.");
  if (isMongoUriPlaceholder(mongoUri)) throw new Error("Replace the sample MongoDB URI placeholders before seeding.");
  const host = new URL(mongoUri).hostname.toLowerCase();
  const isLocalMongo = ["localhost", "127.0.0.1", "::1"].includes(host);
  const productionOptIn = process.env.ALLOW_PRODUCTION_DEMO_SEED === "true";

  if (process.env.NODE_ENV === "production") {
    if (!productionOptIn) throw new Error("Production seeding requires the one-time ALLOW_PRODUCTION_DEMO_SEED=true opt-in.");
    if (isLocalMongo) throw new Error("Production seed opt-in requires the deployed non-local database.");
  } else if (!isLocalMongo) {
    throw new Error("For safety, non-production demo seeding may only use a local MongoDB database.");
  }

  await connectDatabase(mongoUri);

  let owner = await User.findOne({ email: DEMO_OWNER_EMAIL });
  if (!owner) {
    owner = await User.create({
      name: "NESTORA Sample Listings",
      email: DEMO_OWNER_EMAIL,
      phone: "0000000000",
      passwordHash: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12),
      role: "seller",
      emailVerified: true
    });
  } else if (owner.role !== "seller" || owner.name !== "NESTORA Sample Listings") {
    throw new Error("The reserved sample-listings account exists with unexpected account details.");
  }

  let created = 0;
  for (const example of examples) {
    if (await Property.exists({ owner: owner._id, title: example.title })) continue;
    await Property.create({
      title: example.title,
      description: "SAMPLE LISTING — illustrative website content; not a live real-estate offer. " + example.description,
      propertyType: example.propertyType,
      listingType: example.listingType,
      price: example.price,
      location: example.location,
      city: example.city,
      state: example.state,
      address: example.address,
      bedrooms: example.bedrooms,
      bathrooms: example.bathrooms,
      areaSqFt: example.areaSqFt,
      amenities: example.amenities,
      images: (example.images || []).map((url, index) => ({ url, isMain: index === 0 })),
      featuredImage: example.mainImage || example.images?.[0] || "",
      owner: owner._id,
      ownerRole: "seller",
      approvalStatus: "Approved",
      listingStatus: "Active",
      featured: Boolean(example.featured),
      demoListing: true
    });
    created += 1;
  }
  console.log("Added " + created + " sample listings; " + (examples.length - created) + " already existed. The reserved demo listings are illustrative, not live offers.");
}

seed().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
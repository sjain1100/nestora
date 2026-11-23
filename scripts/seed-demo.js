require("dotenv").config();
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { connectDatabase, mongoose } = require("../backend/config/db");
const User = require("../backend/models/User");
const Property = require("../backend/models/Property");
const examples = require("./demo-properties");

const DEMO_OWNER_EMAIL = "sample-listings@demo.nestora.invalid";

async function seed() {
  if (process.env.NODE_ENV === "production") throw new Error("Demo listings can only be seeded in development.");
  if (!process.env.MONGO_URI) throw new Error("Set MONGO_URI to the local development MongoDB before seeding.");
  const host = new URL(process.env.MONGO_URI).hostname.toLowerCase();
  if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
    throw new Error("For safety, demo listings may only be seeded into a local MongoDB database.");
  }
  await connectDatabase();

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
  console.log("Added " + created + " sample listings across Mumbai, Pune, Bangalore, and Delhi.");
}

seed().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
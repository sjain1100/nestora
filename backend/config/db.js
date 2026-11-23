const mongoose = require("mongoose");

function getMongoUri() {
  return String(process.env.MONGO_URI || process.env.MONGODB_URI || "").trim();
}

function isMongoUriPlaceholder(uri) {
  return /<(?:username|password|cluster-host|database)>/i.test(uri);
}

async function connectDatabase(uri = getMongoUri()) {
  if (!uri) throw Object.assign(new Error("MongoDB connection string is missing"), { code: "MISSING_MONGO_URI" });
  if (isMongoUriPlaceholder(uri)) throw Object.assign(new Error("MongoDB connection string still contains sample placeholders"), { code: "MONGO_URI_TEMPLATE" });
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 10000),
    autoIndex: process.env.NODE_ENV !== "production"
  });
  return mongoose.connection;
}

module.exports = { connectDatabase, mongoose, getMongoUri, isMongoUriPlaceholder };

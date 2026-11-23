const mongoose = require("mongoose");

async function connectDatabase(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error("MONGO_URI is required. Add your MongoDB Atlas connection string to .env.");
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_TIMEOUT_MS || 10000),
    autoIndex: process.env.NODE_ENV !== "production"
  });
  return mongoose.connection;
}

module.exports = { connectDatabase, mongoose };

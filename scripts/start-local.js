require("dotenv").config();

const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs/promises");
const { MongoMemoryServer } = require("mongodb-memory-server");

if (process.env.NODE_ENV === "production") {
  throw new Error("The local development database is disabled in production.");
}
process.env.NODE_ENV = "development";
process.env.MONGOMS_DOWNLOAD_DIR = process.env.MONGOMS_DOWNLOAD_DIR || path.resolve(__dirname, "../.test-cache/mongodb");
process.env.JWT_SECRET = crypto.randomBytes(48).toString("hex");
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.CLOUDINARY_CLOUD_NAME = "";
process.env.CLOUDINARY_API_KEY = "";
process.env.CLOUDINARY_API_SECRET = "";
process.env.PORT = process.env.PORT || "5000";
const { connectDatabase, mongoose } = require("../backend/config/db");
const app = require("../backend/app");

let mongo;
let server;
let stopping = false;

async function start() {
  const dbPath = path.resolve(process.env.NESTORA_LOCAL_DB_PATH || path.resolve(__dirname, "../.test-cache/nestora-dev-db-20261122-130654"));
  await fs.mkdir(dbPath, { recursive: true });
  mongo = await MongoMemoryServer.create({ instance: { dbPath } });
  process.env.MONGO_URI = mongo.getUri("nestora_dev");
  await connectDatabase();
  server = app.listen(Number(process.env.PORT), () => {
    console.log("NESTORA local development server at http://localhost:" + process.env.PORT);
    console.log("Using local MongoDB data directory: " + dbPath);
    console.log("MongoDB Compass URI: " + process.env.MONGO_URI);
  });
}

async function stop() {
  if (stopping) return;
  stopping = true;
  if (server) await new Promise(resolve => server.close(resolve));
  if (mongoose.connection.readyState) await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

process.once("SIGINT", () => { void stop().finally(() => process.exit(0)); });
process.once("SIGTERM", () => { void stop().finally(() => process.exit(0)); });

start().catch(async error => {
  console.error("Failed to start local NESTORA: " + error.message);
  await stop().catch(() => {});
  process.exitCode = 1;
});

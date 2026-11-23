// Compatibility entry point for older project scripts. Database access is MongoDB-only.
const { connectDatabase, mongoose } = require("./backend/config/db");

module.exports = {
  connectDatabase,
  initializeDatabase: connectDatabase,
  mongoose
};

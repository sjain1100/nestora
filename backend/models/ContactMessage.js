const { mongoose } = require("../config/db");

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  inquiryType: { type: String, required: true, trim: true, maxlength: 100 },
  message: { type: String, required: true, trim: true, minlength: 8, maxlength: 3000 },
  status: { type: String, enum: ["New", "In Progress", "Closed"], default: "New", index: true }
}, { timestamps: true });

schema.index({ status: 1, createdAt: -1 });
module.exports = mongoose.models.ContactMessage || mongoose.model("ContactMessage", schema);

const { mongoose } = require("../config/db");
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  agencyName: { type: String, trim: true, maxlength: 100, default: "" },
  experience: { type: Number, min: 0, max: 60, default: 0 },
  licenseNumber: { type: String, trim: true, maxlength: 100, default: "" },
  bio: { type: String, trim: true, maxlength: 2000, default: "" },
  location: { type: String, trim: true, maxlength: 120, default: "" },
  profilePhoto: { type: String, default: "" },
  areasServed: [{ type: String, trim: true, maxlength: 100 }],
  verificationStatus: { type: String, enum: ["Unverified", "Pending", "Verified", "Rejected", "Suspended"], default: "Unverified", index: true },
  verifiedAt: Date,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  reviewNote: { type: String, maxlength: 500, default: "" }
}, { timestamps: true });
module.exports = mongoose.models.BrokerProfile || mongoose.model("BrokerProfile", schema);

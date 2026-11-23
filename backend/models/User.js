const { mongoose } = require("../config/db");
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254, unique: true, index: true },
  phone: { type: String, required: true, trim: true, maxlength: 30 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["buyer", "broker", "seller", "admin"], required: true, index: true },
  suspended: { type: Boolean, default: false, index: true },
  tokenVersion: { type: Number, default: 0 },
  emailVerified: { type: Boolean, default: false },
  emailVerificationTokenHash: { type: String, select: false },
  emailVerificationTokenExpires: { type: Date, select: false },
  profileImage: { type: String, default: "" },
  sellerDetails: {
    sellerType: { type: String, enum: ["individual", "company"], default: "individual" },
    organizationName: { type: String, trim: true, maxlength: 120, default: "" }
  },
  resetTokenHash: { type: String, select: false },
  resetTokenExpires: { type: Date, select: false }
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.resetTokenHash; delete ret.resetTokenExpires; delete ret.emailVerificationTokenHash; delete ret.emailVerificationTokenExpires; delete ret.__v; return ret; } } });
module.exports = mongoose.models.User || mongoose.model("User", userSchema);

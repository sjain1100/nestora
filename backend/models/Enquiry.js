const { mongoose } = require("../config/db");
const schema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", default: null, index: true },
  propertyOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  broker: { type: mongoose.Schema.Types.ObjectId, ref: "BrokerProfile", default: null },
  message: { type: String, required: true, trim: true, minlength: 8, maxlength: 3000 },
  contactName: { type: String, required: true, maxlength: 100 },
  contactEmail: { type: String, required: true, lowercase: true, maxlength: 254 },
  contactPhone: { type: String, maxlength: 30, default: "" },
  inquiryType: { type: String, maxlength: 100, default: "Property enquiry" },
  status: { type: String, enum: ["Pending", "Contacted", "Responded", "Closed"], default: "Pending", index: true }
}, { timestamps: true });
module.exports = mongoose.models.Enquiry || mongoose.model("Enquiry", schema);

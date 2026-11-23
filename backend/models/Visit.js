const { mongoose } = require("../config/db");
const schema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true, index: true },
  propertyOwner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  visitDate: { type: Date, required: true, index: true },
  visitTime: { type: String, required: true },
  message: { type: String, maxlength: 2000, default: "" },
  status: { type: String, enum: ["Requested", "Confirmed", "Rescheduled", "Completed", "Cancelled"], default: "Requested", index: true },
  slotKey: { type: String, unique: true, sparse: true }
}, { timestamps: true });
module.exports = mongoose.models.Visit || mongoose.model("Visit", schema);

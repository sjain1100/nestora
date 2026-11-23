const { mongoose } = require("../config/db");
const schema = new mongoose.Schema({ actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, action: { type: String, required: true }, targetType: String, targetId: String, metadata: { type: mongoose.Schema.Types.Mixed, default: {} } }, { timestamps: true });
module.exports = mongoose.models.AuditLog || mongoose.model("AuditLog", schema);

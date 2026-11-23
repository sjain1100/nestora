const { mongoose } = require("../config/db");
const schema = new mongoose.Schema({ buyer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, property: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true } }, { timestamps: true });
schema.index({ buyer: 1, property: 1 }, { unique: true });
module.exports = mongoose.models.Favorite || mongoose.model("Favorite", schema);

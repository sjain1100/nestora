const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const secret = () => process.env.JWT_SECRET;
function sign(user) { return jwt.sign({ sub: user._id.toString(), ver: user.tokenVersion }, secret(), { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }); }
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
module.exports = { sign, digest, randomToken: () => crypto.randomBytes(32).toString("hex") };

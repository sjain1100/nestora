const jwt = require("jsonwebtoken");
const User = require("../models/User");
function unauthorized(res, message = "Authentication required") { return res.status(401).json({ success: false, message }); }
async function requireAuth(req, res, next) {
  const token = req.cookies?.nestora_auth;
  if (!token) return unauthorized(res);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("+passwordHash");
    if (!user || user.suspended || user.tokenVersion !== payload.ver) return unauthorized(res, "Account unavailable");
    req.user = user; next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError" || err.name === "CastError") return unauthorized(res, "Invalid or expired session");
    next(err);
  }
}
const allowRoles = (...roles) => (req, res, next) => roles.includes(req.user?.role) ? next() : res.status(403).json({ success: false, message: "You are not authorized to perform this action" });
module.exports = { requireAuth, allowRoles };

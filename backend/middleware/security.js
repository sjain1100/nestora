const crypto = require("crypto");
const equal = (a, b) => { if (typeof a !== "string" || typeof b !== "string") return false; const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && crypto.timingSafeEqual(x,y); };
function csrfGuard(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || "http://localhost:5000").split(",").map(x=>x.trim());
  if (req.get("origin") && !allowed.includes(req.get("origin"))) return res.status(403).json({ success:false, message:"Origin is not allowed" });
  if (["/auth/login","/auth/register","/auth/forgot-password","/auth/reset-password"].includes(req.path)) return next();
  if (req.cookies?.nestora_auth && !equal(req.cookies.nestora_csrf, req.get("x-csrf-token"))) return res.status(403).json({ success:false,message:"CSRF token missing or invalid" });
  next();
}
function errorHandler(err, _req, res, _next) {
  if (err.name === "MulterError" && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success:false,message:"Each image must be 5 MB or smaller" });
  if (err.name === "MulterError" && err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ success:false,message:"Upload no more than 6 images at a time" });
  if (err.name === "MulterError") return res.status(400).json({ success:false,message:"Image upload could not be processed" });
  if (err.name === "ValidationError") return res.status(400).json({ success:false,message:Object.values(err.errors).map(x=>x.message).join("; ") });
  if (err.code === 11000) return res.status(409).json({ success:false,message:"A record with that value already exists" });
  if (err.name === "CastError") return res.status(400).json({ success:false,message:"Invalid identifier or value" });
  const status = err.status || 500;
  if (status >= 500) console.error("Request failed:", err.message);
  res.status(status).json({ success:false,message:status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error" : err.message || "Request failed" });
}
module.exports = { csrfGuard, errorHandler };

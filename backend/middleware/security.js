const crypto = require("crypto");
const equal = (a, b) => { if (typeof a !== "string" || typeof b !== "string") return false; const x=Buffer.from(a), y=Buffer.from(b); return x.length===y.length && crypto.timingSafeEqual(x,y); };
function normalizeOrigin(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const parsed = new URL(value.trim());
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.origin.toLowerCase() : null;
  } catch {
    return null;
  }
}
function isAllowedOrigin(req) {
  const rawOrigin = req.get?.("origin") || req.headers?.origin;
  if (!rawOrigin) return true;
  const origin = normalizeOrigin(rawOrigin);
  if (!origin) return false;

  const configured = [
    process.env.ALLOWED_ORIGINS,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.RENDER_EXTERNAL_HOSTNAME && `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  ].filter(Boolean).flatMap(value => value.split(",")).map(normalizeOrigin).filter(Boolean);
  if (!configured.length) configured.push("http://localhost:5000");
  if (configured.includes(origin)) return true;

  const host = req.get?.("host") || req.headers?.host;
  const protocol = req.protocol || "http";
  return Boolean(host && normalizeOrigin(`${protocol}://${host}`) === origin);
}

function csrfGuard(req, res, next) {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  if (req.get("origin") && !isAllowedOrigin(req)) return res.status(403).json({ success:false, message:"Origin is not allowed" });
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
  const message = String(err?.message || "");
  const databaseUnavailable = err.name === "MongooseServerSelectionError" || err.name === "MongoNetworkError" || /ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|querysrv/i.test(message);
  const status = databaseUnavailable ? 503 : Number(err.status) || 500;
  if (status >= 500) console.error("Request failed:", { status, name: err.name || "Error", code: typeof err.code === "string" ? err.code : undefined });
  res.status(status).json({ success:false,message:status >= 500 ? "The service is temporarily unavailable. Please try again shortly." : err.message || "Request failed" });
}
module.exports = { csrfGuard, errorHandler, isAllowedOrigin };

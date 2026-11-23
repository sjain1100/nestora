const sanitizeHtml = require("sanitize-html");
const { mongoose } = require("../config/db");
const clean = value => typeof value === "string" ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value;
function fail(message) { const err = new Error(message); err.status = 400; throw err; }
function string(value, field, min = 1, max = 200) { const result = clean(value); if (typeof result !== "string" || result.length < min || result.length > max) fail(`${field} must be ${min}-${max} characters`); return result; }
function numeric(value, field, min = 0, max = 100000000000) { const result = Number(value); if (!Number.isFinite(result) || result < min || result > max) fail(`${field} is invalid`); return result; }
function email(value) { const result = string(value, "Email", 3, 254).toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) fail("A valid email is required"); return result; }
function phone(value) { const result = string(value || "", "Phone", 7, 30); if (!/^[+\d][\d ()-]{6,29}$/.test(result)) fail("A valid phone number is required"); return result; }
function objectId(value, field = "id") { if (!mongoose.isValidObjectId(value)) fail(`Invalid ${field}`); return value; }
function page(query) { const pageNumber = Math.max(1, Number.parseInt(query.page, 10) || 1); const limit = Math.min(50, Math.max(1, Number.parseInt(query.limit, 10) || 12)); return { page: pageNumber, limit, skip: (pageNumber - 1) * limit }; }
module.exports = { clean, string, numeric, email, phone, objectId, page, fail };

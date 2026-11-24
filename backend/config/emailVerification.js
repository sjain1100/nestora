const { digest } = require("../utils/tokens");

function emailVerificationRequired(value = process.env.EMAIL_VERIFICATION_REQUIRED) {
  if (value === undefined || value === null) return true;
  const normalized = String(value).trim().toLowerCase();
  return normalized !== "false";
}

function registrationVerificationFields(required, token, now = Date.now()) {
  const fields = { emailVerified: false };
  if (required) {
    fields.emailVerificationTokenHash = digest(token);
    fields.emailVerificationTokenExpires = new Date(now + 24 * 60 * 60 * 1000);
  }
  return fields;
}

module.exports = { emailVerificationRequired, registrationVerificationFields };

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { emailVerificationRequired, registrationVerificationFields } = require("../backend/config/emailVerification");
const { digest } = require("../backend/utils/tokens");

function withSetting(value, run) {
  const previous = process.env.EMAIL_VERIFICATION_REQUIRED;
  if (value === undefined) delete process.env.EMAIL_VERIFICATION_REQUIRED;
  else process.env.EMAIL_VERIFICATION_REQUIRED = value;
  try { run(); }
  finally {
    if (previous === undefined) delete process.env.EMAIL_VERIFICATION_REQUIRED;
    else process.env.EMAIL_VERIFICATION_REQUIRED = previous;
  }
}

test("email verification is required by default", () => {
  withSetting(undefined, () => assert.equal(emailVerificationRequired(), true));
});

test("false disables email verification case-insensitively", () => {
  for (const value of ["false", "FALSE", " False "]) {
    withSetting(value, () => assert.equal(emailVerificationRequired(), false));
  }
});

test("true and invalid values keep verification required", () => {
  for (const value of ["true", "yes", "0", ""]) {
    withSetting(value, () => assert.equal(emailVerificationRequired(), true));
  }
});

test("demo registrations stay unverified and create no verification token", () => {
  const fields = registrationVerificationFields(false, null, 1000);
  assert.deepEqual(fields, { emailVerified: false });
});

test("required verification retains a hashed one-use token and expiry", () => {
  const fields = registrationVerificationFields(true, "one-time-test-token", 1000);
  assert.equal(fields.emailVerified, false);
  assert.equal(fields.emailVerificationTokenHash, digest("one-time-test-token"));
  assert.equal(fields.emailVerificationTokenExpires.getTime(), 1000 + 24 * 60 * 60 * 1000);
});

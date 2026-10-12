/**
 * Public Partner self-registration is intentionally disabled.
 * Admins must first create a Partner access record for the mobile number.
 * Login then uses the standard OTP flow and issueAgentSession.
 */
async function registerPartner(req, res) {
  return res.status(410).json({
    success: false,
    message: "Partner access must be registered by a GgnHome administrator. Ask the administrator to add your mobile number, then sign in with OTP.",
  });
}

module.exports = { registerPartner };

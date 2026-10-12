/**
 * Legacy endpoint retained for compatibility, but server-side provider credentials
 * must never be returned to a browser. Geocoding integrations should call a
 * server-side proxy or use a provider-supported, domain-restricted public token.
 */
exports.getLocationIQApiKey = (req, res) => {
  return res.status(410).json({
    success: false,
    code: "LOCATIONIQ_KEY_ENDPOINT_RETIRED",
    message: "This endpoint no longer returns API credentials. Use the server-side geocoding integration."
  });
};

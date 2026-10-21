const { reverseGeocode, suggestAddresses } = require("../services/placeLookup.service");

const inIndia = (lat, lon) => lat >= 6 && lat <= 37.5 && lon >= 68 && lon <= 98;

function fail(res, err) {
  return res.status(err.status || 502).json({
    success: false,
    message: err.status ? err.message : "Location lookup failed. You can type the address instead.",
  });
}

// POST /api/partner/location/reverse { latitude, longitude } -> address, sector, pincode
exports.reverse = async (req, res) => {
  const latitude = Number(req.body?.latitude);
  const longitude = Number(req.body?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !inIndia(latitude, longitude)) {
    return res.status(400).json({ success: false, message: "Send a valid latitude and longitude." });
  }
  try {
    return res.json({ success: true, ...(await reverseGeocode(latitude, longitude)) });
  } catch (err) {
    return fail(res, err);
  }
};

// GET /api/partner/location/suggest?q= -> Gurugram address suggestions
exports.suggest = async (req, res) => {
  try {
    return res.json({ success: true, suggestions: await suggestAddresses(req.query?.q) });
  } catch (err) {
    return fail(res, err);
  }
};

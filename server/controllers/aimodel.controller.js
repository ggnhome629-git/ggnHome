// Controller for handling AI model price predictions based on city-specific features.
// Validates input, prepares payloads according to city requirements, and communicates with a Flask API to obtain predicted prices.

const axios = require('axios');

// --------------------
// Configuration
// --------------------

const validCities = ['delhi', 'gurgaon'];

const cityFeatureKeys = {
  delhi: ['Area', 'BHK', 'Bathroom', 'Furnishing', 'Locality', 'Parking', 'Type'],
  gurgaon: ['areaWithType', 'address'],
};

// --------------------
// Controller Functions
// --------------------

const predictPrice = async (req, res) => {
  
  // Destructure input and initialize variables
  const { city, features } = req.body;
  const cityLower = city ? city.toLowerCase() : null;
  let payload = {};

  try {
    // --------------------
    // Validation
    // --------------------
    if (!city || !features) {
      return res.status(400).json({ error: 'City and features are required' });
    }

    if (!validCities.includes(cityLower)) {
      return res.status(404).json({ error: `City ${city} not supported` });
    }

    // --------------------
    // Payload Construction
    // --------------------
    payload.city = cityLower;

    if (cityLower === 'delhi') {
      // Delhi requires full features
      payload = { ...payload, ...features };
    } else if (cityLower === 'gurgaon') {
      // Gurgaon requires areaWithType as numeric and address separately
      if (features.areaWithType === undefined || !features.address) {
        return res.status(400).json({ error: 'Both areaWithType and address are required for Gurgaon' });
      }
      payload.areaWithType = Number(features.areaWithType); // numeric
      payload.address = features.address; // text
    }

    // --------------------
    // Call Flask API
    // --------------------
    try {
      const response = await axios.post(`${process.env.FLASK_API_URL}/predict`, payload);

      // --------------------
      // Response Handling
      // --------------------
      if (response.data && response.data.predicted_price !== undefined) {
        return res.json({ predictedPrice: response.data.predicted_price });
      } else {
        return res.status(500).json({ error: 'Flask API did not return a valid prediction', details: response.data });
      }
    } catch (flaskError) {
      return res.status(500).json({ error: 'Failed to call Flask API', details: flaskError.response?.data || flaskError.message });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

module.exports = { predictPrice };
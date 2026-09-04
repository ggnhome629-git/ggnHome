

const dotenv = require("dotenv");
dotenv.config();

/**
 * Controller to provide LocationIQ API key to frontend securely
 */
exports.getLocationIQApiKey = (req, res) => {
  try {
    const apiKey = process.env.LOCATIONIQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: "LocationIQ API key not found in environment variables",
      });
    }

    res.status(200).json({
      success: true,
      apiKey,
    });
  } catch (error) {
    console.error("Error fetching LocationIQ API key:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error while fetching LocationIQ API key",
    });
  }
};
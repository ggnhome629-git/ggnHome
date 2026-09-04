
// server/controllers/news.controller.js
const axios = require('axios');

/**
 * Backend proxy for GNews
 * Accepts query params: q, lang, max
 * Example: GET /api/news?q=real%20estate&lang=en&max=10
 */
const getNews = async (req, res) => {
  try {
    const q = (req.query.q || 'real estate news').toString();
    const lang = (req.query.lang || 'en').toString();
    const max = Math.min(Number(req.query.max) || 10, 100);

    const apiKey = process.env.GNEWS_API_KEY || process.env.GNEWS_KEY || process.env.GNEWS_TOKEN;
    if (!apiKey) {
      console.error('[NewsController] Missing GNEWS_API_KEY in environment');
      return res.status(500).json({ error: 'GNEWS_API_KEY not configured on server' });
    }

    // console.log(`[NewsController] Requesting GNews q="${q}" lang=${lang} max=${max}`);

    const resp = await axios.get('https://gnews.io/api/v4/search', {
      params: { q, token: apiKey, lang, max },
      timeout: 10000,
    });

    // console.log(`[NewsController] GNews responded status=${resp.status} articles=${Array.isArray(resp.data?.articles)?resp.data.articles.length:0}`);

    return res.status(resp.status).json(resp.data);
  } catch (error) {
    // Log detailed info for debugging
    // console.error('[NewsController] GNews fetch error:', error.message);
    if (error.response) {
    //   console.error('[NewsController] upstream status:', error.response.status, 'body:', error.response.data);
      const status = error.response.status || 500;
      return res.status(status).json({ error: error.response.data || error.message });
    }
    return res.status(500).json({ error: error.message || 'Unknown error from GNews' });
  }
};

module.exports = { getNews };
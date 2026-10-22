const { mongoUris } = require("./db");

/**
 * Checks the environment once at start-up and says exactly what is missing, instead of failing later with
 * a vague "Server error" on the first login or upload.
 *
 *  errors   : the API cannot work without these. In production the process stops (the host shows the list).
 *  warnings : the API runs, but a feature is off or weaker. Printed once.
 */
function checkEnv(env = process.env) {
  const errors = [];
  const warnings = [];
  const has = (name) => Boolean(env[name] && String(env[name]).trim());
  const require_ = (name, why) => { if (!has(name)) errors.push(`${name}: ${why}`); };
  const advise = (ok, message) => { if (!ok) warnings.push(message); };

  if (mongoUris(env).length === 0) errors.push("MONGO_URI: the database address (add MONGO_URI_2, MONGO_URI_3 ... for standby databases)");
  require_("ACCESS_TOKEN_SECRET", "signs login tokens");
  require_("REFRESH_TOKEN_SECRET", "signs refresh tokens");
  require_("ACCESS_TOKEN_SECRET_EXPIRE", "how long a login token lasts, for example 1h");
  require_("REFRESH_TOKEN_SECRET_EXPIRE", "how long a refresh token lasts, for example 7d");

  const cloudinary = Object.keys(env).some((k) => /^CLOUDINARY_CLOUD_NAME(_\d+)?$/.test(k) && has(k)) || has("Cloudinary_name");
  advise(cloudinary, "CLOUDINARY_CLOUD_NAME / _API_KEY / _API_SECRET (add _2, _3 ... for more accounts): property photos cannot be uploaded.");
  advise(has("ALLOWED_ORIGINS"), "ALLOWED_ORIGINS: comma-separated website origins. Defaulting to https://www.ggnhome.com and https://ggnhome.com.");
  advise(has("CRON_SECRET"), "CRON_SECRET: the /api/cron/* endpoints (scraper, push, cache purge) stay locked.");
  advise(has("REDIS_URL") || has("REDIS_URI"), "REDIS_URL: without Redis, caching is off and rate limits use MongoDB (fine for one or a few servers).");
  advise(has("BREVO_API_KEY"), "BREVO_API_KEY: emails (OTP by email, notifications) are not sent.");
  advise(has("SMS_KEY"), "SMS_KEY: the SMS gateway phones cannot authenticate.");
  advise(has("LOCATIONIQ_KEY") || has("LOCATIONIQ_API_KEY"), "LOCATIONIQ_KEY: nearby places and address search for partners are not found.");
  advise(has("FIREBASE_SERVICE_ACCOUNT"), "FIREBASE_SERVICE_ACCOUNT: push notifications are off.");
  advise(has("CLOUDFLARE_API_TOKEN") && has("CLOUDFLARE_ZONE_ID"), "CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID: the Cloudflare cache is not purged on a deploy.");
  advise(has("PUBLIC_API_BASE_URL"), "PUBLIC_API_BASE_URL: set it to https://api.ggnhome.com so app download links use the right host.");

  return { errors, warnings };
}

// Call once before connecting. Stops the process in production when something essential is missing.
function enforceEnv(env = process.env) {
  const { errors, warnings } = checkEnv(env);
  warnings.forEach((w) => console.warn(`[env] ${w}`));
  if (errors.length) {
    console.error(`[env] Missing required settings:\n  - ${errors.join("\n  - ")}`);
    if (env.NODE_ENV === "production") {
      console.error("[env] Stopping: set the variables above on the host and deploy again.");
      process.exit(1);
    }
    console.warn("[env] Continuing because this is not production.");
  }
  return { errors, warnings };
}

module.exports = { checkEnv, enforceEnv };

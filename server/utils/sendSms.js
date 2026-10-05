const axios = require("axios");
require("dotenv").config();

// Sends SMS through an Android SMS-gateway app (https://sms-gate.app,
// "capcom6/android-sms-gateway") running on a phone — the SMS goes out over
// that phone's SIM and uses its SMS quota.
//
// Cloud mode (works from Render, since the server cannot reach a phone on a
// private LAN): default SMS_GATEWAY_URL is https://api.sms-gate.app/3rdparty/v1
// Private-server mode: set SMS_GATEWAY_URL to your own gateway server URL.

const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || "+91";

function isSmsConfigured() {
  return Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD);
}

// "9876543210" -> "+919876543210"; leaves numbers that already have + untouched
function toE164(mobileNumber) {
  const raw = String(mobileNumber || "").trim().replace(/[\s-]/g, "");
  if (raw.startsWith("+")) return raw;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`;
  return `+${digits}`;
}

async function sendSms(mobileNumber, message) {
  if (!isSmsConfigured()) {
    throw new Error("SMS gateway is not configured");
  }

  const baseUrl = (process.env.SMS_GATEWAY_URL || "https://api.sms-gate.app/3rdparty/v1").replace(/\/+$/, "");

  const res = await axios.post(
    `${baseUrl}/messages`,
    { message, phoneNumbers: [toE164(mobileNumber)] },
    {
      auth: {
        username: process.env.SMS_GATEWAY_USER,
        password: process.env.SMS_GATEWAY_PASSWORD,
      },
      timeout: 10000,
    }
  );
  return res.data;
}

function sendOtpSms(mobileNumber, otp) {
  return sendSms(
    mobileNumber,
    `${otp} is your ggnHome OTP. Valid for 5 minutes. Do not share it with anyone.`
  );
}

module.exports = { sendSms, sendOtpSms, isSmsConfigured, toE164 };

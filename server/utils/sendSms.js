const axios = require("axios");
require("dotenv").config();

// Two ways to send, picked from env vars:
//
// 1. Own gateway (default): device key is SMS_DEVICE_KEY (testing default: test123). The OTP is put in the SmsQueue
//    collection and our Android app (sms-gateway-app/) polls /sms-gateway/next,
//    sending the SMS from the phone's SIM.
// 2. Third-party gateway (sms-gate.app): set SMS_GATEWAY_USER + SMS_GATEWAY_PASSWORD
//    (optionally SMS_GATEWAY_URL).

const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || "+91";

function useThirdParty() {
  return Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD);
}

function isSmsConfigured() {
  // The own-gateway queue is always on (device key defaults to a test value).
  return true;
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
  if (!isSmsConfigured()) throw new Error("SMS gateway is not configured");

  if (!useThirdParty()) {
    const SmsQueue = require("../models/SmsQueue.model");
    const { pickDevice } = require("../controllers/smsGateway.controller");
    // Random online phone, so no single SIM carries all the traffic.
    const assignedDevice = await pickDevice();
    return SmsQueue.create({ phoneNumber: toE164(mobileNumber), message, assignedDevice });
  }

  const baseUrl = (process.env.SMS_GATEWAY_URL || "https://api.sms-gate.app/3rdparty/v1").replace(/\/+$/, "");
  const res = await axios.post(
    `${baseUrl}/messages`,
    { message, phoneNumbers: [toE164(mobileNumber)] },
    {
      auth: { username: process.env.SMS_GATEWAY_USER, password: process.env.SMS_GATEWAY_PASSWORD },
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

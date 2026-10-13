const axios = require("axios");
require("dotenv").config();
const { reserveWindow } = require("../services/providerQuota");

// Two ways to send, picked from env vars:
//
// 1. Own gateway (default): device key is SMS_DEVICE_KEY (testing default: test123). The OTP is put in the SmsQueue
//    collection and our Android app (sms-gateway-app/) polls /sms-gateway/next,
//    sending the SMS from the phone's SIM.
// 2. Third-party gateway (sms-gate.app): set SMS_GATEWAY_USER + SMS_GATEWAY_PASSWORD
//    (optionally SMS_GATEWAY_URL).

const DEFAULT_COUNTRY_CODE = process.env.SMS_DEFAULT_COUNTRY_CODE || "+91";

function useThirdParty() {
  const credentialsPresent = Boolean(process.env.SMS_GATEWAY_USER && process.env.SMS_GATEWAY_PASSWORD);
  if (credentialsPresent && process.env.SMS_GATEWAY_FREE_TIER_CONFIRMED !== "true") {
    console.warn("[sms] Third-party gateway credentials are present but the free-tier plan is unconfirmed; using the Android SIM gateway instead.");
    return false;
  }
  return credentialsPresent;
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

async function sendSms(mobileNumber, message, kind = "otp") {
  if (!isSmsConfigured()) throw new Error("SMS gateway is not configured");

  // The admin can temporarily switch GGN Home OTPs to app-only preview mode.
  // Otherwise preserve the existing SMS delivery path (Android SIM or third-party gateway).
  const SmsSetting = require("../models/SmsSetting.model");
  const setting = await SmsSetting.findOne({ key: "ggnhome" }).lean();
  if (kind === "otp" && setting && setting.showOtpOnAndroid === true) {
    const SmsQueue = require("../models/SmsQueue.model");
    const SmsLog = require("../models/SmsLog.model");
    const phoneNumber = toE164(mobileNumber);
    const queued = await SmsQueue.create({ phoneNumber, message, kind, status: "preview", assignedDevice: null });
    await SmsLog.create({ queueId: String(queued._id), phoneNumber, kind, status: "preview" }).catch(() => {});
    return { ...queued.toObject(), preview: true };
  }

  if (!useThirdParty()) {
    const SmsQueue = require("../models/SmsQueue.model");
    const { pickDevice } = require("../controllers/smsGateway.controller");
    // Existing behaviour: randomly assign an online phone when possible; otherwise leave it open.
    const assignedDevice = await pickDevice();
    const SmsLog = require("../models/SmsLog.model");
    const phoneNumber = toE164(mobileNumber);
    const queued = await SmsQueue.create({ phoneNumber, message, assignedDevice });
    await SmsLog.create({ queueId: String(queued._id), phoneNumber, kind, assignedDevice }).catch(() => {});
    return queued;
  }

  const smsLimit = Math.min(30, Math.max(1, Number.parseInt(process.env.SMS_GATEWAY_SENDS_PER_6H_LIMIT || "30", 10) || 30));
  const quota = await reserveWindow({ provider: "sms-gate", windowMs: 6 * 60 * 60 * 1000, limit: smsLimit });
  if (!quota.allowed) {
    throw new Error(quota.reason === "quota_exceeded"
      ? "Third-party SMS quota window is full; SMS sending is paused to protect the free-tier allowance."
      : "SMS quota protection is unavailable; third-party SMS sending is paused.");
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

// The SMS people receive: "Hi, KQMX is code for your app."
function otpSmsText(otp) {
  return `Hi, ${otp} is code for your app.`;
}

function sendOtpSms(mobileNumber, otp) {
  return sendSms(mobileNumber, otpSmsText(otp), "otp");
}

module.exports = { sendSms, sendOtpSms, otpSmsText, isSmsConfigured, toE164 };

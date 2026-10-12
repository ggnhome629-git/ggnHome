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

async function sendSms(mobileNumber, message, kind = "otp") {
  if (!isSmsConfigured()) throw new Error("SMS gateway is not configured");

  // Display-only Android OTP viewer: never send SMS from the Android app or a third-party gateway.
  const SmsSetting = require("../models/SmsSetting.model");
  const setting = await SmsSetting.findOne({ key: "ggnhome" }).lean();
  if (!setting || setting.showOtpOnAndroid !== true) {
    throw new Error("OTP display is disabled by admin");
  }
  const SmsQueue = require("../models/SmsQueue.model");
  const SmsLog = require("../models/SmsLog.model");
  const phoneNumber = toE164(mobileNumber);
  const queued = await SmsQueue.create({ phoneNumber, message, kind, status: "preview", assignedDevice: null });
  await SmsLog.create({ queueId: String(queued._id), phoneNumber, kind, status: "preview" }).catch(() => {});
  return { ...queued.toObject(), preview: true };
}

// The SMS people receive: "Hi, KQMX is code for your app."
function otpSmsText(otp) {
  return `Hi, ${otp} is code for your app.`;
}

function sendOtpSms(mobileNumber, otp) {
  return sendSms(mobileNumber, otpSmsText(otp), "otp");
}

module.exports = { sendSms, sendOtpSms, otpSmsText, isSmsConfigured, toE164 };

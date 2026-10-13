const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();
const { reserveWindow } = require('../services/providerQuota');

// Brevo's Free plan advertises 300 sends/day. Use a conservative 40-recipient
// cap per fixed 6-hour bucket (max 200 in any 24-hour span across bucket edges).
// This is shared across instances and fails closed if MongoDB cannot reserve.
const BREVO_WINDOW_MS = 6 * 60 * 60 * 1000;
const BREVO_WINDOW_LIMIT = Math.min(40, Math.max(1, Number.parseInt(process.env.BREVO_SENDS_PER_6H_LIMIT || '40', 10) || 40));

const sendEmail = async ({ to, subject, text, html, templateId, params }) => {
  try {
    if (!process.env.BREVO_API_KEY || !process.env.SENDER_EMAIL) {
      throw new Error('Brevo email is not configured (BREVO_API_KEY and SENDER_EMAIL are required).');
    }

    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

    const sender = {
      email: process.env.SENDER_EMAIL,
      name: process.env.SENDER_NAME || "www.ggnHome.com"
    };

    // normalize receivers to the SDK expected shape (array of { email, name? })
    const receivers = Array.isArray(to)
      ? to.map(t => (typeof t === 'string' ? { email: t } : t))
      : [{ email: to }];

    // Reserve recipient capacity before sending. Reservations are conservative and
    // are not refunded after an ambiguous provider error to avoid exceeding quota.
    const quota = await reserveWindow({ provider: 'brevo-email', windowMs: BREVO_WINDOW_MS, limit: BREVO_WINDOW_LIMIT, amount: receivers.length });
    if (!quota.allowed) {
      throw new Error(quota.reason === 'quota_exceeded'
        ? 'Email sending is temporarily capped to protect the free-tier quota. Please retry after the current quota window.'
        : 'Email quota protection is unavailable. Email sending is paused to avoid exceeding the free-tier limit.');
    }

    // Use template ONLY when explicitly provided
    const useTemplate =
      typeof templateId === 'number' &&
      !Number.isNaN(templateId) &&
      templateId > 0;

    

    if (useTemplate) {
      // send using a Brevo template and template parameters
      await tranEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        templateId: Number(templateId),
        params: params
      });
      // console.log(`✅ Email (template ${templateId}) successfully sent to ${to}`);
    } else {
      // fallback: send raw subject/html/text
      await tranEmailApi.sendTransacEmail({
        sender,
        to: receivers,
        subject,
        textContent: text,
        htmlContent: html
      });
      console.log(`✅ Email successfully sent to ${to}`);
    }
  } catch (error) {
    console.error("❌ Error sending email via Brevo API:", error.message);
    throw new Error(error.message);
  }
};

module.exports = sendEmail;

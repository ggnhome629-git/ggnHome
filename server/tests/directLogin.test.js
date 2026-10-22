/**
 * The SMS Console "Login" switch (SmsSetting.directOtpEnabled).
 *
 * ON  : /login, /admin/login and /partner/login sign the account in straight from the
 *       mobile number. The response carries channel "direct" plus the session (the pages
 *       look for that channel to skip the code step), and no SMS is sent.
 * OFF : each of them uses the normal SMS code flow (channel "sms").
 *
 * A missing channel once made every page show "we sent you a code" although no code was sent.
 */
jest.mock("../models/user.model", () => ({ findOne: jest.fn() }));
jest.mock("../models/SmsSetting.model", () => ({ findOne: jest.fn() }));
jest.mock("../models/Agent.model", () => ({ findOne: jest.fn() }));
jest.mock("../models/SaleProperty.model", () => ({ exists: jest.fn() }));
jest.mock("../models/Rentalproperty.model", () => ({ exists: jest.fn() }));
jest.mock("../utils/sendEmail", () => jest.fn());
jest.mock("../utils/sendSms", () => ({ sendOtpSms: jest.fn(async () => ({})), isSmsConfigured: jest.fn(() => true) }));
jest.mock("../controllers/smsGateway.controller", () => ({ hasOnlineDevice: jest.fn(async () => true) }));
jest.mock("../utils/agentSession", () => ({ issueAgentSession: jest.fn(async () => ({ agent: null })) }));
jest.mock("../middleware/rateLimit", () => ({ resetOtpLimits: jest.fn(async () => {}) }));

const User = require("../models/user.model");
const SmsSetting = require("../models/SmsSetting.model");
const Agent = require("../models/Agent.model");
const { sendOtpSms } = require("../utils/sendSms");
const login = require("../controllers/login.controller");
const roles = require("../controllers/roleLogin.controller");

let ipCounter = 0;

const makeUser = (role, mobileNumber = "9876543210") => ({
  mobileNumber,
  role,
  otp: null,
  otpExpiry: null,
  otpAttempts: 0,
  save: jest.fn(async () => {}),
  getAccessToken: () => "access-token",
  getRefreshToken: () => "refresh-token",
});

// User.findOne is awaited directly by the login code and chained with .select() by the admin gate.
const findsUser = (user) => User.findOne.mockImplementation(() => Object.assign(Promise.resolve(user), { select: () => Promise.resolve(user) }));
const toggle = (setting) => SmsSetting.findOne.mockImplementation(() => ({ lean: async () => setting }));

async function call(handler, mobileNumber = "9876543210") {
  // Every call comes from its own IP so the per-IP request limit never gets in the way.
  const req = { body: { mobileNumber }, ip: `10.0.0.${++ipCounter}`, headers: {} };
  const res = { statusCode: 200, body: null, cookies: [] };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.cookie = (name) => { res.cookies.push(name); };
  await handler(req, res);
  return res;
}

beforeEach(() => {
  jest.clearAllMocks();
  toggle(null); // no saved setting: direct login is on by default
});

describe("toggle ON (default)", () => {
  test("user login signs in from the number alone and tells the page it is direct", async () => {
    findsUser(makeUser("renter"));
    const res = await call(login.requestOtp);
    expect(res.statusCode).toBe(200);
    expect(res.body.channel).toBe("direct");
    expect(res.body.accessToken).toBe("access-token");
    expect(res.body.user.role).toBe("renter");
    expect(res.cookies).toEqual(expect.arrayContaining(["accessToken", "refreshToken"]));
    expect(sendOtpSms).not.toHaveBeenCalled();
    expect(res.body).not.toHaveProperty("directOtp"); // the code is never sent to the page
  });

  test("admin login signs in an admin number directly", async () => {
    findsUser(makeUser("admin", "9123456789"));
    const res = await call(roles.adminRequestOtp, "9123456789");
    expect(res.body.channel).toBe("direct");
    expect(res.body.user.role).toBe("admin");
    expect(sendOtpSms).not.toHaveBeenCalled();
  });

  test("partner login signs in a registered, active partner directly", async () => {
    findsUser(makeUser("renter", "9555555555"));
    Agent.findOne.mockResolvedValue({ roleType: "Partner", status: "active" });
    const res = await call(roles.partnerRequestOtp, "9555555555");
    expect(res.body.channel).toBe("direct");
    expect(res.body.accessToken).toBe("access-token");
    expect(sendOtpSms).not.toHaveBeenCalled();
  });

  test("an admin number on the ordinary user login still gets an SMS code", async () => {
    findsUser(makeUser("admin", "9123456789"));
    const res = await call(login.requestOtp, "9123456789");
    expect(res.body.channel).toBe("sms");
    expect(res.body).not.toHaveProperty("accessToken");
    expect(sendOtpSms).toHaveBeenCalledTimes(1);
  });

  test("a number that is not a partner is refused on the partner login", async () => {
    findsUser(makeUser("renter"));
    Agent.findOne.mockResolvedValue(null);
    const res = await call(roles.partnerRequestOtp);
    expect(res.statusCode).toBe(403);
    expect(sendOtpSms).not.toHaveBeenCalled();
  });
});

describe("toggle OFF", () => {
  beforeEach(() => toggle({ key: "ggnhome", directOtpEnabled: false }));

  test("user, admin and partner logins use the normal SMS code flow", async () => {
    findsUser(makeUser("renter"));
    const user = await call(login.requestOtp);
    expect(user.body.channel).toBe("sms");
    expect(user.body).not.toHaveProperty("accessToken");

    findsUser(makeUser("admin", "9123456789"));
    const admin = await call(roles.adminRequestOtp, "9123456789");
    expect(admin.body.channel).toBe("sms");
    expect(admin.body).not.toHaveProperty("accessToken");

    findsUser(makeUser("renter", "9555555555"));
    Agent.findOne.mockResolvedValue({ roleType: "Partner", status: "active" });
    const partner = await call(roles.partnerRequestOtp, "9555555555");
    expect(partner.body.channel).toBe("sms");
    expect(partner.body).not.toHaveProperty("accessToken");

    expect(sendOtpSms).toHaveBeenCalledTimes(3);
  });
});

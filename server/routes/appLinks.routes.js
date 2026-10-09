/**
 * Cross-promotion links between the website and the Android app.
 *   GET /api/app-links          public  -> { playStoreUrl, websiteUrl }
 *   PUT /api/admin/app-links    admin   -> save either/both (empty string clears)
 * Stored in AppSetting so an admin can change them without a redeploy.
 */
const express = require("express");
const Joi = require("joi");
const AppSetting = require("../models/AppSetting.model");
const { verifyToken } = require("../middleware/auth");
const { checkAdminEmail } = require("../middleware/adminOnly");
const { validate } = require("../middleware/validate");

const KEY = "appLinks";
const publicRouter = express.Router();
const adminRouter = express.Router();

const read = async () => {
  const s = await AppSetting.findOne({ key: KEY }).lean();
  return { playStoreUrl: s?.value?.playStoreUrl || "", websiteUrl: s?.value?.websiteUrl || "" };
};

publicRouter.get("/", async (req, res, next) => {
  try {
    res.set("Cache-Control", "public, max-age=300");
    res.json({ success: true, ...(await read()) });
  } catch (err) {
    next(err);
  }
});

const httpsUrl = Joi.string().trim().max(500).uri({ scheme: ["https"] }).allow("");
adminRouter.get("/", verifyToken, checkAdminEmail, async (req, res, next) => {
  try {
    res.json({ success: true, ...(await read()) });
  } catch (err) {
    next(err);
  }
});
adminRouter.put(
  "/",
  verifyToken,
  checkAdminEmail,
  validate(Joi.object({ playStoreUrl: httpsUrl, websiteUrl: httpsUrl }).min(1), "body"),
  async (req, res, next) => {
    try {
      const $set = {};
      if (req.body.playStoreUrl !== undefined) $set["value.playStoreUrl"] = req.body.playStoreUrl.trim();
      if (req.body.websiteUrl !== undefined) $set["value.websiteUrl"] = req.body.websiteUrl.trim();
      await AppSetting.updateOne({ key: KEY }, { $set }, { upsert: true });
      res.json({ success: true, ...(await read()) });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = { publicRouter, adminRouter };

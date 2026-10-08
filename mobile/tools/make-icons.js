// Regenerates Android launcher icons + splash from the website logo.
// Usage: NODE_PATH=../server/node_modules node tools/make-icons.js
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "../../client/public/Logo2.jpg");
const RES = path.join(__dirname, "../android/app/src/main/res");
const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

(async () => {
  // Crop away the logo's empty margin so the mark fills its frame.
  const mark = await sharp(SRC).extract({ left: 200, top: 170, width: 680, height: 640 }).toBuffer();

  // Foreground with transparent background (white -> alpha) for adaptive icons.
  const { data, info } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.max(0, Math.min(255, Math.round((250 - min) * 2.4)));
  }
  const transparentMark = await sharp(data, { raw: info }).png().toBuffer();

  const place = async (size, markRatio, background) => {
    const m = Math.round(size * markRatio);
    const inner = await sharp(background ? mark : transparentMark).resize(m, m, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).toBuffer();
    return sharp({ create: { width: size, height: size, channels: 4, background: background || { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: inner, gravity: "center" }])
      .png()
      .toBuffer();
  };

  for (const [name, scale] of Object.entries(DENS)) {
    const dir = path.join(RES, `mipmap-${name}`);
    const legacy = Math.round(48 * scale);
    const adaptive = Math.round(108 * scale);
    const white = { r: 255, g: 255, b: 255, alpha: 1 };
    fs.writeFileSync(path.join(dir, "ic_launcher.png"), await place(legacy, 0.86, white));
    const round = await place(legacy, 0.74, white);
    const mask = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`);
    fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), await sharp(round).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer());
    // Adaptive foreground: mark within the 66dp safe zone of the 108dp canvas.
    fs.writeFileSync(path.join(dir, "ic_launcher_foreground.png"), await place(adaptive, 0.58));
  }

  // Splash: logo centred on white.
  const splash = await sharp({ create: { width: 1080, height: 1080, channels: 3, background: "#FFFFFF" } })
    .composite([{ input: await sharp(mark).resize(520, 520, { fit: "contain", background: "#FFFFFF" }).toBuffer(), gravity: "center" }])
    .png()
    .toBuffer();
  const dirs = fs.readdirSync(RES).filter((d) => /^drawable(-(land|port))?(-[a-z]*dpi)?$/.test(d));
  for (const d of dirs) if (fs.existsSync(path.join(RES, d, "splash.png"))) fs.writeFileSync(path.join(RES, d, "splash.png"), splash);
  console.log("icons + splash written");
})();

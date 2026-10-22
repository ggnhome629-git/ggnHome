#!/usr/bin/env node
/**
 * Turns a copy of the GgnHome Android wrapper into another portal app (Partner, Admin).
 *
 *   node mobile/tools/make-variant.js <dir> <applicationId> "<App name>" <start URL>
 *
 * The copy keeps the same code and the same Java package (namespace), so only the things that
 * make it a separate app on the phone change: application id, name, and the page it opens.
 * Only the main GgnHome app claims ggnhome.com web links, so the intent filter that does so is removed.
 */
const fs = require("fs");
const path = require("path");

const [dir, appId, appName, startUrl] = process.argv.slice(2);
if (!dir || !appId || !appName || !startUrl) {
  console.error('usage: make-variant.js <dir> <applicationId> "<App name>" <start URL>');
  process.exit(1);
}
const file = (...p) => path.join(dir, ...p);
const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, s) => fs.writeFileSync(p, s);
const mustReplace = (text, from, to, label) => {
  if (!text.includes(from)) throw new Error(`make-variant: "${label}" not found, the wrapper changed`);
  return text.replace(from, to);
};

// Capacitor config: id, name and the page the app opens.
const configPath = file("capacitor.config.json");
const config = JSON.parse(read(configPath));
config.appId = appId;
config.appName = appName;
config.server = { ...(config.server || {}), url: startUrl };
write(configPath, JSON.stringify(config, null, 2) + "\n");

// Android application id (the namespace stays, so MainActivity is still found).
const gradlePath = file("android", "app", "build.gradle");
write(gradlePath, mustReplace(read(gradlePath), 'applicationId "com.tanush.ggnhome"', `applicationId "${appId}"`, "applicationId"));

// Names shown on the phone.
const stringsPath = file("android", "app", "src", "main", "res", "values", "strings.xml");
let strings = read(stringsPath);
strings = mustReplace(strings, '<string name="app_name">GgnHome</string>', `<string name="app_name">${appName}</string>`, "app_name");
strings = mustReplace(strings, '<string name="title_activity_main">GgnHome</string>', `<string name="title_activity_main">${appName}</string>`, "title_activity_main");
strings = mustReplace(strings, '<string name="package_name">com.tanush.ggnhome</string>', `<string name="package_name">${appId}</string>`, "package_name");
strings = mustReplace(strings, '<string name="custom_url_scheme">com.tanush.ggnhome</string>', `<string name="custom_url_scheme">${appId}</string>`, "custom_url_scheme");
write(stringsPath, strings);

// Web links stay with the main GgnHome app.
const manifestPath = file("android", "app", "src", "main", "AndroidManifest.xml");
let manifest = read(manifestPath);
const linkFilters = /\s*<intent-filter[^>]*>(?:(?!<\/intent-filter>)[\s\S])*android\.intent\.action\.VIEW[\s\S]*?<\/intent-filter>/g;
const stripped = manifest.replace(linkFilters, "");
if (stripped === manifest) throw new Error("make-variant: the link intent filters were not found, the wrapper changed");
write(manifestPath, stripped);

console.log(`${appName}: ${appId} opens ${startUrl}`);

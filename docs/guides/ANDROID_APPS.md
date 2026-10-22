# Android apps (version 1.0.0)

Four apps, all built by `.github/workflows/build-all-apks.yml` and published to the GitHub release `latest-apks`:

| File | App | Package | Opens |
|---|---|---|---|
| `GgnHome.apk` | GgnHome | `com.tanush.ggnhome` | https://www.ggnhome.com, and every ggnhome.com link tapped on the phone |
| `GgnHome-Partner.apk` | GgnHome Partner | `com.tanush.ggnhomepartner` | https://www.ggnhome.com/partner/dashboard |
| `GgnHome-Admin.apk` | GgnHome Admin | `com.tanush.ggnhomeadmin` | https://www.ggnhome.com/admin/login |
| `sms-service.apk` | SMS Service | `com.ggnhome.smsgateway` | The SMS gateway and OTP viewer (native app) |

People download them from https://www.ggnhome.com/apps (links: `https://api.ggnhome.com/api/app-downloads/<file>`).

## How the apps are made

- The GgnHome, Partner and Admin apps are the same Capacitor wrapper (`mobile/`) pointed at a different page. `mobile/tools/make-variant.js` makes the Partner and Admin copies: it changes only the application id, the name and the page it opens, and keeps the Java package so `MainActivity` is still found.
- The wrapper loads the live website, so website changes reach the apps at once. Only changes under `mobile/` or `sms-gateway-app/` need a new APK.
- The workflow runs on a push to `main` that touches `mobile/**` or `sms-gateway-app/**`, and by hand (Actions → Build and publish all Android APKs → Run workflow).

## Versions

- Every app is **1.0.0** (`versionName`). `versionCode` only ever goes up (it is 4 for the three wrapper apps and 5 for the SMS Service), because Android refuses to update an app to a lower `versionCode`.
- For the next release raise both, in `mobile/android/app/build.gradle`, `mobile/capacitor.config.json` (`appendUserAgent`) and `sms-gateway-app/app/build.gradle`, and set `APP_LATEST_VERSION` on the API so the in-app "update available" prompt appears.

## Signing (do this once)

Every APK must be signed with the same key. Otherwise phones refuse to update the app in place, and Android cannot verify that ggnhome.com links belong to the app.

1. Run `bash mobile/tools/make-keystore.sh`. It creates `ggnhome-release.keystore` and prints what to do next. Keep the file and passwords private and never commit them.
2. In GitHub → Settings → Secrets and variables → Actions, add: `ANDROID_KEYSTORE_BASE64` (`base64 -w0 ggnhome-release.keystore`), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` and `ANDROID_KEY_PASSWORD`.
3. Also add `SMS_KEY` (the shared key of the servers) for the SMS Service app.
4. Run the workflow. Its summary lists each APK with its signing fingerprint (SHA-256).

Without the secrets the workflow still works: it signs with a debug key that it keeps in the Actions cache. That installs, but the key can change when the cache is cleared.

## ggnhome.com links that open in the app

- The GgnHome app declares every `https://www.ggnhome.com/*` link (and the bare domain) in its manifest, and routes the link to the right page (`AppBridge.jsx`).
- For Android to open them **directly** (no "open with" question), the website must list the app's signing key at https://www.ggnhome.com/.well-known/assetlinks.json. Put the SHA-256 from the workflow summary in `client/public/.well-known/assetlinks.json` (`sha256_cert_fingerprints`) and deploy the website.
- The workflow warns when the built GgnHome.apk's fingerprint is not in that file.
- The file must be served as `application/json` at that exact URL, with no redirect (also check Cloudflare).
- Only the GgnHome app claims web links. The Partner and Admin apps open their own page only.

## Releasing

1. Merge to `main`. The workflow builds and replaces the four files in the `latest-apks` release, plus `SHA256SUMS.txt`.
2. Open https://www.ggnhome.com/apps and download one app to check.
3. After a website deploy, use Admin → Clear all caches only if a deploy cache clear was skipped (the API clears the caches by itself for every new build).

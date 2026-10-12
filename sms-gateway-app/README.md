# SMS Service — Android SMS Gateway and OTP Viewer

The Android app supports two GGN Home OTP delivery modes, controlled from the web console. Normal SMS delivery remains the default.

## Choose OTP delivery mode
1. Open https://www.ggnhome.com/sms-service/app/manage.
2. Sign in with the SMS key.
3. Open the GGN Home tab.
4. Leave the switch off (**Send OTP as SMS**) to keep the existing delivery flow: the Android phone sends the OTP by SMS through its SIM (or the configured third-party gateway is used).
5. Enable **Show OTP in app (no SMS)** to display GGN Home login OTPs in the Android app and notification instead of sending those OTPs as SMS.
6. Keep the Android service running. Manual test SMS messages continue to use the normal SMS delivery flow in either mode.

The preview endpoint only returns OTPs while app-display mode is enabled. OTP previews expire after four minutes. Shine One Estate retains its existing SMS sending behavior.

## Build
The `.github/workflows/build-all-apks.yml` workflow builds the Android APKs and publishes `sms-service.apk` to the existing `latest-apks` GitHub Release alongside the other Android APKs.

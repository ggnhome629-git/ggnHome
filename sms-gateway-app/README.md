# SMS Service — Android OTP Viewer

The Android app is display-only. It never sends SMS and does not request SMS permission. It polls GgnHome for login OTPs and displays them in the app history and an Android notification.

## Enable OTP display
1. Open https://www.ggnhome.com/sms-service/app/manage.
2. Sign in with the SMS key.
3. Open the GGN Home tab and enable **Show OTPs in Android app**.
4. Start the Android OTP Viewer. When the admin switch is off, the app does not receive OTP values.

OTP previews expire after four minutes. When the switch is off, this app does not send SMS; configure another delivery channel such as email if login OTPs must still reach users.

## Build
The `.github/workflows/build-all-apks.yml` workflow builds the Android APKs and publishes `sms-service.apk` to the existing `latest-apks` GitHub Release alongside the other Android APKs.

# ggnhome-sms-service

Android app that sends ggnHome OTP SMS from the phone's SIM.

**How it works:** the server queues each OTP (`SmsQueue`) and picks a random
*online, enabled* phone that is under its daily limit. Each phone polls
`GET /sms-gateway/next` every ~3s (header `X-Device-Id`), sends the SMS with
`SmsManager`, then reports `POST /sms-gateway/:id/result`. If the chosen phone
doesn't pick a message up within 15s, any other phone may take it.

**Server env vars**
| Var | Meaning |
|---|---|
| `SMS_DEVICE_KEY` | Shared secret the phones send as `Authorization: Bearer …`. Falls back to `test123` when unset (testing only!). |
| `SMS_DEVICE_DAILY_LIMIT` | Soft per-phone/day cap used when choosing a phone (default 90). |
| `SMS_DEFAULT_COUNTRY_CODE` | Prefix for 10-digit numbers (default `+91`). |

**Phones:** install the APK (built by `.github/workflows/sms-gateway-apk.yml`),
tap *Start service*. Manage phones at `/admin/sms-devices` (admin login).

The app ships with `https://api.ggnhome.com` and key `test123` as defaults
(`Config.kt`); both can be changed under *Advanced settings*.

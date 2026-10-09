# SMS Service (Android)

Sends SMS from this phone's SIM for two services — **GGN Home** (login OTPs) and **Shine One Estate** (lead messages
from the We Three app). The app is a **sender with a read-only status screen**: nothing is configured in it.

Everything is managed on the website console, a hidden page at **`/sms-service/app/manage`** on the ggnHome site
(owner password): which service each phone works for, the limits, the Shine One sending times (lunch / night), and the
per-sheet message and Auto-send switch.

## How it works
Each service has its own polling thread. The phone asks its server for the next message
(`GET /sms-gateway/next` on GGN Home, `GET /api/sms-gateway/next` on the Shine One server), sends it with
`SmsManager`, then reports `result` and, later, the carrier `delivery` report. The **server** decides when a phone may
send (gap between messages, hourly/daily limits, lunch/night windows), so the app has no pacing of its own.

## Build
`.github/workflows/sms-gateway-apk.yml` builds the APK on every push to `main` that touches this folder. Repo secrets:

| Secret | Meaning |
|---|---|
| `SMS_GGNHOME_DEVICE_KEY` | Must equal `SMS_DEVICE_KEY` on the ggnHome server |
| `SMS_SHINE_DEVICE_KEY` | Must equal `SMS_DEVICE_KEY` on the We Three (Render) server |

Optional env at build time: `SMS_GGNHOME_URL`, `SMS_SHINE_URL`.

## Server settings (for the console)
| Where | Variable | Meaning |
|---|---|---|
| ggnHome server | `SMS_CONSOLE_PASSWORD` | Owner password for the console. Unset = the page does not exist |
| ggnHome server | `SMS_CONSOLE_JWT_SECRET` | Signs console sign-ins (falls back to `JWT_SECRET`) |
| ggnHome server | `SMS_CONSOLE_KEY` | Shared secret used to call the We Three server (must equal its `SMS_CONSOLE_KEY`) |
| ggnHome server | `SHINE_API_URL` | Defaults to `https://we-three-api.onrender.com` |
| ggnHome server | `SMS_DEVICE_KEY` | Device key for GGN Home phones |
| We Three server | `SMS_DEVICE_KEY`, `SMS_CONSOLE_KEY` | Device key for Shine One phones, and the console key above |

Limits (auto defaults, hard caps 60/hour and 200/day) are edited in the console, not through env vars. `SMS_DEVICE_DAILY_LIMIT`
is only the default daily limit for GGN Home.

## Phone setup
Install the APK, tap **Start service**, allow SMS and background running. The phone appears in the console within seconds,
and you choose there which service(s) it sends for.

# SMS Service (Android)

Sends SMS from this phone's SIM for two services — **GGN Home** (login OTPs) and **Shine One Estate** (lead messages
from the We Three app). The app is a **sender with a read-only status screen**: nothing is configured in it.

Everything is managed on the website console, a hidden page at **`/sms-service/app/manage`** on the ggnHome site
(opened with the SMS key): which service each phone works for, the limits, the Shine One sending times (lunch / night), and the
per-sheet message and Auto-send switch.

## How it works
Each service has its own polling thread. The phone asks its server for the next message
(`GET /sms-gateway/next` on GGN Home, `GET /api/sms-gateway/next` on the Shine One server), sends it with
`SmsManager`, then reports `result` and, later, the carrier `delivery` report. The **server** decides when a phone may
send (gap between messages, hourly/daily limits, lunch/night windows), so the app has no pacing of its own.

## One key
Everything uses a single shared secret, **`SMS_KEY`** — the same value in four places:

1. the **ggnHome server** env (`SMS_KEY`)
2. the **We Three (Render) server** env (`SMS_KEY`)
3. the **GitHub repo secret** `SMS_KEY` (baked into the APK at build time)
4. you type it once to open the console

It is used by the phones to reach each server, by the ggnHome server to reach the We Three server, and as the
console sign-in. If it is not set on a production server, that server refuses all SMS requests. (`SMS_DEVICE_KEY`
is the older name and is still read.) Optional: `SHINE_API_URL` on the ggnHome server (defaults to
`https://we-three-api.onrender.com`).

## Build
`.github/workflows/sms-gateway-apk.yml` builds the APK on every push to `main` that touches this folder, or by hand
(Actions → Run workflow). Optional build env: `SMS_GGNHOME_URL`, `SMS_SHINE_URL`.

Limits (auto defaults, hard caps 60/hour and 200/day) are edited in the console, not through env vars.

## Phone setup
Install the APK, tap **Start service**, allow SMS and background running. The phone appears in the console within seconds,
and you choose there which service(s) it sends for.

# GgnHome 1.0.0: Portals, apps & status

**Release:** 1.0.0. **Branch:** `main`. **As of:** 22 Oct 2026.
**Suggestions:** add them on the live page at https://www.ggnhome.com/doc (not in this file).

**Legend:** ✅ Live (in code on `main`) · 🚫 Disabled · ❓ Needs confirmation

> "Live" means enabled in the code on `main`. Check the hosting dashboard for what is actually deployed.

---

## 1. Portals & links

| Portal | URL | Who uses it | Status |
|---|---|---|---|
| Main website | https://www.ggnhome.com | Everyone | ✅ |
| Admin login | https://www.ggnhome.com/admin/login | Admin numbers only (the role is checked before an OTP is sent) | ✅ |
| Admin portal | https://www.ggnhome.com/admin/Landingpage | Signed-in admins | ✅ |
| Partner Hub | https://www.ggnhome.com/partner/login | Registered partners (OTP login) | ✅ |
| SMS Console | https://www.ggnhome.com/admin/sms-console (also `/sms-service/app/manage`; button on the admin home page) | Owner console password. SMS gateway phones, limits, logs and OTP delivery mode | ✅ (separate sign-in) |
| App downloads | https://www.ggnhome.com/apps | Everyone | ✅ |
| API backend | https://api.ggnhome.com | The website and all four apps | ✅ |
| Partner portal (standalone site) | ❓ host not in repo (`partner-portal/`) | Partners (optional second site) | ❓ |
| Agent portal (legacy) | /agent/login | none | 🚫 See §4 |
| Voice / LiveKit | `infra/livekit/` (self-hosted) | AI voice assistant | 🚫 on `main` (on `v2`) |

---

## 2. Mobile apps & APKs (version 1.0.0)

| App | Opens | Package | Download (always the latest build) |
|---|---|---|---|
| **GgnHome** | www.ggnhome.com, and every ggnhome.com link tapped on the phone | `com.tanush.ggnhome` | https://api.ggnhome.com/api/app-downloads/GgnHome.apk |
| **GgnHome Partner** | The Partner Hub | `com.tanush.ggnhomepartner` | https://api.ggnhome.com/api/app-downloads/GgnHome-Partner.apk |
| **GgnHome Admin** | The Admin login | `com.tanush.ggnhomeadmin` | https://api.ggnhome.com/api/app-downloads/GgnHome-Admin.apk |
| **SMS Service** | SMS gateway and OTP viewer | `com.ggnhome.smsgateway` | https://api.ggnhome.com/api/app-downloads/sms-service.apk |

- The public page with all four is https://www.ggnhome.com/apps.
- The API streams each file from the GitHub release `latest-apks`, so nobody lands on a GitHub page and the link never changes.
- The APKs are built by `.github/workflows/build-all-apks.yml` whenever `mobile/` or `sms-gateway-app/` changes, or when the workflow is run by hand.
- Admin → App Downloads can change the version shown, or point an app at another HTTPS file.
- See `docs/guides/ANDROID_APPS.md` for signing, links that open in the app, and releases.

---

## 3. Post property

### User / owner: `/add-property` (6 steps)

1. Basic Details
2. Location
3. Property Profile
4. Price & Description
5. Photos
6. Review & Post

- **Free listing**, **reviewed before going live**, **editable anytime**.
- Owner's mobile number is kept private.
- Sale and rent supported.

### Partner: Partner Hub `/partner/properties/add` (4 short screens, about 2–3 minutes)

1. **Photos:** camera or gallery; photos are shrunk before upload; the first photo is the front photo.
2. **Property:** Rent or Sale, type (flat, house, builder floor, villa, plot or studio), rooms.
3. **Size and price:** size (plots in gaj), price, one-tap typical values, furnishing.
4. **Place:** "Use my location" (best-accuracy GPS, address and sector found automatically) or address search; the address is cross-checked against the phone's GPS; nearby places are found and shown, and can be edited or added to in a menu that stays closed; owner's mobile number.

- English with Hindi under every label; big buttons; the Back/Next bar hides while the keyboard is open.
- **Written automatically on the server:** title, description, bathrooms and map position. Nearby market, metro, hospital, school, park and mall are found on the last screen.
- **Publishes immediately.** Partner contact is attached automatically. A draft is saved on the device.
- Partners open each property at `/partner/properties/sale/:id` or `/partner/properties/rental/:id`: the same property page inside the partner portal, without the customer features (save, enquiry, site visit, similar properties).

### Partner web (standalone `partner-portal`)

- Simpler single-page form: purpose, type, title, sector, address, price, area, bedrooms, bathrooms, owner name and mobile.
- At least one front photo is required.

---

## 4. Feature status

### ✅ Live

- Property search, listing and detail pages
- User accounts, preferences and saved properties
- Post property (owner and partner)
- Partner Hub: dashboard, properties, property pages, leads, enquiries, profile (OTP login)
- Admin: inventory, users, enquiries, payments, rewards, property manager, settings, feature toggles, app downloads, partner access, callback requests, SMS Console
- SMS Console: SMS gateway phones, limits, logs and OTP delivery mode
- Four Android apps at `/apps`; the GgnHome app opens every ggnhome.com link
- One cache clear for every new deploy (browsers, Redis, Cloudflare)
- Production setup in code: several MongoDB databases (failover), several Cloudinary accounts (rotation, resting a full one), several servers (shared rate limits, one-server-only scheduled jobs), health checks, clean shutdown, request size limits (see `docs/guides/PRODUCTION_AND_SCALING.md`)

### 🚫 Disabled / not live

| Feature | Why |
|---|---|
| Flatmates (user pages) | Routes commented out in `App.js`; feature toggle defaults to off |
| Agent portal (dashboard, add property, etc.) | Routes commented out; `/agent/register` redirects to admin; toggle off |
| Public partner self-registration | Backend returns 410; admin adds partners instead |
| AI assistant on the site (consultant, AI Search pages, floating assistant, Chatbot) | Off on `main` via `AI_CONSULTANT_ENABLED = false`; on in `v2` |
| Hidden SMS devices page | `/admin/sms-devices` redirects to the admin home page |

---

## 5. Open items for review

1. **Hosting:** set the health check path to `/health/ready`, set the required variables listed in `server/.env.example`, and add `REDIS_URL` if you run more than one API server.
2. **Release signing:** add the four `ANDROID_*` repository secrets (`mobile/tools/make-keystore.sh`), then put the printed fingerprint in `client/public/.well-known/assetlinks.json`. Until then ggnhome.com links open in the app only after Android is told to allow it, and APK updates need the same key every time.
3. **`SMS_KEY` secret:** the SMS Service APK needs the same `SMS_KEY` as the servers. Without it the APK uses a test key.
4. **Confirm the domain:** code uses both `ggnhome.com` and `ggnhome.in` (e.g. AI share links). Pick one.
5. **Partner portal host:** confirm whether the standalone `partner-portal` site is hosted anywhere, or retire it.
6. **Feature toggles:** check the live values for Flatmates and Agent portal in the admin Feature Control page.
7. **Public status page:** `/admin/ping` is public (the old `/test` OTP page now redirects home). Decide if it should stay.
8. **AI backend endpoints:** `/api/ai-consultant/*` still answer on `main`. The site no longer calls them, but they are not blocked server-side yet.

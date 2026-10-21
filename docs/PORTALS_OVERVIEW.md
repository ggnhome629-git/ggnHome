# GgnHome — Portals, Links & Status

**For:** co-founder review. **Branch:** `main`. **As of:** 21 Oct 2026.

**Legend:** ✅ Live (in code on `main`) · 🚫 Disabled · ❓ Needs confirmation

> "Live" means enabled in the code on `main`. Check the hosting dashboard before treating anything as in production.

---

## 1. Portals & links

| Portal | URL | Who uses it | Status | Suggestion |
|---|---|---|---|---|
| Main website | https://www.ggnhome.com | Public users | ✅ | |
| Admin portal | https://www.ggnhome.com/admin/Landingpage | Admins (admin email login) | ✅ | |
| Partner Hub | https://www.ggnhome.com/partner/login | Approved partners (OTP login) | ✅ | |
| Partner Hub (standalone site) | ❓ host not in repo (`partner-portal/`) | Partners | ❓ | |
| SMS gateway console | https://www.ggnhome.com/sms-service/app/manage | Owner with SMS key | ✅ (hidden page) | |
| App downloads page | https://www.ggnhome.com/apps | Everyone | ✅ | |
| Agent portal (legacy) | /agent/login | — | 🚫 See §4 | |
| API backend | ❓ (`ggnhome.onrender.com` is the likely host) | Used by all apps | ❓ | |
| Voice / LiveKit | `infra/livekit/` (self-hosted) | AI voice assistant | 🚫 on `main` (on `v2`) | |

**Suggestion:** _______________________________________________

---

## 2. Mobile apps & APKs

| App | Details | Download | Status | Suggestion |
|---|---|---|---|---|
| **GgnHome** (user) | Capacitor wrapper of www.ggnhome.com · id `com.tanush.ggnhome` · v1.2.0 | GitHub Release `latest-apks` → `GgnHome.apk` | ✅ | |
| **GgnHome Partner** | Android wrapper for PartnerHub | `/api/app-downloads/partner.apk` (streams `GgnHome-Partner.apk`) | ✅ | |
| **SMS Service** | Android SMS gateway + OTP viewer | GitHub Release `latest-apks` → `sms-service.apk` | ✅ | |

- Admin manages download URLs at **Admin → App Downloads** (keys: `ggnhome`, `partner`, `sms-service`).
- APKs are built by `.github/workflows/build-all-apks.yml`.

**Suggestion:** _______________________________________________

---

## 3. Post property

### User / owner — `/add-property` (6 steps)

1. Basic Details
2. Location
3. Property Profile
4. Price & Description
5. Photos
6. Review & Post

- **Free listing**, **reviewed before going live**, **editable anytime**.
- Owner's mobile number is kept private.
- Sale and rent supported.

### Partner — PartnerHub `/partner/properties/add` (3 steps)

1. Photos (front photo required)
2. Property Details (owner's mobile number required)
3. Review & Publish

- **Publishes immediately.**
- Partner contact is attached automatically.
- Drafts are saved on the device.

### Partner web (standalone `partner-portal`)

- Simpler single-page form: purpose, type, title, sector, address, price, area, bedrooms, bathrooms, owner name and mobile.
- At least one front photo is required.

**Suggestion:** _______________________________________________

---

## 4. Feature status

### ✅ Live

- Property search, listing and detail pages
- User accounts, preferences and saved properties
- Post property (owner and partner)
- Partner Hub: dashboard, properties, leads, enquiries, profile (OTP login)
- Admin: inventory, users, enquiries, payments, rewards, property manager, settings, feature toggles, app downloads, partner access, callback requests
- SMS gateway console and OTP-display mode
- App downloads page

### 🚫 Disabled / not live

| Feature | Why | Suggestion |
|---|---|---|
| Flatmates (user pages) | Routes commented out in `App.js`; feature toggle defaults to off | |
| Agent portal (dashboard, add property, etc.) | Routes commented out; `/agent/register` redirects to admin; toggle off | |
| Public partner self-registration | Backend returns 410; admin adds partners instead | |
| AI consultant (chat + voice) | Turned off on `main` via `AI_CONSULTANT_ENABLED = false`; on in `v2` | |
| Hidden SMS devices page | `/admin/sms-devices` redirects to landing page | |

**Suggestion:** _______________________________________________

---

## 5. Open items for review

1. **Confirm the production API host** and set it in the hosting dashboard.
2. **Confirm the domain:** code uses both `ggnhome.com` and `ggnhome.in` (e.g. AI share links). Pick one.
3. **Store builds:** the GitHub APKs for GgnHome and Partner are **debug** builds. Publish signed release builds before Play Store or wide distribution.
4. **Test routes:** `/test` (SMS OTP) and `/admin/ping` are public. Consider removing them in production.
5. **Partner Hub host:** confirm whether it is served from `www.ggnhome.com/partner/*` or a separate site.
6. **Feature toggles:** check the live values for Flatmates and Agent portal in the admin Feature Toggles page.
7. **Admin APK URLs:** confirm all three download URLs are set in Admin → App Downloads.

**Other suggestions:** _______________________________________________

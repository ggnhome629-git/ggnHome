# GgnHome-Partner

A standalone React + Vite web app for GgnHome partners. It uses the same GgnHome logo hosted at `https://www.ggnhome.com/Logo2.jpg` and the existing ggnHome API.

## Local development

```bash
cd partner-portal
npm install
```

Create `.env`:

```bash
VITE_API_BASE=https://YOUR-GGNHOME-API-HOST
```

Then run `npm run dev`.

## Production build

```bash
npm run build
```

Deploy the `dist` directory as a separate static site. Configure `VITE_API_BASE` to the existing ggnHome backend URL. Configure SPA fallback so `/partner/*` routes return `index.html`.

## Included

- Mobile number + OTP registration/login
- Partner dashboard and property list
- Partner property submission
- Leads, enquiries and profile views
- APK downloads populated from `GET /api/app-downloads`

The three APK download URLs are managed in the ggnHome admin panel at `/admin/app-downloads`. They remain unavailable in the portal until real HTTPS APK URLs are configured.

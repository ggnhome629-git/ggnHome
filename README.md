# GgnHome — Real Estate Discovery & Lead Platform

GgnHome is a full-stack real-estate platform for discovering rental and sale properties, collecting buyer/tenant requirements, managing property inventory, and helping the team and approved partners follow up with relevant enquiries.

The platform combines **structured and natural-language-assisted property search**, the ARIA rental/sale preference experience, property recommendations and ranking, user search activity, AI Assistant conversations, and a PartnerHub lead workspace. AI-assisted search activity and submitted preferences can be surfaced to authorized partners as potential leads; this is lead capture and workflow support, not a guarantee that every search is a qualified or contactable lead.

> **Current product scope**
>
> - **In scope:** public property discovery, user accounts/preferences, property detail and engagement, admin inventory and operations, AI-assisted search/assistant experiences, customer requirement capture, and the separate PartnerHub portal.
> - **Flatmates:** the backend models and endpoints exist, but the primary Flatmates page routes are currently commented out in `client/src/App.js`. Treat the end-user Flatmates journey as unavailable until those routes are intentionally re-enabled and tested.
> - **Legacy Agent portal:** legacy Agent code and routes remain in the repository, but they should not be treated as a current supported product flow.
> - **Monetization:** this README does not claim an active monetization/agent-business feature. Payment-related code remains in the repository, but the existence of code alone does not mean the business flow is currently live.

---

## Contents

- [What GgnHome does](#what-ggnhome-does)
- [Core user journeys](#core-user-journeys)
- [AI-assisted search and lead capture](#ai-assisted-search-and-lead-capture)
- [Roles and portals](#roles-and-portals)
- [Repository layout](#repository-layout)
- [Architecture and technology](#architecture-and-technology)
- [Local development](#local-development)
- [Environment configuration](#environment-configuration)
- [Main feature areas](#main-feature-areas)
- [API organization](#api-organization)
- [Security and privacy](#security-and-privacy)
- [Testing and CI](#testing-and-ci)
- [Deployment notes](#deployment-notes)
- [Troubleshooting](#troubleshooting)
- [Known limitations and status notes](#known-limitations-and-status-notes)

---

## What GgnHome does

### Property discovery

- Browse available rental and sale inventory.
- Search by location/sector, free text, property type, configuration and supported filters.
- View property details and images.
- Save preferences and revisit search activity where the account flow supports it.
- Use ranking/recommendation features to help prioritize relevant properties.
- Track property engagement such as views, saves, ratings and time spent where those events are recorded.

### Requirement capture and follow-up

- Collect rental or sale requirements through the AI Assistant / ARIA experiences and preference forms.
- Store customer search activity and submitted property preferences.
- Present AI Assistant search activity and submitted preference-form records in the PartnerHub Leads workspace.
- Review enquiries and update supported lead/enquiry statuses from authorized partner screens.
- Keep customer contact data within authenticated workflows and apply server-side role/access checks.

### Property and platform operations

- Provide an administrative portal for property/user operations, review and status controls, feature toggles, dashboard preferences, API/service usage and application-download settings.
- Support property image upload/storage through the configured media provider.
- Run background and scheduled jobs present in the repository, including property synchronization and notification-related jobs where configured.
- Expose health/status endpoints used by the backend and hosting environment.

---

## Core user journeys

### 1. Property seeker

1. Open the website and browse rental or sale properties.
2. Search using a sector/location, property keywords and available filters.
3. Open a property detail page and review its published information.
4. Use the AI Assistant / ARIA experience to express requirements or explore suitable properties.
5. Sign in where required to save preferences, use account features or submit authenticated requests.

### 2. AI-assisted requirement capture

1. A visitor or signed-in user searches for property or interacts with an assistant/preference form.
2. The application records supported search history or customer requirement data.
3. Authorized partner users can review AI Assistant search leads and preference-form leads in PartnerHub.
4. A partner can follow up using the available lead/enquiry workflow and update supported statuses.

Search events are **signals of interest**, not automatically verified buyer intent. Contact availability depends on what the user submitted, the account relationship, and the relevant access rules.

### 3. Property owner / inventory submission

Property creation and management flows exist in the repository, with user/owner endpoints and administrative review controls. Availability of individual entry points depends on current route registration, account role and feature configuration. Test create, edit, publish, pause and delete flows against a non-production database before relying on them operationally.

### 4. Administrator

1. Sign in using an account authorized for admin access.
2. Use the admin dashboard to review inventory, user/platform activity and supported operational queues.
3. Manage feature visibility, per-admin dashboard preferences, application-download URLs and partner allowlisting.
4. Use privileged operations only through the server-protected admin APIs.

Hiding a dashboard tile is a display preference; it is not a global lock on the underlying API. The backend must enforce authorization for every privileged operation.

### 5. PartnerHub

1. A GgnHome administrator adds the partner's mobile number to the partner-access allowlist.
2. The partner opens the dedicated PartnerHub web app and signs in with the allowed mobile number using OTP verification.
3. The partner can use the authorized dashboard, property, lead, enquiry and profile sections.
4. The Leads area displays AI Assistant search activity and submitted user-preference records where available.
5. The partner can access the app-download area configured by the administrator.

Self-service partner registration is intentionally disabled by the backend. Partners should be added by an administrator before login.

### 6. Flatmates

Flatmates listing models and APIs exist, including listing creation, search, details, management and enquiry handlers. However, the primary page routes are commented out in the current React app. This means the presence of those components or endpoints must not be interpreted as a complete, live end-user journey. Re-enable only after route, privacy, approval, media-upload and enquiry flows have been tested end-to-end.

---

## AI-assisted search and lead capture

AI-assisted discovery and lead capture are important parts of GgnHome.

### Search assistance

The current search code supports natural-language-like query parsing and structured search constraints, including patterns such as:

- `2 BHK in Sector 46`
- `S46` or `sector-46`
- A location/sector plus additional property keywords

The search controller normalizes sector and BHK expressions and combines them with property filters and relevance ordering. Advanced search code supports filters such as price, bedrooms/bathrooms, furnishing, property type, parking, amenities, sort order and pagination where those fields are available in the request/model.

The repository also contains ARIA rental/sale preference experiences, an AI Assistant/chat experience, user preference storage and a price-prediction controller that calls a separate model service for supported Delhi/Gurgaon inputs. Exact behavior depends on the corresponding UI, route, model and environment configuration; do not assume every assistant screen is enabled in production.

### Lead sources surfaced in PartnerHub

The PartnerHub Leads page reads two principal sources:

1. **AI Assistant search leads** — records from customer property-search activity, with the query and available linked user/contact details.
2. **User Preference Form leads** — submitted customer requirements such as preferred location, budget range, BHK/property type, furnishing, move-in date and status.

The PartnerHub UI labels these sources separately and supports pagination and refresh. Actual lead availability depends on users submitting searches/forms and on the backend successfully recording the events.

### Important distinctions

- Search history is not the same as an explicit enquiry.
- A preference form is stronger intent than an anonymous search but still requires appropriate follow-up.
- Contact fields should be shown only to authorized roles and only when the underlying consent/visibility policy permits them.
- Do not describe the system as automatically generating, qualifying or guaranteeing leads unless a verified implementation explicitly does so.
- AI-assisted recommendations are decision support; users should verify property availability, details and terms.

---

## Roles and portals

| Surface | Purpose | Access notes |
|---|---|---|
| Public website | Browse published properties, use available search and assistant entry points | Public reads are limited to published data |
| User account | OTP/password authentication, preferences, search/account features and authenticated requests | Requires valid user session for protected operations |
| Admin portal | Inventory/platform administration, usage screens, feature toggles, dashboard preferences, app downloads and partner access | Admin APIs must enforce server-side admin authorization |
| PartnerHub | Partner dashboard, assigned/authorized inventory, leads, enquiries, profile and downloads | Partner mobile number must be allowlisted by an admin; partner APIs validate access |
| Legacy Agent code | Historical/legacy agent functionality still present in the repository | Not documented as a current supported product journey |
| Flatmates modules | Listing/search/detail/enquiry backend and UI components | Main React page routes are currently disabled/commented out |

PartnerHub is a separate app in `partner-portal/`; it is not the same thing as the legacy Agent portal.

---

## Repository layout

The repository is a monorepo with separate website, backend, partner portal, mobile-related and utility projects.

```text
ggnHome/
├── client/                         # Main React website (Create React App)
│   ├── public/
│   └── src/
│       ├── components/             # Shared UI
│       ├── Context/                # Authentication and app context
│       ├── screens/                # User, search, admin, AI, partner and other screens
│       ├── hooks/                  # Shared React hooks
│       └── ...
├── server/                         # Express API
│   ├── controllers/                # Request/business logic
│   ├── models/                     # Mongoose models
│   ├── Route/route.js              # Main route registration
│   ├── routes/                     # Mounted route modules
│   ├── middleware/                 # Authentication, rate limits and request middleware
│   ├── config/                     # Database, cache and file/media handling
│   ├── services/                   # Recommendation and service logic
│   ├── cron/                       # Scheduled work
│   ├── jobs/                       # Background jobs where present
│   └── index.js                    # Backend entry point
├── partner-portal/                 # Separate PartnerHub React/Vite app
├── mobile/                         # Mobile application/source project
├── sms-gateway-app/                # SMS gateway companion application
├── scraper/                        # Scraping/synchronization utilities
├── Images/                         # Project visual assets
├── SECURITY_AUDIT.md               # Existing security-audit notes (verify against current code)
├── GGNHOME_DEEP_AUDIT_REPORT.md    # Source-level audit and prioritized findings
├── package.json                    # Root scripts
└── README.md
```

Folder contents evolve; use the current tree as the source of truth rather than relying on old file counts in documentation.

---

## Architecture and technology

### Main website

- React with Create React App / `react-scripts`
- React Router
- Material UI, Emotion, Lucide React and other UI libraries
- Axios/fetch for API communication
- Recharts for dashboard visualizations
- Leaflet where map-based UI is used
- React Testing Library and Jest dependencies

### Backend

- Node.js and Express
- MongoDB with Mongoose
- JWT-based authentication and role/access middleware
- Multer for multipart uploads
- Cloudinary integration with image processing via Sharp
- Email/notification integrations through configured service providers
- Optional Redis/cache components and in-memory/local fallback code where configured
- `node-cron` and job/cron modules for scheduled tasks
- Helmet and express-rate-limit middleware

### PartnerHub

- Separate React/Vite application under `partner-portal/`
- Communicates with the GgnHome backend through a configured API base URL
- Uses server-validated partner access rather than allowing unrestricted self-registration

### AI/model services

- Structured query parsing and property-search ranking in the backend
- ARIA rental/sale preference handling
- AI Assistant/chat controllers and data models
- Price prediction controller that calls a separately hosted model API for supported city inputs

The exact deployed services, model endpoints and enabled features must be configured in the target environment. No API key or model secret belongs in client-side code.

---

## Local development

### Prerequisites

- A Node.js version compatible with the lockfiles and installed dependencies
- npm
- MongoDB local instance or a MongoDB-compatible hosted database
- Environment values for the services you want to exercise
- Optional service credentials for media upload, email/OTP delivery, maps and AI/model integrations

Use the Node version selected by the repository's current deployment/CI configuration where available. Do not assume all external integrations work without credentials.

### 1. Clone

```bash
git clone https://github.com/ggnhome629-git/ggnHome.git
cd ggnHome
```

### 2. Install dependencies

From the repository root:

```bash
npm run install:all
```

This root script installs the main client and server dependencies. Install the PartnerHub dependencies separately when working on that portal:

```bash
cd partner-portal
npm install
cd ..
```

Other subprojects such as `mobile/`, `scraper/` and `sms-gateway-app/` have their own dependencies and instructions.

### 3. Configure the backend

Create `server/.env` locally. Do not commit secrets.

Example baseline (only set values for services you have configured):

```env
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://127.0.0.1:27017/ggnhome

# Authentication — use strong, unique random values
JWT_SECRET=replace_with_a_long_random_secret
ACCESS_TOKEN_SECRET=replace_with_a_different_long_random_secret
ACCESS_TOKEN_AGENT_SECRET=replace_with_another_long_random_secret

# Admin authorization
ADMIN_EMAIL=admin@example.com

# Media upload (Cloudinary)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Configure only when used by the deployed code:
BREVO_API_KEY=
LOCATIONIQ_API_KEY=
GNEWS_API_KEY=
REDIS_URL=
```

Environment variable names must match the current code and deployment settings exactly. The example is not a complete list of every optional integration; inspect the relevant controller/config module when enabling a feature.

**Never expose `LOCATIONIQ_API_KEY` or any other private provider credential through an unauthenticated endpoint or a React environment variable.** The legacy `/api/locationqapi` endpoint is retired and no longer returns the key. If a map UI needs geocoding, implement a server-side proxy or use a provider-supported, domain-restricted public token.

### 4. Configure the main client

Create `client/.env` and set the API base variable used by the main website's API helper. Confirm the exact variable name in the current client source before deployment; do not assume Vite's `VITE_*` convention because the main website uses Create React App.

Example if the client API helper is configured to read this variable:

```env
REACT_APP_Base_API=http://localhost:5000
```

Restart the development server after changing client environment variables.

### 5. Start the backend

```bash
npm run server:dev
```

The current server package's `start` script uses Nodemon and starts `server/index.js`. Confirm the startup log and database connection before using the app.

### 6. Start the main website

In a second terminal:

```bash
npm run client:start
```

Create React App normally serves the website at `http://localhost:3000`.

### 7. Start PartnerHub separately

```bash
cd partner-portal
cp .env.example .env
```

Set `VITE_API_BASE` to the backend origin, then run:

```bash
npm run dev
```

Create a production build with:

```bash
npm run build
```

PartnerHub uses Vite and is separate from the main Create React App client.

---

## Environment configuration

| Variable / configuration | Used for | Notes |
|---|---|---|
| `MONGO_URI` | MongoDB connection | Required for persisted accounts, inventory and lead records |
| `JWT_SECRET` / `ACCESS_TOKEN_SECRET` | User/session token verification depending on auth path | Use strong unique secrets; never commit them |
| `ACCESS_TOKEN_AGENT_SECRET` | Agent-token verification where legacy agent auth is used | Keep separate from user signing secrets |
| `ADMIN_EMAIL` | Admin email authorization checks in current middleware | Must match the intended administrator account |
| Cloudinary credentials | Image/file upload | Configure only in the server environment |
| `BREVO_API_KEY` and other notification configuration | Email/OTP/notification delivery where wired | Verify sender/domain/provider setup |
| `LOCATIONIQ_API_KEY` | Server-side geocoding integration | Private; do not return to browsers |
| `GNEWS_API_KEY` | News integration | Optional for the news feature |
| `REDIS_URL` / cache configuration | Optional caching/rate-limit support where enabled | Verify the exact key used by the selected config module |
| `VITE_API_BASE` | PartnerHub API origin | Client-visible API base URL, not a secret |
| Main client API base variable | Main website API origin | Confirm current client helper; Create React App uses `REACT_APP_*` variables |

This table covers the main integration groups rather than every environment variable referenced by every legacy module. Review `server/config/`, `server/middleware/` and the relevant controller before deploying a feature.

---

## Main feature areas

### Property inventory and discovery

- Rental and sale inventory endpoints and detail views
- Location/sector and free-text search
- Structured filters, pagination and sorting where supported
- Property image upload/storage
- Public listing and status controls
- Property ranking/recommendation modules
- Search history and supported property engagement events

### User accounts and preferences

- OTP-based login and password/session endpoints
- User details/profile and preferences
- ARIA rental/sale preference records
- Search history and property engagement data
- Callback/enquiry and support flows where enabled

### AI Assistant and prediction

- AI Assistant/chat screens and backend controllers
- Search query normalization for sector and BHK patterns
- Rental/sale requirement capture
- Preference form storage
- Partner-visible AI Assistant search activity
- A property price prediction endpoint that calls an external model service for supported Delhi/Gurgaon input formats

### Admin operations

- User and property administration
- Property approval/status/ranking operations where registered
- Payment/status administration code present in the repository
- Feature-toggle administration
- Per-admin dashboard visibility preferences
- Service/API usage pages
- Partner allowlisting and admin PartnerHub session bootstrap
- Application download URL management
- Scraper and property-sync administrative route modules

Availability and authorization must be confirmed against the current route registration and deployment. A component existing in the tree does not mean it is accessible in the current website.

### PartnerHub operations

- Partner dashboard
- Partner property listing/creation where authorized
- Lead and enquiry views
- AI Assistant search-lead records
- User preference-form leads
- Lead/enquiry status update routes
- Partner profile
- Admin-configured app downloads

### Supporting modules

- Property scraper/sync code
- SMS gateway companion app
- News integration
- Service/support request code
- Scheduled tasks and notification-related jobs
- Mobile app/source code

Supporting modules may be dormant, separately deployed or environment-dependent; verify before treating them as live production functionality.

---

## API organization

The main Express router is `server/Route/route.js`; additional endpoints are mounted from files under `server/routes/`.

The API is grouped broadly as follows:

| Area | Purpose |
|---|---|
| Authentication | OTP request/verification, password login, session/profile and logout |
| User/profile | User details, preferences, dashboard and account-owned property data |
| Property reads | Active inventory, property details and rental/sale-specific reads |
| Search | Free-text/structured property search, sector suggestions, search history and advanced search modules |
| AI/assistant | Chat/assistant responses, ARIA preferences and supported price-prediction calls |
| Property analysis | Views, saves, engagement, ratings and user/property metrics |
| Admin | Inventory/user operations, payments/status, feature toggles, usage and dashboard preferences |
| PartnerHub | Partner dashboard, properties, leads, searches, enquiries, profile and app downloads |
| Flatmates | Listing create/search/detail/update/delete, views and enquiry handlers; primary UI routes currently disabled |
| App downloads | Public configured downloads and admin URL management |
| Scraper/property sync | Admin route modules for supported sync operations |
| News/support | News and service/enquiry endpoints where enabled |

Use the current `server/Route/route.js` and mounted route modules as the authoritative endpoint list. This README intentionally avoids reproducing a stale endpoint-by-endpoint table; exact HTTP methods, validation and middleware can change independently of this overview.

---

## Security and privacy

Security controls visible in the current source include JWT/auth middleware, role/access checks, Helmet, rate-limiting middleware and OTP expiry/attempt limits. These controls must be maintained and tested as routes evolve.

### Rules for contributors

- Never commit API keys, database credentials, signing secrets or real user data.
- Keep private provider keys on the server. The legacy LocationIQ key-return endpoint is retired and must not be reintroduced.
- Apply authentication **and authorization** to every protected read/write. A valid login alone does not grant access to another user's private data.
- Public search/detail endpoints must return only published, approved data.
- Expose customer phone/email only under an explicit and enforced contact-sharing policy.
- Validate IDs, query parameters, request bodies, uploaded files and status transitions.
- Limit and deduplicate public analytics events that can otherwise be inflated by repeated requests.
- Do not treat hidden frontend buttons/routes as a substitute for backend authorization.
- Use non-production fixtures when testing approvals, contact visibility, payment state and partner access.

### Security audit

See [`GGNHOME_DEEP_AUDIT_REPORT.md`](./GGNHOME_DEEP_AUDIT_REPORT.md) for the source-level audit, prioritized findings and items still requiring runtime verification. `SECURITY_AUDIT.md` is historical and may contain entries that no longer match current source; re-verify each claim before relying on it.

---

## Testing and CI

### Main client

The main client package defines:

```bash
cd client
npm test
npm run build
```

React Scripts may run tests in watch mode locally; use the appropriate CI/non-watch invocation when needed.

### Backend and root scripts

The root `package.json` declares scripts for general tests, API tests, Playwright E2E, security checks and load tests. Some referenced configuration/script paths were not present in the source-tree audit, and `server/package.json` currently has an empty `test` script. Verify those scripts before treating them as runnable or as evidence of coverage.

Do not claim the entire test suite passes unless it has been run against the current commit in a clean environment.

### Suggested pre-release checks

- [ ] Main client production build completes
- [ ] Backend starts with the intended environment and database
- [ ] Anonymous, user, admin and partner access boundaries tested
- [ ] Public search returns published/active listings only
- [ ] Contact fields obey listing/user privacy settings
- [ ] OTP delivery, expiry, attempt limits and logout/session expiry tested
- [ ] AI Assistant search and preference submission are stored as expected
- [ ] PartnerHub displays only authorized lead and contact records
- [ ] Upload failure, file validation and cleanup paths tested
- [ ] Main and PartnerHub responsive layouts checked
- [ ] CI workflows run for the exact release commit
- [ ] Production deployment commit verified

---

## Deployment notes

The repository contains separate build targets for the main client, backend, PartnerHub and supporting projects. Configure each target according to the hosting platform's root directory, build command, start command, SPA fallback and environment-variable settings.

### Main website

- Root directory: `client/` if deploying the main client independently.
- Build command: `npm run build` inside `client/` (Create React App).
- Publish directory: `build/`.
- Configure the client API base URL for the backend origin.
- Configure SPA fallback so direct navigation/refresh on client-side routes works.

### Backend

- Root directory: `server/` for an independently deployed backend.
- Entry point: `index.js`.
- Set database, auth, media, notification and other required environment variables in the hosting dashboard.
- Ensure HTTPS, CORS origins, trusted proxy settings and rate-limit behavior match the deployment.
- Confirm the deployed commit/branch using the hosting provider or backend health/commit metadata; GitHub `main` alone does not prove what is running in production.

### PartnerHub

- Root directory: `partner-portal/`.
- Build command: `npm run build`.
- Publish directory: `dist/`.
- Set `VITE_API_BASE` to the backend origin.
- Configure SPA fallback and ensure the admin-managed APK URLs point to actual downloadable binary files.

### Release caution

No hosting-provider configuration should be inferred from this README. Validate the actual hosting dashboard, secrets, build logs and health endpoint before declaring a release live. Do not enable a dormant feature solely by deploying its existing source files.

---

## Troubleshooting

### Backend cannot connect to MongoDB

- Verify `MONGO_URI`, network access, database credentials and provider allowlists.
- Check the backend startup logs.
- Use a non-production database for migrations and tests.

### OTP or email delivery does not work

- Verify the configured provider key, sender/domain, template/settings and provider account limits.
- Check server logs and rate-limit responses.
- Never log OTPs or credentials in production.

### Images fail to upload

- Verify server-side media credentials, file-size limits, MIME/type validation and provider status.
- Check whether the request reports a partial upload failure.
- Ensure temporary files are cleaned up.

### Main client calls the wrong backend

- Check the API base variable used by the current client source.
- Restart the development server after editing `.env`.
- Inspect browser network requests and CORS configuration.

### PartnerHub login or leads do not load

- Confirm the mobile number was allowlisted by an administrator.
- Confirm OTP verification and partner token issuance.
- Check `VITE_API_BASE`, browser network responses and backend authorization logs.
- Confirm that search/preference events exist; an empty lead table can be a valid empty state.

### Flatmates pages show a missing route

The main Flatmates page routes are currently commented out in `client/src/App.js`. This is a known source state, not necessarily a hosting problem. Do not workaround it by exposing private APIs; restore the intended route and authorization design before calling the feature live.

---

## Known limitations and status notes

- The main Flatmates UI routes are currently disabled/commented out even though related UI components and API handlers remain.
- Legacy Agent functionality remains in the repository but is not described as a current supported flow.
- AI Assistant search activity and preference-form submissions can be surfaced to partners; this does not guarantee contactability or lead qualification.
- Payment, scraping, mobile, SMS gateway and scheduled-job code can require separate configuration and runtime validation.
- Some root test scripts reference paths that were not found during source-tree inspection; verify before relying on them.
- A source audit cannot establish visual correctness, live deployment status, external provider health or end-to-end success without runtime testing.

---

## Contributing

1. Create a focused feature/fix branch.
2. Confirm the behavior and relevant route/controller/model before changing a flow.
3. Preserve server-side authorization and privacy rules.
4. Add or update tests for the affected controller and user journey.
5. Run the applicable build/tests in a clean environment.
6. Document environment variables and feature availability accurately.
7. Submit a pull request describing the change, risks and verification performed.

Use clear commit messages such as:

```text
fix: enforce published listing visibility
fix: respect flatmate contact-sharing preferences
security: retire public provider-key endpoint
docs: update project overview and setup
```

---

**Repository:** [ggnhome629-git/ggnHome](https://github.com/ggnhome629-git/ggnHome)  
**Backend entry point:** `server/index.js`  
**Main client:** `client/`  
**PartnerHub:** `partner-portal/`

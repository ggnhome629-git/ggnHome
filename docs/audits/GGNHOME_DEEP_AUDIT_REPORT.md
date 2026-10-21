# GgnHome Complete Deep Audit Report

**Audit date:** 12 October 2026  
**Repository:** [ggnhome629-git/ggnHome](https://github.com/ggnhome629-git/ggnHome)  
**Audited source baseline:** `main` at `137208246d9ac3aeae6a5193f9b14f9e9a488d7a`  
**Scope:** Read-only source inspection. No application code was changed by this audit.

> **Important scope statement:** This is a source-level deep audit of the highest-risk shared paths and representative flows, with a repository-wide inventory pass. It is **not a complete runtime audit of every page**. Runtime API calls, real database behavior, APK launches, desktop/tablet/mobile visual QA, and end-to-end journeys require a safe test deployment and credentials. Those checks are marked blocked/not run rather than passed. The report uses the current source as evidence and does not treat an old audit document as ground truth.

## Follow-up remediation status (12 October 2026)

The three high-severity findings listed in this report were fixed in later commits on `main`. Treat the original finding text below as the state at the audit baseline commit (`137208246d9ac3aeae6a5193f9b14f9e9a488d7a`), not as a claim that those exact defects remain present in the latest source.

| Original finding | Latest code change | Current source-level status |
|---|---|---|
| GH-001 — Public LocationIQ API key response | `server/controllers/mapintegration.js` now returns HTTP 410 with a retirement message and never returns the key. | Fixed in source; runtime/client map integration still needs validation. |
| GH-002 — Flatmates search could bypass active filter | `searchListings` now always applies `isActive: true` and `isPostedNew: false`; client-supplied `onlyActive=false` is ignored. | Fixed in source; verify with seeded published/unpublished records. |
| GH-003 — Flatmates detail exposed owner contact without consent | `flatmateListingDetails` validates the ID, returns 404 for inactive or pending listings, and only includes email/mobile when the corresponding `contactMethods` flag is true. | Fixed in source; verify with role/contact-preference test cases. |

Relevant commits:
- LocationIQ endpoint retirement: `a12bc021db5870eb7366f9592d0f81239ac42361`
- Flatmates visibility and contact-consent guards: `ed7e25037007060ef1b1745084a604a3cc7c641f`
- README rewrite: `7404ec06d673f68487308d1670143b36245dec57`

These changes have been checked by fetching the resulting files from `main`. The audit environment did not execute a database-backed integration suite, so the fixes are source-verified, not yet runtime-verified. The remaining findings and all blocked checks below should be re-evaluated against the latest source before release.

## A. Executive summary

### Overall assessment

The current `main` source includes meaningful hardening since the checked-in `SECURITY_AUDIT.md` was written: OTPs have a five-minute expiry and attempt counter; server-wide rate-limiting middleware and Helmet are installed; admin property creation routes use `verifyToken` and `checkAdminEmail`; usage endpoints are admin gated; `setPassword` is protected by `verifyToken`; and partner allowlisting is admin-controlled.

However, significant source-level issues remain:

1. **High — LocationIQ API key disclosure:** `GET /api/locationqapi` is public and returns `process.env.LOCATIONIQ_API_KEY` in the response body.
2. **High — Flatmates search can include non-active listings:** guest-accessible search permits `onlyActive=false`, which removes the active filter instead of restricting the query to active listings.
3. **High — Flatmates detail endpoint exposes owner contact details to any authenticated user:** the authenticated `/flatmatelistingdetails` controller populates owner email and mobile for a requested listing ID without checking active/approved status or whether contact sharing is permitted.
4. **Medium — Flatmates photo upload path mismatch:** the route's Multer configuration writes uploaded files to disk, but the controller catches upload errors and does not report them to the user; full trace/testing is required to establish the exact failure rate.
5. **Medium — Flatmates views can be inflated anonymously, and attempted analytics subdocuments do not match the displayed schema.**
6. **Medium — Flatmates main UI routes are commented out:** the components still exist and some navigation points to those paths, but React Router does not register the principal flatmate dashboard/search/post/manage routes.
7. **Medium — Agent JWT verification falls back to general user JWT secrets:** this can blur token separation when the agent-specific secret is not configured.
8. **Medium — Hidden SMS console bearer token is persisted in localStorage with a 30-day lifetime.**
9. **Medium — The client UI build workflow does not run on pushes to `main`; it only runs on pushes to `fix/**` and on qualifying pull requests targeting `main`.**
10. **Low/Medium — Test infrastructure and developer documentation do not match the implemented project consistently.**

### Repository inventory (what was counted)

| Item | Count / result |
|---|---:|
| Git tree entries | 776 |
| Tracked files (blobs) | 620 |
| Directories | 156 |
| Files under `client/src/` | 276 |
| Files under `server/` | 167 |
| Files under `mobile/` | 61 |
| Files under `partner-portal/` | 9 |
| Files under `sms-gateway-app/` | 25 |
| Frontend `<Route path=...` declarations in `client/src/App.js` | 70 |
| Route/use declarations in `server/Route/route.js` | 180 statements, including router mounts and a commented declaration |
| Backend model files under `server/models/` | 53 |
| Backend controller files under `server/controllers/` | 51 |
| Backend route-module files matching the route naming scan | 6 |
| Conventional `.test.*` / `.spec.*` files found | 3 JS/JSX files, plus Android unit and instrumented example tests |
| Current main source commit | `137208246d9ac3aeae6a5193f9b14f9e9a488d7a` |

The 180 central route declarations are **not** the total resolved API inventory: `router.use(...)` mounts additional route modules, including advanced search, recommendations, app routes, app links, scraper and property sync. Those mounted files need individual enumeration for a literal all-endpoints catalogue.

### Deployment source/branch

`main` is the repository default branch and contains the latest inspected commit. The latest observed GitHub Actions runs on that commit included successful **Server Notification Checks** and **GgnHome-Partner build** runs. The latest observed Client UI Build run was successful on `feat/admin-production-controls`, not on the `main` push.

There is no committed Render/Vercel/Netlify/Docker deployment manifest in the inspected repository tree. The backend has a root health handler that reports `RENDER_GIT_COMMIT`, but the external production endpoint could not be checked through the connected GitHub-only fetch tool. **Therefore the currently deployed production commit/branch is unverified.** Do not assume that the latest development branch is live.

## B. Findings by category

Each finding includes severity, source location, reproduction, expected/actual behavior, cause, impact, fix, dependency, verification, and status. “Confirmed” means the defect or risky behavior is visible in the current source; it does not imply a production exploit was executed.

### B1. User flows

#### GH-001 — Public LocationIQ endpoint returns a provider secret
- **Severity:** High
- **Status:** Confirmed in source; runtime/external quota impact not tested.
- **Location:** `server/Route/route.js:367`; `server/controllers/mapintegration.js:8-22`
- **Endpoint:** `GET /api/locationqapi`
- **Steps to reproduce:** Request the endpoint without cookies or Authorization.
- **Expected:** A public browser endpoint should expose only a restricted client token intended for public use, or proxy the geocoding operation server-side. A private server API key must not be returned.
- **Actual:** The controller reads `process.env.LOCATIONIQ_API_KEY` and responds with JSON containing `apiKey`; the route applies no authentication middleware.
- **Root cause:** A server credential is treated as a frontend configuration value.
- **Impact:** Anyone who finds the route can copy the key and potentially consume the account’s quota or trigger charges.
- **Recommended fix:** Remove the secret-returning endpoint, proxy API calls through the backend, or use a provider-supported restricted public key with domain/quota restrictions. Rotate the currently exposed credential as a precaution and review usage.
- **Dependencies:** Confirm map/geocoding call sites before removing the endpoint.
- **Verification:** Anonymous requests must not return a secret; test map autocomplete/geocoding with the replacement flow and confirm the private key is not in response bodies or built assets.

#### GH-002 — Guest-accessible Flatmates search can search inactive/unapproved inventory
- **Severity:** High
- **Status:** Confirmed in source; database result set not queried in production.
- **Location:** `server/controllers/Flatmates.controller.js:316-330`; route `server/Route/route.js:414`
- **Endpoint:** `GET /api/flatmates/listings/search`
- **Steps to reproduce:** Call the endpoint without authentication with `?onlyActive=false`; optionally include search filters to inspect returned rows.
- **Expected:** Public search returns approved, active listings only. Inactive/draft/review listings should be accessible only through an owner/admin management flow.
- **Actual:** The route uses `verifyTokenOptional`. The controller defaults `onlyActive` to true, but only adds `q.isActive = true` when the calculated value is true. An explicit `onlyActive=false` therefore omits the active constraint entirely. Results are returned as full listing documents.
- **Root cause:** A public query parameter is allowed to disable a privacy/publication filter.
- **Impact:** Pending or paused listings may be discoverable before approval or after being taken offline. Listing records can include internal contact preferences, owner IDs and draft content.
- **Recommended fix:** Enforce `isActive: true` unconditionally for guest queries. Permit inactive inventory only after verifying ownership/admin role on a separate management endpoint; never expose a client-controlled “include inactive” option to guests.
- **Dependencies:** Coordinate with Flatmates management UI and moderation policy.
- **Verification:** With seeded active, pending, paused and deleted test fixtures, compare anonymous, owner and admin results for default search and `onlyActive=false`; ensure the latter does not bypass public filters.

#### GH-003 — Flatmates detail API returns owner email/mobile without checking publication or contact permissions
- **Severity:** High
- **Status:** Confirmed in source; production exploit/runtime data not tested.
- **Location:** `server/Route/route.js:422`; `server/controllers/Flatmates.controller.js:622-647`
- **Endpoint:** `GET /flatmatelistingdetails?id=<listingId>` (also accepts `listingId`)
- **Steps to reproduce:** Sign in as an ordinary test user, then request a known test listing ID, including a paused or pending listing.
- **Expected:** Return detail for a published listing only. Owner contact details should be returned only according to the product’s disclosure rules, the listing’s `contactMethods`, and an appropriate authorization/consent path.
- **Actual:** The route requires a valid user token, but the controller fetches any listing by ID and `populate('ownerId', 'email mobileNumber')`. It does not check `isActive`, `isPostedNew`, owner/admin relationship, or `contactMethods`.
- **Root cause:** Authentication is mistaken for authorization to view another user’s private contact fields.
- **Impact:** Any signed-in account can potentially obtain owner phone/email details and inspect listings that should be hidden.
- **Recommended fix:** Create a public-safe detail serializer; require active + approved state; remove owner contact from the default response; reveal contact only under an explicit, audited consent rule. Validate listing IDs and return a consistent 404 for unpublished records.
- **Dependencies:** Define the intended contact-sharing contract and update the detail page’s API response type.
- **Verification:** Test anonymous (401), signed-in guest, unrelated user, owner and admin against active, paused and pending listings; assert sensitive fields are absent unless explicitly allowed.

#### GH-004 — Flatmates core UI paths are not registered in React Router
- **Severity:** Medium
- **Status:** Confirmed in source.
- **Location:** `client/src/App.js:56-60, 186-187, 205-206`; related navigation in `client/src/screens/Dashboard/TopNavigationBar.jsx`
- **Affected paths:** `/flatmatesdashboard`, `/flatmatessearch`, `/flatmateslistingform`, `/flatmatesmylistings`, `/flatmatesearchpropertymodal/:id`
- **Steps to reproduce:** Navigate directly to the paths above or follow the Flatmates “post” action.
- **Expected:** Each supported Flatmates destination is registered, protected if needed, and gated by the same feature-toggle policy that controls links.
- **Actual:** Components are lazy-imported, but the corresponding route declarations are commented out. Navigation can target `/flatmateslistingform` even though that path is not registered.
- **Root cause:** UI modules and route registration/feature toggles are out of sync.
- **Impact:** Users can see a link or action that leads to a missing/wrong page; listing creation, discovery, saved listings and management journeys may be impossible to complete through the app.
- **Recommended fix:** Decide whether Flatmates is intentionally dormant. If dormant, remove/hide all related entry points and ensure the feature toggle communicates that state. If live, register the supported routes with consistent feature gating and authorization. Do not implement a new module as part of this audit.
- **Dependencies:** Product decision on whether Flatmates is live; reconcile `/api/features` with page routing.
- **Verification:** Build a route matrix from all Flatmates UI links and click each path with the feature on and off, signed out and signed in. Confirm refresh and back navigation.

#### GH-005 — Flatmates photo upload errors are swallowed and may result in listings without photos
- **Severity:** Medium
- **Status:** Confirmed error-handling defect; exact upload outcome is not runtime tested.
- **Location:** `server/Route/route.js:407-413`; `server/controllers/Flatmates.controller.js:111-158`; `server/config/FileHandling.js:~100-160`
- **Endpoint:** `POST /api/flatmates/listings`
- **Steps to reproduce:** On a safe test deployment, create a listing with one valid image and force the upload provider to fail/unavailable.
- **Expected:** Either the photo is uploaded successfully or the user receives a clear upload failure and can retry. The listing should not misleadingly succeed if photos are mandatory.
- **Actual:** The route uses Multer disk storage with `dest: "/tmp"` (so it does create a path), and the controller passes `file.path` to `uploadWithFallback`. The per-file upload loop catches errors, logs them, and continues; the request can return 201 with fewer/no photos.
- **Root cause:** Upload failures are treated as non-fatal with no structured result returned to the client.
- **Impact:** Incomplete listings and confusing support reports. If images are optional, the UI still needs to communicate that they failed.
- **Recommended fix:** Track each file’s result; use a deliberate all-or-partial policy; clean temporary files; return upload errors/counts to the form and add retry support.
- **Dependencies:** Agree whether photos are required; verify the Cloudinary fallback contract and storage cleanup.
- **Verification:** Test valid uploads, unsupported MIME, oversize images, Cloudinary outage, partial multi-file failures and retry behavior.

#### GH-006 — Flatmates view endpoint lets callers inflate views and records analytics to a field absent from the schema
- **Severity:** Medium
- **Status:** Confirmed source-level behavior; analytics persistence not runtime tested.
- **Location:** `server/Route/route.js:419`; `server/controllers/Flatmates.controller.js:481-497`; `server/models/Flatmates.model.js:1-97`
- **Endpoint:** `POST /api/flatmates/listings/:id/increment-view`
- **Steps to reproduce:** Repeatedly POST the same valid listing ID without signing in.
- **Expected:** View metrics should resist automated inflation and record only fields supported by the schema/analytics model.
- **Actual:** The endpoint has no authentication/rate-limit specific to the listing ID, increments `views`, and attempts to push an `analytics` subdocument. `Flatmates.model.js` does not declare an `analytics` field.
- **Root cause:** The public view counter does not use a validated event model or a deduplication policy.
- **Impact:** Inflated popularity/rank signals; event history may be discarded by Mongoose strict-schema handling.
- **Recommended fix:** Introduce per-session/user/IP deduplication and rate limits; store events in a declared analytics collection/schema or remove the unsupported push.
- **Dependencies:** Decide the intended meaning of a “view” and align analytics reporting.
- **Verification:** Repeated requests should not inflate a single user/session beyond policy; verify stored event rows and dashboard totals.

#### GH-007 — Flatmates moderation function is exported but not registered as a route in the central router
- **Severity:** Medium
- **Status:** Confirmed in the inspected central routing file; search all nested route modules before final removal/retirement.
- **Location:** `server/controllers/Flatmates.controller.js:604-620, 712-728`; `server/Route/route.js:413-423`
- **Affected function:** `approveListing`
- **Expected:** If Flatmates listings require admin approval, there must be an admin-authorized approval route and reachable admin UI action.
- **Actual:** The controller function is exported and changes `isPostedNew` and `isActive`, but it is not imported or mounted in `server/Route/route.js`. Its own comment says the role check is optional, and the function itself does not enforce admin role.
- **Root cause:** Moderation logic and API routing/authorization are disconnected.
- **Impact:** The intended approve action may not be available through this controller; connecting it naively would expose a privilege-escalation path.
- **Recommended fix:** Verify there is no alternative moderation route in the mounted route modules. If none exists and Flatmates is live, create a guarded admin endpoint that validates status transitions and audit-logs approvals; otherwise mark the function as retired/dead code.
- **Dependencies:** Route-wide search for other approval handlers and review of admin moderation UI.
- **Verification:** Anonymous/user requests must be denied; authorized admin can approve once; repeated/invalid transitions are idempotent or return explicit errors.

#### GH-008 — Flatmates enquiry handler stores the enquiry but does not trigger the advertised follow-up
- **Severity:** Low/Medium
- **Status:** Confirmed in inspected controller; full notification subsystem not exhaustively traced.
- **Location:** `server/controllers/Flatmates.controller.js:657-691`
- **Endpoint:** `POST /flatmateenquiry` (requires `verifyToken` in the route)
- **Expected:** The form’s confirmation should match the implemented delivery process; owner/support notifications should be sent if promised.
- **Actual:** The controller persists an enquiry, returns “Our support team will contact you shortly,” and has a comment that owner notification is optional/not implemented in this handler.
- **Root cause:** Persistence and notification/follow-up responsibility are not visibly joined in this controller.
- **Impact:** An enquiry may be stored without an operational owner/support task if no downstream job processes it.
- **Recommended fix:** Trace all enquiry consumers and notifications before changing behavior. If none exist, enqueue a durable event and expose it in an existing support/admin workflow.
- **Dependencies:** Audit `FlatmateEnquiry` readers, notifications, jobs and admin dashboard.
- **Verification:** Submit a test enquiry and verify an owner/support task/notification, retries and duplicate-submission handling.

### B2. Admin and shared controls

#### GH-009 — Admin landing-page visibility preferences are per-admin, not a global action lock
- **Severity:** Informational / requirement alignment
- **Status:** Confirmed behavior; not a defect if per-admin display preference is the intended feature.
- **Location:** `server/controllers/adminDashboardPreferences.controller.js:1-38`; `server/Route/route.js:130-131`
- **Expected:** A global lock requirement would require centrally stored state shared across admin accounts and backend enforcement on the locked actions.
- **Actual:** `getDashboardPreferences` and `updateDashboardPreferences` query by `adminId: req.user._id` and persist `hiddenRoutes` for that administrator only. They control dashboard display/navigation, not a cross-admin backend action lock.
- **Root cause:** A per-user route-visibility preference is not equivalent to an application-wide feature lock.
- **Impact:** An admin hiding a dashboard item does not disable an API operation. A second admin is not intended to inherit those hidden-route preferences.
- **Recommended fix:** Keep the current functionality labelled as “personalize dashboard” if that is the intention. If a real global lock is required, add a separate centrally stored lock state and enforce it server-side at each action/API; hiding a button alone is not authorization.
- **Dependencies:** Explicit decision on semantics: display preference vs global operation lock.
- **Verification:** Compare saved preferences between two admins and verify that all privileged APIs still enforce their role checks regardless of visibility state.

#### GH-010 — Admin route/UI coverage is broad, but runtime guard completeness remains unverified
- **Severity:** Medium
- **Status:** Partially verified; blocked for interactive testing.
- **Location:** `client/src/App.js:238-265`; `server/Route/route.js`
- **Expected:** Every admin page should wait for identity resolution, show an appropriate unauthorized state, and have server-side authorization on all data/mutations.
- **Actual:** The inspected admin child routes use `AdminProtectedRoute`, and the current central router includes `checkAdminEmail` on the five usage APIs and on admin property create actions. The route is a UI gate only; it cannot replace server middleware.
- **Recommended fix:** Run route-by-route guard checks for every child page and ensure every mutation endpoint is protected by `verifyToken` plus `checkAdminEmail` or an equivalent controller-level role check. Specifically review the older `/api/admin/update-property/:id` and `/api/admin/delete-property/:id` routes that use `verifyToken` but do not include `checkAdminEmail` inline; verify the controller body’s role check before treating them as safe.
- **Verification:** For each admin API, test anonymous, ordinary user and admin credentials; make no production mutations.

### B3. Partner portal

#### GH-011 — Partner registration is intentionally disabled for self-service and replaced by admin allowlisting
- **Severity:** Informational / expected behavior
- **Status:** Confirmed in source.
- **Location:** `server/Route/route.js:516-529`; `server/controllers/adminPartnerAccess.controller.js:1-100`
- **Actual behavior:** `POST /api/partner/register` returns HTTP 410 with a message directing the user to an administrator. The admin registration route validates an Indian mobile number, creates/links a base User and Partner Agent record, and states the partner must still verify possession of the mobile number with OTP. Partner APIs use `verifyAgentToken, verifyPartnerAccess`.
- **Audit note:** This matches the current requirement that admin registration is the only enrollment path. Do not report the 410 self-registration route as a defect; verify the UI clearly explains the admin-only enrollment policy.
- **Verification needed:** Test the full flow with a non-production number: admin allowlist → partner OTP login → dashboard/properties/leads/profile → logout/expiry → re-login; verify wrong-role and inactive partner tokens are denied.

#### GH-012 — PartnerHub stores its bearer token in localStorage
- **Severity:** Medium
- **Status:** Confirmed source pattern; no XSS test run.
- **Location:** `client/src/screens/PartnerHub/PartnerHubProtectedRoute.jsx:15-38` and related PartnerHub auth pages.
- **Expected:** Privileged tokens should have the smallest practical exposure and lifetime.
- **Actual:** The client reads `accessToken` and `partnerAccessToken` from localStorage and uses them in Authorization headers; the partner token is persisted there after the admin-session bootstrap.
- **Impact:** Any script executing in the origin can read the bearer token. This is defense-in-depth risk, particularly for a role with access to leads/contact data.
- **Recommended fix:** Prefer a properly configured HttpOnly, Secure, SameSite cookie/session design where feasible; otherwise shorten token lifetime, rotate/revoke tokens and enforce strict CSP/XSS prevention.
- **Verification:** Confirm expiry/revocation on logout, role suspension, password/OTP reset and expired token response.

### B4. Legacy Agent portal

#### GH-013 — Legacy agent login endpoints are retired while an Agent login page remains registered
- **Severity:** Medium
- **Status:** The API/UI contract mismatch is partly confirmed; exact UI call path needs runtime or call-site tracing.
- **Location:** `server/Route/route.js:444-450`; `client/src/App.js:207-208`
- **Actual behavior:** The central server router mounts `/api/agentcheck`, `/api/agent/send-otp`, `/api/agent/login/otp`, `/api/agent/login/password` and `/api/agent/reset-password` as retired handlers, while React Router still registers `/agent/login` to `AgentLogin`. The server also has an authenticated `/api/agent/login/session` route for already-authenticated users.
- **Impact:** If the surviving `AgentLogin` still calls the retired endpoints, users can reach a login UI that cannot complete authentication. Conversely, the page may be an intentional transition path to shared user OTP.
- **Recommended fix:** Trace all API calls inside `AgentLogin` and its auth context. If Agent portal is retired, clearly redirect/disable its frontend entry. If a supported legacy journey remains, align it with the intended shared OTP/session endpoint rather than reviving retired unauthenticated login handlers.
- **Verification:** Test all links to `/agent/login`, the exact outgoing API URLs, retired endpoint responses and login-to-dashboard redirect.

#### GH-014 — Agent token verification may conflate agent and user signing secrets
- **Severity:** Medium
- **Status:** Confirmed code configuration fallback; exploitation depends on environment configuration and token issuance.
- **Location:** `server/middleware/auth.js:~65-95` and `verifyTokenOrAgent`
- **Actual behavior:** Agent verification resolves the secret as `ACCESS_TOKEN_AGENT_SECRET || ACCESS_TOKEN_SECRET || JWT_SECRET`; `verifyAgentToken` accepts `decoded.agentId || decoded.id` and does not require an explicit role claim in the shown verifier. A missing dedicated agent secret therefore causes cross-role signing-key reuse.
- **Impact:** Token type separation is weaker when the environment is incomplete or misconfigured.
- **Recommended fix:** Require a dedicated agent signing key in production and fail closed if absent. Validate the token’s expected audience/issuer and explicit role/type claim; keep user and agent verification logic separate.
- **Dependencies:** Inventory every agent token issuer/session endpoint and secrets in deployment configuration.
- **Verification:** Unit-test user tokens against agent endpoints and agent tokens against user endpoints under each secret configuration; all cross-role attempts should fail.

### B5. Flatmates complete-flow matrix

| Flow | Source status | Current assessment | Required runtime verification |
|---|---|---|---|
| Dashboard entry | Components exist; route commented out | **Broken/unreachable through the declared router** | Open via all site navigation links and direct URL |
| Discovery/search | UI exists; route commented out | **Broken/unreachable through the declared router** | Filters for area, budget, gender, furnishing, move-in date, pagination |
| Create listing | UI exists; route commented out | **Broken/unreachable through the declared router** | Multi-step validation, draft recovery, valid/invalid photos |
| Save/bookmark | localStorage hook exists | Browser-local only, not an account-synced server feature | Refresh, sign-in on another device, removed listing |
| My listings | UI exists; route commented out | **Broken/unreachable through the declared router** | Owner scope, paused/resume, edit/delete, review resubmission |
| Details | Backend route requires login | Response currently populates owner contact without publication/consent check | Published/unpublished IDs, contact preference |
| Enquiry | Authenticated POST handler stores a record | Notification/follow-up chain not established | Submit once/twice; confirm who receives task/notification |
| Admin approval | controller function exported but not mounted in the central router | Approval route unresolved / likely missing from this module | Locate other moderation routes; test authorization |
| Photo upload | multipart route exists | Upload failures may silently save listing without media | provider outage, oversize/type rejection, retry |
| Analytics | unauthenticated view increment route | Counter inflation/schema mismatch risk | repeated requests, stored event shape |

### B6. API inventory and controller routing

The central router file is `server/Route/route.js` (577 lines). It declares approximately 180 `router.get/post/put/patch/delete/use` statements. Because several declarations mount sub-routers, this report does **not** claim to enumerate every resolved endpoint or every frontend caller. The primary families identified in the central router are below.

| API family / examples | Frontend/consumer | Middleware visible in central router | Controller / module | Source review |
|---|---|---|---|---|
| `/login/request-otp`, `/login/verify-otp`, `/login/password`, `/auth/set-password`, `/auth/me`, `/auth/logout` | Login forms, AuthContext | OTP/login limiters; `verifyToken` where applicable | `login.controller.js`, logout controller | OTP and set-password source inspected; live delivery not tested |
| `/api/user/details`, `/api/user/dashboard`, `/api/user/save-details` | Profile/dashboard pages | User token | userdetails controller | Full per-page caller match incomplete |
| `/api/activeproperties`, `/api/properties/:id`, `/api/getRentalproperties/:id`, `/api/getSaleproperties/:id` | Home/search/detail pages | Optional auth on read | Viewproperties and property controllers | Source routes inspected |
| `/api/search-properties`, `/api/search-history`, `/api/search-properties-on-location` | Search UI | Optional/user token as registered | Searchproperties controller | Pagination and filters not runtime tested |
| `/api/payment` | Payment/visit journey | User token | payment controller | Gateway state/webhooks not runtime tested |
| `/api/admin/pending-payments`, `/api/admin/update-payment-status`, `/api/admin/overview` | Admin dashboard/payment screens | `verifyToken, checkAdminEmail` | admin/payment controllers | No live mutation performed |
| `/api/admin/cloudinary/usage`, `/brevo/usage`, `/mongo/usage`, `/gnews/usage`, `/locationiq/usage` | Admin usage dashboards | `verifyToken, checkAdminEmail` on current main | admin.Accountsusage controller | Current source contradicts old audit claim that these are open |
| `/api/admin/addrentproperties`, `/api/admin/addsaleproperties` | Admin add-property forms | `verifyToken, checkAdminEmail`, upload middleware | admin controller | Current main includes admin authorization |
| `/api/promos`, `/api/admin/promos` | Promo cards/admin promos | Public read; admin writes protected | promo controller | UI/state coverage incomplete |
| `/api/property-analysis/*`, `/api/property-analytics/user-metrics` | Saved properties/analytics | Auth as registered | PropertyAnalysis controller | Detailed data shape verification pending |
| `/api/flatmates/listings*`, `/flatmatelistingdetails`, `/flatmateenquiry` | Flatmates screens | Mix of public/optional-auth/user token | Flatmates controller | Findings GH-002–008 |
| `/api/agent/*`, `/agent/me`, `/api/agent/dashboard` | Legacy Agent UI | Agent/user auth and role middleware varies | agent login/dashboard controllers | Retired login routes need alignment review |
| `/api/partner/*` | PartnerHub pages | `verifyAgentToken, verifyPartnerAccess` | AgentHub/partner controllers | Test allowlist, role boundary and all operations |
| `/api/admin/partners/access`, `/api/admin/partner-session` | Admin partner access and PartnerHub bootstrap | `verifyToken, checkAdminEmail` | adminPartnerAccess and partner auth/session | Current source reflects admin-only enrollment |
| `/api/app-downloads`, `/api/app-downloads/partner.apk` | App downloads UI/PartnerHub | Public read/download, admin updates gated | appDownload controller | Download bytes not fetched/tested |
| `/api/admin/scraper/*`, `/api/admin/property-sync/*` | Admin sync controls | Mounted subrouters | scraper/propertySync route modules | Full child endpoint inventory pending |
| `/api/advanced-search*`, `/api/recommendations/*`, `/api/app/*`, `/api/app-links/*` | Search/recommendation/mobile app | Mounted subrouters | corresponding route modules | Full child endpoint inventory pending |
| `/sms-gateway/*`, `/api/sms-console/*` | SMS gateway device and hidden console | Device auth or console JWT; login rate-limited | SMS gateway/console controllers | Token storage concern GH-012 |

**Important current-source correction:** the checked-in `SECURITY_AUDIT.md` reports some issues as OPEN that do not match current main. Current source adds rate limiting and Helmet; OTP expiry/attempt limits; a protected `setPassword` path; admin-gated usage APIs; and admin-gated property-creation APIs. The old document should be refreshed after verification, not copied forward uncritically.

### B7. Routing and navigation

| Finding | Evidence | Status |
|---|---|---|
| Flatmates route declarations commented out while screens/navigation still exist | `client/src/App.js:186-187, 205-206`; TopNavigationBar flatmates target | Confirmed; GH-004 |
| Legacy agent page still declared while legacy server login endpoints return retired responses | `client/src/App.js:207-208`; `server/Route/route.js:444-450` | Partially confirmed; GH-013 |
| Admin aliases redirect to canonical admin pages; `/admin/*` catch-all redirects to `/admin/Landingpage` | `client/src/App.js:258-265` | Source behavior confirmed; deep-link/guard UX not runtime tested |
| Service worker is registered for production PWA builds | `client/src/index.js`, `client/src/serviceWorkerRegistration.js` | Source confirmed; cache/update behavior not browser-tested |
| No committed deployment manifest found in repository tree | Full tree path-name scan | Confirmed; production branch remains unverified |

### B8. Shared UI/UX and accessibility

No browser was attached to the deployed app and no test deployment was available to run real screenshot/device checks. Therefore visual claims such as clipped text, colors, touch-target sizes or tablet overflow are **not** asserted as confirmed defects. Source inspection only establishes the following work items:

| UI issue / risk | Evidence | Status | Recommended check |
|---|---|---|---|
| Route is missing for Flatmates destinations reached from UI | GH-004 | Confirmed | Click all Flatmates nav, post, saved-room and back actions |
| Some UI modules may still target retired Agent login methods | GH-013 | Suspected until AgentLogin calls are traced | Network log through login journey |
| SMS console session token uses browser localStorage | GH-012 | Confirmed pattern | XSS review, expiration/revocation test |
| Stale Vite instructions conflict with actual CRA scripts | README vs `client/package.json` | Confirmed docs inconsistency | Update setup and deployment docs |
| Detailed spacing/icon/color issues | Requires visual snapshots at desktop/tablet/mobile | Blocked / not assessed | Capture pages after test deployment is reachable |
| Keyboard, focus, accessible names, dialogs, responsive overflow | Not runtime/accessibility tested | Blocked / not assessed | Run axe/Lighthouse and keyboard-only journeys |

Avoid wholesale redesign before documenting the existing design tokens and verifying each live page. The audit has not generated a complete per-component color/icon/spacing diff, because source inspection alone cannot prove rendered output.

### B9. Database and data integrity

1. **Flatmates active/unapproved filtering:** the search query can omit publication status when `onlyActive=false` (GH-002).
2. **Flatmates event schema mismatch:** the controller pushes an `analytics` property, while `Flatmates.model.js` contains `views` and listing fields but does not declare `analytics` (GH-006).
3. **Listing/media partial success:** Flatmates listing creation catches per-image upload errors and continues; ensure the saved listing state and client response are consistent (GH-005).
4. **Admin preferences:** hidden routes are intentionally scoped by `adminId`; do not interpret these user-specific preferences as a global lock (GH-009).
5. Database indexes, production data shape, duplicate records and consistency after deletions were not checked against a live database.

### B10. Authentication and security

#### Positive controls currently visible in source
- `server/index.js` registers Helmet and the global `apiLimiter`.
- `server/middleware/rateLimit.js` defines dedicated OTP request, OTP IP, OTP verification, password login, guest-form, chat and SMS console limiters.
- `login.controller.js` currently defines a five-minute OTP TTL, a resend gap and a maximum attempt count; successful OTP verification clears the OTP fields.
- `/auth/set-password` currently uses `verifyToken`, and the controller requires a signed-in user and refuses to overwrite an already-set password.
- Admin create-property and usage routes in the current central router include `checkAdminEmail`.
- Partner self-registration returns 410 and instructs users to ask an administrator; the admin allowlist route performs server-side mobile validation.
- Partner data routes include server-side partner access middleware.

#### Remaining concerns
- GH-001 — provider key returned by public route.
- GH-002/GH-003 — non-active inventory and owner contact details.
- GH-012 — privileged long-lived token in localStorage.
- GH-014 — agent/user token-secret fallback.
- Verify all `verifyToken`-only routes whose names imply admin operations. In particular, audit controller-level authorization for `PUT /api/admin/update-property/:id` and `DELETE /api/admin/delete-property/:id`, since the central route line does not itself include `checkAdminEmail`. A route name is not proof of a flaw if the controller enforces admin role; verify before changing it.
- `GET /api/locationqapi` is confirmed public and returns a provider key.
- The user-facing hidden SMS console route itself is outside the React admin gate by design; its API access uses a separate shared-key-derived JWT. This is not automatically a bypass, but the password distribution, token lifetime and localStorage exposure deserve a threat-model review.

### B11. Performance and reliability

- No real database/API load tests were run. The root package declares a load-test script targeting `http://localhost:5000/api/activeproperties`, but this report did not execute it.
- Server uses optional Redis/Mongo/local fallback in rate limiting; production configuration and behavior under Redis/Mongo outages were not exercised.
- Background notifications, ranking scheduler, property sync, reminders, scraper jobs and push jobs were inspected only through route/entrypoint references, not executed.
- Multer stores general uploads in `/tmp` with 25 MB per-file and 20-file limits; current config filters declared MIME types to image/video. Flatmates has a stricter separate upload configuration (5 MB, 8 files, image MIME). Content sniffing, temp-file cleanup and malformed-image handling still need dynamic tests.
- Service worker PWA cache/update behavior, nested-route refresh, app links/deep links and APK installation were not verified on devices.

## C. Individual finding index

| ID | Severity | Area | Status |
|---|---|---|---|
| GH-001 | High | Public secret/config endpoint | Confirmed |
| GH-002 | High | Flatmates public search filter | Confirmed |
| GH-003 | High | Flatmates owner-contact privacy | Confirmed |
| GH-004 | Medium | Flatmates frontend routing | Confirmed |
| GH-005 | Medium | Flatmates photo upload error handling | Confirmed error-handling flaw; runtime outcome blocked |
| GH-006 | Medium | Flatmates views/analytics integrity | Confirmed source behavior |
| GH-007 | Medium | Flatmates moderation route completeness | Confirmed in central router; alternative routes must be excluded |
| GH-008 | Low/Medium | Flatmates enquiry follow-up | Confirmed in handler; downstream consumer not exhaustively traced |
| GH-009 | Informational | Admin display preference vs global lock semantics | Confirmed behavior; requirements decision needed |
| GH-010 | Medium | Admin authorization coverage | Partially verified; runtime matrix blocked |
| GH-011 | Informational | Partner admin-only enrollment | Expected behavior |
| GH-012 | Medium | Partner/SMS token storage | Confirmed localStorage pattern |
| GH-013 | Medium | Legacy Agent UI vs retired APIs | Partially confirmed |
| GH-014 | Medium | Agent JWT secret separation | Confirmed fallback; environment-dependent risk |
| GH-015 | Medium | Client build CI trigger does not include main push | Confirmed |
| GH-016 | Low/Medium | Test harness/docs drift | Confirmed configuration/documentation mismatch |

### GH-015 — Client UI build workflow does not run on main pushes
- **Severity:** Medium
- **Status:** Confirmed in workflow configuration and latest observed run list.
- **Location:** `.github/workflows/client-ui-build.yml:1-16`
- **Steps:** Push a source change directly to `main` touching client/server code and inspect checks.
- **Expected:** A production branch push should trigger the client build/syntax validation (or an explicitly documented release workflow should gate deployment).
- **Actual:** The workflow’s `push.branches` filter contains only `fix/**`; PRs targeting `main` do trigger it for matching paths. The latest observed main push ran Server Notification Checks and Partner build, but not Client UI Build.
- **Impact:** Client build breakage can reach main without this workflow running on that push. This does not mean the last main build failed; it means the trigger does not independently validate main pushes.
- **Fix:** Include `main` in the push branch filter or provide another main-branch build workflow that is required before release.
- **Verification:** Push a harmless test change to a temporary/main test branch under each path scope and confirm expected workflow dispatch.

### GH-016 — Test commands and documentation do not match the actual test setup
- **Severity:** Low/Medium
- **Status:** Confirmed configuration mismatch; commands not executed.
- **Location:** Root `package.json`; `server/package.json`; `client/src/App.test.js`; `README.md`
- **Actual behavior:** `server/package.json` defines `"test": ""`. Root scripts reference `server/jest.config.js`, `playwright test` and `server/scripts/security-check.js`, but those specific paths were not present in the current tracked tree. Only a small number of conventional JS/JSX test files were found, including a CRA boilerplate test that renders `App` without the Router/Auth/Theme wrappers provided by `client/src/index.js` and expects the old “learn react” text.
- **Impact:** A developer may believe API, E2E or security suites are available when the referenced config/script is missing; a boilerplate client test is not meaningful coverage for the product and may fail.
- **Fix:** Either add and maintain the referenced test suites/configs, or remove/replace stale script entries. Replace the boilerplate App test with a route test that wraps the proper providers and asserts real GgnHome behavior.
- **Verification:** Execute each declared test command from a clean checkout; include the exact exit code and suite count in CI.

## D. UI inconsistency list

This section intentionally separates **source-confirmed navigation defects** from **visual checks that remain blocked**.

| UI area | Issue | Status |
|---|---|---|
| Flatmates dashboard/search/post/manage | Core path declarations commented out while components and navigation targets remain | Confirmed |
| Flatmates post action | Top navigation selects `/flatmateslistingform` when the pathname indicates Flatmates; route is commented out | Confirmed |
| Admin route visibility | Stored preferences are per-admin hiddenRoutes; they do not lock backend actions | Confirmed design semantics |
| Partner enrollment | `/partner/register` route uses the shared auth page, while server returns 410 for self-registration; UI wording should clearly tell partner to ask admin | Code contract confirmed; UI clarity not visually tested |
| SMS console | Separate sign-in form and localStorage JWT; review session-expiry/re-auth and errors | Source pattern confirmed; rendered states not tested |
| Button color, icons, spacing, border radius, typography, card heights | Requires screenshots/computed styles of all live pages | Not assessed |
| Hover/focus/disabled/loading/active states | Requires browser interaction | Not assessed |
| Mobile overflow, tablet wrapping, modal boundaries | Requires responsive browser/device QA | Not assessed |
| Contrast, keyboard navigation, ARIA labels, focus trap | Requires accessibility tools/keyboard review | Not assessed |
| Loading/empty/error/success states across all 168 screen page components | Not exhaustively traced | Remaining work |

## E. API inventory detail: central route map

The following is the central router’s high-level registration map. It is **not** a fully expanded final endpoint count because subrouters contribute additional endpoints and not every frontend call site was traced.

| Central route group | Methods and paths sampled | Auth/middleware characteristics |
|---|---|---|
| Feature toggles | `GET /api/features`; `GET/PUT /api/admin/feature-toggles` | Public read; admin writes guarded |
| App downloads | `GET /api/app-downloads`; `GET /api/app-downloads/partner.apk`; admin GET/PUT | Public download; admin write guarded |
| Dashboard tools | `GET/PUT /api/admin/dashboard-tools` | Admin authentication; per-admin preferences |
| Partner access | `GET/POST /api/admin/partners/access`; `POST /api/admin/partner-session` | Admin guarded |
| OTP/login | `POST /login/request-otp`; `POST /login/password`; `POST /login/verify-otp`; `POST /auth/set-password`; `GET /auth/me`; `POST /auth/logout` | Purpose-specific throttles; protected actions |
| SMS gateway | `GET /sms-gateway/next`; `GET /sms-gateway/status`; `POST /sms-gateway/:id/result`; `POST /sms-gateway/:id/delivery` | Gateway device verification |
| SMS console | `POST /api/sms-console/login`; overview, settings, phones, logs and test-send routes | Console login limiter and signed console-token gate |
| User/profile | `/api/user/save-details`; `/api/user/details`; `/api/user/dashboard`; `/api/properties/my` | User/session or user/agent auth depending endpoint |
| Property reads/search | `/api/activeproperties`; property detail endpoints; `/api/search-properties`; `/api/search-history` | Public/optional auth or required user auth as registered |
| Property create/edit | `/api/addrentproperties`; `/api/addsaleproperties`; `/api/user/update-property/:id`; delete property | User/agent token and uploads |
| Admin property management | `/api/admin/properties`; counts/bulk approve; property toggles/rank; admin add-sale/rent | Admin checks on current main; older update/delete routes need controller re-check |
| Payment/rewards | `/api/payment`; admin pending/update/approved; rewards endpoints | User/admin checks as applicable |
| Support/enquiry | callback, enquiry, services and service status endpoints | Mix of optional/user/admin auth; verify owner/status checks per endpoint |
| Property analytics | addView/addSave/addEngagementTime/addRating/metrics/conversion/saved properties | Token protected as registered |
| Flatmates | listing create/search/by-ids/list/detail/delete/update/view/user listings/enquiry | Mix of user, optional and public; GH-002–008 |
| Agent | retired login routes, login session, agent/me/dashboard/properties/enquiries | Agent/user role gates, retirement contract mismatch needs review |
| Partner | dashboard/properties/leads/enquiries/profile and status update | Agent token + Partner access |
| Ranking | public ranking read and admin calculate/batch/stats/suspicious | Public read; admin mutation/query routes gated |
| Mounted route modules | scraper, property sync, advanced search, recommendations, app, app-links | Must expand each mounted module for complete inventory |

A complete endpoint inventory still needs one row for every method/path in all mounted routers, with every frontend caller, request/response schema, validation, ownership condition and test. The table above is explicit about this limitation rather than claiming all endpoints have been tested.

## F. Broken-flow matrix

| Flow | Current source path | Fail point / risk | Confidence |
|---|---|---|---|
| Anonymous map/geocoding setup | `/api/locationqapi` → mapintegration controller | Private API key appears in response | Confirmed |
| Flatmates discovery | search UI → `/api/flatmates/listings/search` | Main frontend route unregistered; direct API also permits inactive filter bypass | Confirmed source |
| Flatmates listing create with image | form → POST listings → multer → controller → Cloudinary | Image upload error is swallowed; response may succeed without image | Source confirmed; runtime blocked |
| Flatmates detail/contact | authenticated detail request → controller | Listing status/contact sharing not checked before owner population | Confirmed |
| Flatmates pause/resume | manage UI → DELETE listing with active query/body | Status semantics use DELETE for toggle; main management route itself is commented out | Source/API mismatch; browser test blocked |
| Flatmates approval | admin UI (if present) → approveListing | exported function not mounted in central route; no admin check inside controller | Central router confirmed; other-module check needed |
| Flatmates enquiry | detail form → POST flatmateenquiry | record written; follow-up notification not visible in this handler | Needs downstream consumer trace |
| Legacy Agent login | `/agent/login` page → agent API | central OTP/password/reset routes are retired; exact caller mapping pending | Partially confirmed |
| Partner enrollment/login | admin allowlist → PartnerAuthPage OTP → partner dashboard | Intended contract exists; real OTP, token expiry and role failure not tested | Runtime blocked |
| Admin feature visibility | admin UI → `/api/admin/dashboard-tools` | Preferences apply to one admin only; not a global backend lock | Confirmed intentional semantics |
| Main CI validation | push `main` | Client UI Build branch filter excludes `main` pushes | Confirmed |
| PWA deep link/refresh | Browser route → service worker/static host | No live hosting config/test performed | Blocked |
| Payment/visits | checkout → payment API/provider | No live gateway credentials/test transaction used | Blocked |
| User OTP/session | request OTP → delivery → verify → cookies/session | Static code controls inspected; SMS/email delivery and session expiry untested | Partial |

## G. Unused/unreachable routes, dead code and retired/incomplete features

1. **Flatmates routes:** the five main Flatmates page routes are commented out while their components remain in source. See GH-004.
2. **Agent portal:** `/agent/login` and a redirection from `/agent/register` remain in UI routes, while several legacy backend sign-in endpoints return the retired handler. Trace `AgentLogin` before deciding whether to redirect or refactor.
3. **Flatmates approval:** `approveListing` is exported by the controller but not mounted in the central router. Confirm no alternative route exists before classifying it as dead code.
4. **Potential route duplication/overlap:** admin delete-property behavior exists at `/api/admin/delete-property/:id` and `/api/admin/properties/:id`; check whether both should remain and whether both enforce equivalent auth/controller checks.
5. **README route/API documentation:** the published table is long but should be generated/verified against actual routers; the documentation and runtime stack already diverge.
6. **No committed deployment manifest:** the source tree contains no Render/Vercel/Netlify/Docker-style deployment descriptor in the scanned root names; verify deployment settings in the hosting provider separately.

## H. Tests executed, results, skipped tests and blockers

### Checks completed during this audit
- Read the recursive Git tree and counted tracked files and directories.
- Read current repository metadata and branch list.
- Read central React Router definitions and central Express route registrations.
- Read targeted auth/OTP, upload, Flatmates, partner-access, dashboard-preference, LocationIQ, rate-limit and app-download source.
- Read package scripts, main README, security audit document and two workflow definitions.
- Queried recent GitHub Actions runs.

### CI results observed from GitHub
- [Server Notification Checks — main](https://github.com/ggnhome629-git/ggnHome/actions/runs/38232930855): **success** on commit `137208246d9ac3aeae6a5193f9b14f9e9a488d7a`.
- [GgnHome-Partner build — main](https://github.com/ggnhome629-git/ggnHome/actions/runs/38232930835): **success** on the same main commit.
- [Client UI Build — feat/admin-production-controls](https://github.com/ggnhome629-git/ggnHome/actions/runs/38232734798): **success** on a pull-request branch commit, not a main push.
- These are historical workflow results, not proof that all current production flows pass.

### Not run / blocked
- `npm test`, `npm run test:api`, `npm run test:e2e`, `npm run test:security`, `npm audit`, local build and syntax tests: **not run** because the repository was accessed through GitHub source tools, not a local checkout with dependencies.
- The current tracked tree did not contain `server/jest.config.js`, `server/scripts/security-check.js`, or a `playwright.config.js/ts` file under those exact names, despite root package scripts referencing those paths. Verify the scripts before attempting those commands.
- No live production HTTP request was completed through the connected GitHub-only fetch capability. Deployment commit remains unknown.
- No real database query, OTP SMS/email, password-reset, payment, scraper, push notification, upload-provider outage, APK install, or role-boundary runtime test was executed.
- No screenshot/browser audit on desktop/tablet/mobile; no axe/Lighthouse or keyboard pass.
- No production/customer data or destructive operation used.
- The root-level client test `client/src/App.test.js` is a CRA boilerplate expectation and renders `App` without the Router/Auth/Theme wrappers from `client/src/index.js`. This is a clear test-quality concern, but its actual failure was not asserted without execution.

## I. Prioritized remediation plan

### Immediate — Critical/High
1. **Remove public LocationIQ secret response** (GH-001); rotate the key and review provider usage.
2. **Force active/approved filter for public Flatmates search** (GH-002); never trust a public query parameter to disable privacy state.
3. **Stop owner contact disclosure from Flatmates detail lookup** (GH-003); enforce published state and contact-consent policy, and serialize safe fields only.
4. **Run the full authenticated/anonymous API authorization matrix** against a non-production environment before release, especially all admin/agent/partner writes and every Flatmates status transition.

### Next — Medium
5. Align Flatmates route registration and feature-toggle behavior (GH-004); make the product state unambiguous (live vs dormant).
6. Make media upload failures explicit and recoverable (GH-005); verify temp-file cleanup.
7. Fix view-counter abuse and the analytics-schema mismatch (GH-006).
8. Resolve Flatmates approval route ownership and authorization (GH-007).
9. Trace and ensure durable follow-up for Flatmates enquiries (GH-008).
10. Enforce agent/user JWT separation and explicit agent role/audience claims (GH-014).
11. Reduce privileged token exposure from localStorage and review token lifetime/revocation (GH-012).
12. Trigger client build validation on main pushes (GH-015).
13. Replace stale/missing tests and script paths with actual API/controller/E2E/security tests; test every command in clean CI (GH-016).
14. Finish the end-to-end PartnerHub allowlist/OTP/property/lead/enquiry/profile/session-expiry path, including wrong-role and suspended-agent negative tests.
15. Verify the legacy Agent login UI either uses the intended supported flow or is marked/redirected as retired (GH-013).

### Then — Low and quality improvements
16. Refresh `SECURITY_AUDIT.md` so findings it labels OPEN are rechecked against current main and false positives are explicitly marked fixed only after tests.
17. Fix README stack/start/test/API descriptions to match the actual Create React App, server scripts and route layout.
18. Complete per-page visual/accessibility checks at 360 px mobile, tablet, desktop and keyboard-only use; catalogue real color/icon/spacing/hover/focus/loading/error inconsistencies from rendered evidence.
19. Expand the route inventory to every nested router and add tests that assert each UI route is registered and each API caller’s expected response matches the controller.
20. Validate deployment branch/commit using the hosting provider and the backend health handler’s commit field before declaring a particular GitHub branch production.

## Audit completion statement

**This report does not claim that the entire repository was fully tested or that every page/API/flow has been exhaustively reviewed.** The initial repository-wide inventory was completed for the current `main` tree (620 files), and targeted source tracing was completed for the highest-risk areas documented above. A literal file-by-file UI/API call-site audit, full expanded inventory of mounted subrouters, responsive visual review and runtime role/flow testing remain outstanding. The findings above are limited to issues supported by the inspected current source or explicitly labelled as risks requiring verification.

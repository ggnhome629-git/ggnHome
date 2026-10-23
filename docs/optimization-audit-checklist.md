# ggnHome Optimization & Verification Checklist

Audit owner: ChatGPT-assisted repository review  
Scope: current `main` application; compare with backup branch `v3` after each accepted change.  
Status convention: **PASS** only after a check is actually run and its evidence recorded; **FAIL** for a reproduced defect; **BLOCKED** when required access/data/environment is missing; **NOT RUN** otherwise.

> This is an execution checklist, not a claim that every page has already passed. Build, automated tests, browser/device testing, production monitoring, and authenticated workflows require their respective environments.

## 0. Baseline and change safety
- [ ] Capture current commit, branch state, dependency lockfiles, scripts, and available CI workflows.
- [ ] Establish clean install and reproducible client/server build.
- [ ] Run existing unit, API, E2E, security, and load-test scripts; record actual results.
- [ ] Confirm environment variables/secrets are not exposed in client bundles, logs, or committed files.
- [ ] Ensure each change is minimal, reviewable, and has regression coverage where practical.
- [ ] Verify `main` and `v3` point to the intended commit after accepted changes.

## 1. Page and route coverage
For each route below, verify direct URL load, refresh/deep-link behavior, expected auth/role gate, loading/empty/error states, responsive layout, console/network errors, keyboard access, and core task completion.

### Public and customer pages
- [ ] `/` Dashboard / home
- [ ] `/login`
- [ ] `/apps`, `/doc`, `/about`
- [ ] `/Rentaldetails/:id`, `/Saledetails/:id`
- [ ] `/property-visit/:id`
- [ ] `/search`, `/search/:query`
- [ ] `/userpreferenceform`
- [ ] `/app/for-you`, `/app/settings`, `/app/notifications`
- [ ] `/support`, `/chatbot`, `/seeAllproperties`, `/savedproperties`
- [ ] `/price-predictor`, `/analytics`, `/investrealestate`
- [ ] `/property-analytics/:id`, `/enquiry-page/:id`
- [ ] `/servicesCreate`, `/services`, `/property/:id/virtual-tour`
- [ ] Responsive customer property-detail view and mobile/desktop assistant routes
- [ ] Disabled/legacy routes redirect safely and consistently

### Partner portal
- [ ] `/partner/login`, `/partner/register`
- [ ] `/partner/dashboard`, `/partner/properties`, `/partner/properties/add`
- [ ] `/partner/properties/sale/:id`, `/partner/properties/rental/:id`
- [ ] `/partner/leads`, `/partner/enquiries`, `/partner/profile`
- [ ] Verify protected-route behavior, session expiry, and shell navigation

### Admin and operations
- [ ] `/admin/login`, `/admin/ping`, `/admin/sms-console`, `/sms-service/app/manage`
- [ ] `/admin/Landingpage`, `/admin/Dashboard`, `/admin/UserManagement`
- [ ] `/admin/enquiries`, `/admin/ai-leads`, `/admin/service-catalog`, `/admin/callback`
- [ ] `/admin/rewardsproperties`, `/admin/propertymanager`, `/admin/add-property`
- [ ] `/admin/services`, `/admin/usagetrack`, `/admin/usagetrack2`
- [ ] `/admin/settings`, `/admin/feature-toggles`, `/admin/app-downloads`
- [ ] `/admin/rewards`, `/admin/payments`, `/admin/userpreferenceformresponses`
- [ ] `/admin/agentsmanagement`, `/admin/promos`, `/admin/agent-registration`, `/admin/partner-access`
- [ ] Verify every admin route is role-gated; test unauthorized and expired sessions
- [ ] Verify SMS OTP toggle, send/verify behavior, console visibility, and failure states

## 2. Core feature and data-flow checks
- [ ] Search filters, sorting, pagination/infinite load, query persistence, and no-results state
- [ ] Property detail data, gallery/media, price, contact/enquiry, visit booking, and invalid IDs
- [ ] Listing create/edit/delete, validation, image upload, ownership, and server-side authorization
- [ ] Saved properties/preferences, alerts/notifications, and account state persistence
- [ ] Partner leads/enquiries/profile and data isolation between partners
- [ ] Admin CRUD, analytics, feature flags, cache purge, SMS console, and audit trail
- [ ] AI/price prediction/virtual tour: enabled and disabled flags, unavailable provider, timeouts, fallback
- [ ] API requests: duplicate calls, cancellation on route change, retries, rate limits, stale data, and errors
- [ ] Confirm user-facing success messages correspond to successful server responses

## 3. Performance and low-resource devices
- [ ] Production bundle/chunk report; identify oversized initial JS/CSS and duplicate dependencies
- [ ] Lazy-load non-critical routes, maps, charts, AI, and below-the-fold modules
- [ ] Images: responsive sizes, modern formats where supported, lazy loading, dimensions/aspect ratio
- [ ] Lists: pagination/virtualization where large; avoid unnecessary rerenders and expensive effects
- [ ] API/data: deduplicate requests, use safe cache policy, avoid blocking UI and unbounded payloads
- [ ] Motion: honor reduced-motion; reduce animation/hover work on touch and low-power devices
- [ ] Mobile layout at 320px, 360px, 390px, tablet, desktop; no horizontal overflow except intentional tables
- [ ] Check Chrome Android low-memory/CPU throttling and Safari/iOS where available
- [ ] Measure Core Web Vitals: LCP target <= 2.5s, INP <= 200ms, CLS <= 0.1 (targets, not assumed results)
- [ ] Verify offline/poor-network handling, loading skeletons, timeouts, and retry controls

## 4. Accessibility, compatibility, and security
- [ ] Keyboard-only navigation, visible focus, labels, semantic headings, dialog focus, and screen-reader names
- [ ] Contrast, text zoom, reduced motion, touch target size, and form error announcements
- [ ] Browser support from declared Browserslist: Chrome, Firefox, Safari; test Edge and mobile browsers
- [ ] Auth/session/token handling, CSRF/CORS, rate limits, input validation, and authorization boundaries
- [ ] XSS-safe rendering, upload validation, secrets, dependency vulnerabilities, and security script
- [ ] Check production logs for sensitive data and unhandled errors

## 5. Release verification
- [ ] All automated checks pass (or exceptions are documented with rationale)
- [ ] Smoke test key public, partner, and admin journeys in production/staging
- [ ] Confirm deployment commit, health endpoint, cache invalidation, and rollback/backup readiness
- [ ] Record known issues, measured before/after performance, and checks blocked by access

## Audit log
| Date | Commit | Check | Result | Evidence / notes |
|---|---|---|---|---|
| 2026-10-23 | Initial review | package scripts and route declarations inspected | PARTIAL | Scripts and route map identified; execution/device verification still pending. |

# Security Audit

Findings from a review of the Express/MongoDB server (`server/`, ~13.5k lines,
57 files) and the React client (`client/src`).

**This document is deliberately sanitized.** It records where each issue lives
and how to fix it. It does not contain exploit payloads or reproduction steps,
because this repository is public and several findings are unpatched. Treat the
CRITICAL items as live risk until the "Fixed" column says otherwise.

| Status | Meaning |
| --- | --- |
| OPEN | Not yet fixed |
| FIXED | Patched, verified |

---

## Severity summary

| ID | Severity | Area | Issue | Status |
| --- | --- | --- | --- | --- |
| C-1 | Critical | Backend | Unauthenticated password set → account takeover | OPEN |
| C-2 | Critical | Backend | Upload filename not sanitized → arbitrary file write | OPEN |
| H-1 | High | Backend | Admin property creation reachable without auth | OPEN |
| H-2 | High | Backend | No rate limiting anywhere | OPEN |
| H-3 | High | Backend | Admin sign-in code never expires, unlimited attempts | OPEN |
| H-4 | High | Backend | Third-party API key returned to anonymous callers | OPEN |
| H-5 | High | Backend | Agent password reset gated on low-entropy values | OPEN |
| H-6 | High | Backend | Query operators injectable from request bodies | OPEN |
| H-7 | High | Frontend | Session tokens stored in `localStorage` | OPEN |
| M-1 | Medium | Backend | Admin usage endpoints unauthenticated | OPEN |
| M-2 | Medium | Backend | Two admin routes missing role check | OPEN |
| M-3 | Medium | Backend | Agent tokens fall back to the user JWT secret | OPEN |
| M-4 | Medium | Backend | No security headers | OPEN |
| M-5 | Medium | Backend | Agent cookies lose `Secure` outside production | OPEN |
| M-6 | Medium | Backend | Uploads have no size limit or type filter | OPEN |
| M-7 | Frontend | Frontend | Admin screens render without a route guard | OPEN |
| M-8 | Medium | Both | Known-vulnerable dependencies | OPEN |
| L-1 | Low | Backend | `checkMobile` throws on unknown numbers | OPEN |
| L-2 | Low | Backend | Auth errors distinguish valid from invalid identifiers | OPEN |

---

## CRITICAL

### C-1 — Unauthenticated password set leads to account takeover

- **Where:** `server/controllers/login.controller.js:197` (`setPassword`),
  routed at `server/Route/route.js:115`
- **Related:** `server/models/user.model.js:23` (`passwordSet` default),
  `server/controllers/login.controller.js:47` (user creation in `requestOtp`)

The endpoint has no authentication middleware. Its only safeguard is a check
that the account does not already have `passwordSet === true`. Because
`passwordSet` defaults to `false` and the OTP sign-in path creates accounts
without ever setting a password, effectively every ordinary user account sits
in the unprotected state. An attacker who knows or guesses a mobile number can
establish a password on that account and then authenticate through
`/login/password`. The legitimate owner receives no notification and their OTP
sign-in continues to work, so the compromise is silent.

**Fix:** require server-side proof that the caller controls the number — a
freshly verified OTP, or an authenticated session — before any password is
written. Do not treat the absence of a password as authorization. Consider
moving password creation behind `verifyToken` entirely, and notify the account
owner by email whenever a password is set or changed.

### C-2 — Upload filename is not sanitized, allowing writes outside the upload directory

- **Where:** `server/middleware/multer.js:9`

The `filename` callback interpolates `file.originalname` straight into the
stored name, and multer joins that to the destination directory. Directory
traversal sequences in the client-supplied name therefore resolve outside the
intended folder. Depending on the privileges of the Node process, this permits
overwriting files that lead to code execution. The exposure is worse because
one upload route is reachable without authentication (see H-1).

**Fix:** never build a path from client input. Generate the stored filename
server-side (for example a UUID) and carry the original name only as metadata.
If the extension must be preserved, derive it from an allowlist rather than
from the supplied string. Run the process as a non-root user.

---

## HIGH

### H-1 — Admin property creation is reachable without authentication

- **Where:** `server/Route/route.js:201` (`POST /api/admin/addrentproperties`)
- **Controller:** `server/controllers/admin.controller.js:1546`
  (`createRentalPropertyAdmin`)

The route uses `verifyTokenOptional`, which calls `next()` when no token is
present (`server/middleware/auth.js:50`), and the controller performs no
identity or role check of its own. Anonymous callers can create listings that
enter the catalogue as admin-created inventory, and can reach the file-upload
path described in C-2.

**Fix:** replace `verifyTokenOptional` with `verifyToken` plus the
`checkAdminEmail` guard.

### H-2 — No rate limiting on any endpoint

- **Where:** `server/index.js:20` (middleware stack)

No rate-limiting middleware is installed. Sign-in verification
(`server/controllers/login.controller.js:318`) compares the submitted code with
no attempt counter, and `requestOtp` reuses an existing unexpired code rather
than issuing a new one, so a single value stays valid for the full window. The
combination makes the numeric sign-in code guessable by repetition. The same
absence exposes every other endpoint to scraping and resource abuse.

**Fix:** add `express-rate-limit` globally, with a much stricter per-identifier
limit on `/login/*`, `/auth/*` and `/api/agent/*`. Add a per-account attempt
counter that invalidates the code after a small number of failures, and issue a
new code on each request.

### H-3 — Administrator sign-in code never expires and has no attempt limit

- **Where:** `server/controllers/login.controller.js:275-283`

The administrator branch of the verification handler deliberately skips the
expiry comparison and checks a stored, predefined value. Because that value is
never rotated, it behaves as a permanent static credential rather than a
one-time code. With no rate limiting (H-2) it can be attacked by repetition.

**Fix:** treat administrator codes exactly like user codes — generated per
request, short expiry, attempt-limited. Better, move administrators to a real
second factor (TOTP or WebAuthn).

### H-4 — Third-party API key disclosed to anonymous callers

- **Where:** `server/controllers/mapintegration.js:9` (`getLocationIQApiKey`),
  routed at `server/Route/route.js:287`

The handler reads a geocoding provider key from the environment and returns it
in the response body. The route carries no middleware, so the key is available
to anyone who requests it and can be used against the owner's paid quota.

**Fix:** never ship provider keys to clients. Proxy the third-party call
through the server so the key stays server-side, and rotate the currently
exposed key — assume it is already compromised.

### H-5 — Agent password reset gated only on low-entropy values

- **Where:** `server/controllers/agentLogin.controller.js:1324`
  (`resetAgentPassword`), routed at `server/Route/route.js:373`

The reset path is unauthenticated and succeeds on a match of an agent
identifier plus a date of birth. A date of birth has a small search space and
is frequently known or discoverable, so it is not a suitable authentication
factor. Distinct failure responses also reveal which identifiers are valid.

**Fix:** require a one-time code delivered to the agent's registered email or
phone before a reset is permitted. Return an identical response whether or not
the identifier exists.

### H-6 — Query operators injectable from request bodies

- **Where:** `server/controllers/login.controller.js:29, 140, 213, 265, 384`;
  `server/controllers/agentLogin.controller.js:825`;
  `server/controllers/userpreferencesform.controller.js:80`

Database lookups are constructed directly from request-body fields. The JSON
body parser accepts nested objects and no sanitizer is installed, so a caller
can supply a query operator where a scalar is expected and influence which
document is selected. Combined with C-1 this widens the blast radius.

**Fix:** install `express-mongo-sanitize`, and validate request bodies with a
schema validator (`zod`, `joi`) that coerces these fields to strings before any
query is built.

---

## MEDIUM

### M-1 — Admin usage endpoints have no authentication

- **Where:** `server/Route/route.js:173-177`

Five telemetry routes (`/api/admin/cloudinary/usage`, `/brevo/usage`,
`/mongo/usage`, `/gnews/usage`, `/locationiq/usage`) are registered with no
middleware. They disclose account and quota information
(`server/controllers/admin.Accountsusage.js:151`), and two of them make live
outbound calls with server-side keys, so anonymous traffic consumes paid quota.

**Fix:** add `verifyToken, checkAdminEmail` to all five.

### M-2 — Two admin routes verify a session but not the admin role

- **Where:** `server/Route/route.js:192` (`/api/admin/addsaleproperties`) and
  `server/Route/route.js:216` (`/api/admin/preferences/:prefId/assign`)

Both use `verifyToken` without `checkAdminEmail`, and neither controller
re-checks the role internally. Any signed-in user can therefore perform these
administrative actions.

Note for contrast: `updatePropertyAdmin`
(`server/controllers/admin.controller.js:1267`) and `deletePropertyAdmin`
(`:1386`) *do* assert `req.user.role === 'admin'` in their bodies, so they are
not affected despite also lacking the middleware.

**Fix:** add `checkAdminEmail` to both routes, and as defence in depth assert
the role inside every admin controller.

### M-3 — Agent tokens fall back to the user JWT secret

- **Where:** `server/middleware/auth.js:72-75`, `120-123`, `185-188`

The secret is resolved as
`ACCESS_TOKEN_AGENT_SECRET || ACCESS_TOKEN_SECRET || JWT_SECRET`. When the
agent-specific variable is unset, agent and user tokens are signed and verified
with the same key. `verifyAgentToken` then accepts `decoded.agentId ||
decoded.id` without asserting a role claim, so the two token types are no
longer cryptographically distinct.

**Fix:** require a dedicated agent secret and fail closed at boot if it is
missing. Assert an explicit `role` claim inside the token before granting agent
access.

### M-4 — No security headers

- **Where:** `server/index.js:11-36`

The stack registers only JSON parsing, cookie parsing and CORS. Responses ship
without HSTS, `X-Content-Type-Options`, frame protection or a CSP.

**Fix:** `app.use(helmet())`, with HSTS enabled and a CSP scoped to the app's
real asset origins.

### M-5 — Agent cookies lose the `Secure` flag outside production

- **Where:** `server/controllers/agentLogin.controller.js:22-31` (`cookieForEnv`)

Cookie options fall back to `secure: false, sameSite: 'Lax'` whenever
`NODE_ENV` is not exactly `production`, or whenever the `Host` header looks
local. If the deployment omits `NODE_ENV`, agent session cookies travel over
plaintext. The host component is attacker-influenced, which also forces the
insecure branch.

**Fix:** default to secure cookies and require an explicit opt-out for local
development. Do not derive cookie security from a request header.

### M-6 — Uploads have no size limit or type filter

- **Where:** `server/middleware/multer.js:13`

`multer({ storage })` sets neither `limits` nor `fileFilter`, so upload routes
accept unbounded data of any type. Reachable anonymously through H-1, this
allows filling the disk and taking the service down.

**Fix:** set `limits.fileSize` and `limits.files`, and add a `fileFilter`
allowlisting the image and document types the product actually needs. Validate
the real content type, not just the declared one.

### M-7 — Admin screens render without a route guard

- **Where:** `client/src/App.js:183, 192, 193, 194, 197`

Five admin routes (`/admin/Landingpage`, `/admin/usagetrack`,
`/admin/usagetrack2`, `/admin/rewards`, `/admin/agent-registration`) are
registered without the `AdminProtectedRoute` wrapper used by their siblings.
Paired with M-1, the usage dashboards populate with real data for an anonymous
visitor.

**Fix:** wrap all five. Note that `AdminProtectedRoute`
(`client/src/screens/Admin Page/AdminProtectedRoutes.jsx`) is a navigation
convenience only — it hides UI, it does not protect data. Server-side
authorization remains the real control.

### M-8 — Known-vulnerable dependencies

- `server/`: 15 advisories (12 high, 3 moderate), including prototype
  pollution and ReDoS in a spreadsheet parser with no fix available.
- `client/`: 62 advisories (2 critical, 33 high, 15 moderate, 12 low).

**Fix:** run `npm audit` in both packages. Apply non-breaking upgrades first,
then schedule the breaking ones. Replace the unmaintained spreadsheet parser.

---

## LOW

### L-1 — `checkMobile` throws for unknown numbers

- **Where:** `server/controllers/login.controller.js:384-390`

`user` is declared with `const` and reassigned when no record is found, raising
a `TypeError` and returning a 500 for every unseen number. Had the assignment
succeeded it would have persisted an account with no email address, which the
sign-in path then rejects — permanently locking that number out of OTP access.
Currently unreachable because the password flow is disabled on the client
behind `PASSWORD_LOGIN_ENABLED`, but it will surface the moment that is
enabled.

**Fix:** declare with `let`, and do not create an account as a side effect of a
lookup.

### L-2 — Authentication errors distinguish valid from invalid identifiers

- **Where:** `server/controllers/agentLogin.controller.js:1340-1360`;
  `server/controllers/login.controller.js:140-151`

Separate messages for "not found" and "wrong credential" let an attacker
enumerate which identifiers exist before attempting anything else.

**Fix:** return a single generic failure message and a uniform status code for
all authentication failures.

---

## Frontend

### H-7 — Session tokens stored in `localStorage`

- **Where:** `client/src/screens/Login Page/login.jsx:214, 344`;
  `client/src/screens/Agent Page/Login Page/AgentLogin.jsx:536, 625`

Access tokens are written to `localStorage`, which any script on the origin can
read. The server already issues the same session as an `httpOnly` cookie, so
the browser-readable copy adds exposure without adding capability: a single XSS
anywhere on the site yields a durable, exfiltratable session token.

**Fix:** rely on the `httpOnly` cookie the server already sets and stop
persisting tokens in `localStorage`. If a bearer token is genuinely needed for
cross-origin calls, keep it in memory only.

### Notes that are not findings

- No hardcoded secrets were found in the client source.
- `REACT_APP_*` values are compiled into the published bundle and are public by
  design. Only non-secret endpoint URLs are currently passed this way, which is
  correct — no key must ever be added to that set (see H-4).
- The single `innerHTML` assignment
  (`client/src/screens/Flatmates page/flatmatesearchpropertymodal.jsx:1026`)
  writes a static stylesheet with no interpolated user input.
- No `eval`, `new Function` or shell execution anywhere in the server.
- No `.env` file is tracked in git; `.gitignore` covers both packages.
- Sign-in codes are never echoed in API responses, and no debug authentication
  bypass was found.

---

## Suggested order of work

1. **C-1** and **C-2** — both are remotely exploitable against production today.
2. **H-1** — removes the unauthenticated route into the upload path.
3. **H-4** — rotate the exposed key; assume it is already compromised.
4. **H-2** — rate limiting; this alone blunts H-3, H-5 and credential guessing.
5. **H-3**, **H-5**, **H-6** — remaining authentication weaknesses.
6. **M-1**, **M-2**, **M-7** — close the authorization gaps.
7. **M-3** through **M-6**, **M-8**, **L-1**, **L-2** — hardening.

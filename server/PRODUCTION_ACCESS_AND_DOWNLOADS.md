# Partner access, dashboard tools and direct APK delivery

## Partner access is admin-managed

- Use **Admin → Register Partner** to add a 10-digit Indian mobile number.
- The API creates an active Partner access record in the Agent collection. It does not issue a session or bypass OTP.
- Partner Portal sign-in calls the existing /login/request-otp and /login/verify-otp endpoints. A Partner session is issued only when the verified mobile number matches an active roleType: Partner record.
- Public /api/partner/register is retired with HTTP 410. The traditional /api/agent/register route now requires an authenticated admin.
- Admin APIs: GET /api/admin/partners/access and POST /api/admin/partners/access, both protected by verifyToken and checkAdminEmail.

## Dashboard tool locks

- AdminDashboardPreferences stores hidden dashboard route shortcuts per admin user.
- Admin UI reads/writes preferences using GET and PUT /api/admin/dashboard-tools.
- Locking a shortcut removes it from the main landing-page cards and moves it to **Hidden tools**. Unlocking restores it to its original card.
- This is a dashboard shortcut preference, not an authorization mechanism. Actual pages and APIs remain protected by their normal auth middleware.

## Partner APK delivery

- Partners use the first-party endpoint /api/app-downloads/partner.apk; it streams the APK with attachment headers instead of sending the user to a GitHub webpage.
- Default source: https://github.com/ggnhome629-git/ggnHome/releases/download/latest-apks/GgnHome-Partner.apk.
- Optional API-host setting: PARTNER_APK_SOURCE_URL. The URL must be a direct GgnHome Release asset URL ending in GgnHome-Partner.apk; otherwise the safe default is used.
- Optional PUBLIC_API_BASE_URL sets the externally reachable API origin used when publishing the direct download URL. Include the API origin only, with no trailing slash.
- The API host must be able to reach GitHub Releases. Verify the response downloads a non-empty APK before promoting a release.

## Production verification checklist

1. Deploy the API and client together after CI succeeds.
2. In Admin → Register Partner, register a test number; confirm a corresponding roleType: Partner record exists in MongoDB.
3. Confirm that an unregistered number cannot enter PartnerHub even if its OTP is correct.
4. Confirm a registered number needs a valid OTP and a suspended account is denied.
5. Lock and unlock a few dashboard shortcuts; refresh and sign in again as the same admin to verify preferences persist.
6. Open /api/app-downloads/partner.apk in a browser and verify the browser downloads GgnHome-Partner.apk with the expected package size.
7. Test the partner portal on narrow mobile and desktop widths, including OTP errors, long loading states, no data, and download behavior.

## Remaining production work

This change hardens onboarding and admin tool organization. A complete production launch still needs a broader route-by-route responsive/accessibility review, real Android download/install tests, API monitoring, and event-driven property/price-change notification tests in the deployed environment.

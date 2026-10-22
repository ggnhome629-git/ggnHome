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

## APK delivery (four apps)

- Every app downloads through one first-party link on the API, which streams the APK from the GitHub release `latest-apks` instead of sending the user to a GitHub page:
  - `/api/app-downloads/GgnHome.apk` (GgnHome)
  - `/api/app-downloads/GgnHome-Partner.apk` (Partner portal)
  - `/api/app-downloads/GgnHome-Admin.apk` (Admin portal)
  - `/api/app-downloads/sms-service.apk` (SMS Service)
- `GET /api/app-downloads` lists the four apps with their version (default 1.0.0). The public page is `/apps`.
- Optional per app: Admin → App Downloads can set a version label, or another HTTPS file. A GitHub release asset with the same file name is streamed; any other HTTPS link is redirected to.
- Optional env: `PARTNER_APK_SOURCE_URL` (kept for older deployments) and `PUBLIC_API_BASE_URL` (the API origin used in the links; no trailing slash).
- The API host must be able to reach GitHub Releases. Verify each download is a non-empty APK before promoting a release. See `ANDROID_APPS.md` for how the APKs are built and signed.

## Production verification checklist

1. Deploy the API and client together after CI succeeds.
2. In Admin → Register Partner, register a test number; confirm a corresponding roleType: Partner record exists in MongoDB.
3. Confirm that an unregistered number cannot enter PartnerHub even if its OTP is correct.
4. Confirm a registered number needs a valid OTP and a suspended account is denied.
5. Lock and unlock a few dashboard shortcuts; refresh and sign in again as the same admin to verify preferences persist.
6. Open each of the four /api/app-downloads/<file> links in a browser and verify it downloads the APK with the expected size.
7. Test the partner portal on narrow mobile and desktop widths, including OTP errors, long loading states, no data, and download behavior.

## Remaining production work

This change hardens onboarding and admin tool organization. A complete production launch still needs a broader route-by-route responsive/accessibility review, real Android download/install tests, API monitoring, and event-driven property/price-change notification tests in the deployed environment.

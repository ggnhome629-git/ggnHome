# GgnHome smart push notifications

## What the campaign does

- Uses the existing GgnHome recommendation engine, which reads active sale/rental listings from MongoDB, to find a relevant property for a signed-in user.
- Sends a property-specific push with a deep link when a suitable recommendation exists.
- Sends a non-property general update when no suitable property match exists.
- Writes successfully delivered notifications to the user's existing in-app inbox.
- Respects independent `personalPushes` and `generalPushes` device preferences and limits a device to one smart-campaign message per seven days.
- Removes invalid FCM tokens using the existing push sender.

The template library lives in `server/data/notification-templates.json` and currently contains 220 templates across 11 categories. Run `node server/scripts/validate-notification-templates.js` to validate it.

## Required production configuration

1. Configure Firebase Cloud Messaging for the Android app using the Firebase project associated with the app's `google-services.json`.
2. In the API host's environment (for example Render), set `FIREBASE_SERVICE_ACCOUNT` to the Firebase Admin service-account JSON, either as raw JSON or base64. Alternatively set `GOOGLE_APPLICATION_CREDENTIALS` to a service-account file path that exists on the host.
3. Set a strong `CRON_SECRET` in the same host environment. Never commit service-account credentials or the cron secret to Git.
4. Redeploy the API after setting environment variables.

Without Firebase Admin credentials, the API deliberately reports that push is not configured and does not claim delivery succeeded.

## Triggering and testing

- The in-process scheduler runs daily at 18:45 Asia/Kolkata and selects devices eligible for a weekly message.
- To support hosts that sleep when idle, configure an external scheduler (for example, cron-job.org) to call this endpoint daily:
  `GET https://<your-api-host>/api/cron/smart-push`
  Send `x-cron-secret: <CRON_SECRET>` as a request header. Prefer a header over a query parameter so the secret is less likely to appear in request logs.
- Admins can preview the campaign from the app-only admin endpoint `POST /api/app/push/smart` with `{"dryRun":true}`. The endpoint requires a signed-in admin and an Android app user-agent.
- Use the app's Settings screen to independently enable or disable Popular homes, Picked for you, and General updates.
- Check API logs for `[smart-push]` and confirm a test device has notification permission enabled.

## Operational notes

- Delivery requires network access and a valid, registered FCM token; Android notification permission must be granted.
- The job is capped at 300 devices per run by default to avoid long server requests. Remaining eligible devices are picked up by subsequent daily runs.
- Notifications are marketing/product updates, not a guarantee that a listing is available. Users should confirm details directly with the listing advertiser.
- Before scaling up, monitor FCM failure rates, token churn, click-throughs, opt-outs, and campaign performance. Consider a durable queue and delivery receipts if volume grows materially.

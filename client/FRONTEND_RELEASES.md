# Frontend release and cache-version checklist

GgnHome shows a persistent **V2 / LIVE** marker on public pages. The marker compares the JavaScript bundle version with the live \`/version.json\` manifest; a mismatch is a clue that the current tab may be running stale code or the deployment is between releases.

For every frontend release, update all three version references in the same release:

1. \`client/src/components/app/AppVersionBadge.jsx\` — update \`APP_VERSION\`.
2. \`client/public/index.html\` — update the \`ggnhome-frontend-version\` meta value. This allows the static HTML fallback to detect an older cached bundle before React starts.
3. \`client/public/version.json\` — update \`version\`, \`releaseName\`, \`releasedAt\`, and add a new entry at the beginning of \`releases\` with a version, date, title, and user-visible highlights. Keep a few previous release entries so visitors can see recent changes.

Add the artwork/UI to the same deployment. After the site deploys, open the badge and confirm that **Browser bundle** and **Live manifest** versions match. To test stale-build handling, temporarily compare a local bundle version against a different manifest version in a non-production environment; do not leave the mismatch in a live release.

The badge checks on first load, when the tab becomes active, and every five minutes while visible. A mismatch can be refreshed from the panel, which clears Cache Storage and unregisters service workers before reloading. It does not delete login tokens or cookies.

A version match proves that the visible bundle and published manifest agree; it does not, by itself, prove the hosting platform finished deploying every asset or that all APIs are healthy.
# Frontend release and cache-version checklist

GgnHome displays a persistent V2 marker on public pages. It compares the JavaScript bundle version with the live \`/version.json\` manifest so visitors can spot stale tabs or a deployment that is still catching up.

For every frontend release, update all three version references in the same release:
1. \`client/src/components/app/AppVersionBadge.jsx\` — bump \`APP_VERSION\`.
2. \`client/public/index.html\` — bump the \`ggnhome-frontend-version\` meta value. This lets the static HTML fallback detect a stale bundle before React starts.
3. \`client/public/version.json\` — bump \`version\`, update release metadata, and add a new entry at the start of \`releases\` with version, date, title, and user-visible highlights. Keep a few previous releases in the list.

Bundle and manifest match = LIVE. A newer server version = UPDATE. A newer bundle than manifest = MISMATCH (release metadata may be lagging). An unavailable endpoint = VERIFY, not proof that the latest deployment is live.

The badge checks on first load, when the tab becomes active, and every five minutes while visible. UPDATE can clear Cache Storage and unregister service workers before reloading. This does not delete login tokens or cookies.

A matching version proves that the bundle and published manifest agree; it does not independently prove every static asset or API is healthy.
import React, { useEffect, useState } from "react";
import { Alert, Button, Snackbar } from "@mui/material";
import { checkCacheVersion } from "../../utils/cacheVersion";

const RECHECK_MS = 10 * 60 * 1000; // background re-check
const MIN_GAP_MS = 60 * 1000; // never ask the server more than once a minute

/**
 * Keeps every visitor on the latest version after an admin cache clear.
 *  - On first load: if the version changed, caches are wiped and the page reloads at once.
 *  - Later (tab refocus or timer): caches are wiped quietly and a small banner offers a
 *    refresh, so nobody loses a half-filled form to a surprise reload.
 */
export default function CacheRefreshWatcher() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let lastRun = 0;

    const run = async (initial) => {
      const now = Date.now();
      if (!initial && now - lastRun < MIN_GAP_MS) return;
      lastRun = now;
      const result = await checkCacheVersion();
      if (cancelled || result !== "changed") return;
      if (initial) window.location.reload();
      else setUpdateReady(true);
    };

    run(true);
    const onVisible = () => {
      if (document.visibilityState === "visible") run(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => run(false), RECHECK_MS);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  return (
    <Snackbar open={updateReady} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
      <Alert
        severity="info"
        variant="filled"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()} sx={{ fontWeight: 800 }}>
            Refresh
          </Button>
        }
      >
        GgnHome was updated. Refresh to see the latest version.
      </Alert>
    </Snackbar>
  );
}

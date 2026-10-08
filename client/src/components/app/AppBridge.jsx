import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Snackbar, Typography } from "@mui/material";
import { Fingerprint, RefreshCw, WifiOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { appVersion, isNativeApp, nativePlugin, snapshot } from "../../utils/nativeApp";
import { appFetch, versionLt } from "../../utils/appApi";

const BIOMETRIC_KEY = "ggn:biometric";

const TOKEN_KEY = "ggn:fcm";
const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/**
 * Glue between the web app and the Android shell. Renders nothing on the
 * website. In the app it: registers for push notifications and opens the
 * property a notification points at, handles the hardware back button, hides
 * the splash screen, themes the status bar and shows an offline banner.
 */
export default function AppBridge() {
  const inApp = isNativeApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
  const [toast, setToast] = useState(null);
  const [pull, setPull] = useState(0);
  const [locked, setLocked] = useState(() => isNativeApp() && localStorage.getItem(BIOMETRIC_KEY) === "1");
  const [update, setUpdate] = useState(null);
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const navRef = useRef(navigate);
  navRef.current = navigate;

  // ---- connectivity ----
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ---- shell chrome: splash, status bar, back button ----
  useEffect(() => {
    if (!inApp) return undefined;
    document.documentElement.classList.add("is-app");
    nativePlugin("SplashScreen")?.hide?.().catch?.(() => {});
    const bar = nativePlugin("StatusBar");
    bar?.setBackgroundColor?.({ color: "#003366" }).catch?.(() => {});
    bar?.setStyle?.({ style: "DARK" }).catch?.(() => {});

    const App = nativePlugin("App");
    let handle;
    Promise.resolve(
      App?.addListener?.("backButton", () => {
        if (pathRef.current === "/" || window.history.length <= 1) App.exitApp?.();
        else navRef.current(-1);
      })
    ).then((h) => (handle = h));
    return () => handle?.remove?.();
  }, [inApp]);


  // ---- biometric app lock: on launch and whenever the app returns from background ----
  const unlock = async () => {
    const Bio = nativePlugin("BiometricAuth");
    if (!Bio) return setLocked(false);
    try {
      await Bio.authenticate({ reason: "Unlock GgnHome", cancelTitle: "Cancel", allowDeviceCredential: true });
      setLocked(false);
    } catch {
      /* stays locked; the user can tap Unlock again */
    }
  };

  useEffect(() => {
    if (!inApp) return undefined;
    if (locked) unlock();
    const App = nativePlugin("App");
    let handle;
    Promise.resolve(
      App?.addListener?.("appStateChange", ({ isActive }) => {
        if (!isActive && localStorage.getItem(BIOMETRIC_KEY) === "1") setLocked(true);
        if (isActive && localStorage.getItem(BIOMETRIC_KEY) === "1") unlock();
      })
    ).then((h) => (handle = h));
    return () => handle?.remove?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp]);

  // ---- pull down at the top of any page to refresh ----
  useEffect(() => {
    if (!inApp) return undefined;
    let startY = null;
    const THRESHOLD = 90;
    const blocked = (el) => el?.closest?.('[role="dialog"], .MuiDrawer-root, input, textarea, [data-no-pull]');
    const start = (e) => {
      startY = window.scrollY <= 0 && !blocked(e.target) ? e.touches[0].clientY : null;
    };
    const move = (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy, THRESHOLD * 1.4));
      else setPull(0);
    };
    const end = () => {
      setPull((p) => {
        if (p >= THRESHOLD) setTimeout(() => window.location.reload(), 120);
        return p >= THRESHOLD ? THRESHOLD : 0;
      });
      startY = null;
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
    };
  }, [inApp]);

  // ---- "new version available" prompt (once per launch) ----
  useEffect(() => {
    if (!inApp) return;
    appFetch("/version")
      .then((v) => {
        const dismissed = sessionStorage.getItem("ggn:update-dismissed");
        if (versionLt(appVersion(), v.latest) && v.updateUrl && !dismissed) setUpdate({ ...v, force: versionLt(appVersion(), v.minimum) });
      })
      .catch(() => {});
  }, [inApp]);

  // ---- push notifications ----
  const registerToken = async (token) => {
    if (!token) return;
    try {
      await fetch(`${process.env.REACT_APP_BASE_API || process.env.REACT_APP_Base_API}/api/app/devices`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ token, appVersion: appVersion() }),
      });
    } catch {
      /* retried next launch / login */
    }
  };

  useEffect(() => {
    if (!inApp) return undefined;
    const Push = nativePlugin("PushNotifications");
    if (!Push) return undefined;
    const handles = [];
    let cancelled = false;

    (async () => {
      try {
        await Push.createChannel?.({ id: "ggnhome_updates", name: "Property updates", description: "Popular and recommended homes", importance: 4, visibility: 1, lights: true, lightColor: "#00A79D" });
        handles.push(
          await Push.addListener("registration", ({ value }) => {
            snapshot.write(TOKEN_KEY, value);
            registerToken(value);
          }),
          await Push.addListener("registrationError", (e) => console.warn("Push registration error", e)),
          await Push.addListener("pushNotificationReceived", (n) => setToast({ title: n.title, body: n.body, link: n.data?.link })),
          await Push.addListener("pushNotificationActionPerformed", (a) => {
            const link = a.notification?.data?.link;
            if (link && link.startsWith("/")) navRef.current(link);
          })
        );
        // Ask politely a few seconds after launch, not on the very first frame.
        await new Promise((r) => setTimeout(r, 6000));
        if (cancelled) return;
        let perm = await Push.checkPermissions();
        if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await Push.requestPermissions();
        if (perm.receive === "granted") await Push.register();
      } catch (err) {
        console.warn("Push setup failed", err);
      }
    })();

    return () => {
      cancelled = true;
      handles.forEach((h) => h?.remove?.());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp]);

  // Attach the device to the account as soon as someone signs in.
  useEffect(() => {
    if (!inApp || !user) return;
    const token = snapshot.read(TOKEN_KEY, null);
    if (token) registerToken(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inApp, user?._id]);

  return (
    <>
      {pull > 8 && (
        <Box sx={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 2100, display: "flex", justifyContent: "center", pointerEvents: "none", transform: `translateY(${Math.min(pull, 90) - 36}px)`, transition: pull ? "none" : "transform .2s" }}>
          <Box sx={{ width: 36, height: 36, borderRadius: "50%", backgroundColor: "#fff", boxShadow: "0 4px 14px rgba(0,51,102,0.25)", display: "flex", alignItems: "center", justifyContent: "center", color: pull >= 90 ? "#00A79D" : "#9AA7B4" }}>
            <RefreshCw size={18} style={{ transform: `rotate(${pull * 4}deg)` }} />
          </Box>
        </Box>
      )}
      {update && (
        <Box sx={{ position: "fixed", left: 12, right: 12, bottom: "calc(76px + env(safe-area-inset-bottom, 0px))", zIndex: 2050, p: 1.5, borderRadius: "14px", color: "#fff", display: "flex", alignItems: "center", gap: 1.5, backgroundImage: "linear-gradient(120deg,#003366,#0B7A85)", boxShadow: "0 8px 24px rgba(0,51,102,0.35)" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 800, fontSize: "0.88rem" }}>Update available · v{update.latest}</Typography>
            <Typography sx={{ fontSize: "0.72rem", opacity: 0.85 }}>{update.notes || "New features and fixes."}</Typography>
          </Box>
          <Button size="small" href={update.updateUrl} sx={{ color: "#003366", backgroundColor: "#fff", fontWeight: 800, textTransform: "none", "&:hover": { backgroundColor: "#E6FFFB" } }}>Update</Button>
          {!update.force && (
            <Button size="small" onClick={() => { sessionStorage.setItem("ggn:update-dismissed", "1"); setUpdate(null); }} sx={{ color: "#fff", minWidth: 0, textTransform: "none" }}>Later</Button>
          )}
        </Box>
      )}
      {locked && (
        <Box sx={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "#fff", backgroundImage: "linear-gradient(160deg,#002244,#003366 55%,#0B7A85)" }}>
          <Fingerprint size={56} />
          <Typography sx={{ fontWeight: 800, fontSize: "1.25rem" }}>GgnHome is locked</Typography>
          <Button onClick={unlock} variant="contained" sx={{ backgroundColor: "#fff", color: "#003366", fontWeight: 800, textTransform: "none", "&:hover": { backgroundColor: "#E6FFFB" } }}>Unlock</Button>
        </Box>
      )}
      {!online && (
        <Box
          role="status"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 0.75,
            px: 2,
            pt: "calc(6px + env(safe-area-inset-top, 0px))",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(90deg,#B45309,#F59E0B)",
          }}
        >
          <WifiOff size={14} /> You're offline — showing saved data
        </Box>
      )}
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={7000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ mt: "env(safe-area-inset-top, 0px)" }}
      >
        <Alert
          severity="info"
          icon={false}
          onClose={() => setToast(null)}
          action={
            toast?.link ? (
              <Button
                size="small"
                onClick={() => {
                  navigate(toast.link);
                  setToast(null);
                }}
              >
                View
              </Button>
            ) : null
          }
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {toast?.title}
          {toast?.body ? ` — ${toast.body}` : ""}
        </Alert>
      </Snackbar>
    </>
  );
}

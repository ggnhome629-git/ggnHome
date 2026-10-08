import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, Snackbar } from "@mui/material";
import { WifiOff } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { appVersion, isNativeApp, nativePlugin, snapshot } from "../../utils/nativeApp";

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

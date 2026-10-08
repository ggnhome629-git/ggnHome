import React, { useEffect, useState } from "react";
import { Box, Button, Stack, Switch, Typography } from "@mui/material";
import { Bell, ChevronLeft, ChevronRight, Fingerprint, Info, RefreshCw, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../Context/AuthContext";
import { appFetch, fcmToken, versionLt } from "../../utils/appApi";
import { appVersion, clearUserCache, isNativeApp, nativePlugin } from "../../utils/nativeApp";
import MobileBottomNav from "../Dashboard/MobileBottomNav";

export const BIOMETRIC_KEY = "ggn:biometric";

function Row({ icon: Icon, title, body, action, onClick }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      onClick={onClick}
      sx={{ p: 2, borderRadius: "14px", backgroundColor: "#fff", border: "1px solid #E5E9EE", mb: 1.25, cursor: onClick ? "pointer" : "default" }}
    >
      <Box sx={{ width: 38, height: 38, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,167,157,0.12)", color: "#00857D", flexShrink: 0 }}>
        <Icon size={19} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "#1B2B3A" }}>{title}</Typography>
        {body && <Typography sx={{ fontSize: "0.76rem", color: "#5B6B7B" }}>{body}</Typography>}
      </Box>
      {action}
    </Stack>
  );
}

/** App-only settings: push preferences, biometric lock, updates, offline data. */
export default function AppSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({ popularPushes: true, personalPushes: true });
  const [bio, setBio] = useState(() => localStorage.getItem(BIOMETRIC_KEY) === "1");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [update, setUpdate] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    document.title = "App settings | GgnHome";
    nativePlugin("BiometricAuth")?.checkBiometry?.().then((r) => setBioAvailable(Boolean(r?.isAvailable))).catch(() => {});
    const token = fcmToken();
    if (token) appFetch("/devices", { method: "POST", body: { token, appVersion: appVersion() } }).then((d) => setPrefs({ popularPushes: d.popularPushes, personalPushes: d.personalPushes })).catch(() => {});
  }, []);

  const setPush = async (key, value) => {
    setPrefs((p) => ({ ...p, [key]: value }));
    const token = fcmToken();
    if (!token) return setMsg("Allow notifications for GgnHome in Android settings first.");
    try {
      await appFetch("/devices/prefs", { method: "PATCH", body: { token, [key]: value } });
    } catch {
      setPrefs((p) => ({ ...p, [key]: !value }));
      setMsg("Couldn't save — check your connection.");
    }
  };

  const toggleBio = async (on) => {
    if (on) {
      try {
        await nativePlugin("BiometricAuth").authenticate({ reason: "Turn on app lock", allowDeviceCredential: true });
      } catch {
        return setMsg("Couldn't verify — app lock stays off.");
      }
    }
    localStorage.setItem(BIOMETRIC_KEY, on ? "1" : "0");
    setBio(on);
  };

  const checkUpdate = async () => {
    setMsg("");
    try {
      const v = await appFetch("/version");
      setUpdate(versionLt(appVersion(), v.latest) ? v : { upToDate: true });
    } catch {
      setMsg("Couldn't check for updates right now.");
    }
  };

  const clearOffline = async () => {
    clearUserCache();
    try {
      const keys = (await window.caches?.keys?.()) || [];
      await Promise.all(keys.filter((k) => /^ggn-(api|img)/.test(k)).map((k) => window.caches.delete(k)));
      ["ggn:foryou:v1", "ggn:inbox:v1"].forEach((k) => localStorage.removeItem(k));
      setMsg("Saved offline data cleared.");
    } catch {
      setMsg("Couldn't clear offline data.");
    }
  };

  if (!isNativeApp() && process.env.NODE_ENV === "production") return null;

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#F4F7F9", pb: 2 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, pb: 2, pt: "calc(14px + env(safe-area-inset-top, 0px))", color: "#fff", backgroundImage: "linear-gradient(130deg,#002244,#003366 55%,#0B7A85)" }}>
        <Button onClick={() => navigate(-1)} aria-label="Back" sx={{ minWidth: 40, color: "#fff" }}><ChevronLeft /></Button>
        <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>App settings</Typography>
      </Stack>
      <Box sx={{ p: 2 }}>
        {msg && <Typography sx={{ mb: 1.5, fontSize: "0.8rem", fontWeight: 700, color: "#92400E" }}>{msg}</Typography>}

        <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", color: "#00857D", mb: 1, mt: 1 }}>NOTIFICATIONS</Typography>
        <Row icon={Bell} title="Popular homes" body="A daily nudge about the hottest listing" action={<Switch checked={prefs.popularPushes} onChange={(e) => setPush("popularPushes", e.target.checked)} />} />
        <Row icon={Bell} title="Picked for you" body={user ? "A weekly pick matched to your taste" : "Sign in to get personal picks"} action={<Switch disabled={!user} checked={prefs.personalPushes} onChange={(e) => setPush("personalPushes", e.target.checked)} />} />
        <Row icon={Bell} title="Notification inbox" body="Everything we've sent you" action={<ChevronRight size={18} color="#9AA7B4" />} onClick={() => navigate("/app/notifications")} />

        <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", color: "#00857D", mb: 1, mt: 2.5 }}>SECURITY</Typography>
        <Row icon={Fingerprint} title="App lock" body={bioAvailable ? "Ask for fingerprint / face / PIN when you open the app" : "Set up a screen lock or fingerprint on your phone to use this"} action={<Switch disabled={!bioAvailable} checked={bio} onChange={(e) => toggleBio(e.target.checked)} />} />

        <Typography sx={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", color: "#00857D", mb: 1, mt: 2.5 }}>APP</Typography>
        <Row icon={RefreshCw} title="Check for updates" body={update?.upToDate ? "You're on the latest version" : update ? `Version ${update.latest} is available` : `Version ${appVersion() || "—"}`} action={update && !update.upToDate && update.updateUrl ? <Button size="small" variant="contained" href={update.updateUrl}>Update</Button> : <ChevronRight size={18} color="#9AA7B4" />} onClick={checkUpdate} />
        <Row icon={Trash2} title="Clear saved offline data" body="Frees space; saved homes reload when you're online" action={<ChevronRight size={18} color="#9AA7B4" />} onClick={clearOffline} />
        <Row icon={Info} title="About" body={`GgnHome app ${appVersion() || ""}`} />
      </Box>
      <MobileBottomNav user={user} />
    </Box>
  );
}

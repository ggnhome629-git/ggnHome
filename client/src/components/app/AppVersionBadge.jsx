import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCcw, Sparkles, X } from "lucide-react";
import { clearBrowserCaches } from "../../utils/cacheVersion";
import "./appVersionBadge.css";

// Bump this and client/public/version.json together for every frontend release.
const APP_VERSION = "2.0.0";
const VERSION_ENDPOINT = (process.env.PUBLIC_URL || "").replace(/\/+$/, "") + "/version.json";
const RECHECK_MS = 5 * 60 * 1000;

const FALLBACK_RELEASES = [
  {
    version: APP_VERSION,
    date: "2026-10-23",
    title: "GgnHome Quest V2",
    highlights: [
      "GgnBot home quest with clear progress and reward moments",
      "Interactive Gurgaon exploration and live home matching",
      "Collect, compare and explore matching properties with Property Drive",
      "Visible frontend version and stale-build detection",
    ],
  },
];

export default function AppVersionBadge() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("checking");
  const [releaseManifest, setReleaseManifest] = useState(null);
  const [checkedAt, setCheckedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkLiveVersion = useCallback(async () => {
    try {
      const response = await fetch(VERSION_ENDPOINT + "?check=" + Date.now(), {
        method: "GET",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Version check failed");
      const manifest = await response.json();
      if (!manifest || typeof manifest.version !== "string" || !manifest.version.trim()) {
        throw new Error("Version manifest is invalid");
      }
      setReleaseManifest(manifest);
      setCheckedAt(Date.now());
      setStatus(manifest.version.trim() === APP_VERSION ? "current" : "update");
    } catch {
      setCheckedAt(Date.now());
      setStatus((previous) => previous === "update" ? "update" : "unavailable");
    }
  }, []);

  useEffect(() => {
    const isPrivateArea = /^\/(admin|partner|agent|sms-service)(\/|$)/i.test(location.pathname);
    if (isPrivateArea) return undefined;

    // The static HTML badge covers the first paint and stale JS bundles; replace it once React is live.
    document.getElementById("ggn-build-status")?.remove();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkLiveVersion();
    };
    checkLiveVersion();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") checkLiveVersion();
    }, RECHECK_MS);
    window.addEventListener("focus", checkLiveVersion);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", checkLiveVersion);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [checkLiveVersion, location.pathname]);

  const isPrivateArea = /^\/(admin|partner|agent|sms-service)(\/|$)/i.test(location.pathname);
  if (isPrivateArea) return null;

  const releaseList = Array.isArray(releaseManifest?.releases) && releaseManifest.releases.length
    ? releaseManifest.releases.slice(0, 4)
    : FALLBACK_RELEASES;
  const liveVersion = releaseManifest?.version || null;
  const versionStatus = status === "current" ? "LIVE" : status === "update" ? "UPDATE" : status === "checking" ? "CHECK" : "VERIFY";
  const statusMessage = status === "current"
    ? "This tab's frontend bundle matches the live version manifest."
    : status === "update"
      ? "A newer frontend build is published. This browser may still be using cached JavaScript."
      : status === "checking"
        ? "Checking which frontend build is live…"
        : "Couldn't verify the live version. The displayed version is the bundle loaded in this tab.";

  const refreshToLatest = async () => {
    setRefreshing(true);
    try {
      await clearBrowserCaches();
    } finally {
      window.location.reload();
    }
  };

  return (
    <aside className="ggn-v2-widget" aria-label="GgnHome frontend version">
      <button
        type="button"
        className={"ggn-v2-trigger " + status}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="ggn-v2-panel"
        title={"Frontend bundle v" + APP_VERSION + ". Click to see release notes and live cache status."}
      >
        <span className="ggn-v2-star" aria-hidden="true"><Sparkles size={14} /></span>
        <span>V2</span>
        <span className="ggn-v2-live-dot" aria-hidden="true" />
        <span className="ggn-v2-status">{versionStatus}</span>
      </button>

      {open ? (
        <section className="ggn-v2-panel" id="ggn-v2-panel" role="dialog" aria-label="Frontend version and what's new">
          <header className="ggn-v2-panel-head">
            <div className="ggn-v2-title-wrap">
              <span className="ggn-v2-eyebrow"><Sparkles size={13} /> What's new</span>
              <strong className="ggn-v2-panel-title">GgnHome Quest V2</strong>
              <span className="ggn-v2-build">Frontend bundle v{APP_VERSION}</span>
            </div>
            <button type="button" className="ggn-v2-close" onClick={() => setOpen(false)} aria-label="Close version panel"><X size={16} /></button>
          </header>

          <img
            className="ggn-v2-art"
            src={(process.env.PUBLIC_URL || "") + "/ggn-quest-v2.svg"}
            alt="GgnBot exploring the Gurgaon home quest map"
            loading="lazy"
            decoding="async"
          />

          <div className="ggn-v2-copy">
            <div className={"ggn-v2-state " + status} role="status" aria-live="polite">
              {status === "update" ? <AlertTriangle size={16} /> : status === "current" ? <CheckCircle2 size={16} /> : <RefreshCcw size={16} />}
              <span>{statusMessage}</span>
            </div>

            <h3 className="ggn-v2-section-title">Release notes</h3>
            <div className="ggn-v2-release-list">
              {releaseList.map((release) => (
                <article className="ggn-v2-release" key={release.version}>
                  <div className="ggn-v2-release-head">
                    <strong>{release.title || "GgnHome update"} · v{release.version}</strong>
                    <span>{release.date || ""}</span>
                  </div>
                  <ul>
                    {(Array.isArray(release.highlights) ? release.highlights : []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </article>
              ))}
            </div>

            <div className="ggn-v2-meta">
              <span>Browser bundle: v{APP_VERSION}</span>
              <span>Live manifest: {liveVersion ? "v" + liveVersion : "not confirmed"}</span>
              {checkedAt ? <span>Last checked: {new Date(checkedAt).toLocaleTimeString()}</span> : null}
            </div>

            <div className="ggn-v2-actions">
              {status === "update" ? (
                <button type="button" className="ggn-v2-action" onClick={refreshToLatest} disabled={refreshing}>
                  <RefreshCcw size={14} /> {refreshing ? "Refreshing…" : "Refresh to latest"}
                </button>
              ) : null}
              <button type="button" className="ggn-v2-action secondary" onClick={checkLiveVersion}>
                <RefreshCcw size={13} /> Check again
              </button>
            </div>
            <small className="ggn-v2-footnote">For each frontend release, bump the bundle version and update client/public/version.json with the new version and release notes.</small>
          </div>
        </section>
      ) : null}
    </aside>
  );
}

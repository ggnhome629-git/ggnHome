import { snapshot } from "./nativeApp";

const BASE = () => process.env.REACT_APP_BASE_API || process.env.REACT_APP_Base_API;
const authHeaders = () => {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Thin fetch wrapper for the app-only /api/app/* endpoints. */
export async function appFetch(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE()}/api/app${path}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || String(res.status)), { status: res.status });
  return data;
}

export const fcmToken = () => snapshot.read("ggn:fcm", null);

/** "1.2.0" vs "1.10.1" — true when a is older than b. */
export function versionLt(a, b) {
  const pa = String(a || "0").split(".").map(Number);
  const pb = String(b || "0").split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) < (pb[i] || 0);
  }
  return false;
}

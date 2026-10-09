import { useEffect, useState } from "react";

/**
 * Public status page at /admin/ping — no sign-in, no admin gate. It asks the API's own /admin/ping and shows the
 * answer, so a quick visit tells you whether the website and the API server are both up.
 */
const BASE = process.env.REACT_APP_Base_API;

export default function AdminPing() {
  const [state, setState] = useState({ loading: true, ok: false, message: "" });

  useEffect(() => {
    let alive = true;
    fetch(`${BASE}/admin/ping`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (alive) setState({ loading: false, ok: res.ok, message: data.message || `API answered ${res.status}` });
      })
      .catch(() => alive && setState({ loading: false, ok: false, message: "The API server did not answer (it may be waking up — try again in a minute)." }));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", padding: 16, textAlign: "center" }}>
      <div>
        <div style={{ fontSize: 40 }}>{state.loading ? "…" : state.ok ? "✅" : "⚠️"}</div>
        <h1 style={{ fontSize: 20, margin: "8px 0" }}>{state.loading ? "Checking…" : state.ok ? "API is up" : "API problem"}</h1>
        <p style={{ color: "#5B6B7B", margin: 0 }}>{state.message}</p>
      </div>
    </div>
  );
}

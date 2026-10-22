import React from "react";
import { useLocation } from "react-router-dom";

const RELOAD_KEY = "ggn:chunkReload";

// After a deploy a tab that is still open may ask for a page file that no longer exists.
const isStaleBuild = (error) =>
  /ChunkLoadError|Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed/i.test(`${error?.name || ""} ${error?.message || ""}`);

/**
 * Catches an error while drawing a page, so one broken page shows a friendly screen instead of a blank one.
 * A stale-build error (new deploy, old tab) reloads the page once by itself. `resetKey` (the route) clears the
 * error when the visitor goes to another page.
 */
class Boundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error("Page error:", error);
    if (!isStaleBuild(error)) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 30000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    } catch (_) {
      /* storage blocked: the screen below still offers a reload */
    }
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f7fb", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, margin: "0 0 8px", color: "#0f172a" }}>Something went wrong</h1>
          <p style={{ margin: "0 0 4px", color: "#475569" }}>This page could not be shown. Please try again.</p>
          <p style={{ margin: "0 0 20px", color: "#475569" }}>यह पेज नहीं खुल पाया। कृपया दोबारा कोशिश करें।</p>
          <button type="button" onClick={() => window.location.reload()} style={{ minHeight: 48, padding: "0 24px", borderRadius: 12, border: 0, background: "#0f766e", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Reload · दोबारा खोलें
          </button>
          <div style={{ marginTop: 14 }}>
            <a href="/" style={{ color: "#0f766e", fontWeight: 700 }}>Go to home · होम पर जाएँ</a>
          </div>
        </div>
      </div>
    );
  }
}

export default function ErrorBoundary({ children }) {
  const location = useLocation();
  return <Boundary resetKey={location.pathname}>{children}</Boundary>;
}

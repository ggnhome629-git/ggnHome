/**
 * Single sign-on helpers between the main site and the agent area.
 * One mobile + OTP login gives both sessions; these keep them in step.
 */
const base = () => process.env.REACT_APP_Base_API || "";

/** Store whatever tokens a login returned and tell both auth contexts. */
export function storeLoginTokens(data) {
  try {
    if (data?.accessToken) localStorage.setItem("accessToken", data.accessToken);
    if (data?.agentAccessToken) localStorage.setItem("agentAccessToken", data.agentAccessToken);
  } catch (e) {
    // storage blocked — cookies still carry the session
  }
  if (data?.agentAccessToken) window.dispatchEvent(new Event("agent:login"));
}

/**
 * Already signed in on the main site → open the agent session too.
 * Resolves { ok, status, agent } where agent is { status, name } or null.
 */
export async function openAgentSessionFromUser() {
  const token = localStorage.getItem("accessToken");
  try {
    const res = await fetch(`${base()}/api/agent/login/session`, {
      method: "POST",
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.agentAccessToken) {
      storeLoginTokens({ agentAccessToken: data.agentAccessToken });
      return { ok: true, status: 200, agent: data.agent || null };
    }
    return { ok: false, status: res.status, agent: data.agent || null };
  } catch (e) {
    return { ok: false, status: 0, agent: null };
  }
}

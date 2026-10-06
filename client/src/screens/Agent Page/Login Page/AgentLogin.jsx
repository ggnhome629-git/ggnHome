import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { BadgeCheck, Clock, Home, LayoutDashboard, PhoneCall, ShieldAlert, UserPlus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../../../components/auth/AuthShell";
import MobileOtpForm from "../../../components/auth/MobileOtpForm";
import { useAuth } from "../../../Context/AuthContext";
import { useAgentAuth } from "../../../Context/AgentAuthContext";
import { openAgentSessionFromUser, storeLoginTokens } from "../../../utils/agentSso";

const POINTS = [
  { icon: PhoneCall, title: "Verified Leads", text: "Tenants and buyers matched to your preferred sectors." },
  { icon: LayoutDashboard, title: "One Dashboard", text: "Your listings, enquiries and leads in one place." },
  { icon: Home, title: "Post Listings Free", text: "List client properties without any fee." },
  { icon: BadgeCheck, title: "One Login", text: "The same mobile login opens ggnHome and your agent account." },
];

function StatusCard({ icon: Icon, tone, title, text, children }) {
  return (
    <Stack spacing={3} alignItems="flex-start">
      <Box sx={{ width: 52, height: 52, borderRadius: "16px", display: "grid", placeItems: "center", backgroundColor: `${tone}1A`, color: tone }}>
        <Icon size={26} />
      </Box>
      <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.3rem" }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {text}
      </Typography>
      {children}
    </Stack>
  );
}

/**
 * /agent/login — mobile number + 4-letter code, exactly like the main
 * login. An approved agent lands on the dashboard (and is signed in on the
 * main site too); anyone already signed in on the main site is let straight in.
 */
export default function AgentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchUser } = useAuth();
  const { fetchAgent } = useAgentAuth();
  const from = location.state?.from && location.state.from.startsWith("/agent") ? location.state.from : "/agent/dashboard";
  const [phase, setPhase] = useState("checking"); // checking | form | pending | suspended | none
  const [mobile, setMobile] = useState("");

  const enter = async () => {
    try {
      await Promise.all([fetchUser?.({ force: true }), fetchAgent?.({ force: true })]);
    } catch (e) {
      // the dashboard re-checks anyway
    }
    navigate(from, { replace: true });
  };

  const showStatus = (agent) => {
    const st = agent?.status;
    setPhase(st === "pending" ? "pending" : st === "suspended" ? "suspended" : "none");
  };

  // Signed in on the main site already? Open the agent session without asking again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (localStorage.getItem("agentAccessToken")) {
        const agent = await fetchAgent?.({ force: true });
        if (!cancelled && agent) return navigate(from, { replace: true });
      }
      if (!localStorage.getItem("accessToken")) {
        if (!cancelled) setPhase("form");
        return;
      }
      const r = await openAgentSessionFromUser();
      if (cancelled) return;
      if (r.ok) return enter();
      if (r.status === 403 || r.status === 404) return showStatus(r.agent);
      setPhase("form");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onVerified = async (data, number) => {
    setMobile(number);
    storeLoginTokens(data);
    if (data.agentAccessToken) return enter();
    try {
      await fetchUser?.({ force: true });
    } catch (e) {
      // ignore
    }
    showStatus(data.agent);
  };

  let body;
  if (phase === "checking") {
    body = (
      <Stack alignItems="center" spacing={3} sx={{ py: 8 }}>
        <CircularProgress color="secondary" />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Checking your session…
        </Typography>
      </Stack>
    );
  } else if (phase === "pending") {
    body = (
      <StatusCard icon={Clock} tone="#F59E0B" title="Registration Under Review" text="Thanks for registering! Our team is verifying your details. You'll be able to log in here as soon as your account is approved.">
        <Button variant="outlined" onClick={() => navigate("/")} sx={{ borderRadius: 999, fontWeight: 700 }}>
          Go To ggnHome
        </Button>
      </StatusCard>
    );
  } else if (phase === "suspended") {
    body = (
      <StatusCard icon={ShieldAlert} tone="#DC2626" title="Account Suspended" text="Your agent account is currently suspended. Please contact ggnHome support for help.">
        <Button variant="outlined" onClick={() => navigate("/support")} sx={{ borderRadius: 999, fontWeight: 700 }}>
          Contact Support
        </Button>
      </StatusCard>
    );
  } else if (phase === "none") {
    body = (
      <StatusCard
        icon={UserPlus}
        tone="#00A79D"
        title="No Agent Account Yet"
        text={`${mobile ? `+91 ${mobile} isn't` : "This number isn't"} registered as a ggnHome agent. You're signed in on ggnHome — register as an agent in a couple of minutes.`}
      >
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="secondary" onClick={() => navigate("/agent/register")} sx={{ borderRadius: 999, fontWeight: 800 }}>
            Register As Agent
          </Button>
          <Button onClick={() => navigate("/")} sx={{ fontWeight: 700 }}>
            Go To ggnHome
          </Button>
        </Stack>
      </StatusCard>
    );
  } else {
    body = (
      <>
        <Typography component="h2" sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.6rem" }}>
          Agent Login
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, mb: 5 }}>
          Use the mobile number you registered with.
        </Typography>
        {location.state?.message && (
          <Typography variant="body2" sx={{ mb: 3, color: "#B45309", fontWeight: 600 }}>
            {location.state.message}
          </Typography>
        )}
        <MobileOtpForm onVerified={onVerified} submitLabel="Log In" />
      </>
    );
  }

  return (
    <AuthShell
      eyebrow="For Agents"
      title="Grow Your Business With ggnHome"
      subtitle="Get matched with tenants and buyers in the sectors you work in."
      points={POINTS}
      footer={
        <Stack spacing={1.5} alignItems="center">
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            New to ggnHome?{" "}
            <Link component="button" type="button" underline="hover" onClick={() => navigate("/agent/register")} sx={{ fontWeight: 700, color: "secondary.main" }}>
              Register as an agent
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Not an agent?{" "}
            <Link component="button" type="button" underline="hover" onClick={() => navigate("/login")} sx={{ fontWeight: 700 }}>
              User login
            </Link>
          </Typography>
        </Stack>
      }
    >
      {body}
    </AuthShell>
  );
}

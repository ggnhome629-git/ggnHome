import React, { useState, useEffect } from "react";
import { Box, Button, Card, CardContent, Divider, Stack, Switch, Typography, CircularProgress, Alert } from "@mui/material";
import { Settings, RefreshCw } from "lucide-react";
import { useAdminFeedback } from "./shell/adminUi";

/**
 * Feature Toggles Admin Page — settings are persisted in the shared backend,
 * so changes apply to users across browsers and devices.
 */
export default function FeatureTogglesAdmin() {
  const { confirm, notify, feedback } = useAdminFeedback();
  const [features, setFeatures] = useState({
    flatmates: false,
    agentPortal: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load the shared settings from the backend. localStorage is retained as
  // a short-term cache for instant UI updates, not as the source of truth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/feature-toggles`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error("Could not load feature settings.");
        const data = await response.json();
        if (cancelled) return;
        const next = { flatmates: data.flatmates === true, agentPortal: data.agentPortal === true };
        setFeatures(next);
        localStorage.setItem("admin:featureToggles", JSON.stringify(next));
      } catch (err) {
        if (!cancelled) {
          try {
            const stored = JSON.parse(localStorage.getItem("admin:featureToggles") || "{}");
            setFeatures({ flatmates: stored.flatmates === true, agentPortal: stored.agentPortal === true });
          } catch (_) {
            setFeatures({ flatmates: false, agentPortal: false });
          }
          setMessage("Could not sync with the server. Changes may not be shared until connection is restored.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Save settings globally so the user-facing UI is controlled by this panel.
  const handleSave = async () => {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/feature-toggles`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(features),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Failed to save feature settings.");
      const saved = data.features || features;
      setFeatures(saved);
      localStorage.setItem("admin:featureToggles", JSON.stringify(saved));
      window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: saved }));
      setMessage("✓ Feature toggles saved and applied platform-wide");
      setTimeout(() => setMessage(""), 3500);
    } catch (err) {
      setMessage(`✗ ${err.message || "Failed to save toggles"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (feature) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  const handleReset = async () => {
    if (await confirm({ title: "Reset features", message: "Reset all features to OFF?", confirmLabel: "Reset", danger: true })) {
      setFeatures({ flatmates: false, agentPortal: false });
      await handlePersistReset();
    }
  };

  const handlePersistReset = async () => {
    setSaving(true);
    try {
      const disabled = { flatmates: false, agentPortal: false };
      const response = await fetch(`${process.env.REACT_APP_Base_API}/api/admin/feature-toggles`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(disabled),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not reset feature settings.");
      setFeatures(data.features || disabled);
      localStorage.setItem("admin:featureToggles", JSON.stringify(data.features || disabled));
      window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: data.features || disabled }));
      setMessage("✓ Features reset and applied platform-wide");
    } catch (err) {
      setMessage(`✗ ${err.message || "Could not reset features"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 3, md: 4 } }}>
      {feedback}
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Settings size={24} color="#003366" />
          <Box>
            <Typography variant="h3" sx={{ fontSize: "1.5rem", fontWeight: 700, color: "primary.main" }}>
              Feature Toggles
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Control visibility of optional features across the platform.
            </Typography>
          </Box>
        </Stack>

        {/* Alert */}
        {message && (
          <Alert severity={message.includes("✓") ? "success" : "error"} onClose={() => setMessage("")}>
            {message}
          </Alert>
        )}

        {/* Features Grid */}
        <Stack spacing={2}>
          {/* Flatmates Feature */}
          <Card sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>
                    Flatmates Portal
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    Enable the roommate matching and listing platform. When enabled, users can:
                  </Typography>
                  <ul style={{ color: "#5B6B7B", fontSize: "0.9rem", margin: "8px 0", paddingLeft: "20px" }}>
                    <li>Post and browse flatmate listings</li>
                    <li>Access /flatmatesdashboard and /flatmatessearch</li>
                    <li>See "Flatmates" link in footer navigation</li>
                  </ul>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: features.flatmates ? "rgba(46,158,107,0.1)" : "rgba(239,68,68,0.1)",
                      borderRadius: "8px",
                      borderLeft: `4px solid ${features.flatmates ? "#10B981" : "#EF4444"}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: features.flatmates ? "#10B981" : "#EF4444" }}>
                      Status: {features.flatmates ? "✓ Enabled" : "✗ Disabled"}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={features.flatmates}
                  onChange={() => handleToggle("flatmates")}
                  color="success"
                  sx={{ ml: 2 }}
                />
              </Stack>
            </CardContent>
          </Card>

          {/* Agent Portal Feature */}
          <Card sx={{ borderRadius: "12px", border: "1px solid", borderColor: "divider" }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main", mb: 1 }}>
                    Agent Portal
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    Enable the dedicated agent login and management system. When enabled, agents can:
                  </Typography>
                  <ul style={{ color: "#5B6B7B", fontSize: "0.9rem", margin: "8px 0", paddingLeft: "20px" }}>
                    <li>Register and login at /agent/login</li>
                    <li>Access agent dashboard and property management</li>
                    <li>Post and manage listings as agents</li>
                    <li>View analytics and client support</li>
                  </ul>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: features.agentPortal ? "rgba(46,158,107,0.1)" : "rgba(239,68,68,0.1)",
                      borderRadius: "8px",
                      borderLeft: `4px solid ${features.agentPortal ? "#10B981" : "#EF4444"}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: features.agentPortal ? "#10B981" : "#EF4444" }}>
                      Status: {features.agentPortal ? "✓ Enabled" : "✗ Disabled"}
                    </Typography>
                  </Box>
                </Box>
                <Switch
                  checked={features.agentPortal}
                  onChange={() => handleToggle("agentPortal")}
                  color="success"
                  sx={{ ml: 2 }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Divider />

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            startIcon={<RefreshCw size={16} />}
            onClick={handleReset}
            disabled={saving}
          >
            Reset All
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Stack>

        {/* Info Note */}
        <Box sx={{ p: 2, backgroundColor: "rgba(34,211,238,0.08)", borderRadius: "8px", borderLeft: "4px solid #22D3EE" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
            💡 <strong>Note:</strong> Changes are saved centrally and apply to users across devices.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

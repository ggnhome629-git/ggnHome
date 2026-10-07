import React, { useState, useEffect } from "react";
import { Box, Button, Card, CardContent, Divider, Stack, Switch, Typography, CircularProgress, Alert } from "@mui/material";
import { Settings, RefreshCw } from "lucide-react";

/**
 * Feature Toggles Admin Page — control visibility of Flatmates and Agent portals.
 * Settings are stored in localStorage and can be synced to the backend later.
 */
export default function FeatureTogglesAdmin() {
  const [features, setFeatures] = useState({
    flatmates: false,
    agentPortal: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("admin:featureToggles") || "{}");
      setFeatures({
        flatmates: stored.flatmates ?? false,
        agentPortal: stored.agentPortal ?? false,
      });
    } catch (err) {
      console.error("Error loading feature toggles:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save to localStorage
  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("admin:featureToggles", JSON.stringify(features));
      setMessage("✓ Feature toggles saved successfully");
      setTimeout(() => setMessage(""), 3000);
      
      // Dispatch event so other parts of app can react
      window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: features }));
    } catch (err) {
      setMessage("✗ Failed to save toggles");
      console.error(err);
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

  const handleReset = () => {
    if (window.confirm("Reset all features to OFF?")) {
      setFeatures({ flatmates: false, agentPortal: false });
      localStorage.removeItem("admin:featureToggles");
      setMessage("✓ Features reset");
      setTimeout(() => setMessage(""), 3000);
      window.dispatchEvent(new CustomEvent("featureTogglesUpdated", { detail: { flatmates: false, agentPortal: false } }));
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
            💡 <strong>Note:</strong> Changes are saved to browser storage. Implement backend sync for multi-device persistence.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

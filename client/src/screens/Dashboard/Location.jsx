import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { MapPin, X } from "lucide-react";
import { radii } from "../../theme/theme";

/**
 * Requests geolocation on mount (silently) and lifts the reverse-geocoded
 * area up to the dashboard via setUserLocation. The pin button reopens the
 * request manually — e.g. if the user denied it the first time.
 */
const Location = ({ setUserLocation }) => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [resolvedLocation, setResolvedLocation] = useState(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const res = await fetch(
            `${process.env.REACT_APP_REVERSE_GEOCODE_API}?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const address = data.address || {};

          const loc = {
            latitude,
            longitude,
            city:
              address.city || address.town || address.village ||
              address.city_district || address.county ||
              address.state_district || address.state || null,
            area:
              address.suburb || address.neighbourhood || address.village ||
              address.city_district || address.county ||
              address.state_district || address.state || null,
            village: address.village || null,
            city_district: address.city_district || null,
            county: address.county || null,
            state_district: address.state_district || null,
            state: address.state || null,
          };

          if (loc.area || loc.city) {
            if (typeof setUserLocation === "function") {
              setUserLocation(loc);
              setResolvedLocation(loc);
            } else {
              console.warn("setUserLocation is not a function. Cannot lift location to parent.");
            }
          } else {
            console.warn("Could not determine valid area or city from location.");
          }
        } catch (err) {
          console.error("Error fetching location name:", err);
        }

        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    handleGetLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const DETAIL_ROWS = [
    ["City", resolvedLocation?.city],
    ["Area", resolvedLocation?.area],
    ["Village", resolvedLocation?.village],
    ["City district", resolvedLocation?.city_district],
    ["County", resolvedLocation?.county],
    ["State district", resolvedLocation?.state_district],
    ["State", resolvedLocation?.state],
  ].filter(([, value]) => Boolean(value));

  return (
    <Box sx={{ display: "inline-block" }}>
      <IconButton
        onClick={() => setShowModal(true)}
        aria-label="Location settings"
        sx={{ color: "secondary.main" }}
      >
        <MapPin size={26} />
      </IconButton>

      <Dialog
        open={showModal}
        onClose={() => setShowModal(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: `${radii.lg}px`, p: 2 } }}
      >
        <Box sx={{ p: 4, textAlign: "center", position: "relative" }}>
          <IconButton
            onClick={() => setShowModal(false)}
            aria-label="Close"
            size="small"
            sx={{ position: "absolute", top: 4, right: 4 }}
          >
            <X size={18} />
          </IconButton>

          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
            <MapPin size={20} color="#00A79D" />
            <Typography variant="h4" sx={{ color: "primary.main" }}>
              Find homes near you
            </Typography>
          </Stack>

          <Typography variant="body2" sx={{ color: "text.secondary", mb: 5 }}>
            We'll need your permission to access your location to show nearby
            properties.
          </Typography>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleGetLocation}
            disabled={loading}
            sx={{ px: 8 }}
          >
            {loading ? "Getting location…" : "Use my current location"}
          </Button>

          {error && (
            <Typography variant="body2" sx={{ color: "error.main", mt: 4 }}>
              {error}
            </Typography>
          )}

          {DETAIL_ROWS.length > 0 && (
            <Stack spacing={1} sx={{ mt: 5, textAlign: "left" }}>
              {DETAIL_ROWS.map(([label, value]) => (
                <Typography key={label} variant="caption" sx={{ color: "text.secondary" }}>
                  {label}: {value}
                </Typography>
              ))}
            </Stack>
          )}
        </Box>
      </Dialog>
    </Box>
  );
};

export default Location;

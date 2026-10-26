import React, { useEffect, useState } from "react";
import { Alert, Box, Button } from "@mui/material";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchScrapedListingsEnabled } from "./ScrapedListingsSwitch";

/**
 * Wraps scraper screens (Scraper Control, Property Sync). While the landing
 * page's "Scraped properties" switch is OFF their controls are inert — not
 * clickable or focusable — and a notice says how to unlock them. The server
 * refuses the same actions (423), so this is the visible half of the lock.
 */
export default function ScraperLock({ children }) {
  const navigate = useNavigate();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchScrapedListingsEnabled()
      .then((enabled) => !cancelled && setLocked(!enabled))
      .catch(() => {});
    const onChange = (e) => {
      if (typeof e.detail?.scrapedListings === "boolean") setLocked(!e.detail.scrapedListings);
    };
    window.addEventListener("featureTogglesUpdated", onChange);
    return () => {
      cancelled = true;
      window.removeEventListener("featureTogglesUpdated", onChange);
    };
  }, []);

  return (
    <>
      {locked && (
        <Box sx={{ px: { xs: 2, md: 3 }, pt: { xs: 2, md: 3 } }}>
          <Alert
            severity="warning"
            icon={<Lock size={18} />}
            action={
              <Button color="inherit" size="small" onClick={() => navigate("/admin/Landingpage")}>
                Open switch
              </Button>
            }
          >
            Scraped properties are turned off, so the scraper is locked. Turn them on from the admin dashboard to use these controls.
          </Alert>
        </Box>
      )}
      <Box inert={locked || undefined} aria-disabled={locked || undefined} sx={locked ? { opacity: 0.5, filter: "grayscale(0.6)" } : undefined}>
        {children}
      </Box>
    </>
  );
}

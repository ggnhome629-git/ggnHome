import React, { useEffect, useState } from "react";
import { Box, Button, Container, Skeleton, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { radii, elevationShadows } from "../../theme/theme";

const TABS = ["News", "Tax & Legal", "Help Guides", "Investment"];

const QUERIES = {
  News: "real estate news",
  "Tax & Legal": "property tax",
  "Help Guides": "home buying guide",
  Investment: "real estate investment",
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Editorial split: a tabbed article feed (proxied through our backend so the
 * GNews key stays server-side) alongside a static "Buy a home" promo. Article
 * results are cached in localStorage for a day to avoid re-hitting the news
 * API on every dashboard load.
 */
const PropertyHeroSection = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("News");
  const [articlesByCategory, setArticlesByCategory] = useState({
    News: [],
    "Tax & Legal": [],
    "Help Guides": [],
    Investment: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [forceFetchKey, setForceFetchKey] = useState(0);

  const apiBase = (process.env.REACT_APP_Base_API || "").replace(/\/$/, "");

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);
        const cachedData = localStorage.getItem("articlesByCategory");
        const cachedTimestamp = localStorage.getItem("articlesTimestamp");
        const now = Date.now();

        if (cachedData) {
          try {
            setArticlesByCategory(JSON.parse(cachedData));
          } catch (e) {
            // ignore malformed cache
          }
        }

        if (cachedTimestamp) {
          const lastFetchTime = Number(cachedTimestamp) || 0;
          if (now - lastFetchTime < ONE_DAY_MS) {
            setLoading(false);
            return;
          }
        }

        const newArticles = {};
        for (const tab of TABS) {
          const url = `${apiBase}/api/news?q=${encodeURIComponent(QUERIES[tab])}&lang=en&max=10`;
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            let res;
            try {
              res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
            } catch (fetchErr) {
              newArticles[tab] = [];
              clearTimeout(timeout);
              continue;
            }
            clearTimeout(timeout);

            if (!res.ok) {
              newArticles[tab] = [];
              continue;
            }

            const data = await res.json().catch(() => null);
            const articlesData = Array.isArray(data?.articles) ? data.articles : [];
            newArticles[tab] = articlesData.map((item, index) => ({
              id: item.url || index,
              title: item.title || "No Title",
              date: item.publishedAt ? new Date(item.publishedAt).toDateString() : "",
              image: item.image || "https://via.placeholder.com/150?text=No+Image",
              category: tab,
              link: item.url || "#",
              description: item.description || "",
            }));
          } catch (fetchErr) {
            newArticles[tab] = [];
          }
        }

        setArticlesByCategory(newArticles);
        localStorage.setItem("articlesByCategory", JSON.stringify(newArticles));
        localStorage.setItem("articlesTimestamp", now.toString());
      } catch (err) {
        const cachedData = localStorage.getItem("articlesByCategory");
        if (cachedData) {
          setArticlesByCategory(JSON.parse(cachedData));
        } else {
          setErrorMsg("Failed to load news. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchArticles();
  }, [forceFetchKey, apiBase]);

  const refresh = () => {
    localStorage.removeItem("articlesByCategory");
    localStorage.removeItem("articlesTimestamp");
    setForceFetchKey(Date.now());
  };

  const activeArticles = articlesByCategory[activeTab] || [];

  return (
    <Container maxWidth="xl" sx={{ px: { xs: 4, sm: 6, md: 8 }, py: { xs: 8, md: 12 } }}>
      <Typography variant="overline" sx={{ display: "block", textAlign: "center", color: "text.secondary", mb: 2 }}>
        All property needs · one portal
      </Typography>
      <Typography variant="h2" sx={{ textAlign: "center", color: "primary.main", mb: { xs: 8, md: 10 } }}>
        Find better places to live, work and wonder
      </Typography>

      <Stack direction={{ xs: "column", md: "row" }} spacing={8} alignItems="flex-start">
        <Box
          sx={{
            flex: 1,
            width: "100%",
            p: { xs: 6, md: 8 },
            borderRadius: `${radii.lg}px`,
            backgroundColor: "background.paper",
            boxShadow: elevationShadows[1],
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
            <Box>
              <Typography variant="h3" sx={{ color: "primary.main", fontSize: { xs: "1.25rem", md: "1.5rem" } }}>
                Top articles on home buying
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                From beginner checklists to pro tips
              </Typography>
            </Box>
            <Button size="small" onClick={refresh} sx={{ color: "primary.main", flexShrink: 0 }}>
              Refresh
            </Button>
          </Stack>

          <Stack
            direction="row"
            spacing={6}
            sx={{ borderBottom: "1px solid", borderColor: "divider", overflowX: "auto", mb: 6 }}
          >
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <Box
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  sx={{
                    position: "relative",
                    pb: 3,
                    flexShrink: 0,
                    cursor: "pointer",
                    color: active ? "primary.main" : "text.secondary",
                    fontWeight: active ? 700 : 600,
                    fontSize: 14,
                    whiteSpace: "nowrap",
                    "&:hover": { color: "primary.main" },
                  }}
                >
                  {tab}
                  {active && (
                    <Box
                      component={motion.div}
                      layoutId="news-tab-underline"
                      sx={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "secondary.main", borderRadius: 999 }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>

          {errorMsg && (
            <Box sx={{ p: 4, backgroundColor: "#FFF3F2", color: "#A13838", borderRadius: `${radii.sm}px`, mb: 4 }}>
              <Typography variant="body2">{errorMsg}</Typography>
            </Box>
          )}

          <Box
            sx={{
              display: "grid",
              gap: 5,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(auto-fit, minmax(250px, 1fr))" },
            }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Stack key={i} direction="row" spacing={3}>
                    <Skeleton variant="rounded" width={80} height={60} />
                    <Stack spacing={2} sx={{ flex: 1 }}>
                      <Skeleton variant="text" width="90%" />
                      <Skeleton variant="text" width="40%" />
                    </Stack>
                  </Stack>
                ))
              : activeArticles.map((article) => (
                  <Stack
                    key={article.id}
                    component="a"
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    direction="row"
                    spacing={3}
                    sx={{
                      p: 2,
                      borderRadius: `${radii.sm}px`,
                      textDecoration: "none",
                      transition: "background-color .2s ease, transform .2s ease",
                      "&:hover": { backgroundColor: "background.default", transform: "translateX(4px)" },
                    }}
                  >
                    <Box
                      component="img"
                      src={article.image}
                      alt={article.title}
                      sx={{ width: 80, height: 60, borderRadius: `${radii.sm}px`, objectFit: "cover", flexShrink: 0 }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: "primary.main",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {article.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {article.date}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
          </Box>
        </Box>

        <Box
          sx={{
            width: { xs: "100%", md: 420 },
            flexShrink: 0,
            borderRadius: `${radii.lg}px`,
            overflow: "hidden",
            backgroundColor: "background.paper",
            boxShadow: elevationShadows[1],
            position: { md: "sticky" },
            top: { md: 96 },
          }}
        >
          <Box
            component="img"
            src="https://images.unsplash.com/photo-1556912173-46c336c7fd55?w=800&h=500&fit=crop"
            alt="Buy a home"
            sx={{ width: "100%", height: { xs: 180, md: 260 }, objectFit: "cover" }}
          />
          <Box sx={{ p: { xs: 5, md: 7 } }}>
            <Typography variant="overline" sx={{ color: "text.secondary" }}>
              Buy a home
            </Typography>
            <Typography variant="h3" sx={{ color: "primary.main", fontSize: "1.4rem", my: 3 }}>
              Find, buy & own your dream home
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mb: 6 }}>
              Explore apartments, land, builder floors, villas and more.
            </Typography>
            <Button
              fullWidth
              variant="contained"
              endIcon={<ChevronRight size={18} />}
              onClick={() => navigate("/search")}
            >
              Explore buying
            </Button>
          </Box>
        </Box>
      </Stack>
    </Container>
  );
};

export default PropertyHeroSection;

import React, { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import { CheckCircle2, Clock, Eye, LayoutList, LifeBuoy, MessageSquare, PauseCircle, PencilLine, PlayCircle, Share2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNavigationBar from "../Dashboard/TopNavigationBar";
import ManageLayout, { SideCard } from "../../components/manage/ManageLayout";
import ListingRow from "../../components/manage/ListingRow";
import ListingToolbar from "../../components/manage/ListingToolbar";
import ShareDialog from "../../components/ui/ShareDialog";
import PostPromos from "../../components/postForm/PostPromos";
import { formatBudget } from "./FlatmateCard";
import EditFlatmateDialog from "./EditFlatmateDialog";

const NAV_ITEMS = ["For Buyers", "For Tenants", "For Owners", "For Dealers / Builders", "Insights"];
const GENDER = { female: "Women only", male: "Men only", any: "Anyone" };

function status(l) {
  if (l.isActive) return { key: "live", label: "Live" };
  if (l.isPostedNew) return { key: "review", label: "Under Review", note: "Our team is reviewing this listing. It shows in flatmate search once approved." };
  return { key: "inactive", label: "Paused", note: "Hidden from flatmate search. Activate it to show it again." };
}

function quality(l) {
  const photos = (l.photos || []).length;
  const parts = [
    [30 * Math.min(1, photos / 4), "Add 4+ photos"],
    [20 * Math.min(1, String(l.description || "").length / 200), "Describe the room & household"],
    [15 * Math.min(1, (l.amenities || []).length / 5), "Tick more amenities"],
    [l.area ? 15 : 0, "Add the locality"],
    [l.budget?.min ? 10 : 0, "Add the rent"],
    [l.moveInDate ? 10 : 0, "Add the move-in date"],
  ];
  const max = [30, 20, 15, 15, 10, 10];
  const value = Math.round(parts.reduce((s, [v]) => s + v, 0));
  const worst = parts.map(([v, tip], i) => [max[i] - v, tip]).sort((a, b) => b[0] - a[0])[0];
  return { value, tip: value >= 100 ? "Complete listing" : `Tip: ${worst[1]}` };
}

const SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "views", label: "Most Viewed" },
  { value: "enquiries", label: "Most Enquiries" },
  { value: "rent-low", label: "Rent: Low To High" },
  { value: "rent-high", label: "Rent: High To Low" },
];

/** /flatmatesmylistings — the rooms a user has listed for flatmates. */
export default function FlatmatesListings() {
  const navigate = useNavigate();
  const token = localStorage.getItem("accessToken");
  const base = process.env.REACT_APP_Base_API;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${base}/api/flatmates/user/listings?limit=100&page=1`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(async (res) => {
        if (res.status === 401) {
          navigate("/login", { state: { from: "/flatmatesmylistings" } });
          return null;
        }
        if (!res.ok) throw new Error("Couldn't load your listings.");
        return res.json();
      })
      .then((data) => !cancelled && data && setItems(data.data?.items || []))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [base, token, reload, navigate]);

  const counts = useMemo(() => {
    const c = { all: items.length, live: 0, review: 0, inactive: 0, views: 0, enquiries: 0 };
    items.forEach((l) => {
      c[status(l).key] += 1;
      c.views += l.views || 0;
      c.enquiries += l.enquiryCount || 0;
    });
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rent = (l) => Number(l.budget?.min) || 0;
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      views: (a, b) => (b.views || 0) - (a.views || 0),
      enquiries: (a, b) => (b.enquiryCount || 0) - (a.enquiryCount || 0),
      "rent-low": (a, b) => rent(a) - rent(b),
      "rent-high": (a, b) => rent(b) - rent(a),
    }[sort];
    return items
      .filter((l) => (tab === "all" || status(l).key === tab) && (!q || [l.title, l.area, l.city].some((v) => String(v || "").toLowerCase().includes(q))))
      .sort(by);
  }, [items, tab, query, sort]);

  const toggle = async (l) => {
    setBusy(true);
    try {
      const res = await fetch(`${base}/api/flatmates/listings/${l._id}?active=${!l.isActive}`, { method: "DELETE", credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Couldn't update the listing.");
      setItems((list) => list.map((x) => (x._id === l._id ? { ...x, isActive: Boolean(data.data?.isActive ?? !l.isActive) } : x)));
      setToast({ severity: "success", text: l.isActive ? "Listing paused." : "Listing is live again." });
    } catch (e) {
      setToast({ severity: "error", text: e.message });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  const open = (l) => navigate(`/flatmatesearchpropertymodal/${l._id}`);

  return (
    <ManageLayout
      nav={<TopNavigationBar navItems={NAV_ITEMS} />}
      eyebrow="Flatmates · My Listings"
      title="My Room Listings"
      subtitle="See how your rooms are doing, update details and pause a listing once the room is taken."
      action={{ label: "List A Room", onClick: () => navigate("/flatmateslistingform") }}
      stats={[
        { icon: LayoutList, label: "All Listings", value: counts.all, onClick: () => setTab("all"), active: tab === "all" },
        { icon: CheckCircle2, label: "Live", value: counts.live, tone: "#16A34A", onClick: () => setTab("live"), active: tab === "live" },
        { icon: Clock, label: "Under Review", value: counts.review, tone: "#F59E0B", onClick: () => setTab("review"), active: tab === "review" },
        { icon: PauseCircle, label: "Paused", value: counts.inactive, tone: "#64748B", onClick: () => setTab("inactive"), active: tab === "inactive" },
        { icon: Eye, label: "Total Views", value: counts.views, tone: "#0EA5E9" },
        { icon: MessageSquare, label: "Enquiries", value: counts.enquiries, tone: "#7C3AED" },
      ]}
      aside={
        <>
          <SideCard title="Find The Right Flatmate">
            <Stack component="ul" spacing={1.5} sx={{ m: 0, pl: 5, color: "text.secondary", fontSize: 14 }}>
              <li>Meet in person or on video before agreeing</li>
              <li>Never pay a deposit before seeing the room</li>
              <li>Agree on rent split, bills and house rules in writing</li>
              <li>Pause the listing as soon as the room is taken</li>
            </Stack>
          </SideCard>
          <PostPromos type="rent" />
          <SideCard title="Need Help?">
            <Button variant="outlined" size="small" startIcon={<LifeBuoy size={15} />} onClick={() => navigate("/support")} sx={{ borderRadius: 999, fontWeight: 700 }}>
              Contact Support
            </Button>
          </SideCard>
        </>
      }
    >
      <ListingToolbar
        tabs={[
          { value: "all", label: "All", count: counts.all },
          { value: "live", label: "Live", count: counts.live },
          { value: "review", label: "Under Review", count: counts.review },
          { value: "inactive", label: "Paused", count: counts.inactive },
        ]}
        tab={tab}
        onTab={setTab}
        query={query}
        onQuery={setQuery}
        sorts={SORTS}
        sort={sort}
        onSort={setSort}
        placeholder="Search by title or locality"
      />
      {error && (
        <Alert severity="error" sx={{ mb: 4 }} action={<Button color="inherit" onClick={() => setReload((r) => r + 1)}>Retry</Button>}>
          {error}
        </Alert>
      )}
      <Stack spacing={4}>
        {loading && [0, 1].map((i) => <Skeleton key={i} variant="rounded" height={210} sx={{ borderRadius: 4 }} />)}
        {!loading &&
          visible.map((l) => {
            const st = status(l);
            const photos = (l.photos || []).map((p) => (typeof p === "string" ? p : p?.url)).filter(Boolean);
            const left = Math.max(0, (Number(l.occupancyWanted) || 0));
            return (
              <ListingRow
                key={l._id}
                image={photos[0]}
                imageCount={photos.length}
                badge={GENDER[l.preferredGender] || "Anyone"}
                price={formatBudget(l.budget)}
                title={l.title}
                location={[l.area, l.city].filter(Boolean).join(", ")}
                facts={[
                  `${left} ${left === 1 ? "spot" : "spots"} open`,
                  l.currentOccupants != null ? `${l.currentOccupants} living there` : null,
                  l.furnished ? "Furnished" : "Unfurnished",
                  l.moveInDate ? (new Date(l.moveInDate) <= new Date() ? "Available now" : `From ${new Date(l.moveInDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`) : null,
                ].filter(Boolean)}
                status={st}
                stats={[
                  { icon: Eye, label: "Views", value: l.views || 0 },
                  { icon: MessageSquare, label: "Enquiries", value: l.enquiryCount || 0 },
                  { icon: Users, label: "Spots", value: left },
                ]}
                quality={quality(l)}
                onOpen={() => open(l)}
                meta={l.createdAt ? `Posted ${new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                actions={[
                  { label: "Edit", icon: PencilLine, onClick: () => setEditing(l), primary: true },
                  { label: "View", icon: Eye, onClick: () => open(l) },
                ]}
                menu={[
                  { label: "Share Listing", icon: Share2, onClick: () => setSharing(l), disabled: st.key !== "live" },
                  st.key === "review"
                    ? { label: "Activate (after approval)", icon: PlayCircle, onClick: () => {}, disabled: true }
                    : l.isActive
                    ? { label: "Pause Listing", icon: PauseCircle, onClick: () => setConfirm(l), danger: true }
                    : { label: "Activate Listing", icon: PlayCircle, onClick: () => setConfirm(l) },
                ]}
              />
            );
          })}
        {!loading && !error && !visible.length && (
          <Stack alignItems="center" spacing={3} sx={{ py: 12, px: 4, textAlign: "center", borderRadius: 4, backgroundColor: "background.paper", border: "1px dashed", borderColor: "divider" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.main" }}>
              <Users size={28} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.2rem" }}>{items.length ? "No listings match" : "No rooms listed yet"}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              {items.length ? "Try another tab or clear the search." : "Have a spare room? List it free and find a flatmate."}
            </Typography>
            {items.length ? (
              <Button onClick={() => { setTab("all"); setQuery(""); }} sx={{ fontWeight: 700 }}>
                Show All Listings
              </Button>
            ) : (
              <Button variant="contained" color="secondary" onClick={() => navigate("/flatmateslistingform")} sx={{ borderRadius: 999, fontWeight: 800, px: 6 }}>
                List A Room
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Dialog open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)} maxWidth="xs" fullWidth>
        {confirm && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: "primary.main" }}>{confirm.isActive ? "Pause This Listing?" : "Activate This Listing?"}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {confirm.isActive ? "It will be hidden from flatmate search. You can activate it again any time." : "It will show in flatmate search again."}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 5, pb: 4 }}>
              <Button onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" color={confirm.isActive ? "error" : "secondary"} onClick={() => toggle(confirm)} disabled={busy} sx={{ fontWeight: 800 }}>
                {busy ? "Saving…" : confirm.isActive ? "Pause Listing" : "Activate"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {editing && (
        <EditFlatmateDialog
          listing={editing}
          token={token}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setItems((list) => list.map((x) => (x._id === editing._id ? { ...x, ...updated, enquiryCount: x.enquiryCount } : x)));
            setEditing(null);
            setToast({ severity: "success", text: "Changes saved and sent for review." });
          }}
        />
      )}

      <ShareDialog open={Boolean(sharing)} onClose={() => setSharing(null)} link={sharing ? `${window.location.origin}/flatmatesearchpropertymodal/${sharing._id}` : ""} title={sharing?.title || "Share room"} />
      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.text}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </ManageLayout>
  );
}

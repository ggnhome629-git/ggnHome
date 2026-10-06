import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Pagination, Skeleton, Snackbar, Stack, Typography } from "@mui/material";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  Heart,
  Home,
  LayoutList,
  LifeBuoy,
  MessageCircle,
  MessageSquare,
  PauseCircle,
  PencilLine,
  PlayCircle,
  Share2,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ManageLayout, { SideCard } from "../../components/manage/ManageLayout";
import ListingRow from "../../components/manage/ListingRow";
import ListingToolbar from "../../components/manage/ListingToolbar";
import ShareDialog from "../../components/ui/ShareDialog";
import PostPromos from "../../components/postForm/PostPromos";

const PER_PAGE = 10;

const isRental = (p) => {
  const t = String(p.defaultpropertytype || p.defaultPropertyType || p.propertyCategory || "").toLowerCase();
  if (t) return t.includes("rent");
  return p.monthlyRent != null;
};

/** Live / under review / paused, in plain words. */
export function listingStatus(p) {
  // Live wins: agent/admin sale listings go live at once and may still carry
  // the default isPostedNew flag.
  if (p.isActive) return { key: "live", label: "Live" };
  if (p.isPostedNew && p.isEdited) return { key: "review", label: "Changes In Review", note: "Your edits are being reviewed. The listing is offline until our team approves them." };
  if (p.isPostedNew) return { key: "review", label: "Under Review", note: "Our team is reviewing this listing. It goes live as soon as it's approved." };
  return { key: "inactive", label: "Paused", note: "Hidden from search. Activate it to show it again." };
}

/** Rough 0–100 completeness, with the most valuable missing item as a tip. */
function listingQuality(p) {
  const rent = isRental(p);
  const plot = p.propertyType === "plot";
  const photos = (p.images || []).length;
  const items = [
    [25 * Math.min(1, photos / 5), 25, "Add 5+ photos"],
    [15 * Math.min(1, String(p.description || "").trim().length / 100), 15, "Write a fuller description"],
    [p.totalArea?.sqft ? 10 : 0, 10, "Add the area"],
    [plot || p.bedrooms ? 10 : 0, 10, "Add bedrooms"],
    [plot || p.bathrooms ? 5 : 0, 5, "Add bathrooms"],
    [p.Sector ? 10 : 0, 10, "Add the sector"],
    [(rent ? p.monthlyRent : p.price) ? 10 : 0, 10, "Add the price"],
    [(p.address || p.location) ? 5 : 0, 5, "Add the address"],
    [plot || p.furnishing || (p.appliances || []).length ? 5 : 0, 5, "Add furnishing"],
    [p.parking ? 5 : 0, 5, "Add parking"],
  ];
  const value = Math.round(items.reduce((s, [got]) => s + got, 0));
  const worst = items.map(([got, max, tip]) => [max - got, tip]).sort((a, b) => b[0] - a[0])[0];
  return { value, tip: value >= 100 ? "Complete listing" : `Tip: ${worst[1]} (edit the listing)` };
}

function priceLabel(p) {
  if (isRental(p)) return p.monthlyRent ? `₹${Number(p.monthlyRent).toLocaleString("en-IN")}/mo` : "Rent not set";
  const n = Number(p.price);
  if (!n) return "Price not set";
  if (n >= 1e7) return `₹${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${+(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

function since(date) {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

const SORTS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "views", label: "Most Viewed" },
  { value: "enquiries", label: "Most Enquiries" },
  { value: "price-high", label: "Price: High To Low" },
  { value: "price-low", label: "Price: Low To High" },
];

/**
 * Manage-listings page shared by owners (/my-properties) and agents
 * (/agent/my-properties). Loads every listing once (owners rarely have
 * more than a few dozen) so tabs, search and sort work across all of them.
 */
export default function ManageProperties({
  nav,
  footer,
  token,
  EditModal,
  title = "My Listings",
  eyebrow = "Manage Listings",
  postPath = "/add-property",
  detailPath = (rent, id) => (rent ? `/Rentaldetails/${id}` : `/Saledetails/${id}`),
  analyticsPath = (id) => `/property-analytics/${id}`,
  supportPath = "/support",
  loginPath = "/login",
}) {
  const navigate = useNavigate();
  const base = process.env.REACT_APP_Base_API;
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [tab, setTab] = useState("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // { kind: "toggle" | "edit", p }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sharing, setSharing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`${base}/api/properties/my?limit=200&page=1`, { credentials: "include", headers: authHeaders })
      .then(async (res) => {
        if (res.status === 401) {
          navigate(loginPath, { state: { from: window.location.pathname } });
          return null;
        }
        if (!res.ok) throw new Error("Couldn't load your listings.");
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setItems((data.properties || []).filter(Boolean));
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [base, authHeaders, reload, navigate, loginPath]);

  const counts = useMemo(() => {
    const c = { all: items.length, live: 0, review: 0, inactive: 0, views: 0, enquiries: 0, saves: 0 };
    items.forEach((p) => {
      c[listingStatus(p).key] += 1;
      c.views += p.viewCount || 0;
      c.enquiries += p.enquiryCount || 0;
      c.saves += p.saveCount || 0;
    });
    return c;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((p) => {
      if (tab !== "all" && listingStatus(p).key !== tab) return false;
      if (type === "rent" && !isRental(p)) return false;
      if (type === "sale" && isRental(p)) return false;
      if (!q) return true;
      return [p.title, p.Sector, p.address, p.location, p.totalArea?.configuration].some((v) => String(v || "").toLowerCase().includes(q));
    });
    const amount = (p) => Number(p.monthlyRent ?? p.price) || 0;
    const by = {
      newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
      views: (a, b) => (b.viewCount || 0) - (a.viewCount || 0),
      enquiries: (a, b) => (b.enquiryCount || 0) - (a.enquiryCount || 0),
      "price-high": (a, b) => amount(b) - amount(a),
      "price-low": (a, b) => amount(a) - amount(b),
    }[sort];
    return list.sort(by);
  }, [items, tab, type, query, sort]);

  useEffect(() => setPage(1), [tab, type, query, sort]);
  const pageItems = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pages = Math.ceil(visible.length / PER_PAGE);

  const toggle = useCallback(
    async (p) => {
      setBusy(true);
      try {
        const res = await fetch(`${base}/api/user/delete-property/${p._id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || "Couldn't update the listing.");
        const nowActive = data.property ? Boolean(data.property.isActive) : !p.isActive;
        setItems((list) => list.map((x) => (x._id === p._id ? { ...x, isActive: nowActive } : x)));
        setToast({ severity: "success", text: nowActive ? "Listing is live again." : "Listing paused — it's hidden from search." });
      } catch (e) {
        setToast({ severity: "error", text: e.message });
      } finally {
        setBusy(false);
        setConfirm(null);
      }
    },
    [base, authHeaders]
  );

  const openEdit = (p) => {
    // Editing a live listing sends it back for review, so say so first.
    if (listingStatus(p).key === "live") setConfirm({ kind: "edit", p });
    else setEditing(p);
  };

  const publicLink = (p) => `${window.location.origin}${isRental(p) ? `/Rentaldetails/${p._id}` : `/Saledetails/${p._id}`}`;

  const stats = [
    { icon: LayoutList, label: "All Listings", value: counts.all, onClick: () => setTab("all"), active: tab === "all" },
    { icon: CheckCircle2, label: "Live", value: counts.live, tone: "#16A34A", onClick: () => setTab("live"), active: tab === "live" },
    { icon: Clock, label: "Under Review", value: counts.review, tone: "#F59E0B", onClick: () => setTab("review"), active: tab === "review" },
    { icon: PauseCircle, label: "Paused", value: counts.inactive, tone: "#64748B", onClick: () => setTab("inactive"), active: tab === "inactive" },
    { icon: Eye, label: "Total Views", value: counts.views.toLocaleString("en-IN"), tone: "#0EA5E9" },
    { icon: MessageSquare, label: "Enquiries", value: counts.enquiries.toLocaleString("en-IN"), tone: "#7C3AED" },
  ];

  const aside = (
    <>
      <SideCard title="Performance">
        <Stack spacing={3}>
          {[
            [Eye, "Views", counts.views],
            [Heart, "Saved by people", counts.saves],
            [MessageSquare, "Enquiries", counts.enquiries],
            [Star, "Rated listings", items.filter((p) => p.ratingCount).length],
          ].map(([Icon, label, value]) => (
            <Stack key={label} direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={2} alignItems="center" sx={{ color: "text.secondary" }}>
                <Icon size={16} />
                <Typography variant="body2">{label}</Typography>
              </Stack>
              <Typography sx={{ fontWeight: 800, color: "primary.main" }}>{Number(value).toLocaleString("en-IN")}</Typography>
            </Stack>
          ))}
        </Stack>
      </SideCard>
      <SideCard title="Get More Enquiries">
        <Stack component="ul" spacing={1.5} sx={{ m: 0, pl: 5, color: "text.secondary", fontSize: 14 }}>
          <li>Add 5 or more bright photos of every room</li>
          <li>Write a few lines on the society and what's nearby</li>
          <li>Keep the price and availability up to date</li>
          <li>Pause listings that are no longer available</li>
        </Stack>
      </SideCard>
      <PostPromos />
      <SideCard title="Need Help?">
        <Stack direction="row" spacing={2}>
          <Button variant="outlined" size="small" startIcon={<LifeBuoy size={15} />} onClick={() => navigate(supportPath)} sx={{ borderRadius: 999, fontWeight: 700 }}>
            Support
          </Button>
          <Button variant="outlined" size="small" startIcon={<MessageCircle size={15} />} onClick={() => navigate("/chatbot")} sx={{ borderRadius: 999, fontWeight: 700 }}>
            Chat
          </Button>
        </Stack>
      </SideCard>
    </>
  );

  return (
    <ManageLayout
      nav={nav}
      footer={footer}
      eyebrow={eyebrow}
      title={title}
      subtitle="Track how your properties are doing, keep details fresh and pause listings that are no longer available."
      action={{ label: "Post Property", onClick: () => navigate(postPath) }}
      stats={stats}
      aside={aside}
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
        types={[
          { value: "all", label: "All" },
          { value: "rent", label: "Rent" },
          { value: "sale", label: "Sale" },
        ]}
        type={type}
        onType={setType}
        query={query}
        onQuery={setQuery}
        sorts={SORTS}
        sort={sort}
        onSort={setSort}
        placeholder="Search by title, sector or address"
      />

      {error && (
        <Alert severity="error" sx={{ mb: 4 }} action={<Button color="inherit" onClick={() => setReload((r) => r + 1)}>Retry</Button>}>
          {error}
        </Alert>
      )}

      <Stack spacing={4}>
        {loading &&
          [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={210} sx={{ borderRadius: 4 }} />)}

        {!loading &&
          pageItems.map((p) => {
            const rent = isRental(p);
            const st = listingStatus(p);
            const live = st.key === "live";
            const conf = p.totalArea?.configuration || (p.bedrooms ? `${p.bedrooms} BHK` : null);
            return (
              <ListingRow
                key={p._id}
                image={(p.images || [])[0]}
                imageCount={(p.images || []).length}
                badge={rent ? "For Rent" : "For Sale"}
                price={priceLabel(p)}
                title={p.title || "Untitled listing"}
                location={[p.Sector, "Gurgaon"].filter(Boolean).join(", ")}
                facts={[conf, p.bathrooms ? `${p.bathrooms} Bath` : null, p.totalArea?.sqft ? `${Math.round(p.totalArea.sqft).toLocaleString("en-IN")} sqft` : null, p.furnishing ? p.furnishing.replace("-", " ") : null].filter(Boolean)}
                status={st}
                stats={[
                  { icon: Eye, label: "Views", value: p.viewCount || 0 },
                  { icon: Heart, label: "Saves", value: p.saveCount || 0 },
                  { icon: MessageSquare, label: "Enquiries", value: p.enquiryCount || 0 },
                ]}
                quality={listingQuality(p)}
                onOpen={() => navigate(detailPath(rent, p._id), { state: { preview: true } })}
                meta={since(p.createdAt)}
                actions={[
                  { label: "Edit", icon: PencilLine, onClick: () => openEdit(p), primary: true },
                  { label: "View", icon: Eye, onClick: () => navigate(detailPath(rent, p._id), { state: { preview: true } }) },
                  { label: "Analytics", icon: BarChart3, onClick: () => navigate(analyticsPath(p._id)) },
                ]}
                menu={[
                  { label: "Share Listing", icon: Share2, onClick: () => setSharing(p), disabled: !live },
                  st.key === "review"
                    ? { label: "Activate (after approval)", icon: PlayCircle, onClick: () => {}, disabled: true }
                    : live
                    ? { label: "Pause Listing", icon: PauseCircle, onClick: () => setConfirm({ kind: "toggle", p }), danger: true }
                    : { label: "Activate Listing", icon: PlayCircle, onClick: () => setConfirm({ kind: "toggle", p }) },
                ]}
              />
            );
          })}

        {!loading && !error && !visible.length && (
          <Stack alignItems="center" spacing={3} sx={{ py: 12, px: 4, textAlign: "center", borderRadius: 4, backgroundColor: "background.paper", border: "1px dashed", borderColor: "divider" }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", display: "grid", placeItems: "center", backgroundColor: "rgba(0,167,157,0.1)", color: "secondary.main" }}>
              <Home size={28} />
            </Box>
            <Typography sx={{ fontWeight: 800, color: "primary.main", fontSize: "1.2rem" }}>{items.length ? "No listings match" : "You haven't posted anything yet"}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 420 }}>
              {items.length ? "Try another tab or clear the search." : "Post your first property for free — it takes about 3 minutes."}
            </Typography>
            {items.length ? (
              <Button onClick={() => { setTab("all"); setType("all"); setQuery(""); }} sx={{ fontWeight: 700 }}>
                Show All Listings
              </Button>
            ) : (
              <Button variant="contained" color="secondary" onClick={() => navigate(postPath)} sx={{ borderRadius: 999, fontWeight: 800, px: 6 }}>
                Post Property
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      {pages > 1 && (
        <Stack alignItems="center" sx={{ mt: 6 }}>
          <Pagination count={pages} page={page} onChange={(e, v) => { setPage(v); window.scrollTo({ top: 0, behavior: "smooth" }); }} color="secondary" shape="rounded" />
        </Stack>
      )}

      <Dialog open={Boolean(confirm)} onClose={() => !busy && setConfirm(null)} maxWidth="xs" fullWidth>
        {confirm?.kind === "toggle" && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: "primary.main" }}>{confirm.p.isActive ? "Pause This Listing?" : "Activate This Listing?"}</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {confirm.p.isActive
                  ? "It will be hidden from search and nobody new can enquire. You can activate it again any time."
                  : "It will show in search again and people can enquire."}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 5, pb: 4 }}>
              <Button onClick={() => setConfirm(null)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" color={confirm.p.isActive ? "error" : "secondary"} onClick={() => toggle(confirm.p)} disabled={busy} sx={{ fontWeight: 800 }}>
                {busy ? "Saving…" : confirm.p.isActive ? "Pause Listing" : "Activate"}
              </Button>
            </DialogActions>
          </>
        )}
        {confirm?.kind === "edit" && (
          <>
            <DialogTitle sx={{ fontWeight: 800, color: "primary.main" }}>Edit A Live Listing?</DialogTitle>
            <DialogContent>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Saved changes go to our team for a quick review. The listing is offline until they're approved.
              </Typography>
            </DialogContent>
            <DialogActions sx={{ px: 5, pb: 4 }}>
              <Button onClick={() => setConfirm(null)}>Cancel</Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => {
                  setEditing(confirm.p);
                  setConfirm(null);
                }}
                sx={{ fontWeight: 800 }}
              >
                Continue To Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {EditModal && editing && (
        <EditModal
          propertyId={editing._id}
          isOpen={Boolean(editing)}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setToast({ severity: "success", text: "Changes saved and sent for review." });
            setReload((r) => r + 1);
          }}
        />
      )}

      <ShareDialog open={Boolean(sharing)} onClose={() => setSharing(null)} link={sharing ? publicLink(sharing) : ""} title={sharing?.title || "Share listing"} />

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)} sx={{ fontWeight: 600 }}>
            {toast.text}
          </Alert>
        ) : (
          <span />
        )}
      </Snackbar>
    </ManageLayout>
  );
}

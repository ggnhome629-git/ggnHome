import { API_BASE } from "./apiBase.js";
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2,
  ChevronRight, CircleUserRound, ClipboardList, Download, Home, LogOut, Menu,
  MessageSquare, Plus, RefreshCw, ShieldCheck, Smartphone, Sparkles, UploadCloud, X,
} from "lucide-react";

const API = API_BASE;
const LOGO = "https://www.ggnhome.com/Logo2.jpg";
const emptyProperty = {
  purpose: "sale", title: "", propertyType: "apartment", address: "", sector: "",
  price: "", area: "", bedrooms: "2", bathrooms: "2", ownerName: "", ownerMobile: "",
};

async function request(path, options = {}, token = "") {
  const headers = new Headers(options.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, { ...options, headers, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `Request failed (${response.status})`);
  return data;
}

function rows(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) if (Array.isArray(data?.[key])) return data[key];
  return [];
}
const money = value => value == null || value === "" ? "Price on request" : `₹${Number(value).toLocaleString("en-IN")}`;
// Public page of a listing on the GgnHome website (sale and rent pages are separate).
const SITE = "https://www.ggnhome.com";
const propertyUrl = item => item?._id ? `${SITE}${item.propertyType === "rental" || item.defaultpropertytype === "rental" ? "/Rentaldetails/" : "/Saledetails/"}${item._id}` : "";
const displayDate = value => value ? new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

function Brand({ small = false }) {
  return <div className="brand"><img src={LOGO} alt="GgnHome logo" /><div><strong>GgnHome<span>-Partner</span></strong>{!small && <small>PARTNER WORKSPACE</small>}</div></div>;
}

function AuthScreen({ onLogin }) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const normalized = mobile.replace(/\D/g, "").slice(-10);

  function completePartnerLogin(data) {
    if (!data.accessToken) throw new Error("OTP was verified but no login token was returned.");
    if (data.agent?.role === "Agent") throw new Error("This number is registered as a standard Agent, not a Partner. Contact GgnHome admin.");
    if (data.agent?.role !== "Partner") throw new Error("This mobile number is not registered for Partner Portal access. Ask a GgnHome administrator to register it first.");
    if (data.agent.status === "suspended") throw new Error("This Partner account is suspended. Contact GgnHome support.");
    if (data.agent.status !== "active") throw new Error("This Partner account is not active yet. Contact GgnHome admin.");
    if (!data.agentAccessToken) throw new Error("OTP was verified, but a Partner session could not be created. Please try again.");
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("partnerAccessToken", data.agentAccessToken);
    onLogin(data.agentAccessToken);
  }

  async function sendOtp() {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalized)) return setError("Enter a valid 10-digit Indian mobile number.");
    setBusy(true);
    try {
      const data = await request("/partner/login/request-otp", { method: "POST", body: JSON.stringify({ mobileNumber: normalized }) });
      setSent(true); setNotice(data.message || "OTP sent. It is valid for 5 minutes.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function verifyOtp() {
    setError(""); setNotice("");
    const code = otp.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return setError("Enter the 4-letter OTP you received.");
    setBusy(true);
    try {
      const data = await request("/partner/login/verify-otp", { method: "POST", body: JSON.stringify({ mobileNumber: normalized, otp: code }) });
      completePartnerLogin(data);
    } catch (e) { setError(e.message || "OTP verification failed."); } finally { setBusy(false); }
  }

  return (
    <main className="auth-layout">
      <section className="auth-visual">
        <Brand />
        <div className="auth-visual-copy">
          <div className="eyebrow"><ShieldCheck size={15} /> BUILT FOR PROPERTY PARTNERS</div>
          <h1>Your property network.<br /><em>One clear workspace.</em></h1>
          <p>Manage listings, respond to enquiries and keep every property moving with GgnHome.</p>
          <div className="auth-benefits"><span><CheckCircle2 size={17} /> Manage property listings</span><span><CheckCircle2 size={17} /> Keep track of leads</span><span><CheckCircle2 size={17} /> Reach enquiries faster</span></div>
        </div>
        <div className="visual-footer">GgnHome · Get Space & Get Rewarded</div>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <Brand small />
          <div className="eyebrow dark">SECURE PARTNER LOGIN</div>
          <h2>Sign in to PartnerHub</h2>
          <p className="muted">Only mobile numbers registered by GgnHome admin can access this portal. OTP verification is required for every login.</p>
          {error && <div className="alert error">{error}</div>}
          {notice && <div className="alert info">{notice}</div>}
          <label>Mobile number</label>
          <div className="input-with-prefix"><span>+91</span><input value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" disabled={sent || busy} /></div>
          {!sent ? <button className="primary full" onClick={sendOtp} disabled={busy}>{busy ? "Sending code…" : "Send OTP"} <ArrowRight size={17} /></button> : <>
            <label>4-letter OTP</label>
            <input className="otp-input" value={otp} onChange={e => setOtp(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="e.g. ABCF" maxLength={4} disabled={busy} />
            <button className="primary full" onClick={verifyOtp} disabled={busy}>{busy ? "Verifying…" : "Verify OTP and sign in"} <ArrowRight size={17} /></button>
            <button className="text-button" onClick={() => { setSent(false); setOtp(""); setError(""); setNotice(""); }} disabled={busy}>Change mobile number</button>
          </>}
          <p className="fine-print">Need access? Ask a GgnHome administrator to register your mobile number. Self-registration is disabled.</p>
        </div>
      </section>
    </main>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("partnerAccessToken") || "");
  const [page, setPage] = useState("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState({});
  const [apps, setApps] = useState([]);
  const [property, setProperty] = useState(emptyProperty);
  const [photo, setPhoto] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const nav = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "properties", label: "My properties", icon: Building2 },
    { id: "add", label: "Add property", icon: Plus },
    { id: "ai-leads", label: "AI leads", icon: Sparkles },
    { id: "leads", label: "Leads", icon: ClipboardList },
    { id: "enquiries", label: "Enquiries", icon: MessageSquare },
    { id: "downloads", label: "App downloads", icon: Download },
    { id: "profile", label: "My profile", icon: CircleUserRound },
  ];

  const title = nav.find(x => x.id === page)?.label || "Overview";
  const listProperties = useMemo(() => rows(data.properties, ["properties", "listings", "data"]), [data.properties]);
  const listLeads = useMemo(() => rows(data.leads, ["leads", "preferences", "data"]), [data.leads]);
  const listEnquiries = useMemo(() => rows(data.enquiries, ["enquiries", "data"]), [data.enquiries]);

  async function loadPage(target = page, currentToken = token) {
    if (!currentToken) return;
    setLoading(true); setError(""); setNotice("");
    try {
      if (target === "downloads") {
        setApps(await request("/api/app-downloads"));
      } else if (target === "overview") {
        const [dashboard, properties, leads, enquiries] = await Promise.all([
          request("/api/partner/dashboard", {}, currentToken),
          request("/api/partner/properties", {}, currentToken),
          request("/api/partner/leads", {}, currentToken),
          request("/api/partner/enquiries", {}, currentToken),
        ]);
        setData({ dashboard, properties, leads, enquiries });
      } else if (target === "properties") {
        const properties = await request("/api/partner/properties", {}, currentToken);
        setData(prev => ({ ...prev, properties }));
      } else if (target === "leads") {
        const leads = await request("/api/partner/leads", {}, currentToken);
        setData(prev => ({ ...prev, leads }));
      } else if (target === "enquiries") {
        const enquiries = await request("/api/partner/enquiries", {}, currentToken);
        setData(prev => ({ ...prev, enquiries }));
      } else if (target === "profile") {
        const profile = await request("/api/partner/profile", {}, currentToken);
        setData(prev => ({ ...prev, profile }));
      }
    } catch (e) { setError(e.message || "Could not load this section."); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (token) loadPage(page, token); }, [token, page]);

  function signOut() {
    localStorage.removeItem("partnerAccessToken"); localStorage.removeItem("accessToken");
    setToken(""); setData({}); setPage("overview");
  }

  function setField(name, value) { setProperty(prev => ({ ...prev, [name]: value })); }

  async function submitProperty(e) {
    e.preventDefault(); setError(""); setNotice("");
    if (!photo) return setError("Upload at least one front/exterior property photo.");
    setPublishing(true);
    try {
      const form = new FormData();
      Object.entries(property).forEach(([key, value]) => { if (value !== "") form.append(key, value); });
      form.append("ownerMobile", property.ownerMobile.replace(/\s|-/g, ""));
      form.append("mobile", property.ownerMobile.replace(/\s|-/g, ""));
      form.append("imageCategories", JSON.stringify(["front"]));
      form.append("images", photo);
      const result = await request("/api/partner/properties", { method: "POST", body: form }, token);
      setNotice(result.message || "Property published successfully.");
      setProperty(emptyProperty); setPhoto(null); setPage("properties");
    } catch (e2) { setError(e2.message || "Could not publish property."); }
    finally { setPublishing(false); }
  }

  if (!token) return <AuthScreen onLogin={newToken => { setToken(newToken); setPage("overview"); }} />;

  const profile = data.profile?.agent || data.profile || {};
  const dashboard = data.dashboard?.dashboard || data.dashboard || {};
  const metric = (key, fallback = 0) => dashboard[key] ?? data.dashboard?.[key] ?? fallback;

  return (
    <div className="app-shell">
      {mobileNav && <button className="scrim" onClick={() => setMobileNav(false)} aria-label="Close menu" />}
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="sidebar-top"><Brand /><button className="icon-button mobile-only" onClick={() => setMobileNav(false)}><X size={19} /></button></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={page === item.id ? "nav-item active" : "nav-item"} onClick={() => { setPage(item.id); setMobileNav(false); }}><Icon size={18} /><span>{item.label}</span>{page === item.id && <ChevronRight className="nav-arrow" size={16} />}</button>; })}</nav>
        <div className="sidebar-bottom"><div className="support-card"><div className="support-icon"><ShieldCheck size={17} /></div><strong>Need a hand?</strong><span>Contact the GgnHome team for help with your listings.</span><a href="https://www.ggnhome.com/" target="_blank" rel="noreferrer">Visit GgnHome <ArrowRight size={13} /></a></div><button className="nav-item signout" onClick={signOut}><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>
      <main className="main-area">
        <header className="topbar"><div className="topbar-left"><button className="icon-button mobile-only" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div><div className="breadcrumb">GgnHome <ChevronRight size={13} /> PartnerHub</div><h1>{title}</h1></div></div><div className="topbar-right"><span className="live-dot" /> <span className="desktop-only">Partner workspace</span><div className="avatar">{(profile.name || "P").slice(0,1).toUpperCase()}</div></div></header>
        <div className="content-area">
          {error && <div className="alert error global-alert">{error}<button onClick={() => setError("")}><X size={16} /></button></div>}
          {notice && <div className="alert success global-alert"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")}><X size={16} /></button></div>}
          {loading && <div className="loading-strip"><RefreshCw size={16} className="spin" /> Loading your workspace…</div>}

          {page === "overview" && <section className="section-stack">
            <div className="welcome-banner"><div><div className="eyebrow">YOUR PARTNER SPACE</div><h2>Welcome{profile.name ? `, ${profile.name.split(" ")[0]}` : " back"}.</h2><p>Your property activity, leads and enquiries in one place.</p></div><div className="banner-art"><Building2 size={72} strokeWidth={1.1} /><div className="art-spark spark-one" /><div className="art-spark spark-two" /></div></div>
            <div className="metrics-grid">
              <Metric icon={Building2} label="My properties" value={listProperties.length || metric("totalProperties", 0)} hint="Listings submitted" />
              <Metric icon={ClipboardList} label="Leads" value={listLeads.length || metric("totalLeads", 0)} hint="Customer preferences" />
              <Metric icon={MessageSquare} label="Enquiries" value={listEnquiries.length || metric("totalEnquiries", 0)} hint="Incoming requests" />
            </div>
            <div className="section-heading"><div><h3>Quick actions</h3><p>Pick up where you left off.</p></div></div>
            <div className="quick-grid"><QuickAction icon={Plus} title="Add a property" text="Publish a new listing" onClick={() => setPage("add")} /><QuickAction icon={MessageSquare} title="View enquiries" text="Review customer requests" onClick={() => setPage("enquiries")} /><QuickAction icon={Download} title="Get the apps" text="Download GgnHome tools" onClick={() => setPage("downloads")} /></div>
            <div className="section-heading"><div><h3>Recent properties</h3><p>Your latest submitted listings.</p></div><button className="inline-link" onClick={() => setPage("properties")}>View all <ArrowRight size={15} /></button></div>
            {listProperties.length ? <PropertyTable items={listProperties.slice(0,4)} /> : <EmptyState icon={Building2} title="No properties yet" text="Add your first property to start building your portfolio." action="Add property" onAction={() => setPage("add")} />}
          </section>}

          {page === "properties" && <section className="section-stack"><div className="section-heading"><div><h3>Your listings</h3><p>Properties submitted through your partner account.</p></div><button className="primary" onClick={() => setPage("add")}><Plus size={16} /> Add property</button></div>{listProperties.length ? <PropertyTable items={listProperties} /> : <EmptyState icon={Building2} title="No properties found" text="Your submitted properties will appear here." action="Add property" onAction={() => setPage("add")} />}</section>}

          {page === "add" && <section className="section-stack"><div className="form-intro"><div className="eyebrow dark">NEW LISTING</div><h2>Add a property</h2><p>Provide the property details and the owner's contact. Your partner contact is attached automatically.</p></div><form className="property-form" onSubmit={submitProperty}>
            <div className="form-section-title"><span>01</span><div><strong>Property basics</strong><small>Tell customers what is available.</small></div></div>
            <div className="form-grid"><Field label="Purpose" required><select value={property.purpose} onChange={e => setField("purpose", e.target.value)}><option value="sale">For sale</option><option value="rent">For rent</option></select></Field><Field label="Property type" required><select value={property.propertyType} onChange={e => setField("propertyType", e.target.value)}><option value="apartment">Apartment / Flat</option><option value="house">Independent house</option><option value="villa">Villa</option><option value="builder-floor">Builder floor</option><option value="plot">Plot / Land</option><option value="commercial">Commercial</option></select></Field><Field label="Listing title"><input value={property.title} onChange={e => setField("title", e.target.value)} placeholder="e.g. Spacious 3 BHK in Sector 57" /></Field><Field label="Sector / locality" required><input value={property.sector} onChange={e => setField("sector", e.target.value)} required placeholder="e.g. Sector 57, Gurugram" /></Field><Field label="Full property address" required wide><input value={property.address} onChange={e => setField("address", e.target.value)} required placeholder="Street, society and locality" /></Field><Field label={property.purpose === "rent" ? "Monthly rent (₹)" : "Asking price (₹)"} required><input type="number" min="1" value={property.price} onChange={e => setField("price", e.target.value)} required placeholder="Amount in INR" /></Field><Field label="Area (sq. ft.)" required><input type="number" min="1" value={property.area} onChange={e => setField("area", e.target.value)} required placeholder="Built-up area" /></Field><Field label="Bedrooms"><select value={property.bedrooms} onChange={e => setField("bedrooms", e.target.value)}><option value="1">1 BHK</option><option value="2">2 BHK</option><option value="3">3 BHK</option><option value="4">4 BHK</option><option value="5">5+ BHK</option><option value="">Not applicable</option></select></Field><Field label="Bathrooms"><select value={property.bathrooms} onChange={e => setField("bathrooms", e.target.value)}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option></select></Field></div>
            <div className="form-section-title"><span>02</span><div><strong>Owner contact</strong><small>These details are separate from your partner account.</small></div></div>
            <div className="form-grid"><Field label="Owner name (optional)"><input value={property.ownerName} onChange={e => setField("ownerName", e.target.value)} placeholder="Property owner's name" /></Field><Field label="Owner mobile number" required><input value={property.ownerMobile} onChange={e => setField("ownerMobile", e.target.value.replace(/[^0-9+ -]/g, ""))} required placeholder="10-digit mobile number" inputMode="tel" /></Field></div>
            <div className="form-section-title"><span>03</span><div><strong>Property photo</strong><small>At least one front/exterior photo is required.</small></div></div>
            <label className="upload-box"><UploadCloud size={27} /><strong>{photo ? photo.name : "Upload front / exterior photo"}</strong><span>JPG, PNG or WebP · Max 18 images supported by the server</span><input type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} required={!photo} /></label>
            <div className="partner-contact-note"><BadgeCheck size={19} /><div><strong>Your partner details are attached automatically</strong><span>The mobile number you enter above is treated as the property owner's number.</span></div></div>
            <div className="form-actions"><button type="button" className="secondary" onClick={() => setPage("properties")}>Cancel</button><button type="submit" className="primary" disabled={publishing}>{publishing ? "Publishing…" : "Publish property"} <ArrowRight size={16} /></button></div>
          </form></section>}

          {page === "ai-leads" && <AiLeadsPage token={token} />}
          {page === "leads" && <section className="section-stack"><div className="section-heading"><div><h3>Customer leads</h3><p>Preference and search leads made available to your partner account.</p></div><button className="icon-button" onClick={() => loadPage("leads")}><RefreshCw size={17} /></button></div>{listLeads.length ? <div className="data-grid">{listLeads.map((item, i) => <div className="data-card" key={item._id || i}><div className="data-card-top"><span className="pill">Lead</span><small>{displayDate(item.createdAt || item.updatedAt)}</small></div><h4>{item.name || item.user?.name || item.customerName || item.title || "Customer preference"}</h4><p>{item.sector || item.location || item.message || item.description || "Property search preference"}</p><div className="data-card-bottom">{item.email || item.user?.email || "Preference lead"} <span>{item.mobileNumber || item.user?.mobileNumber || ""}</span></div></div>)}</div> : <EmptyState icon={ClipboardList} title="No leads to show" text="New preference and search leads will appear here when available." />}</section>}

          {page === "enquiries" && <section className="section-stack"><div className="section-heading"><div><h3>Property enquiries</h3><p>Customer requests and contact details. Source-platform metadata is not shown here.</p></div><button className="icon-button" onClick={() => loadPage("enquiries")}><RefreshCw size={17} /></button></div>{listEnquiries.length ? <div className="table-wrap"><table><thead><tr><th>Customer</th><th>Mobile</th><th>Property</th><th>Owner</th><th>Received</th></tr></thead><tbody>{listEnquiries.map((item, i) => <tr key={item._id || i}><td><strong>{item.customerName || item.userName || item.customer?.name || "Customer"}</strong><small>{item.userEmail || item.customer?.email || ""}</small></td><td>{item.userMobile || item.customer?.mobileNumber || "—"}</td><td>{item.property?.title || item.propertyAddress || item.property?.address || "Property enquiry"}</td><td>{item.ownerName || "No owner of this property present."}</td><td>{displayDate(item.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState icon={MessageSquare} title="No enquiries yet" text="Enquiries will appear here as customers contact GgnHome about properties." />}</section>}

          {page === "downloads" && <section className="section-stack"><div className="form-intro"><div className="eyebrow dark">GGNHOME TOOLS</div><h2>App downloads</h2><p>Keep the apps you need close at hand. Direct APK links are managed by the GgnHome admin.</p></div><div className="download-grid">{apps.map(app => <div className="download-card" key={app.key}><div className="download-icon"><Smartphone size={23} /></div><div className="download-info"><h3>{app.name}</h3><p>{app.description}</p>{app.version && <span className="version">Version {app.version}</span>}</div>{app.url ? <a className="primary download-button" href={app.url} target="_blank" rel="noreferrer" download><ArrowDownToLine size={16} /> Download APK</a> : <span className="not-ready">APK link not published yet</span>}</div>)}</div><p className="fine-print">Only install APKs from a trusted GgnHome download link. Android may ask you to approve installation from your browser.</p></section>}

          {page === "profile" && <section className="section-stack"><div className="profile-card"><div className="profile-avatar">{(profile.name || "P").slice(0,1).toUpperCase()}</div><div><div className="eyebrow dark">PARTNER ACCOUNT</div><h2>{profile.name || profile.agent?.name || "GgnHome Partner"}</h2><p>{profile.roleType || profile.role || "Partner"} · {profile.agentCode || "Partner account"}</p></div></div><div className="profile-fields"><ProfileField label="Mobile number" value={profile.mobileNumber || profile.mobile || "—"} /><ProfileField label="Email" value={profile.email || "—"} /><ProfileField label="Agency" value={profile.agencyName || "Individual partner"} /><ProfileField label="Status" value={profile.status || "Active"} /></div><button className="secondary" onClick={() => loadPage("profile")}><RefreshCw size={15} /> Refresh profile</button></section>}
          <footer className="page-footer"><span>© {new Date().getFullYear()} GgnHome-Partner</span><a href="https://www.ggnhome.com/" target="_blank" rel="noreferrer">Open GgnHome <ArrowRight size={13} /></a></footer>
        </div>
      </main>
    </div>
  );
}

function Metric({ icon: Icon, label, value, hint }) {
  return <div className="metric-card"><div className="metric-top"><span>{label}</span><div className="metric-icon"><Icon size={18} /></div></div><strong>{value}</strong><small>{hint}</small></div>;
}
function QuickAction({ icon: Icon, title, text, onClick }) {
  return <button className="quick-card" onClick={onClick}><span className="quick-icon"><Icon size={19} /></span><span className="quick-copy"><strong>{title}</strong><small>{text}</small></span><ChevronRight size={18} /></button>;
}
function Field({ label, required, wide, children }) {
  return <label className={`field ${wide ? "wide" : ""}`}><span>{label}{required && <i> *</i>}</span>{React.cloneElement(children, { required: Boolean(required) })}</label>;
}
/* ---------------------------------------------------------- AI leads */
// Buyers and tenants who finished the GgnHome AI Property Consultant and
// agreed to be contacted. Every active partner sees the requirements; phone
// and email unlock once the partner is assigned (automatically when their
// listing matched, or by tapping "Take this lead" while slots are left).
const LEAD_STATUS = {
  submitted: "Submitted", pending_assignment: "Pending assignment", assigned: "Assigned", contacted: "Contacted",
  viewing_scheduled: "Viewing scheduled", converted: "Converted", closed: "Closed", lost: "Lost",
};
const PARTNER_STATUSES = ["contacted", "viewing_scheduled", "converted", "lost"];
const NEARBY = { market: "Market", metro: "Metro", hospital: "Hospital", school: "School", park: "Park", mall: "Mall" };
const compactMoney = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${Math.round((v / 1e7) * 100) / 100} Cr`;
  if (v >= 1e5) return `₹${Math.round((v / 1e5) * 100) / 100} L`;
  return `₹${v.toLocaleString("en-IN")}`;
};
const metres = (m) => (m >= 1000 ? `${Math.round(m / 100) / 10} km` : `${m} m`);

function leadFacts(lead) {
  const r = lead.requirements || {};
  const facts = [];
  const where = r.anywhere ? "Anywhere in Gurgaon" : [...(r.sectors || []).map((x) => `Sector ${x}`), ...(r.localities || [])].join(", ");
  if (where) facts.push(["Location", where]);
  if (r.budgetFlexible) facts.push(["Budget", "Flexible"]);
  else if (r.budgetMax || r.budgetMin) facts.push(["Budget", `${r.budgetApprox ? "~" : ""}${r.budgetMin && r.budgetMax ? `${compactMoney(r.budgetMin)}–${compactMoney(r.budgetMax)}` : r.budgetMax ? `up to ${compactMoney(r.budgetMax)}` : `from ${compactMoney(r.budgetMin)}`}${lead.mode === "rent" ? "/month" : ""}`]);
  if ((r.bhk || []).length) facts.push(["BHK", r.bhk.map((n) => (n === 0 ? "1 RK" : `${n} BHK`)).join(" / ")]);
  if ((r.propertyTypes || []).length) facts.push(["Type", r.propertyTypes.join(", ")]);
  if (r.furnishing) facts.push(["Furnishing", r.furnishing]);
  if (r.moveInLabel) facts.push(["Move-in", r.moveInLabel]);
  if (r.occupancy) facts.push(["Occupants", r.occupancy.replace(/_/g, " ") + (r.people ? ` · ${r.people} people` : "")]);
  if (r.possession) facts.push(["Possession", r.possession]);
  if (r.purpose) facts.push(["Purpose", r.purpose]);
  const near = (r.priorities || []).map((p) => `${NEARBY[p.category] || p.category}${p.maxMeters ? ` ≤ ${metres(p.maxMeters)}` : ""}`);
  if (r.corner === "corner" || r.corner === "middle") near.push(r.corner === "corner" ? "Corner home" : "Middle position");
  if (near.length) facts.push(["Wants nearby", near.join(", ")]);
  return facts;
}

function AiLeadCard({ lead, token, onChange }) {
  const [status, setStatus] = useState(PARTNER_STATUSES.includes(lead.status) ? lead.status : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(path, method, body) {
    setBusy(true); setError("");
    try {
      const res = await request(path, { method, body: body ? JSON.stringify(body) : undefined }, token);
      onChange(res.data); setNote("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="data-card ai-lead">
      <div className="data-card-top">
        <span className="pill">{lead.mode === "sale" ? "Buy" : lead.mode === "rent" ? "Rent" : "Callback"}</span>
        <span className={`pill status-pill ${lead.status}`}>{LEAD_STATUS[lead.status] || lead.status}</span>
        <small>{displayDate(lead.createdAt)}</small>
      </div>
      <h4>{lead.leadRef}</h4>
      <dl className="ai-facts">{leadFacts(lead).map(([k, v]) => <React.Fragment key={k}><dt>{k}</dt><dd>{v}</dd></React.Fragment>)}</dl>
      {(lead.matches || []).length > 0 && <p className="ai-matches">Matched {lead.matches.length} listing{lead.matches.length > 1 ? "s" : ""}: {lead.matches.slice(0, 3).map((m) => m.title || m.sector).join(" · ")}</p>}
      <div className="data-card-bottom">
        <span>{lead.contact?.name || "Customer"}</span>
        {lead.assignedToMe ? <a href={`tel:+91${lead.contact?.phone}`}>+91 {lead.contact?.phone}</a> : <span>{lead.contact?.phone}</span>}
      </div>
      {lead.assignedToMe && lead.contact?.email && <p className="ai-email"><a href={`mailto:${lead.contact.email}`}>{lead.contact.email}</a></p>}
      {error && <div className="alert error">{error}</div>}
      {lead.assignedToMe ? (
        <div className="ai-actions">
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Update status">
            <option value="">Update status…</option>
            {PARTNER_STATUSES.map((s) => <option key={s} value={s}>{LEAD_STATUS[s]}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Note, e.g. call outcome" />
          <button className="primary" disabled={busy || (!status && !note.trim())} onClick={() => act(`/api/partner/ai-leads/${lead._id}`, "PATCH", { ...(status ? { status } : {}), ...(note.trim() ? { note } : {}) })}>{busy ? "Saving…" : "Save"}</button>
        </div>
      ) : (
        <div className="ai-actions">
          <small>Contact details unlock when you take this lead · {lead.slotsLeft} of 3 partner slots left</small>
          <button className="primary" disabled={busy || lead.slotsLeft === 0} onClick={() => act(`/api/partner/ai-leads/${lead._id}/claim`, "POST")}>{lead.slotsLeft === 0 ? "Lead is full" : busy ? "Taking…" : "Take this lead"}</button>
        </div>
      )}
      {lead.assignedToMe && (lead.followUps || []).slice(-3).map((f, i) => <p key={i} className="ai-followup">{displayDate(f.at)} · {f.byName || f.byType}{f.status ? ` → ${LEAD_STATUS[f.status] || f.status}` : ""}{f.note ? ` — ${f.note}` : ""}</p>)}
    </div>
  );
}

function AiLeadsPage({ token }) {
  const [scope, setScope] = useState("all");
  const [mode, setMode] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const qs = new URLSearchParams({ page: String(page), limit: "12", scope, ...(mode ? { mode } : {}) });
      const res = await request(`/api/partner/ai-leads?${qs}`, {}, token);
      setItems(res.data || []); setMeta(res.meta || { total: 0, totalPages: 1 });
    } catch (e) { setError(e.message || "Could not load AI leads."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [scope, mode, page]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="section-stack">
      <div className="section-heading">
        <div><h3>AI Consultant leads</h3><p>Buyers and tenants who used the GgnHome AI consultant and agreed to be contacted · {meta.total || 0} total</p></div>
        <button className="icon-button" onClick={load} aria-label="Refresh"><RefreshCw size={17} /></button>
      </div>
      <div className="ai-filters">
        <button className={scope === "all" ? "chip active" : "chip"} onClick={() => { setScope("all"); setPage(1); }}>All open</button>
        <button className={scope === "mine" ? "chip active" : "chip"} onClick={() => { setScope("mine"); setPage(1); }}>Assigned to me</button>
        <select value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} aria-label="Rent or buy">
          <option value="">Rent &amp; buy</option><option value="rent">Rent</option><option value="sale">Buy</option>
        </select>
      </div>
      {error && <div className="alert error">{error}</div>}
      {loading ? <p className="muted">Loading…</p> : items.length ? (
        <div className="data-grid">{items.map((lead) => <AiLeadCard key={lead._id} lead={lead} token={token} onChange={(fresh) => setItems((prev) => prev.map((l) => (l._id === fresh._id ? fresh : l)))} />)}</div>
      ) : <EmptyState icon={Sparkles} title={scope === "mine" ? "No AI leads assigned to you yet" : "No open AI leads right now"} text="New requirements from the AI consultant will appear here." />}
      {meta.totalPages > 1 && <div className="ai-pager"><button className="chip" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button><span>Page {page} of {meta.totalPages}</span><button className="chip" disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}>Next →</button></div>}
    </section>
  );
}

function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={24} /></div><h3>{title}</h3><p>{text}</p>{action && <button className="primary" onClick={onAction}>{action} <ArrowRight size={15} /></button>}</div>;
}
function PropertyTable({ items }) {
  return <div className="table-wrap"><table><thead><tr><th>Property</th><th>Location</th><th>Price</th><th>Status</th><th>Added</th><th>Open</th></tr></thead><tbody>{items.map((item, i) => <tr key={item._id || i}><td><div className="property-cell">{item.images?.[0] && <img src={typeof item.images[0] === "string" ? item.images[0] : item.images[0]?.url} alt="" />}<div><strong>{item.title || item.propertyTitle || "Property listing"}</strong><small>{item.propertyType || item.defaultpropertytype || "Property"}</small></div></div></td><td>{item.address || item.location || item.Sector || "—"}</td><td>{money(item.price || item.monthlyRent)}</td><td><span className={item.isActive === false ? "status pending" : "status live"}><span />{item.isActive === false ? "Inactive" : "Live"}</span></td><td>{displayDate(item.createdAt || item.updatedAt)}</td><td>{propertyUrl(item) ? <a className="inline-link" href={propertyUrl(item)} target="_blank" rel="noreferrer">View <ArrowRight size={14} /></a> : "—"}</td></tr>)}</tbody></table></div>;
}
function ProfileField({ label, value }) { return <div className="profile-field"><small>{label}</small><strong>{value}</strong></div>; }

export default App;

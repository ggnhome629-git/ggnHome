import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2,
  ChevronRight, CircleUserRound, ClipboardList, Download, Home, LogOut, Menu,
  MessageSquare, Plus, RefreshCw, ShieldCheck, Smartphone, UploadCloud, X,
} from "lucide-react";

const API = (import.meta.env.VITE_API_BASE || "").replace(/\/+$/, "");
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

  async function sendOtp() {
    setError(""); setNotice("");
    if (!/^[6-9]\d{9}$/.test(normalized)) return setError("Enter a valid 10-digit Indian mobile number.");
    setBusy(true);
    try {
      const data = await request("/login/request-otp", { method: "POST", body: JSON.stringify({ mobileNumber: normalized }) });
      setSent(true); setNotice(data.message || "OTP sent. It is valid for 5 minutes.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function verifyOtp() {
    setError(""); setNotice("");
    const code = otp.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) return setError("Enter the 4-letter OTP you received.");
    setBusy(true);
    try {
      const data = await request("/login/verify-otp", { method: "POST", body: JSON.stringify({ mobileNumber: normalized, otp: code }) });
      if (!data.accessToken) throw new Error("OTP was verified but no login token was returned.");
      if (data.agent?.role === "Agent") throw new Error("This number is registered as a standard Agent, not a Partner. Contact GgnHome admin.");
      if (data.agent?.role !== "Partner") throw new Error("This mobile number is not registered for Partner Portal access. Ask a GgnHome administrator to register it first.");
      if (data.agent.status === "suspended") throw new Error("This Partner account is suspended. Contact GgnHome support.");
      if (data.agent.status !== "active") throw new Error("This Partner account is not active yet. Contact GgnHome admin.");
      if (!data.agentAccessToken) throw new Error("OTP was verified, but a Partner session could not be created. Please try again.");
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("partnerAccessToken", data.agentAccessToken);
      onLogin(data.agentAccessToken);
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
            <input className="otp-input" value={otp} onChange={e => setOtp(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="e.g. KQMX" maxLength={4} disabled={busy} />
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
function EmptyState({ icon: Icon, title, text, action, onAction }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={24} /></div><h3>{title}</h3><p>{text}</p>{action && <button className="primary" onClick={onAction}>{action} <ArrowRight size={15} /></button>}</div>;
}
function PropertyTable({ items }) {
  return <div className="table-wrap"><table><thead><tr><th>Property</th><th>Location</th><th>Price</th><th>Status</th><th>Added</th></tr></thead><tbody>{items.map((item, i) => <tr key={item._id || i}><td><div className="property-cell">{item.images?.[0] && <img src={typeof item.images[0] === "string" ? item.images[0] : item.images[0]?.url} alt="" />}<div><strong>{item.title || item.propertyTitle || "Property listing"}</strong><small>{item.propertyType || item.defaultpropertytype || "Property"}</small></div></div></td><td>{item.address || item.location || item.Sector || "—"}</td><td>{money(item.price || item.monthlyRent)}</td><td><span className={item.isActive === false ? "status pending" : "status live"}><span />{item.isActive === false ? "Inactive" : "Live"}</span></td><td>{displayDate(item.createdAt || item.updatedAt)}</td></tr>)}</tbody></table></div>;
}
function ProfileField({ label, value }) { return <div className="profile-field"><small>{label}</small><strong>{value}</strong></div>; }

export default App;

# ggnHome Upgrade Checklist

Live tracker for the upgrade work. Tick items off in the same commit that delivers them.
Legend: `[x]` done, `[~]` partly done, `[ ]` not started. Item numbers match the Work Items in `README.md`.

## Phase A: UI upgrade (current focus)

### Dashboard
- [x] Gift banner at the very top, headline only: "gifts worth up to ₹1,000" (links to /rewards, dismissible)
- [x] Search bar pinned under the navbar once the hero scrolls away (all devices)
- [x] Rent / Buy / All chips now change the search (type was previously dropped on navigation)
- [x] Mic button hidden where voice search is unsupported (no more alert popup)
- [x] "Personalise" button now visible on phones (icon only)
- [x] Removed duplicate pre-fetch request on every search
- [x] Premium Compass-style hero: centered "Get Space. Get Rewarded." tagline (serif, gold), punchy subline
- [x] Sections reordered: hero → intents → listings → rewards → nearby → trust → snapshot → tools → news → brands → cities
- [x] "Earn gifts up to ₹1,000" 3-step rewards section (replaces duplicate cashback banner)
- [x] Rent / Sale tabs on the Explore listings rail
- [x] Intent cards with clear CTAs; 2-column on phones
- [x] Phone bottom navigation bar (Home, Search, Saved, Post, Account)
- [x] Gurgaon only: Property Snapshot, and a compact "Popular localities" section (rent / sale / plots chips linking to our search; 6 shown on phones with "Show all")
- [x] News: proper empty state; failed fetches no longer cached for a day
- [x] "Why choose us" card overflow fixed; dead buttons (Explore, Get quote, Find out how) now navigate
- [x] Location pin given a clear "Update your location" label
- [x] Checked on phone (390px), tablet (820px), laptop (1440px)
- [ ] Real listings in "Explore Properties" (verify on live site with API data)
- [ ] Replace Tools section stats (94%, 10K+, 2.5K+) with real numbers or remove

### Speed and loading
- [x] Route-level code splitting: first-load JS cut from 840 kB to 301 kB (gzip)
- [x] Branded page loader while a page downloads
- [x] Hero photo as WebP (415 kB → 157 kB) and preloaded; Inter + Playfair fonts loaded
- [x] Share image shrunk (5.7 MB → 100 kB) so WhatsApp previews load
- [x] Intent card images requested at smaller size and auto-format
- [x] Removed duplicate meta description / manifest; proper page title
- [~] Skeleton loaders: search results and saved homes done; property pages pending
- [ ] Lighthouse pass on dashboard (mobile) with target score recorded here

### Flatmates
- [x] Flatmates dashboard rebuilt in main dashboard style: photo hero "Find Your Flatmate. Share The Rent.", search card with Anyone/Female/Male, quick links, "Rooms available now" and "Most viewed" rows (swipe on phones), how-it-works band, admin offers, locality grid
- [x] Flatmates search rebuilt like property search: photo header, Budget / Furnished / spots / move-in filters, sort tabs, page X of Y, admin promos, saved hearts (kept in browser), popular localities, list-your-room band
- [x] API: gender, budget, move-in filters and safe sort; sector searches now respect all filters and approval; removed per-request debug query
- [x] Privacy fix: public flatmate list no longer returns unapproved listings or owner email/phone
- [x] Fixed broken links: "Post" → /flatmateslistingform, popup back → /flatmatessearch
- [ ] Flatmate detail popup, post form and "My listings" still use the old styling

### Other pages
- [x] Search page: total homes for the sector at top, "Showing 1–12 of N · Page X of Y" and numbered pages at bottom (#16)
- [x] Search page redesign (#14): navy header with serif title, sticky BHK / Budget / More filters / Sort bar, active filter chips, skeletons, empty + error states, "Didn't find your home?" lead band
- [x] Search header: photo background with slow zoom, navy/gold lighting, gold rule, serif title with gold area name, live "N homes available" count, trust points
- [x] Headings in title case ("Homes For Rent In Sector 46", "10 Homes In Sector 46"; BHK/DLF/MG kept upper case)
- [x] More filters: property type, posted by owner/agent, listed within 24h/7/30 days, with photos only (server-side)
- [x] "Nearby" sector shortcuts and "Share search" link
- [x] Livelier search (patterns from NoBroker, Flipkart, real-estate UX guides): swipeable card photos with dots/arrows, "New" tag (<3 days), heart pop + "Saved · View" toast, Flipkart-style quick-pick icon strip, sort tabs, rewards + post-property promo tiles in results, animated count, Recently viewed row
- [x] Promo cards come only from Admin → Promo Cards (title, text, button, link, colour, icon, image, audience, weight, start/end dates, live switch, preview)
- [x] Admin "Add from JSON": paste one or many promos, live preview with per-promo errors, "Load example" with 6 ready promos; "Copy as JSON" on each promo
- [x] Dashboard shows up to 3 random admin promos; search shows 2–3 different random ones, placed to close a grid row; closable per session
- [x] Admin can replace the top banner line (placement "Top banner")
- [x] Search: one request per page — view counts and ratings come inside the search response (was 1 + 12 requests)
- [x] `rankScore` field on every listing; default "Most relevant" order sorts by it (AI model to own it later). Admin API: PATCH /api/admin/property/:id/rank
- [ ] Admin UI to edit rankScore per property (API ready)
- [x] Dashboard: Flipkart-style quick links strip (rent, under ₹25K, 2 BHK, villas, new, by owner, saved, post), "Offers for you" row, Recently viewed row
- [ ] "By owner / agent / ggnHome" card label — built, currently commented out in PropertyCard
- [x] Search state lives in the URL (type, BHK, budget, sort, page) — back button and shared links keep the exact search
- [x] Fixed: Rent/Buy and filter changes used stale values; filters only applied to the 10 results on screen
- [x] Backend search: server-side filters (BHK incl. 1 RK / 4+, budget, area, baths, parking, move-in), sort, X-Total-Count, correct paging when mixing rent + sale
- [x] Save heart now toggles (backend previously only added saves, never removed)
- [x] Saved homes page rebuilt: header, type/sector/search/sort, unsave with Undo, empty state (was broken on page 2 by double pagination)
- [x] Property card restyled (price first, ₹ L / Cr for sale, facts line, "Listed N days ago")
- [x] Login from search, saved or any protected page returns to that page (#20, partial: property pages still to verify)
- [ ] Property page UI fix; affiliate and own listings look identical (#15)
- [~] Return to the same property after login instead of dashboard (#20) — search page and protected routes done

### Post property & post flatmate forms
- [x] Six-step forms (Rent/Sale and Flatmate) with step rail on laptop, step pills on tablet, progress bar + sticky Continue on phone
- [x] Live Visibility Score 0–100 with "add these to reach 100" tips that jump to the step
- [x] Inline validation per step (area, floors, price ranges, past dates, no phone/email in text)
- [x] Review step with live card preview, edit links, listing check and confirmation before posting
- [x] Trust panel (who is posting, verified badge, free/reviewed/private) and admin promos (new "post" placement)
- [x] Draft autosave and restore; suggested title and "Write it for me" description
- [x] Sale listings now store type, furnishing, parking, floors, possession and age; rentals store furnishing
- [x] Server: owners can't set isActive/rankScore/owner/source fields; flatmates can't self-approve; flatmate photos upload
- [ ] Show the new sale fields (furnishing, possession, age) on the property detail pages
- [x] Agent and admin add-property pages use the same new form (one shared component)
- [x] Admin form keeps owner's mobile number and all extra rental fields (lease, utilities, fees, policies, neighbourhood)
- [x] Admin add-property endpoints now admin-only (rent endpoint was open to anyone)

## Phase B: Property sources (affiliate + own)
- [~] Source fields on property models (`sourcePortal`, `sourceUrl`, `sourceStatus`...) (#1, #2)
- [ ] Commission field on own properties (#25, #3)
- [ ] Agent properties: leads to agent and admin (#4)
- [ ] Affiliate admin UI: list, filter, on/off toggle, affiliate ID, no source shown to users (#5, #23)
- [ ] No contact or commission on affiliate listings; redirect through affiliate link (#8)
- [~] NoBroker scraper and daily cron exist (#6, #7)
- [ ] Initial import of about 100 listings (#6)
- [ ] 99acres scraper (#6)
- [ ] Friday schedule + `ScraperLog` + admin log view (#7)
- [ ] Search filter by source (#24)

## Phase C: Admin roles
- [ ] Normal admin role and per-feature permissions (#9, #26)
- [ ] Super admin feature toggle screen (#10, #12)
- [ ] Normal admin adds and sees only their own properties (#11)

## Phase D: Production readiness
- [ ] Rate limiting and Helmet (#27)
- [ ] Monitoring, logging, error tracking (#28)
- [ ] CI/CD and tests (#29)
- [ ] Database backups, Redis, secrets (#30)

## Phase E: Mobile app
- [ ] React Native app, after website UI is final (#22)

- [x] Promo cards from admin, shown on dashboard and search page (see Phase A)

### Manage listings, rewards, saved, agent login
- [x] Manage-listings pages for owners, agents and flatmate rooms (status tabs, stats, quality meter, pause/activate, edit, share)
- [x] Rewards page redesign; Saved page with Flatmate Rooms tab
- [x] Agent login and registration: mobile + 4-letter OTP, no agent code to type, no password
- [x] One login for both sites: main login also opens the agent session for approved agents; agent area opens from a main-site login
- [x] Admin approval sets the user role to Agent; suspension reverts it
- [ ] Property detail pages: show the new sale fields (furnishing, possession, age)
- [ ] Analytics page: server data for sources, amenities, heatmap, funnel
- [ ] Rate-limit agent/user OTP requests per mobile on the server (in-memory per-IP limit only today)


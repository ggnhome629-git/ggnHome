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

### Other pages
- [x] Search page: total homes for the sector at top, "Showing 1–12 of N · Page X of Y" and numbered pages at bottom (#16)
- [x] Search page redesign (#14): navy header with serif title, sticky BHK / Budget / More filters / Sort bar, active filter chips, skeletons, empty + error states, "Didn't find your home?" lead band
- [x] Search state lives in the URL (type, BHK, budget, sort, page) — back button and shared links keep the exact search
- [x] Fixed: Rent/Buy and filter changes used stale values; filters only applied to the 10 results on screen
- [x] Backend search: server-side filters (BHK incl. 1 RK / 4+, budget, area, baths, parking, move-in), sort, X-Total-Count, correct paging when mixing rent + sale
- [x] Save heart now toggles (backend previously only added saves, never removed)
- [x] Saved homes page rebuilt: header, type/sector/search/sort, unsave with Undo, empty state (was broken on page 2 by double pagination)
- [x] Property card restyled (price first, ₹ L / Cr for sale, facts line, "Listed N days ago")
- [x] Login from search, saved or any protected page returns to that page (#20, partial: property pages still to verify)
- [ ] Property page UI fix; affiliate and own listings look identical (#15)
- [~] Return to the same property after login instead of dashboard (#20) — search page and protected routes done

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

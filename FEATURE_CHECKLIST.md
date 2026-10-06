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
- [ ] Review every dashboard section for spacing / alignment on phone, tablet, laptop
- [ ] Dashboard section order and content refresh (see upgrade suggestions)
- [ ] Real listings in "Explore Properties" (empty state seen when API has no data)

### Speed and loading
- [x] Route-level code splitting: first-load JS cut from 840 kB to 301 kB (gzip)
- [x] Branded page loader while a page downloads
- [ ] Lazy-load and size images (Unsplash cards, hero photo)
- [ ] Skeleton loaders on search results and property pages
- [ ] Lighthouse pass on dashboard (mobile) with target score recorded here

### Other pages
- [ ] Search page: sector property count at top, page X of Y at bottom (#16)
- [ ] Search page UI fix (#14)
- [ ] Property page UI fix; affiliate and own listings look identical (#15)
- [ ] Return to the same property after login instead of dashboard (#20)

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

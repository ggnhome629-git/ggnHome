---
name: ggnhome-real-estate-ux
description: Design, audit, improve, and implement ggnhome.com as a trustworthy, human-friendly real-estate experience across mobile, tablet, and desktop. Use whenever working on the public website, property discovery, listings, search/filter UX, property detail pages, lead forms, navigation, responsive behavior, accessibility, visual design, or frontend performance.
---

# GGNHome Real Estate UX & Frontend Skill

## Mission

Make **ggnhome.com** exceptionally easy and confidence-inspiring for real people looking to buy, rent, sell, or research property. Optimize for useful decisions—not visual novelty, engagement tricks, or unnecessary complexity.

A successful experience helps a visitor answer, quickly:

1. Is this website relevant to what I need?
2. Can I find suitable properties without fighting the interface?
3. Can I trust the listing and understand its price, location, and status?
4. What should I do next, and what happens if I contact GGNHome?

Apply this skill to **mobile, tablet, and desktop**. Treat responsive design as a core product requirement, not a final CSS pass.

## Non-negotiable working rules

- **Inspect before changing.** Read the repository instructions (`AGENTS.md`, `CLAUDE.md`, existing skills, package scripts), understand the current framework, routes, design tokens, data model, and relevant components before editing.
- **Preserve working behavior.** Do not break authentication, account switching, listing data, search, filters, API contracts, analytics, SEO, deployment configuration, or existing business logic while improving the UI.
- **Do not invent property facts.** Never fabricate prices, availability, amenities, addresses, distances, RERA IDs, verification status, seller identity, reviews, or market claims. Use existing verified data; label unknowns clearly.
- **Keep the brand authentic.** Inspect the live site and repository assets first. Preserve approved logo, colors, content, and recognizable brand identity unless a redesign is explicitly requested.
- **Make meaningful improvements.** Avoid superficial changes such as merely changing colors, adding shadows, or increasing border radii. Solve real user friction.
- **No needless rewrites.** Prefer focused changes and existing project conventions. Do not introduce a framework, library, dependency, or design system without a clear need.
- **Be honest about verification.** Run available tests and inspect the actual rendered UI when possible. Never claim a route, device, test, deployment, or interaction was verified if it was not.
- **Ask only for consequential missing information.** Resolve routine choices from the repository and current product. Do not block implementation for minor aesthetic preferences.

## Product principles

### 1. Human-first, task-first

Design around visitor goals, not internal company structure. Common intents include:

- Buy a home
- Rent a home
- Explore new projects
- Find commercial property
- Sell or rent out a property
- Research a locality, sector, or project
- Contact an advisor or schedule a site visit

Make the most important tasks obvious. Keep labels familiar and specific. Prefer “View properties” or “Schedule a visit” over vague calls to action such as “Discover more” when the action is known.

### 2. Trust is part of the interface

Real estate decisions involve substantial money and risk. The UI must communicate what is known and what is not.

- Distinguish verified facts from seller-provided or indicative information.
- Show verification meaning and date where the data exists; do not use a badge without a real verification process.
- Make listing status understandable: available, under offer, rented, sold, upcoming, or unknown—only where supported by actual data.
- Clearly identify who is listing or representing a property when known.
- Explain brokerage, fees, and contact expectations before a user commits.
- Never use fake scarcity, fabricated testimonials, misleading “only 2 left” banners, false countdowns, or deceptive urgency.
- Avoid implying that GGNHome is a developer, government authority, or RERA regulator unless that is factually true.
- Provide a clear way to report incorrect or suspicious listings if the product supports it.

### 3. Reduce cognitive load

- Use progressive disclosure: show the essentials first and advanced options when requested.
- Avoid exposing every filter, amenity, and metadata field at once.
- Group related controls with clear headings.
- Preserve the user's context when opening a property, changing filters, or returning to results.
- Use plain language; explain specialist real-estate terminology when needed.
- Provide sensible defaults without silently making consequential decisions.

### 4. Respect the user's time

- Make search and contact flows short, predictable, and resilient.
- Do not force login for basic browsing unless the product genuinely requires it.
- Avoid repeated prompts, modal interruptions, autoplay video, and unnecessary animations.
- Give immediate, useful feedback after user actions.
- Preserve entered data after validation errors or recoverable failures.

## Required workflow

### Phase A — Understand the current product

Before coding:

1. Inspect project-level instructions and the relevant route/component tree.
2. Identify the current stack, shared components, styling method, breakpoints, state management, and API/data sources.
3. Review the current live page or screenshots if accessible; otherwise inspect repository implementation.
4. Identify the page's audience, primary task, secondary tasks, and conversion goal.
5. Record existing behavior that must remain unchanged.
6. Note the current mobile and desktop pain points.
7. Identify data that is real, derived, missing, or potentially misleading.

Do not assume the live website's design or functionality from its domain alone.

### Phase B — Plan the experience

Create a concise implementation plan containing:

- User problem and intended outcome
- Current friction points
- Information hierarchy and page structure
- Responsive behavior at mobile, tablet, and desktop
- Existing components to reuse or adjust
- Required data and states
- Accessibility and performance risks
- Acceptance checks

For a substantial redesign, establish a coherent visual direction based on GGNHome's actual brand and real-estate audience. Do not default automatically to a generic property-template aesthetic.

### Phase C — Implement incrementally

- Prefer semantic HTML and existing component conventions.
- Build or improve reusable patterns only when multiple use cases justify them.
- Keep data fetching, domain logic, and presentation appropriately separated.
- Keep state ownership clear. Search filters, result counts, chips, and displayed listings must stay synchronized.
- Implement loading, empty, error, success, disabled, and selected states—not just the ideal loaded state.
- Avoid layout shifts when images, fonts, maps, or async content load.
- Keep changes scoped to the requested task.

### Phase D — Verify and refine

1. Run relevant lint, type-check, build, and tests available in the repository.
2. Inspect the actual rendered result at representative mobile, tablet, and desktop sizes.
3. Test the real interactions—not just static appearance.
4. Fix issues found and repeat the checks.
5. Report what changed, what was tested, and any remaining limitation honestly.

## Responsive design requirements

### Mobile-first behavior

Start with a narrow viewport and progressively enhance.

- Support small phones, typical phones, tablets, laptops, and wide desktops.
- Avoid horizontal overflow, clipped text, overlapping controls, and tiny tap targets.
- Use fluid sizing (`rem`, `%`, `minmax()`, `clamp()`, container queries where appropriate) instead of arbitrary fixed dimensions.
- Use a content-driven layout; do not simply shrink desktop columns.
- Keep body text comfortable to read; generally target at least 16 CSS px for primary mobile text unless the typeface and context justify otherwise.
- Aim for touch targets of at least 44 × 44 CSS px; meet WCAG 2.2 target-size requirements and provide spacing between adjacent controls.
- Ensure fixed/sticky bars do not cover content, focus indicators, browser controls, or form fields.
- Account for safe-area insets on devices that have them.
- Do not rely on hover for essential actions. Provide tap and keyboard equivalents.
- Use mobile-appropriate input types, autocomplete, and input modes.

### Responsive layout guidance

Use the project's established breakpoints if they are coherent. Otherwise choose breakpoints based on where content stops fitting—not device brand names.

Typical patterns:

- **Small mobile:** single-column content; compact but usable header; filters in a dedicated sheet or page; property cards with readable hierarchy; clear bottom action when justified.
- **Large mobile / tablet:** adapt card density and navigation; use two columns only when cards remain legible and tappable.
- **Desktop:** make productive use of width with a sensible max-width container; consider results + map or sidebar + results when it improves discovery.
- **Wide screens:** avoid excessively long text lines or stretched property cards; maintain readable content widths.

Test at minimum around 360–390 px mobile width, 768 px tablet width, 1280 px desktop width, and a wide desktop viewport. These are test points, not mandatory CSS breakpoints.

### Mobile navigation

- Keep primary property intents easy to reach.
- Use a clear menu button with accessible name, expanded state, and keyboard behavior.
- Close the menu after navigation when appropriate.
- Prevent background scrolling when a modal navigation drawer is open.
- Keep the logo, search, account, and contact controls balanced; do not overcrowd the header.
- If using a bottom navigation or sticky CTA, ensure it does not compete with other fixed UI.

## Property discovery and search

### Search entry

Search should accept useful, understandable terms such as locality, sector, project, landmark, or city if supported.

- Provide autocomplete only when it is genuinely useful and backed by data.
- Make suggestions keyboard accessible and announce relevant changes to assistive technology.
- Distinguish suggestion types (for example, locality vs project) where ambiguity matters.
- Support clear, recoverable behavior for no match or failed suggestions.
- Do not silently reinterpret an ambiguous location.

### Search filters

Use filters that correspond to actual available inventory and supported query parameters. Potential categories include:

- Buy / rent / commercial / projects
- City, locality, sector, project
- Property type and BHK/unit configuration
- Minimum and maximum budget
- Area and area unit
- Furnishing, possession, availability, or listing source where applicable
- Additional property-specific attributes only when reliable data exists

Rules:

- Use understandable labels and units (₹, sq ft, sq yd, acres, monthly rent, etc.).
- Make min/max ranges easy to set and validate.
- Avoid contradictory ranges and explain invalid values inline.
- Show active filters and provide a clear “Clear all” action.
- Keep the applied-filter count accurate.
- Make Apply/Reset behavior explicit, especially on mobile sheets.
- Preserve filters when a user opens a listing and returns to results.
- Do not show filters that cannot affect results.
- Avoid excessively long filter lists; group advanced filters progressively.
- If results update live, announce result-count changes accessibly without overwhelming screen readers.

### Results and sorting

- Display a clear result count when available.
- Explain sort options in plain language: relevance, newest, price low-to-high, price high-to-low, etc., only if supported.
- Make loading and no-results states useful. Offer relevant ways to adjust the search without discarding all user input.
- Keep pagination or infinite-scroll behavior predictable and accessible.
- Avoid jumping the viewport unexpectedly after filtering or loading more results.
- Use stable keys and preserve result state when appropriate.

## Property listing cards

A card should let users decide whether to inspect a listing without opening every result.

Prioritize, based on available verified data:

1. Useful, accurate property image
2. Price and relevant price basis (sale price or rent/month)
3. Property type, BHK, and area
4. Locality / sector / project
5. One or two genuinely differentiating attributes
6. Listing source or verification indicator when meaningful
7. A clear route to details or save/favorite action

Rules:

- Keep card hierarchy consistent across results.
- Do not hide essential details behind hover.
- Avoid image overlays that obscure the property.
- Use consistent image aspect ratios and a graceful fallback for missing images.
- Ensure the whole card and its nested controls have correct, non-conflicting interaction semantics.
- Favorite/save controls need accessible names and clear selected state.
- Do not display unsupported “verified”, “premium”, “hot”, or “best deal” labels.
- Do not stuff cards with every amenity or duplicate the same information.

## Property detail pages

A property page should support careful evaluation and a confident next step.

### Information hierarchy

Use available, trustworthy information to prioritize:

- Property identity and location
- Price, rent basis, or price range
- Main attributes (type, BHK, area, furnishing, possession/status)
- Photo gallery and floor plans
- Description and key features
- Amenities and building/project details
- Location context and map, when supported
- Seller/agent/developer information and verification context
- Fees, disclaimers, and relevant legal/RERA information
- Contact, callback, or site-visit actions

Do not invent missing sections to make a page look complete. Clearly mark unavailable data or omit it.

### Image gallery

- Use optimized, responsive images with meaningful alt text.
- Let users understand the number and type of images.
- Provide accessible previous/next controls and keyboard support for any lightbox.
- Ensure close controls are visible and focus is managed correctly.
- Avoid autoplay carousels.
- Distinguish actual property photos from renderings, sample images, or illustrative visuals when relevant.
- Do not present a project rendering as a photograph of the exact unit.

### Maps and location claims

- Use a map only when the location data and map experience provide real value.
- Do not expose a precise private address unless it is authorized for display.
- Distinguish approximate location from exact location.
- Never invent distances or travel times. If shown, derive them from a reliable source and explain the basis where needed.
- Provide a textual location description so the map is not the only way to understand location.
- Ensure maps do not block page performance or core content.

### Contact and site-visit flows

- Ask only for information needed to fulfill the request.
- Explain why contact details are requested and how the user will be contacted.
- Use appropriate phone, email, date, and time controls.
- Validate inline with specific, helpful messages.
- Preserve form input after errors.
- Prevent duplicate submissions and show progress.
- Show a genuine confirmation after a successful server response; do not claim success before confirmation.
- Make consent clear and avoid pre-checked optional marketing consent.
- Do not expose a user's phone number or other private information publicly without permission.
- Keep WhatsApp, call, and callback actions clear about what will happen.

## Visual design direction

### Build a coherent system

Inspect existing brand assets first. Define and consistently use:

- Color roles: background, surface, text, muted text, border, primary action, focus, success, warning, and error
- Typography roles: display, page title, section title, body, label, metadata
- Spacing scale
- Content widths and grid rules
- Border, elevation, and radius rules
- Icon style
- Interactive states

Do not create a new color or spacing value for every component. Ensure contrast remains sufficient across all states.

### Visual hierarchy

- Make the primary task visually clear.
- Use whitespace to group information and improve scanning.
- Keep property price, location, and important attributes easy to locate.
- Use typography to express hierarchy rather than relying on color alone.
- Prefer purposeful layouts over repeated identical cards and sections.
- Use high-quality real property imagery when available and authorized.
- Avoid generic AI-generated design patterns: unnecessary gradients, excessive glassmorphism, random decorative blobs, over-rounded everything, too many shadows, and animation for its own sake.
- Do not sacrifice clarity to achieve a “premium” look.

### Motion and interaction polish

Motion should explain state or support orientation.

- Keep transitions brief and restrained.
- Respect `prefers-reduced-motion`.
- Avoid parallax, scroll hijacking, autoplay motion, and distracting entrance animations.
- Provide hover, focus, active, disabled, loading, and selected states where appropriate.
- Use motion only when it improves feedback or comprehension.
- Never make essential content dependent on animation.

## Accessibility requirements

Target **WCAG 2.2 AA** as the baseline.

- Use semantic landmarks, headings, lists, buttons, links, and form controls.
- Maintain logical heading order and DOM reading order.
- Ensure full keyboard operation and visible focus.
- Use accessible names for icon-only controls.
- Provide text alternatives for meaningful images; use empty alt for decorative images.
- Do not use color as the only signal.
- Maintain text and non-text contrast.
- Associate labels and descriptions with form controls.
- Identify errors in text and programmatically; move focus appropriately when needed.
- Ensure dialogs and drawers manage focus, Escape behavior, and background interaction correctly.
- Support browser zoom and text resizing without loss of functionality.
- Respect reduced-motion preferences.
- Test with keyboard navigation and, where available, a screen reader.
- Avoid ARIA when native HTML already provides the required semantics.

## Performance and technical quality

Aim for good Core Web Vitals in real-user data:

- **LCP:** 2.5 seconds or less
- **INP:** 200 milliseconds or less
- **CLS:** 0.1 or less

These are targets at the 75th percentile, segmented by device where applicable—not guarantees for every visit.

Implementation practices:

- Optimize property images; use modern formats and responsive sizes.
- Set image dimensions or aspect ratios to prevent layout shift.
- Prioritize the actual above-the-fold hero or lead image; do not lazy-load the LCP image.
- Lazy-load below-the-fold images and noncritical embeds.
- Avoid loading every map, gallery, video, or third-party widget immediately.
- Minimize unnecessary JavaScript, dependencies, and hydration.
- Keep interactions responsive and avoid long main-thread tasks.
- Load fonts responsibly and use appropriate fallbacks.
- Avoid blocking the first render on nonessential network requests.
- Cache assets correctly within the existing deployment architecture.
- Keep SEO-critical property content available to crawlers using the current framework's appropriate rendering strategy.
- Do not introduce performance optimizations that break data correctness or accessibility.

## SEO and shareability

Where relevant to the existing application:

- Use unique, accurate page titles and meta descriptions.
- Use canonical URLs and correct index/noindex behavior.
- Provide crawlable links and stable, human-readable URLs.
- Use structured data only when it accurately reflects visible, verified content and complies with the relevant schema.
- Do not mark up fake ratings, reviews, prices, or availability.
- Provide useful Open Graph metadata and share previews.
- Avoid duplicate or thin indexable pages caused by arbitrary filter combinations.
- Keep sitemap and robots behavior aligned with the actual site's intended indexing strategy.
- Do not change URL conventions without considering existing links, analytics, and SEO.

## India and Gurugram real-estate context

- Format prices in Indian Rupees with familiar grouping (for example, ₹1.25 Cr or ₹85,000/month) while preserving precise values where needed.
- Make the price basis explicit: total price, per sq ft, monthly rent, maintenance, or other charge.
- Clearly label area units; do not treat sq ft, sq yd, and acres as interchangeable.
- Use familiar local references such as sector, locality, road, and project names only when data supports them.
- Explain abbreviations such as BHK, PLC, EDC/IDC, or maintenance charges when they appear in user-facing contexts and could confuse a first-time buyer.
- Show RERA details and links only when verified and applicable; do not imply that RERA registration guarantees investment returns or property quality.
- Make taxes, additional charges, brokerage, and exclusions clear where known.
- Never promise appreciation, rental yield, possession dates, approvals, or legal status without reliable evidence and appropriate qualification.

## Testing checklist

### Functional

- [ ] Main navigation and all visible links work.
- [ ] Search submits the expected query.
- [ ] Autocomplete works with mouse, touch, and keyboard if present.
- [ ] Filters apply, reset, and persist as intended.
- [ ] Sort order matches its label.
- [ ] Listing cards open the correct property.
- [ ] Gallery and floor-plan controls work.
- [ ] Favorite/save actions reflect the real state.
- [ ] Contact and site-visit forms validate and handle server responses.
- [ ] Loading, empty, error, and success states are useful.
- [ ] No console errors or broken requests are introduced.

### Responsive

- [ ] Small mobile (~360 px): no horizontal overflow; controls remain usable.
- [ ] Typical mobile (~390 px): content hierarchy and tap targets are comfortable.
- [ ] Tablet (~768 px): layout adapts without awkward gaps or cramped cards.
- [ ] Desktop (~1280 px): hierarchy, content width, and navigation are balanced.
- [ ] Wide desktop: content does not stretch beyond readable limits.
- [ ] Sticky or fixed elements do not obscure content or actions.
- [ ] Menus, sheets, dialogs, and forms work with touch and keyboard.

### Accessibility

- [ ] Keyboard-only navigation is possible.
- [ ] Focus is visible and follows a logical order.
- [ ] Headings and landmarks are meaningful.
- [ ] Form labels and error messages are accessible.
- [ ] Images have correct alternatives.
- [ ] Contrast and target sizes are checked.
- [ ] Reduced motion is respected.
- [ ] Zoom does not cause content loss.

### Quality and trust

- [ ] No fabricated listing details, badges, claims, or testimonials.
- [ ] Unknown data is omitted or clearly labeled.
- [ ] Price and unit basis are explicit.
- [ ] Privacy and consent are understandable.
- [ ] Existing backend and business logic remain intact.
- [ ] Tests/build/lint/type-check were run where available.
- [ ] Actual rendered mobile and desktop UI was inspected, or the limitation is disclosed.

## Definition of done

A task is complete only when:

1. The requested user problem is solved—not merely restyled.
2. The implementation follows the existing architecture and preserves working behavior.
3. Mobile, tablet, and desktop layouts have been considered and checked.
4. Important interactions and all relevant states work.
5. Accessibility, performance, and trust requirements have been considered.
6. Available checks pass, or failures and limitations are clearly reported.
7. The final response summarizes the change and gives truthful verification details.

## Final agent response format

When finishing a task, report briefly:

- **Changed:** what user-facing experience improved.
- **Responsive:** what was checked on mobile/tablet/desktop.
- **Verification:** tests, build, lint, or browser checks actually performed.
- **Remaining:** known gaps or blockers.

Never say “fully tested,” “production-ready,” “merged,” or “deployed” unless that exact status has been verified.

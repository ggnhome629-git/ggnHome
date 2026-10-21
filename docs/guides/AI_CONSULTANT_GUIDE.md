# GgnHome AI Property Consultant

A voice + text property consultant that opens on the homepage, asks the
questions from the PRD, searches live GgnHome listings, explains every match,
and turns a consented conversation into a lead for the admin panel and
PartnerHub.

**Rule-based first, AI-assisted second.** The rule engine owns conversation
state, validation, database access, ranking, leads and permissions. The Groq
model (`openai/gpt-oss-120b`) is only asked to interpret a message the rules
could not understand, or to answer a general process question. With every key
missing, exhausted or rate-limited, the assistant keeps working.

## The seven property parameters

| # | Parameter | Stored on listings as |
|---|---|---|
| 1 | Nearest market | `nearbyAmenities[category=market]` |
| 2 | Metro station | `nearbyAmenities[category=metro]` |
| 3 | Hospital / clinic | `nearbyAmenities[category=hospital]` |
| 4 | School | `nearbyAmenities[category=school]` |
| 5 | Park / garden | `nearbyAmenities[category=park]` |
| 6 | Shopping mall | `nearbyAmenities[category=mall]` |
| 7 | Corner or middle | `cornerPosition` (`corner` / `middle` / `not_sure`) |

Definitions: `server/config/propertyParameters.js` and
`client/src/data/propertyParameters.js` (keep them in sync).

They are now captured and used everywhere:

- **Listing forms** (owner, agent, admin, partner — all share `PropertyPostForm`):
  "Nearby market, metro, hospital, school, park & mall" with a working
  **Auto-detect** button (now server-side via `POST /api/nearby-parameters`;
  the old browser key endpoint was retired), plus "Corner or middle?".
- **Create/update APIs**: owner, agent, admin and partner controllers sanitise
  and save them (`parametersFromBody`).
- **Property detail page**: "Neighbourhood check" section.
- **Manual search**: "Close to" and "Corner or middle" filters (`near=metro,park`, `position=corner`).
- **AI consultant**: asked, scored and shown on every result card.

Distances are straight-line estimates (lister-entered or LocationIQ), never
road distances, and are always labelled "approx.". Missing data is shown as
"not verified" and never scores.

## Environment variables (server)

```bash
# Up to five Groq keys (any of these forms). Server-side only.
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
GROQ_API_KEY_3=gsk_...
GROQ_API_KEY_4=gsk_...
GROQ_API_KEY_5=gsk_...
# or: GROQ_API_KEYS=gsk_a,gsk_b,...   or: GROQ_API_KEY=gsk_...

AI_CONSULTANT_LLM=on            # "off" = pure rule-based mode
GROQ_MODEL=openai/gpt-oss-120b  # default
GROQ_TIMEOUT_MS=5000            # bounded AI wait
# Local ceilings (defaults sit just under the free-plan limits for this model:
# 30 RPM, 1,000 RPD, 8,000 TPM, 200,000 TPD — check your Groq console)
GROQ_RPM_LIMIT=25
GROQ_RPD_LIMIT=900
GROQ_TPM_LIMIT=7000
GROQ_TPD_LIMIT=180000
GROQ_SERVICE_TIER=on_demand

LOCATIONIQ_KEY=...              # already used by the admin usage page; powers nearby auto-detect
```

**About the five keys.** Groq applies rate limits to the *organization*, not
the key. If all five keys belong to one Groq organization they share one
quota. The app rotates keys only to survive a revoked or failing key; a 429
puts every key on the same cooldown. It never retries in a loop and never
turns on paid usage.

## How a conversation works

1. **Start.** The assistant opens automatically once per browser session on `/` (after the
   launch intro), or from **Ask AI** in the hero or the floating orb button.
   **Manual search ✕** closes it and focuses the normal search box.
2. **Questions.** Rent: location, budget, BHK, type, furnishing, move-in,
   occupancy. Buy: location, budget, BHK, type, minimum area, possession,
   purpose. Both then ask which nearby places matter, how close each should
   be, and corner or middle.
3. **Only missing questions are asked.** "2 BHK for rent in Sector 57 under 30k near metro"
   fills five answers at once. Optional questions can be skipped, and
   "show results" works as soon as mode, location and budget are known.
4. **Corrections.** "make it 30k" or "only furnished" updates one answer and
   leaves the rest alone. Every summary item can be tapped to edit it.
5. **Clarifications instead of guesses.** A bare "25" becomes "₹25,000 per month?", and
   "2 crore" for a rental becomes "did you mean to buy?".
6. **Search.** The "AI is finding your best matches" stage shows a radar and a five-step
   pipeline with real numbers from the server: listings scanned, how many pass
   the must-haves, how many have verified distances, and how many were ranked.
7. **Results.** Each card shows a match score, the reasons it matched and any
   caveats (from listing data only), and the 7-parameter badges. "Ask AI"
   answers follow-up questions about a listing.
8. **No match.** The assistant names the constraint that emptied the results
   and offers to relax it. It always asks before relaxing anything.
9. **Lead.** The user gives name and mobile (email optional), reviews the
   summary, ticks consent and submits. Submitting is idempotent, so a retry
   never creates a duplicate lead.

Ranking weights (PRD): budget 30 · location 25 · BHK 15 · type/furnishing 10 ·
verified nearby + corner 10 · listing quality/freshness 10.

## Leads: admin and partners

- **Admin → Leads → AI Consultant Leads** (`/admin/ai-leads`) shows every lead with:
  - full requirements, contact, matched listings and transcript
  - status workflow and follow-up notes
  - partner assignment (up to 3 partners)
  - a usage panel: conversations, searches, enquiries, estimated AI calls and
    tokens, fallbacks and voice failures
- **PartnerHub → Leads → AI Consultant leads:**
  - Every active partner sees the requirements of open leads.
  - The phone number stays masked until the partner is assigned. Partners whose listings matched are
    assigned automatically, and others can **Take this lead** while fewer than 3 partners have it.
  - Assigned partners update the status (contacted → viewing scheduled →
    converted / lost) and add notes.

## Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/api/ai-consultant/config` | public |
| POST | `/api/ai-consultant/turn` | public, 120 / 10 min / IP |
| POST | `/api/ai-consultant/search` | public, 40 / 10 min / IP |
| POST | `/api/ai-consultant/enquiry` | public (optional login), 10 / hour / IP |
| POST | `/api/ai-consultant/metric` | public |
| GET / PATCH | `/api/admin/ai-consultant/leads[/:id]` | admin |
| GET | `/api/admin/ai-consultant/partners`, `/usage` | admin |
| GET | `/api/partner/ai-leads` | partner |
| POST | `/api/partner/ai-leads/:id/claim` | partner |
| PATCH | `/api/partner/ai-leads/:id` | partner (assigned only) |
| POST | `/api/nearby-parameters` | logged-in user, agent or partner |

## The question bank

`server/data/aiConsultant/questionBank.json` (about 5,800 lines) is the single source for:

- every question and its re-ask, hint, chips and follow-ups, in English, Hinglish and Hindi
- the 7 parameter definitions, with synonyms and distance chips
- intent patterns: restart, help, human, show results, ask about #2, …
- vocabulary: Gurgaon localities, number words, ₹ multipliers, distance and
  area units
- response templates, search-stage labels and FAQs
- the prompts and output schema for the LLM
- test dialogues

To change wording, edit the JSON. The engine picks up the change on restart.

## Running on Render's 512 MB free tier

- No new npm dependencies. The JSON loads once (~180 KB in memory).
- Conversation state lives in the browser and is re-validated on every request. MongoDB is
  written only when a lead is submitted, plus one small `$inc` counter per day.
- Each search reads at most 150 listings with a narrow projection and one image each.
- The nearby lookup cache is capped at 300 entries.
- The Groq client is a plain `fetch` call with a 5-second timeout. There is no SDK and no background worker.
- On the client the assistant is code-split: it downloads only when opened.

## Voice

Voice uses the browser's Web Speech API. Recognition runs in en-IN or hi-IN to match the
chosen language, and spoken replies switch on automatically after the first
use of the mic. The heard text appears in the input box for about a second
before it is sent, so it can be corrected. Typing always works. Unsupported
browsers, a denied microphone, no speech and network errors each show a clear
message. Browser speech may use the browser vendor's cloud service.

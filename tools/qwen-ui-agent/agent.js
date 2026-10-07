#!/usr/bin/env node
/**
 * Qwen UI agent — makes admin screens responsive + consistent using a small local model.
 *
 * How it stays safe with a tiny model:
 *  - The file is split into small chunks; the model only returns JSON find/replace edits
 *    for ONE chunk (never rewrites a file).
 *  - Every edit must match exactly once in the file, must not touch logic (fetch/await/
 *    handlers/hooks), and the file must still parse after it is applied — otherwise the
 *    edit is dropped.
 *  - Chunks run in parallel (CONCURRENCY) against a local Ollama server.
 *
 * Usage:  node agent.js [--dry] file1.jsx file2.jsx ...
 * Env:    QWEN_MODEL (default qwen3.5:4b)  OLLAMA_URL (default http://localhost:11435)
 *         CONCURRENCY (default 3)  CHUNK_LINES (default 70)
 */
const fs = require("fs");
const path = require("path");
const parser = require(path.resolve(__dirname, "../../node_modules/@babel/parser"));

const MODEL = process.env.QWEN_MODEL || "qwen3.5:4b";
const URL = process.env.OLLAMA_URL || "http://localhost:11435";
const CONCURRENCY = +process.env.CONCURRENCY || 3;
const CHUNK = +process.env.CHUNK_LINES || 70;
const DRY = process.argv.includes("--dry");
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// Digest of client/ADMIN_PANEL_UI_UPGRADE_SPEC.txt (Part 3, 4, 8.14)
const RULES = `You improve ONE chunk of a React + MUI admin screen so it looks professional and works on mobile (360px), tablet (768px) and laptop (1280px).
Design tokens: primary #003366, teal #00A79D, cyan #22D3EE, page bg #F4F7F9, surface #FFFFFF, border #E5E9EE, text #1B2B3A / #5B6B7B. Card radius 12, input/button radius 8. Card shadow 0 2px 8px rgba(0,51,102,.05). Spacing multiples of 4/8.
What to change (styling only):
- Responsive sx values: padding { xs: 2, md: 3 }; direction { xs: "column", sm: "row" }; gridTemplateColumns { xs: "1fr", sm: "repeat(2,1fr)", lg: "repeat(4,1fr)" }; Grid items xs={12} sm={6} md={4}; fontSize responsive; fixed pixel widths -> width: "100%" with maxWidth.
- Tables: wrap-friendly (TableContainer sx overflowX "auto"), cell nowrap where needed.
- Buttons/IconButtons: minHeight 44 on touch (xs), aria-label on icon-only buttons, visible focus ring ("&:focus-visible": { outline: "2px solid #00A79D", outlineOffset: 2 }).
- Cards: borderRadius 3 (=12px), border "1px solid #E5E9EE", subtle shadow, hover lift.
- Use theme tokens like "text.secondary", "divider" as plain strings.
Return ONLY JSON: {"edits":[{"find":"<exact text copied from the chunk, on one line or a few lines>","replace":"<new text>"}]}
Rules for edits: "find" must be copied EXACTLY from the chunk and be unique. Keep each edit small (one prop or one sx object). Do NOT change imports, state, handlers, fetch/axios calls, text content, JSX structure, tags, or keys. Do not add new components or imports. Keep brackets/quotes balanced. 3-8 high-value edits is ideal; return {"edits":[]} if nothing needs changing.`;

const FORBID = ["fetch(", "axios", "await ", "useState", "useEffect", "useMemo", "useCallback", "import ", "require(", "localStorage", "dangerouslySetInnerHTML", "navigate(", "onClick", "onChange", "onSubmit", "href=", "to="];
const count = (s, t) => s.split(t).length - 1;

function parses(code) {
  try { parser.parse(code, { sourceType: "module", plugins: ["jsx"] }); return true; } catch { return false; }
}

function safe(find, replace) {
  if (!find || find === replace) return "noop";
  if (find.length > 600 || replace.length > 900) return "too-big";
  for (const t of FORBID) if (count(find, t) !== count(replace, t)) return `touches:${t.trim()}`;
  if (count(find, "=>") !== count(replace, "=>")) return "touches:=>";
  // tag structure must be unchanged
  const tags = (s) => (s.match(/<\/?[A-Za-z][\w.]*/g) || []).join("|");
  if (tags(find) !== tags(replace)) return "touches:tags";
  return null;
}

async function ask(chunkText) {
  const res = await fetch(`${URL}/api/chat`, {
    method: "POST",
    body: JSON.stringify({
      model: MODEL, stream: false, think: false, format: "json",
      messages: [{ role: "system", content: RULES }, { role: "user", content: "CHUNK:\n```jsx\n" + chunkText + "\n```" }],
      options: { num_ctx: 4096, num_predict: 1200, temperature: 0.1 },
    }),
  });
  const j = await res.json();
  try { return JSON.parse(j.message.content).edits || []; } catch { return []; }
}

const state = {}; // per-file working copy
const stats = { chunks: 0, applied: 0, rejected: {}, fileApplied: {} };

function applyEdits(file, edits) {
  const st = state[file];
  for (const e of edits) {
    if (!e || typeof e.find !== "string" || typeof e.replace !== "string") continue;
    const why = safe(e.find, e.replace);
    const reject = (r) => { stats.rejected[r] = (stats.rejected[r] || 0) + 1; };
    if (why) { reject(why); continue; }
    if (count(st.code, e.find) !== 1) { reject("not-unique-or-missing"); continue; }
    const next = st.code.replace(e.find, () => e.replace);
    if (!parses(next)) { reject("syntax"); continue; }
    st.code = next; stats.applied++; stats.fileApplied[file] = (stats.fileApplied[file] || 0) + 1;
    st.log.push({ find: e.find, replace: e.replace });
  }
}

function chunksOf(code) {
  const lines = code.split("\n"); const out = [];
  for (let i = 0; i < lines.length; i += CHUNK) {
    const text = lines.slice(i, i + CHUNK).join("\n");
    if (/sx=|style=|<Grid|<Table|<Stack|<Box|<Button|<IconButton/.test(text)) out.push(text);
  }
  return out;
}

(async () => {
  const jobs = [];
  for (const f of files) {
    const abs = path.resolve(f);
    const code = fs.readFileSync(abs, "utf8");
    if (!parses(code)) { console.log("SKIP (does not parse):", f); continue; }
    state[abs] = { code, orig: code, log: [] };
    for (const c of chunksOf(code)) jobs.push({ file: abs, text: c });
  }
  console.log(`${jobs.length} chunks across ${Object.keys(state).length} files, concurrency ${CONCURRENCY}, model ${MODEL}`);
  const t0 = Date.now(); let next = 0, done = 0;
  async function worker() {
    while (next < jobs.length) {
      const job = jobs[next++];
      try { applyEdits(job.file, await ask(job.text)); } catch (e) { console.log("ERR", e.message); }
      stats.chunks++; done++;
      if (done % 5 === 0 || done === jobs.length) console.log(`[${Math.round((Date.now() - t0) / 1000)}s] ${done}/${jobs.length} chunks, ${stats.applied} edits applied`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  for (const [abs, st] of Object.entries(state)) {
    if (st.code !== st.orig && !DRY) fs.writeFileSync(abs, st.code);
    console.log(`${st.code !== st.orig ? "EDITED" : "unchanged"} ${path.basename(abs)} (${stats.fileApplied[abs] || 0} edits)`);
  }
  console.log("rejected:", JSON.stringify(stats.rejected), `total ${Math.round((Date.now() - t0) / 1000)}s`);
  fs.writeFileSync(path.join(__dirname, "last-run.json"), JSON.stringify(Object.fromEntries(Object.entries(state).map(([k, v]) => [path.basename(k), v.log])), null, 1));
})();

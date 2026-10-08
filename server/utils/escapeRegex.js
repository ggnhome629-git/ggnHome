// Escapes regex metacharacters so user-supplied search text can't be used
// to build an attacker-controlled RegExp. Without this, search/autocomplete
// endpoints that pass user input straight into `new RegExp(...)` or
// Mongoose's $regex accept a crafted pattern (catastrophic backtracking)
// that can hang MongoDB's regex engine evaluating it against every scanned
// document -- a database-wide ReDoS, not just a client-side one, and
// reachable here with no login required.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };

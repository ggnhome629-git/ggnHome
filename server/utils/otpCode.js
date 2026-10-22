const crypto = require("crypto");

// Login codes are 4 LETTERS in alphabetical order, e.g. "ABCF" or "CDET".
//
// Four different letters, always sorted A to Z, are easy to read out and to remember ("a, b, c, f").
// I, L and O are left out so nothing is confused with 1, 0 or each other.
// 23 letters choose 4 = 8,855 codes. That is much fewer than random letters, so the safety comes from the
// limits around the code: it is valid for 5 minutes, it is cancelled after 5 wrong guesses, and the number
// of codes one person can ask for is rate limited.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 4;

function generateCode() {
  // Pick CODE_LENGTH different letters, then put them in order.
  const pool = ALPHABET.split("");
  const picked = [];
  for (let i = 0; i < CODE_LENGTH; i++) picked.push(pool.splice(crypto.randomInt(pool.length), 1)[0]);
  return picked.sort().join("");
}

// People type "abcf", " ABCF " or paste with spaces — all mean ABCF.
function normalizeCode(input) {
  return String(input == null ? "" : input).replace(/\s+/g, "").toUpperCase();
}

module.exports = { generateCode, normalizeCode, CODE_LENGTH };

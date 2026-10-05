const crypto = require("crypto");

// Login codes are 4 random LETTERS (e.g. "KQMX"), not digits.
//
// Consonants only: a random 4-letter string can otherwise spell a real (or
// rude) word, and I/O/Y are left out so nothing is confused with 1/0.
// 20 letters ^ 4 = 160,000 codes. That is safe here because each code is valid
// for 5 minutes and is cancelled after 5 wrong guesses.
const ALPHABET = "BCDFGHJKLMNPQRSTVWXZ";
const CODE_LENGTH = 4;

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return code;
}

// People type "kqmx", " KQMX " or paste with spaces — all mean KQMX.
function normalizeCode(input) {
  return String(input == null ? "" : input).replace(/\s+/g, "").toUpperCase();
}

module.exports = { generateCode, normalizeCode, CODE_LENGTH };

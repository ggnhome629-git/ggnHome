"""Turns on-screen consultant text into natural spoken language.

The chat shows compact text (₹30k, 2 BHK, bullets, "#3"). Read aloud verbatim it
sounds like a bot. This module only changes *how a reply is said*; it never adds
facts, so the rule engine / database stay the single source of truth.
"""
import re
import zlib

ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def _below_100(n: int) -> str:
    if n < 20:
        return ONES[n]
    return TENS[n // 10] + (f" {ONES[n % 10]}" if n % 10 else "")


def number_words(n: int) -> str:
    """Indian-style spoken number: 25000 -> 'twenty five thousand'."""
    if n < 100:
        return _below_100(n)
    if n < 1000:
        return f"{ONES[n // 100]} hundred" + (f" {_below_100(n % 100)}" if n % 100 else "")
    for size, name in ((10_000_000, "crore"), (100_000, "lakh"), (1000, "thousand")):
        if n >= size:
            head, rest = divmod(n, size)
            return f"{number_words(head)} {name}" + (f" {number_words(rest)}" if rest else "")
    return str(n)


def _decimal_words(text: str) -> str:
    whole, _, frac = text.partition(".")
    out = number_words(int(whole.replace(",", "") or 0))
    return out + (" point " + " ".join(ONES[int(d)] for d in frac) if frac else "")


def _money(match: re.Match) -> str:
    amount, unit = match.group(1), (match.group(2) or "").lower()
    if unit in ("cr", "crore"):
        return f"{_decimal_words(amount)} crore rupees"
    if unit in ("l", "lakh", "lac"):
        return f"{_decimal_words(amount)} lakh rupees"
    if unit == "k":
        return f"{_decimal_words(amount)} thousand rupees"
    return f"{number_words(int(amount.replace(',', '')))} rupees" if "." not in amount else f"{amount} rupees"


CONTRACTIONS = [
    (r"\bI am\b", "I'm"), (r"\bI will\b", "I'll"), (r"\bI have\b", "I've"),
    (r"\bdo not\b", "don't"), (r"\bdoes not\b", "doesn't"), (r"\bcannot\b", "can't"),
    (r"\bcan not\b", "can't"), (r"\bit is\b", "it's"), (r"\bthat is\b", "that's"),
    (r"\bwhat is\b", "what's"), (r"\byou are\b", "you're"), (r"\bwe are\b", "we're"),
    (r"\byou will\b", "you'll"), (r"\bwill not\b", "won't"), (r"\bI would\b", "I'd"),
    (r"\blet us\b", "let's"), (r"\bthere is\b", "there's"),
]
OPENERS = ["Sure — ", "Okay, ", "Alright, ", "Got it. ", "Right, "]
NO_OPENER = re.compile(r"^(hi|hello|hey|namaste|namaskar|welcome|sure|okay|ok|alright|got it|great|thanks|thank you|sorry|right|yes|no)\b", re.I)


def humanize(text: str, *, lang: str = "en", allow_opener: bool = True, seed: str = "") -> str:
    t = text
    # markup and screen-only artefacts
    t = re.sub(r"https?://\S+", "", t)
    t = re.sub(r"[*_`#>]+", "", t)
    t = re.sub(r"(?m)^\s*[-•·▪]\s*", "", t)
    t = re.sub(r"\(#?\d+\)", "", t)
    t = re.sub(r"[\U0001F300-\U0001FAFF☀-➿️]", "", t)
    # money, units, shorthand
    t = re.sub(r"₹\s?([\d,]+(?:\.\d+)?)\s?(Cr|crore|L|lakh|lac|k)?\b", _money, t, flags=re.I)
    t = re.sub(r"\bRs\.?\s?([\d,]+)", lambda m: _money(re.match(r"([\d,]+)()", m.group(1))), t)
    t = re.sub(r"/\s?(month|mahina|माह)\b", r" per month", t, flags=re.I)
    t = re.sub(r"\b(\d+)\s?BHK\b", lambda m: f"{number_words(int(m.group(1)))} B H K", t, flags=re.I)
    t = re.sub(r"\b(\d+(?:\.\d+)?)\s?km\b", lambda m: f"{_decimal_words(m.group(1))} kilometre" + ("" if m.group(1) == "1" else "s"), t)
    t = re.sub(r"\b(\d+)\s?m\b(?!\w)", lambda m: f"{number_words(int(m.group(1)))} metres", t)
    t = re.sub(r"\bsq\.?\s?ft\b", "square feet", t, flags=re.I)
    t = re.sub(r"≤", "within ", t)
    t = t.replace("&", " and ").replace("→", "").replace("n/a", "not available")
    t = re.sub(r"\s[—–-]{1,2}\s", ", ", t)
    t = re.sub(r"\s*\n+\s*", ". ", t)
    if lang == "en":
        for pattern, repl in CONTRACTIONS:
            t = re.sub(pattern, lambda m, r=repl: r[0].upper() + r[1:] if m.group(0)[0].isupper() else r, t, flags=re.I)
    t = re.sub(r"\s+([,.!?])", r"\1", t)
    t = re.sub(r"([.!?])\s*\.", r"\1", t)
    t = re.sub(r"\s+", " ", t).strip()
    # A light, varied acknowledgement on some replies; never on greetings or repeats.
    if allow_opener and lang == "en" and t and not NO_OPENER.match(t):
        pick = zlib.crc32((seed or t).encode("utf-8"))
        if pick % 3 == 0:
            t = OPENERS[(pick // 3) % len(OPENERS)] + t[0].lower() + t[1:] if not t[:2].isupper() else OPENERS[(pick // 3) % len(OPENERS)] + t
    return t

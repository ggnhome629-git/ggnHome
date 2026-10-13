"""Optional Groq pass that rewrites a *finished* consultant reply for speech.

The rule engine and database decide the content. This step may only change the
wording. A reply is accepted only if it passes ``is_safe_rewrite``; otherwise
the caller speaks the deterministic version, so a model slip can never put a
new fact in the consultant's mouth.
"""
import logging
import os
import re
from pathlib import Path
from typing import Any

logger = logging.getLogger("ggnhome-livekit")

STYLE_GUIDE = (Path(__file__).with_name("voice_style_guide.md")).read_text(encoding="utf-8")
SYSTEM_PROMPT = (
    STYLE_GUIDE.split("## Rules the rewriter follows", 1)[-1].strip()
    + "\n\nRewrite the user's message for speech. Reply with the rewritten text only."
)
MODEL = os.getenv("VOICE_REWRITE_MODEL", "llama-3.1-8b-instant")
TIMEOUT_S = float(os.getenv("VOICE_REWRITE_TIMEOUT_S", "2.5"))
MAX_INPUT_CHARS = 700

_NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?")
_CONTACT = re.compile(r"https?://|www\.|@|\+?\d{10}")


def numbers_in(text: str) -> set[str]:
    return {n.replace(",", "").rstrip(".") for n in _NUMBER.findall(text)}


def is_safe_rewrite(source: str, rewritten: str, max_chars: int) -> bool:
    """True only if the rewrite adds no numbers/contact details and stays short."""
    out = rewritten.strip()
    if not out or len(out) > max_chars * 1.4:
        return False
    if re.search(r"[*_`#\[\]{}<>]", out) or "\n\n" in out:
        return False
    if not numbers_in(out) <= numbers_in(source):
        return False
    if _CONTACT.search(out) and not _CONTACT.search(source):
        return False
    # A rewrite must keep the question if there was one, and not invent one.
    if source.count("?") == 0 and out.count("?") > 0:
        return False
    return True


def trim_source(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= MAX_INPUT_CHARS:
        return text
    window = text[:MAX_INPUT_CHARS]
    cut = max(window.rfind(". "), window.rfind("? "), window.rfind("! "), window.rfind("। "))
    return window[: cut + 1] if cut > 80 else window.rsplit(" ", 1)[0]


async def rewrite_for_speech(client: Any, text: str, *, lang: str, last_opener: str, max_chars: int) -> str | None:
    """Return a safe rewrite, or None to keep the deterministic wording."""
    if client is None:
        return None
    source = trim_source(text)
    if len(source) < 25:
        return None  # already short; nothing to humanise
    try:
        import asyncio

        response = await asyncio.wait_for(
            client.chat.completions.create(
                model=MODEL,
                temperature=0.6,
                max_tokens=140,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT + f"\nLanguage: {lang}. Last opener used: {last_opener or 'none'}."},
                    {"role": "user", "content": source},
                ],
            ),
            timeout=TIMEOUT_S,
        )
        out = (response.choices[0].message.content or "").strip().strip('"')
    except Exception as error:  # timeout, quota, network: stay silent about details
        logger.info("Voice rewrite skipped (%s)", type(error).__name__)
        return None
    if not is_safe_rewrite(source, out, max_chars):
        logger.info("Voice rewrite rejected by safety check")
        return None
    return out

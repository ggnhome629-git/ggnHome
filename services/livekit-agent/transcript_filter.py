"""Pure transcript filtering helpers, kept independent of LiveKit runtime imports."""
import logging
import re
import time

logger = logging.getLogger("ggnhome-livekit.transcript-filter")
DUPLICATE_WINDOW_S = 4.0
ECHO_WINDOW_S = 6.0
FILLER_WORDS = {
    "hmm", "hm", "mm", "mhm", "uh", "um", "umm", "uhh", "ah", "oh", "haan", "han", "hanji",
    "ok", "okay", "okk", "yeah", "yes", "yep", "right", "achha", "accha", "theek", "hmmm",
}

# Phrases Whisper invents from silence, breathing or room noise (it was trained on
# subtitled video). A transcript made only of these is never a real answer.
HALLUCINATIONS = {
    "thank you", "thank you very much", "thank you so much", "thanks", "thanks a lot",
    "thank you for watching", "thanks for watching", "thank you for listening",
    "please subscribe", "like and subscribe", "subscribe", "bye", "bye bye", "goodbye",
    "you", "the end", "subtitles by the amara org community", "transcribed by",
    "so", "okay thank you", "ok thank you", "thank you bye", "see you next time",
    "धन्यवाद", "शुक्रिया", "सब्सक्राइब", "थैंक यू", "बाय",
}


def normalise(text: str) -> str:
    return re.sub(r"[^\wऀ-ॿ]+", " ", text.lower()).strip()


def is_hallucination(text: str) -> bool:
    norm = normalise(text)
    return norm in HALLUCINATIONS or bool(re.fullmatch(r"(thank you\s*)+", norm))


def is_filler_only(text: str) -> bool:
    words = normalise(text).split()
    return bool(words) and len(words) <= 2 and all(word in FILLER_WORDS for word in words)


class TranscriptFilter:
    """Drops duplicate transcripts and echoes of the assistant's own voice."""

    def __init__(self) -> None:
        self.last_text = ""
        self.last_at = 0.0
        self.spoken: list[tuple[float, str]] = []

    def remember_spoken(self, text: str) -> None:
        now = time.monotonic()
        self.spoken = [(stamp, spoken) for stamp, spoken in self.spoken if now - stamp < 60] + [(now, normalise(text))]

    def accept(self, text: str) -> bool:
        now = time.monotonic()
        norm = normalise(text)
        if not norm or is_filler_only(text):
            return False
        if is_hallucination(text):
            logger.info("Dropped a likely speech-to-text hallucination: %r", norm)
            return False
        if norm == self.last_text and now - self.last_at < DUPLICATE_WINDOW_S:
            return False
        # Echo guard: a transcript matching recent assistant speech is not a new question.
        if len(norm) >= 12 and any(now - stamp < ECHO_WINDOW_S and norm in spoken for stamp, spoken in self.spoken):
            logger.info("Dropped a transcript that matched the assistant's own speech")
            return False
        self.last_text, self.last_at = norm, now
        return True

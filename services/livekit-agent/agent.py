"""GgnHome's LiveKit voice bridge.

Audio stays on the self-hosted LiveKit server. Speech recognition and synthesis
use OpenAI-compatible self-hosted endpoints (for example faster-whisper via
Speaches and Kokoro-FastAPI). This worker does not run any LLM: it only turns
speech into text and text into speech.

Every answer is decided by GgnHome itself. The browser receives each final
transcript, sends it to /api/ai-consultant/turn (rule engine + database search,
with the optional server-side Groq fallback only for messages the rules cannot
interpret) and sends the resulting reply back here to be spoken.

Data-channel protocol (topic "ggnhome-voice", JSON):

  agent -> browser
    {"type": "voice_status", "status": "ready" | "tts_error" | "stt_error"}
    {"type": "agent_state", "state": "initializing|idle|listening|thinking|speaking"}
    {"type": "user_state", "state": "speaking|listening|away"}
    {"type": "user_transcript", "id": str, "text": str}
    {"type": "speech_started", "id": str}
    {"type": "speech_done", "id": str, "interrupted": bool}

  browser -> agent
    {"type": "speak_text", "id": str, "text": str, "lang": "en|hi|hinglish",
     "interruptible": bool}
    {"type": "hello"}            (answered with voice_status "ready")
    {"type": "stop_speaking"}
    {"type": "set_language", "lang": "en|hi|hinglish"}
"""
import asyncio
import json
import logging
import os
import re
import time
import uuid
from typing import Any

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentServer, AgentSession
from livekit.plugins import openai, silero

from speech_style import humanize
from voice_rewrite import rewrite_for_speech

load_dotenv(".env")

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ggnhome-livekit")

VOICE_TOPIC = "ggnhome-voice"
AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "ggnhome-property-voice")
# Providers: "groq" (hosted, fast, free tier) or "local" (self-hosted CPU/GPU
# OpenAI-compatible servers). Hosted Groq is the default because small CPU
# Whisper + CPU Kokoro were the main source of lag.
STT_PROVIDER = os.getenv("VOICE_STT_PROVIDER", "groq").lower()
# Groq is the default when its speech key is set; other providers are optional.
TTS_PROVIDER = os.getenv(
    "VOICE_TTS_PROVIDER",
    "groq" if os.getenv("GROQ_SPEECH_API_KEY") else "deepgram" if os.getenv("DEEPGRAM_API_KEY") else "cartesia" if os.getenv("CARTESIA_API_KEY") else "groq",
).lower()
# Use a dedicated Groq key for speech, never the consultant's GROQ_API_KEY_* set,
# so voice traffic cannot exhaust the text fallback's quota.
GROQ_SPEECH_KEY = os.getenv("GROQ_SPEECH_API_KEY", "")
GROQ_STT_MODEL = os.getenv("GROQ_STT_MODEL", "whisper-large-v3-turbo")
GROQ_TTS_MODEL = os.getenv("GROQ_TTS_MODEL", "canopylabs/orpheus-v1-english")
GROQ_TTS_VOICE = os.getenv("GROQ_TTS_VOICE", "autumn")

# Natural-voice providers (each reads its own key from the environment):
#   deepgram -> DEEPGRAM_API_KEY  (Aura-2 voices, ~$200 signup credit)
#   cartesia -> CARTESIA_API_KEY  (Sonic-3, low latency, emotion control)
#   sarvam   -> SARVAM_API_KEY    (Bulbul v3, Indian-accented English/Hindi)
DEEPGRAM_TTS_MODEL = os.getenv("DEEPGRAM_TTS_MODEL", "aura-2-thalia-en")
CARTESIA_TTS_MODEL = os.getenv("CARTESIA_TTS_MODEL", "sonic-3")
CARTESIA_VOICE = os.getenv("CARTESIA_VOICE_ID", "")
SARVAM_TTS_MODEL = os.getenv("SARVAM_TTS_MODEL", "bulbul:v3")
SARVAM_SPEAKER = os.getenv("SARVAM_SPEAKER", "") or None
SARVAM_LANGS = {"en": "en-IN", "hi": "hi-IN", "hinglish": "hi-IN"}

# Rewrite each reply into natural spoken wording with a small Groq model. The
# rewrite is checked (no new numbers/contacts) and falls back to the plain text.
VOICE_REWRITE = os.getenv("VOICE_REWRITE", "on").lower() != "off" and bool(GROQ_SPEECH_KEY)

STT_BASE_URL = os.getenv("LOCAL_STT_BASE_URL", "http://127.0.0.1:8000/v1")
STT_API_KEY = os.getenv("LOCAL_STT_API_KEY", "local")
STT_MODEL = os.getenv("LOCAL_STT_MODEL", "Systran/faster-whisper-small")
TTS_BASE_URL = os.getenv("LOCAL_TTS_BASE_URL", "http://127.0.0.1:8880/v1")
TTS_API_KEY = os.getenv("LOCAL_TTS_API_KEY", "local")
TTS_MODEL = os.getenv("LOCAL_TTS_MODEL", "kokoro")
TTS_VOICES = {
    "en": os.getenv("LOCAL_TTS_VOICE", "af_heart"),
    "hinglish": os.getenv("LOCAL_TTS_VOICE_HINGLISH", os.getenv("LOCAL_TTS_VOICE", "af_heart")),
    "hi": os.getenv("LOCAL_TTS_VOICE_HI", "hf_alpha"),
}
# Whisper language per consultant language. Hinglish is code-switched, so the
# model detects it per utterance instead of being forced to one language.
STT_LANGUAGES = {"en": "en", "hi": "hi", "hinglish": None}

# Long answers are read in full on screen; speaking only the opening sentences
# keeps replies snappy and the voice from rambling.
MAX_SPEAK_CHARS = int(os.getenv("VOICE_MAX_SPEAK_CHARS", "320"))
MAX_TRANSCRIPT_CHARS = 600
DUPLICATE_WINDOW_S = 4.0
ECHO_WINDOW_S = 6.0


def data_packet(message: dict[str, Any]) -> bytes:
    return json.dumps(message, ensure_ascii=False).encode("utf-8")


def normalise(text: str) -> str:
    return re.sub(r"[^\wऀ-ॿ]+", " ", text.lower()).strip()


def clean_for_speech(text: str, *, lang: str = "en", opener: bool = True, seed: str = "") -> str:
    text = humanize(text, lang=lang, allow_opener=opener, seed=seed)
    if len(text) <= MAX_SPEAK_CHARS:
        return text
    # Cut at the last sentence end inside the limit so speech never stops mid-word.
    window = text[:MAX_SPEAK_CHARS]
    cut = max(window.rfind(". "), window.rfind("? "), window.rfind("! "), window.rfind("। "))
    return (window[: cut + 1] if cut > 60 else window.rsplit(" ", 1)[0]).strip()


class GgnHomeVoiceAgent(Agent):
    """Audio transport only. GgnHome's API owns every reply."""

    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are the GgnHome audio transport. Never answer on your own; "
                "GgnHome's rule engine and property database decide every reply."
            )
        )

    async def llm_node(self, chat_ctx: Any, tools: Any, model_settings: Any):
        # No LLM is configured on purpose. Yielding nothing guarantees the
        # pipeline cannot produce a parallel, ungrounded answer.
        if False:  # pragma: no cover
            yield ""


# Short acknowledgements ("hmm", "okay") are not questions. Treating them as turns
# makes the consultant answer a nod; ignore them (LiveKit issue #4450).
FILLER_WORDS = {
    "hmm", "hm", "mm", "mhm", "uh", "um", "umm", "uhh", "ah", "oh", "haan", "han", "hanji",
    "ok", "okay", "okk", "yeah", "yes", "yep", "right", "achha", "accha", "theek", "hmmm",
}


def is_filler_only(text: str) -> bool:
    words = normalise(text).split()
    return bool(words) and len(words) <= 2 and all(w in FILLER_WORDS for w in words)


class TranscriptFilter:
    """Drops duplicate transcripts and echoes of the assistant's own voice."""

    def __init__(self) -> None:
        self.last_text = ""
        self.last_at = 0.0
        self.spoken: list[tuple[float, str]] = []

    def remember_spoken(self, text: str) -> None:
        now = time.monotonic()
        self.spoken = [(t, s) for t, s in self.spoken if now - t < 60] + [(now, normalise(text))]

    def accept(self, text: str) -> bool:
        now = time.monotonic()
        norm = normalise(text)
        if not norm or is_filler_only(text):
            return False
        if norm == self.last_text and now - self.last_at < DUPLICATE_WINDOW_S:
            return False
        # Echo guard: a transcript that is just a slice of what we said a moment
        # ago is our own voice leaking past the browser's echo cancellation.
        if len(norm) >= 12 and any(now - t < ECHO_WINDOW_S and norm in s for t, s in self.spoken):
            logger.info("Dropped a transcript that matched the assistant's own speech")
            return False
        self.last_text, self.last_at = norm, now
        return True


def build_speech_services() -> tuple[Any, Any]:
    """Create STT and TTS for one session from environment configuration."""
    if STT_PROVIDER == "groq":
        if not GROQ_SPEECH_KEY:
            raise RuntimeError("GROQ_SPEECH_API_KEY is required when VOICE_STT_PROVIDER=groq")
        from livekit.plugins import groq

        stt = groq.STT(model=GROQ_STT_MODEL, api_key=GROQ_SPEECH_KEY, language="en")
    else:
        stt = openai.STT(
            model=STT_MODEL,
            base_url=STT_BASE_URL,
            api_key=STT_API_KEY,
            language="en",
            use_realtime=False,
        )
    if TTS_PROVIDER == "deepgram":
        from livekit.plugins import deepgram

        tts = deepgram.TTS(model=DEEPGRAM_TTS_MODEL)
    elif TTS_PROVIDER == "cartesia":
        from livekit.plugins import cartesia

        kwargs = {"voice": CARTESIA_VOICE} if CARTESIA_VOICE else {}
        tts = cartesia.TTS(model=CARTESIA_TTS_MODEL, language="en", speed=1.0, emotion="content", **kwargs)
    elif TTS_PROVIDER == "sarvam":
        from livekit.plugins import sarvam

        tts = sarvam.TTS(target_language_code="en-IN", model=SARVAM_TTS_MODEL, speaker=SARVAM_SPEAKER)
    elif TTS_PROVIDER == "groq":
        if not GROQ_SPEECH_KEY:
            raise RuntimeError("GROQ_SPEECH_API_KEY is required when VOICE_TTS_PROVIDER=groq")
        from livekit.plugins import groq

        tts = groq.TTS(model=GROQ_TTS_MODEL, voice=GROQ_TTS_VOICE, api_key=GROQ_SPEECH_KEY)
    else:
        tts = openai.TTS(
            model=TTS_MODEL,
            voice=TTS_VOICES["en"],
            base_url=TTS_BASE_URL,
            api_key=TTS_API_KEY,
            # Headerless PCM streams back faster than WAV.
            response_format="pcm",
        )
    return stt, tts


server = AgentServer()


def prewarm(proc: agents.JobProcess) -> None:
    # Load the VAD model once per worker process, not on every visitor's first turn.
    proc.userdata["vad"] = silero.VAD.load()


server.setup_fnc = prewarm


@server.rtc_session(agent_name=AGENT_NAME)
async def ggn_home_voice(ctx: agents.JobContext) -> None:
    await ctx.connect()
    VAD = ctx.proc.userdata["vad"]

    stt, tts = build_speech_services()
    session = AgentSession(
        stt=stt,
        tts=tts,
        # Whisper-style STT is not streaming; local Silero VAD segments turns.
        vad=VAD,
        # VAD only: no hosted turn-detector inference.
        turn_handling={
            "turn_detection": "vad",
            "endpointing": {"min_delay": 0.35, "max_delay": 1.6},
            "preemptive_generation": {"enabled": False},
        },
        user_away_timeout=60.0,
    )
    rewrite_client = None
    if VOICE_REWRITE:
        import openai as openai_sdk  # the OpenAI-compatible SDK, pointed at Groq

        rewrite_client = openai_sdk.AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1", api_key=GROQ_SPEECH_KEY, timeout=4.0, max_retries=0
        )
    last_opener = {"value": ""}
    transcripts = TranscriptFilter()
    current_lang = {"value": "en"}
    speak_lock = asyncio.Lock()
    tasks: set[asyncio.Task[Any]] = set()

    def spawn(coro: Any) -> None:
        task = asyncio.create_task(coro)
        tasks.add(task)
        task.add_done_callback(tasks.discard)

    async def send(message: dict[str, Any]) -> None:
        participant = ctx.room.local_participant
        if not participant:
            return
        try:
            await participant.publish_data(data_packet(message), reliable=True, topic=VOICE_TOPIC)
        except Exception:  # room closing
            logger.debug("Could not publish %s", message.get("type"))

    def set_language(lang: str) -> None:
        lang = lang if lang in TTS_VOICES else "en"
        if lang == current_lang["value"]:
            return
        current_lang["value"] = lang
        try:
            if TTS_PROVIDER == "local":
                tts.update_options(voice=TTS_VOICES[lang])
            elif TTS_PROVIDER == "sarvam":
                tts.update_options(target_language_code=SARVAM_LANGS[lang])
            stt_lang = STT_LANGUAGES[lang]
            if stt_lang:
                stt.update_options(language=stt_lang, detect_language=False)
            else:
                stt.update_options(detect_language=True)
        except Exception:
            logger.exception("Could not switch voice language to %s", lang)

    @session.on("agent_state_changed")
    def on_agent_state(event: Any) -> None:
        spawn(send({"type": "agent_state", "state": event.new_state}))

    @session.on("user_state_changed")
    def on_user_state(event: Any) -> None:
        spawn(send({"type": "user_state", "state": event.new_state}))

    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: Any) -> None:
        if not getattr(event, "is_final", False):
            return
        text = str(getattr(event, "transcript", "") or "").strip()[:MAX_TRANSCRIPT_CHARS]
        if not text or not transcripts.accept(text):
            return
        spawn(send({"type": "user_transcript", "id": uuid.uuid4().hex[:12], "text": text}))

    @session.on("error")
    def on_error(event: Any) -> None:
        source = type(getattr(event, "source", None)).__name__.lower()
        status = "stt_error" if "stt" in source else "tts_error" if "tts" in source else "agent_error"
        logger.warning("Voice pipeline error from %s", source or "unknown")
        spawn(send({"type": "voice_status", "status": status}))

    async def speak(message_id: str, text: str, interruptible: bool) -> None:
        async with speak_lock:
            transcripts.remember_spoken(text)
            # A non-interruptible message (the greeting) is spoken with the
            # microphone input switched off, so nothing is heard until it ends.
            if not interruptible:
                session.input.set_audio_enabled(False)
            await send({"type": "speech_started", "id": message_id})
            interrupted = False
            try:
                handle = session.say(text, allow_interruptions=interruptible, add_to_chat_ctx=False)
                await handle
                interrupted = bool(handle.interrupted)
            except Exception:
                logger.exception("Local TTS failed for a voice response")
                await send({"type": "voice_status", "status": "tts_error", "id": message_id})
            finally:
                if not interruptible:
                    # Let the last audio frames leave the speaker before listening.
                    await asyncio.sleep(0.35)
                    session.clear_user_turn()
                    session.input.set_audio_enabled(True)
            await send({"type": "speech_done", "id": message_id, "interrupted": interrupted})

    @ctx.room.on("data_received")
    def on_data_received(packet: rtc.DataPacket) -> None:
        if packet.topic and packet.topic != VOICE_TOPIC:
            return
        try:
            message = json.loads(packet.data.decode("utf-8"))
        except (ValueError, UnicodeDecodeError, AttributeError):
            return
        if not isinstance(message, dict):
            return
        kind = message.get("type")
        if kind == "hello":
            # The browser may join after our first "ready"; answer every hello.
            spawn(send({"type": "voice_status", "status": "ready"}))
        elif kind == "set_language":
            set_language(str(message.get("lang", "en")))
        elif kind == "stop_speaking":
            session.interrupt(force=True)
        elif kind == "speak_text":
            raw = str(message.get("text", ""))
            if message.get("lang"):
                set_language(str(message["lang"]))
            message_id = str(message.get("id") or uuid.uuid4().hex[:12])[:40]
            interruptible = message.get("interruptible") is not False
            is_greeting = message.get("kind") == "greeting" or not interruptible

            async def prepare_and_speak() -> None:
                lang = current_lang["value"]
                rewritten = None
                if not is_greeting:  # the greeting is fixed copy; speak it without delay
                    rewritten = await rewrite_for_speech(
                        rewrite_client, raw, lang=lang, last_opener=last_opener["value"], max_chars=MAX_SPEAK_CHARS
                    )
                text = clean_for_speech(
                    rewritten or raw,
                    lang=lang,
                    opener=not is_greeting and rewritten is None,
                    seed=message_id,
                )
                if not text:
                    return
                last_opener["value"] = " ".join(text.split()[:2])
                await speak(message_id, text, interruptible)

            spawn(prepare_and_speak())

    @ctx.room.on("participant_connected")
    def on_participant_connected(participant: rtc.RemoteParticipant) -> None:
        spawn(send({"type": "voice_status", "status": "ready"}))

    @ctx.room.on("participant_disconnected")
    def on_participant_disconnected(participant: rtc.RemoteParticipant) -> None:
        logger.info("Visitor left room %s", ctx.room.name)

    await session.start(room=ctx.room, agent=GgnHomeVoiceAgent())
    await send({"type": "voice_status", "status": "ready"})
    logger.info("GgnHome voice agent joined room %s", ctx.room.name)


if __name__ == "__main__":
    agents.cli.run_app(server)

"""GgnHome's LiveKit voice bridge.

Audio stays on the self-hosted LiveKit server. Speech recognition and synthesis
use OpenAI-compatible local endpoints (for example faster-whisper and
Kokoro-FastAPI); no hosted LLM is used. The existing GgnHome API remains the
source of truth for the conversation and property data.
"""
import asyncio
import json
import logging
import os
from typing import Any

from dotenv import load_dotenv
from livekit import agents, rtc
from livekit.agents import Agent, AgentServer, AgentSession
from livekit.plugins import openai, silero

load_dotenv(".env")

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("ggnhome-livekit")

VOICE_TOPIC = "ggnhome-voice"
STT_BASE_URL = os.getenv("LOCAL_STT_BASE_URL", "http://127.0.0.1:8000/v1")
STT_API_KEY = os.getenv("LOCAL_STT_API_KEY", "local")
STT_MODEL = os.getenv("LOCAL_STT_MODEL", "whisper-1")
TTS_BASE_URL = os.getenv("LOCAL_TTS_BASE_URL", "http://127.0.0.1:8880/v1")
TTS_API_KEY = os.getenv("LOCAL_TTS_API_KEY", "local")
TTS_MODEL = os.getenv("LOCAL_TTS_MODEL", "kokoro")
TTS_VOICE = os.getenv("LOCAL_TTS_VOICE", "af_heart")


def data_packet(message: dict[str, Any]) -> bytes:
    return json.dumps(message, ensure_ascii=False).encode("utf-8")


async def send_room_message(ctx: agents.JobContext, message: dict[str, Any]) -> None:
    participant = ctx.room.local_participant
    if participant:
        await participant.publish_data(data_packet(message), reliable=True, topic=VOICE_TOPIC)


class GgnHomeVoiceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=(
                "You are the GgnHome audio transport assistant. Do not invent property "
                "facts or answer independently. GgnHome's existing rule-based web client "
                "handles every recognized transcript and decides the response."
            )
        )


server = AgentServer()


@server.rtc_session(agent_name="ggnhome-property-voice")
async def ggn_home_voice(ctx: agents.JobContext) -> None:
    await ctx.connect()

    session = AgentSession(
        stt=openai.STT(
            model=STT_MODEL,
            base_url=STT_BASE_URL,
            api_key=STT_API_KEY,
        ),
        tts=openai.TTS(
            model=TTS_MODEL,
            voice=TTS_VOICE,
            base_url=TTS_BASE_URL,
            api_key=TTS_API_KEY,
            response_format="wav",
        ),
        # Whisper-style STT is non-streaming; VAD segments the audio into turns.
        vad=silero.VAD.load(),
    )

    # The transcript is forwarded to the existing React consultant, which calls
    # /api/ai-consultant/turn and retains all current search/lead/consent rules.
    @session.on("user_input_transcribed")
    def on_user_input_transcribed(event: Any) -> None:
        if not getattr(event, "is_final", False):
            return
        transcript = str(getattr(event, "transcript", "") or "").strip()
        if not transcript:
            return
        asyncio.create_task(send_room_message(ctx, {
            "type": "user_transcript",
            "text": transcript[:600],
        }))

    @ctx.room.on("data_received")
    def on_data_received(packet: rtc.DataPacket) -> None:
        try:
            message = json.loads(packet.data.decode("utf-8"))
        except (ValueError, UnicodeDecodeError, AttributeError):
            return
        if message.get("type") != "speak_text":
            return
        text = str(message.get("text", "")).strip()[:1800]
        if not text:
            return

        async def speak() -> None:
            try:
                await session.say(text, allow_interruptions=True)
            except Exception:
                logger.exception("Local TTS failed for a voice response")
                await send_room_message(ctx, {"type": "voice_status", "status": "tts_error"})

        asyncio.create_task(speak())

    await session.start(
        room=ctx.room,
        agent=GgnHomeVoiceAgent(),
    )
    await send_room_message(ctx, {"type": "voice_status", "status": "ready"})
    logger.info("GgnHome voice agent joined room %s", ctx.room.name)


if __name__ == "__main__":
    agents.cli.run_app(server)

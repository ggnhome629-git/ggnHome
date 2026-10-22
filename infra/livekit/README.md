# GgnHome self-hosted LiveKit voice

This folder and `services/livekit-agent` adapt the official LiveKit Agents SDK into GgnHome. We do not vendor or fork the entire upstream repository. The SDK is installed as a dependency; GgnHome-owned glue code is maintained here.

## Architecture

- Browser: `livekit-client` connects to a self-hosted LiveKit room and publishes microphone audio.
- GgnHome API: `POST /api/ai-consultant/livekit/token` issues a short-lived room-scoped token. The LiveKit API secret never reaches the browser.
- LiveKit server: forwards WebRTC audio/data.
- GgnHome agent worker: LiveKit Agents with local OpenAI-compatible STT/TTS endpoints.
- Existing React consultant: receives final transcripts and continues to call `/api/ai-consultant/turn`, `/search`, and `/enquiry`. The rule parser/question bank and database-backed property search remain authoritative. If a transcript is not understood by the rules, the existing server-side Groq fallback may be used when `AI_CONSULTANT_LLM` is enabled and Groq keys are configured; it is not used to invent listing facts. The same lead-consent and validation rules apply to voice and text. The LiveKit worker itself does not run a local LLM.

## Required environment

Set these server-only values on the GgnHome API host:

- `LIVEKIT_URL`: public WebSocket URL, for example `wss://voice.example.com`.
- `LIVEKIT_API_KEY`: key configured in the LiveKit server.
- `LIVEKIT_API_SECRET`: matching secret. Do not use a `REACT_APP_*` variable.

Set `LIVEKIT_URL=wss://voice.example.com` on the GgnHome API host. For the worker running on the same VM, use `LIVEKIT_URL=ws://127.0.0.1:7880` (or a private internal URL if it runs elsewhere); set the same API key/secret in both places. The worker needs a private network route to the local STT/TTS services.

## Redis-backed fair-use voice queue

The API only issues a LiveKit token after a visitor has a valid queue reservation. The FIFO queue and active-session leases use two Redis sorted sets; Redis stores opaque random tickets and timestamps only—never conversation text, property preferences, names, or phone numbers. Tickets waiting longer than the configured wait TTL expire; active slots renew while a session is connected and expire automatically if the browser disappears. Closing/minimizing explicitly releases the ticket.

Configure these on the **GgnHome API service** (the same `REDIS_URL` is also used by existing caching/rate limiting):

```env
REDIS_URL=rediss://default:YOUR_REDIS_PASSWORD@YOUR_REDIS_HOST:YOUR_REDIS_PORT
VOICE_QUEUE_ENABLED=true
VOICE_QUEUE_MAX_ACTIVE=3
VOICE_QUEUE_MAX_WAITING=50
VOICE_QUEUE_LEASE_SECONDS=90
VOICE_QUEUE_WAIT_TTL_SECONDS=900
VOICE_QUEUE_KEY_PREFIX=ggnhome:voice:v1
```

Keep the queue deliberately small for a free Redis plan. Defaults cap active real-time sessions at 3, waiting tickets at 50, and queue wait at 15 minutes. The client polls every 8 seconds and heartbeats active leases every 25 seconds. Redis is shared with cache/rate-limit traffic, so check the provider's current command and memory limits. If Redis is unavailable, queued LiveKit voice is disabled and the normal text/browser consultant remains available; the API must not bypass the queue.

## Self-hosted server

1. Copy `livekit.yaml.example` to `livekit.yaml` in this folder and replace the example secret with a long random value.
2. Copy `services/livekit-agent/.env.example` to `services/livekit-agent/.env`. Set its LiveKit key/secret to match `livekit.yaml`; keep the worker's `LIVEKIT_URL=ws://127.0.0.1:7880` when it runs on this same VM.
3. Point a DNS record (for example `voice.example.com`) at the voice VM's public IP.
4. From the repository root, start the server, local speech models, agent worker and Caddy TLS proxy:

   ```bash
   export LIVEKIT_DOMAIN=voice.example.com
   docker compose -f infra/livekit/docker-compose.yml up -d --build
   ```

   Caddy obtains the HTTPS certificate and proxies HTTPS/WSS signalling to the local LiveKit API port. Keep public TCP 7880 blocked at the VM firewall; Caddy reaches it locally.
5. Open TCP 80/443 for Caddy, TCP 7881 and UDP 50000-60000 for LiveKit media. Follow the current official ports guide for TURN and network-specific requirements: https://docs.livekit.io/transport/self-hosting/ports-firewall/
6. Do not point the public browser at `127.0.0.1` or an internal Docker hostname. Set the Render backend `LIVEKIT_URL=wss://voice.example.com`; the worker's `.env` should use `LIVEKIT_URL=ws://127.0.0.1:7880` when it runs on this same VM. The API key/secret in `livekit.yaml` must exactly match `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` on both services.

Render's small web-service instance should keep serving the existing GgnHome API; it is not the recommended place to run the UDP/WebRTC media server.

## Local speech models

The agent expects OpenAI-compatible local endpoints:

- STT: a self-hosted faster-whisper-compatible server exposing `/v1/audio/transcriptions`, default `http://127.0.0.1:8000/v1`.
- TTS: a self-hosted Kokoro-FastAPI-compatible server exposing `/v1/audio/speech`, default `http://127.0.0.1:8880/v1`.

The provided Compose file includes CPU services for Speaches/faster-whisper on port 8000 and Kokoro-FastAPI on port 8880. They use host networking so the worker can reach them at the default localhost URLs. Block public inbound access to ports 8000 and 8880 in the VM firewall; only the worker should use them. The STT model is downloaded on first use and cached in the `stt_cache` volume; TTS model files are supplied by the image. CPU inference may have noticeable latency under load.

## Run the agent separately (optional)

The Compose stack builds and starts `services/livekit-agent/Dockerfile` automatically. If you prefer to run the worker directly, use a Python 3.11 virtual environment, install `services/livekit-agent/requirements.txt`, and start `python agent.py start` from `services/livekit-agent` after setting the same environment values.

Check the current LiveKit Agents CLI/runtime documentation before production deployment: https://docs.livekit.io/agents/start/voice-ai/

## GgnHome API

The public config endpoint reports whether LiveKit credentials are configured. The token endpoint requires an explicit `accepted: true` request, creates a random room and identity, and grants only room join/publish/subscribe/data permissions for ten minutes. Never commit production secrets.

## Rule-first answers and Groq fallback

- Known intents, question flow, parameter parsing, and supported FAQs are handled by GgnHome's deterministic rule engine and question bank.
- Property matches and listing facts come from the existing GgnHome database/search engine; Groq must not fabricate inventory or owner/contact details.
- Only when rule parsing cannot interpret a message or an uncovered general real-estate process question needs an answer may the existing server-side Groq adapter be called. It respects `AI_CONSULTANT_LLM`, configured `GROQ_API_KEY` / `GROQ_API_KEY_1`…`GROQ_API_KEY_5` / `GROQ_API_KEYS`, timeouts and quota guards. Keep these secrets only on the API server, never in `REACT_APP_*` variables or the LiveKit worker.
- If Groq is unavailable or rate-limited, the engine falls back to its safe deterministic response. Lead creation still requires explicit consent.

## Current implementation boundary

This code is the repo-side integration. It does not create DNS, VM resources, firewall rules, model servers, or Render environment variables. Until those are configured and a real browser-to-agent conversation is tested, the live site must not be described as LiveKit-connected. Browser voice and text chat remain available as fallbacks.

## Voice quality and speed (recommended providers)

Small CPU Whisper plus CPU Kokoro was laggy and sounded flat, so the worker now picks providers from `services/livekit-agent/.env`:

- STT: `VOICE_STT_PROVIDER=groq` (Whisper large-v3-turbo, hosted) or `local`.
- TTS: `VOICE_TTS_PROVIDER=deepgram` (Aura-2), `cartesia` (Sonic-3), `sarvam` (Bulbul v3, Indian English/Hindi), `groq` (Orpheus, English, non-streaming) or `local`. Deepgram, Cartesia and Sarvam stream audio, so speech starts sooner.
- Spoken text is rewritten by `speech_style.py` (spoken numbers, contractions, no markup) and filler-only turns such as "hmm" or "okay" are ignored.
- Free allowances change often; check each vendor's pricing page before launch. Self-hosted Chatterbox (MIT) is the most natural open model in the comparisons we found but wants a GPU, so it is not set up here.

## Groq-only speech and the human voice style

With `VOICE_STT_PROVIDER=groq`, `VOICE_TTS_PROVIDER=groq` and one `GROQ_SPEECH_API_KEY`, the whole voice path uses Groq: Whisper for listening, Orpheus for speaking, and a small model (`VOICE_REWRITE_MODEL`) that rewrites each finished reply into natural spoken wording using `services/livekit-agent/voice_style_guide.md`. The rewrite is rejected if it adds any number, link or phone number, invents a question, is too long, or times out; the plain deterministic wording is spoken instead. The greeting is never rewritten. This does not change what the consultant says, only how.

## Free-plan limits, busy sessions and idle timeout

On LiveKit Cloud's free plan only a few agent conversations (sessions) can run at once (5 at the time of writing) and monthly agent minutes are capped, so the app is built to use as few as possible:

- **Busy or unavailable:** if no voice agent picks up (all slots busy, minutes used up, agent offline), the browser waits about 12 seconds and switches to the browser's own voice automatically. Text chat is never affected.
- **Idle timeout:** a quiet session warns after `VOICE_IDLE_WARN_S` (default 120s) and the agent hangs up after `VOICE_IDLE_END_S` (default 150s). Any speech, typed message or reply resets the clock; the time the assistant spends talking does not count. Browser voice applies the same rule.
- **Visitor leaves:** the agent ends its session a few seconds after the visitor disconnects, instead of waiting for the room to expire.
- **Cloud hosting ignores `LIVEKIT_LOAD_THRESHOLD`** (the SDK reverts to its default there). The setting only matters on a self-hosted worker, where a crowded machine can make the worker refuse visitors.

## Riya's voice without LiveKit (API server and Android app)

- The API server speaks and listens for the consultant at `/api/ai-consultant/speech/{config,tts,stt}` using Groq Orpheus (voice) and Whisper (listening). Set `GROQ_SPEECH_API_KEY` on the API server (it falls back to `GROQ_API_KEY_1` / `GROQ_API_KEY`). Orpheus needs its terms accepted once in the Groq console, and it reads at most 200 characters per request (the page sends sentence-sized clips).
- The Android app bundles `@capacitor-community/text-to-speech` and `@capacitor-community/speech-recognition`: inside the app Riya uses the phone's own voice and recognition (on-device, plays as normal media, works with earphones, no call mode). Rebuild the APK after `npx cap sync android` to ship it.
- The LiveKit worker splits replies into ≤190-character pieces for Orpheus and, when `DEEPGRAM_API_KEY` or `CARTESIA_API_KEY` is also set, falls back to that voice automatically if the main one fails.

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

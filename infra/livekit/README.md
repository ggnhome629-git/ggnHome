# GgnHome self-hosted LiveKit voice

This folder and `services/livekit-agent` adapt the official LiveKit Agents SDK into GgnHome. We do not vendor or fork the entire upstream repository. The SDK is installed as a dependency; GgnHome-owned glue code is maintained here.

## Architecture

- Browser: `livekit-client` connects to a self-hosted LiveKit room and publishes microphone audio.
- GgnHome API: `POST /api/ai-consultant/livekit/token` issues a short-lived room-scoped token. The LiveKit API secret never reaches the browser.
- LiveKit server: forwards WebRTC audio/data.
- GgnHome agent worker: LiveKit Agents with local OpenAI-compatible STT/TTS endpoints.
- Existing React consultant: receives final transcripts and continues to call `/api/ai-consultant/turn`, `/search`, and `/enquiry`. GgnHome's rule engine, property inventory, and explicit lead consent remain authoritative.

## Required environment

Set these server-only values on the GgnHome API host:

- `LIVEKIT_URL`: public WebSocket URL, for example `wss://voice.example.com`.
- `LIVEKIT_API_KEY`: key configured in the LiveKit server.
- `LIVEKIT_API_SECRET`: matching secret. Do not use a `REACT_APP_*` variable.

Set the same LiveKit URL/key/secret for the worker in `services/livekit-agent/.env`. The worker needs a private network route to the local STT/TTS services.

## Self-hosted server

1. Copy `livekit.yaml.example` to `livekit.yaml` in this folder and replace the example secret with a long random value.
2. Point a DNS record (for example `voice.example.com`) at the voice VM's public IP.
3. From the repository root, start the server and Caddy TLS proxy:

   ```bash
   export LIVEKIT_DOMAIN=voice.example.com
   docker compose -f infra/livekit/docker-compose.yml up -d
   ```

   Caddy obtains the HTTPS certificate and proxies HTTPS/WSS signalling to the local LiveKit API port. Keep public TCP 7880 blocked at the VM firewall; Caddy reaches it locally.
4. Open TCP 80/443 for Caddy, TCP 7881 and UDP 50000-60000 for LiveKit media. Follow the current official ports guide for TURN and network-specific requirements: https://docs.livekit.io/transport/self-hosting/ports-firewall/
5. Do not point the public browser at `127.0.0.1` or an internal Docker hostname. Set the backend and worker `LIVEKIT_URL=wss://voice.example.com`. The API key/secret in `livekit.yaml` must exactly match `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` on both services.

Render's small web-service instance should keep serving the existing GgnHome API; it is not the recommended place to run the UDP/WebRTC media server.

## Local speech models

The agent expects OpenAI-compatible local endpoints:

- STT: a self-hosted faster-whisper-compatible server exposing `/v1/audio/transcriptions`, default `http://127.0.0.1:8000/v1`.
- TTS: a self-hosted Kokoro-FastAPI-compatible server exposing `/v1/audio/speech`, default `http://127.0.0.1:8880/v1`.

Run those services on the same VM or private network and configure `LOCAL_STT_BASE_URL` and `LOCAL_TTS_BASE_URL`. Do not expose the model endpoints publicly. Model downloads and CPU/RAM requirements depend on the selected model; verify the endpoints independently before starting the worker. This repo does not embed model weights.

## Run the agent

```bash
cd services/livekit-agent
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with the real LiveKit and local-model URLs.
python agent.py start
```

Check the current LiveKit Agents CLI/runtime documentation before production deployment: https://docs.livekit.io/agents/start/voice-ai/

## GgnHome API

The public config endpoint reports whether LiveKit credentials are configured. The token endpoint requires an explicit `accepted: true` request, creates a random room and identity, and grants only room join/publish/subscribe/data permissions for ten minutes. Never commit production secrets.

## Current implementation boundary

This code is the repo-side integration. It does not create DNS, VM resources, firewall rules, model servers, or Render environment variables. Until those are configured and a real browser-to-agent conversation is tested, the live site must not be described as LiveKit-connected. Browser voice and text chat remain available as fallbacks.

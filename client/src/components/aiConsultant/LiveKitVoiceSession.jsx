import React, { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Radio } from "lucide-react";
import { Room, RoomEvent, Track, createLocalAudioTrack } from "livekit-client";
import "./liveKitVoice.css";

const API_BASE = process.env.REACT_APP_Base_API || "";
const VOICE_TOPIC = "ggnhome-voice";

function parseMessage(payload) {
  try {
    const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (_) {
    return null;
  }
}

export default function LiveKitVoiceSession({ enabled = true, assistantText, onTranscript, onStatus, onError }) {
  const roomRef = useRef(null);
  const micRef = useRef(null);
  const assistantTextRef = useRef("");
  const lastSpokenRef = useRef("");
  const callbacksRef = useRef({ onTranscript, onStatus, onError });
  const [status, setStatus] = useState("idle");
  const [configured, setConfigured] = useState(null);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  callbacksRef.current = { onTranscript, onStatus, onError };
  assistantTextRef.current = assistantText || "";

  const updateStatus = useCallback((next) => {
    setStatus(next);
    callbacksRef.current.onStatus?.(next);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetch(API_BASE + "/api/ai-consultant/livekit/config", { credentials: "omit" })
      .then((response) => {
        if (!response.ok) throw new Error("Voice configuration could not be checked.");
        return response.json();
      })
      .then((payload) => {
        if (!cancelled) setConfigured(payload.enabled === true);
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => { cancelled = true; };
  }, [enabled]);

  const disconnect = useCallback(async () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
    }
    if (room) {
      try { await room.disconnect(); } catch (_) { /* already disconnected */ }
    }
    updateStatus("idle");
    setMuted(false);
  }, [updateStatus]);

  const connect = async () => {
    if (status === "connecting" || status === "connected") return;
    setError("");
    updateStatus("connecting");
    try {
      const response = await fetch(`${API_BASE}/api/ai-consultant/livekit/token`, {
        method: "POST",
        credentials: "omit",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.token || !payload.url) {
        throw new Error(payload.message || "Self-hosted LiveKit is not available yet.");
      }

      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
        void _publication;
        if (track.kind === Track.Kind.Audio) {
          const element = track.attach();
          element.autoplay = true;
          element.setAttribute("playsinline", "true");
          element.dataset.livekitParticipant = participant.identity;
          document.body.appendChild(element);
          element.play().catch(() => {
            callbacksRef.current.onError?.("Tap the page once to allow voice playback.");
          });
        }
      });
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
      });
      room.on(RoomEvent.DataReceived, (data, _participant, _kind, topic) => {
        void _participant;
        void _kind;
        if (topic && topic !== VOICE_TOPIC) return;
        const message = parseMessage(data);
        if (!message) return;
        if (message.type === "user_transcript" && typeof message.text === "string" && message.text.trim()) {
          callbacksRef.current.onTranscript?.(message.text.trim());
        } else if (message.type === "voice_status" && typeof message.status === "string") {
          callbacksRef.current.onStatus?.(message.status);
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current === room) {
          roomRef.current = null;
          if (micRef.current) {
            micRef.current.stop();
            micRef.current = null;
          }
          updateStatus("idle");
        }
      });

      await room.connect(payload.url, payload.token);
      const mic = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      });
      micRef.current = mic;
      await room.localParticipant.publishTrack(mic);
      // Replay the current greeting once the agent room is ready. Remember it
      // before changing status so the assistantText effect doesn't send it twice.
      const greeting = assistantTextRef.current.trim();
      if (greeting) lastSpokenRef.current = greeting;
      updateStatus("connected");
      if (greeting) {
        window.setTimeout(() => {
          if (roomRef.current === room) publishText("speak_text", greeting);
        }, 600);
      }
    } catch (err) {
      setError(err?.message || "Could not connect to the voice service.");
      updateStatus("error");
      await disconnect();
      setError(err?.message || "Could not connect to the voice service.");
      callbacksRef.current.onError?.(err?.message || "Could not connect to the voice service.");
    }
  };

  const publishText = useCallback((type, text) => {
    const room = roomRef.current;
    if (!room || room.state !== "connected" || !text) return;
    const encoded = new TextEncoder().encode(JSON.stringify({ type, text }));
    room.localParticipant.publishData(encoded, { reliable: true, topic: VOICE_TOPIC }).catch((err) => {
      callbacksRef.current.onError?.(err?.message || "Couldn't send voice text to the agent.");
    });
  }, []);

  useEffect(() => {
    const text = String(assistantText || "").trim();
    if (!text || status !== "connected" || text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    publishText("speak_text", text);
  }, [assistantText, status, publishText]);

  useEffect(() => {
    if (!enabled) disconnect();
  }, [enabled, disconnect]);

  useEffect(() => () => {
    const room = roomRef.current;
    roomRef.current = null;
    if (micRef.current) {
      micRef.current.stop();
      micRef.current = null;
    }
    if (room) room.disconnect().catch(() => {});
  }, []);

  const toggleMute = async () => {
    const mic = micRef.current;
    if (!mic) return;
    const next = !muted;
    if (next) await mic.mute(); else await mic.unmute();
    setMuted(next);
  };

  return (
    <section className="gai-livekit-card" aria-label="LiveKit real-time voice">
      <div className="gai-livekit-heading">
        <span className={`gai-livekit-mark ${status}`}><Radio size={19} /></span>
        <div>
          <strong>Real-time voice</strong>
          <small aria-live="polite">{configured === null ? "Checking self-hosted voice setup…" : configured === false ? "Voice server setup is still required; text chat remains available" : status === "connected" ? "Connected to GgnHome voice" : status === "connecting" ? "Connecting to your self-hosted voice server…" : status === "error" ? "Voice connection unavailable" : "Self-hosted LiveKit · microphone starts only when you connect"}</small>
        </div>
      </div>
      {error ? <p className="gai-livekit-error" role="alert">{error}</p> : null}
      <div className="gai-livekit-actions">
        {status !== "connected" ? (
          <button type="button" className="gai-livekit-primary" onClick={connect} disabled={status === "connecting" || configured !== true}>
            <Phone size={17} /> {status === "connecting" ? "Connecting…" : configured === null ? "Checking setup…" : configured === false ? "Setup required" : "Connect voice"}
          </button>
        ) : (
          <>
            <button type="button" className="gai-livekit-primary" onClick={toggleMute}>
              {muted ? <MicOff size={17} /> : <Mic size={17} />} {muted ? "Unmute" : "Mute"}
            </button>
            <button type="button" className="gai-livekit-secondary" onClick={disconnect}>
              <PhoneOff size={17} /> End voice
            </button>
          </>
        )}
      </div>
      <p className="gai-livekit-footnote">Voice is sent to the GgnHome-hosted LiveKit server and local speech services when configured. Text chat remains available.</p>
    </section>
  );
}

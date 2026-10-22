/**
 * Listening without a browser speech engine (the Android app's WebView has none):
 * open the mic, wait for the visitor to start talking, record until they pause,
 * then hand the clip back to be transcribed on the server.
 *
 * The mic is held only while it is the visitor's turn. stop() releases it at once,
 * so the phone never stays in call mode and nothing is heard after mute.
 */

const FRAME_MS = 50;
const START_FRAMES = 3; // ~150 ms of sound before we call it speech
const END_SILENCE_MS = 900;
const MAX_SPEECH_MS = 15000;
const MIN_SPEECH_MS = 350;
const IDLE_RESTART_MS = 8000; // drop a recording that never heard speech, so clips stay small

function pickMime() {
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return options.find((m) => window.MediaRecorder.isTypeSupported?.(m)) || "";
}

/**
 * @param {object} o
 * @param {MediaTrackConstraints} o.constraints
 * @param {() => void} o.onSpeechStart
 * @param {(level: number) => void} o.onLevel
 * @param {(blob: Blob) => void} o.onClip
 * @param {(error: Error) => void} o.onError
 */
export async function startServerListener({ constraints, onSpeechStart, onLevel, onClip, onError }) {
  let stopped = false;
  let cancelled = false;
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
  } catch (error) {
    onError?.(error);
    return { stop() {} };
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);
  const data = new Float32Array(analyser.fftSize);
  const mime = pickMime();

  let recorder = null;
  let chunks = [];
  let recStartedAt = 0;
  let speaking = false;
  let loudFrames = 0;
  let speechStartedAt = 0;
  let lastLoudAt = 0;
  let floor = 0.006;

  const newRecorder = () => {
    chunks = [];
    recorder = new window.MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    recorder.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
    recorder.start(250);
    recStartedAt = Date.now();
  };

  const finishClip = () => {
    const r = recorder;
    recorder = null;
    if (!r || r.state === "inactive") return;
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType || mime || "audio/webm" });
      cleanup();
      if (!cancelled) onClip(blob);
    };
    r.stop();
  };

  newRecorder();
  const timer = setInterval(() => {
    if (stopped) return;
    analyser.getFloatTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / data.length);
    const now = Date.now();
    onLevel?.(Math.min(1, rms * 8));
    const threshold = Math.max(0.018, floor * 3);
    const loud = rms > threshold;

    if (!speaking) {
      // Follow the room's background level so steady noise is never taken for speech.
      floor = floor * 0.95 + Math.min(rms, 0.05) * 0.05;
      loudFrames = loud ? loudFrames + 1 : 0;
      if (loudFrames >= START_FRAMES) {
        speaking = true;
        speechStartedAt = now;
        lastLoudAt = now;
        onSpeechStart?.();
      } else if (now - recStartedAt > IDLE_RESTART_MS && recorder) {
        // Nothing said for a while: start a fresh recording (keeps the clip short).
        const r = recorder;
        recorder = null;
        r.onstop = null;
        try {
          r.stop();
        } catch (_) {
          // already stopped
        }
        newRecorder();
      }
      return;
    }
    if (loud) lastLoudAt = now;
    const spokeFor = now - speechStartedAt;
    if (now - lastLoudAt > END_SILENCE_MS || spokeFor > MAX_SPEECH_MS) {
      speaking = false;
      loudFrames = 0;
      if (spokeFor - END_SILENCE_MS < MIN_SPEECH_MS && spokeFor < MAX_SPEECH_MS) {
        // A cough or a knock, not a sentence.
        const r = recorder;
        recorder = null;
        if (r && r.state !== "inactive") {
          r.onstop = null;
          r.stop();
        }
        newRecorder();
        return;
      }
      stopped = true; // one clip per turn; the controller decides when to listen again
      clearInterval(timer);
      finishClip();
    }
  }, FRAME_MS);

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    clearInterval(timer);
    stream.getTracks().forEach((t) => t.stop());
    ctx.close().catch(() => {});
  }

  return {
    stop() {
      cancelled = true;
      stopped = true;
      if (recorder && recorder.state !== "inactive") {
        recorder.onstop = null;
        try {
          recorder.stop();
        } catch (_) {
          // already stopped
        }
      }
      recorder = null;
      cleanup();
    },
  };
}

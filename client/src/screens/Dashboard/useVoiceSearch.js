import { useCallback, useEffect, useRef, useState } from "react";

const getRecognition = () =>
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/**
 * Browser speech-to-text for the search boxes. `supported` lets the UI hide
 * the mic where it can never work instead of showing a dead button.
 */
export default function useVoiceSearch(onResult) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const supported = Boolean(getRecognition());

  const start = useCallback(() => {
    const SpeechRecognition = getRecognition();
    if (!SpeechRecognition) return;

    // A second tap while listening stops the session.
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const spoken = event.results[0][0].transcript;
      if (spoken) onResultRef.current(spoken);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, []);

  useEffect(
    () => () => {
      if (recognitionRef.current) recognitionRef.current.abort();
    },
    []
  );

  return { listening, start, supported };
}

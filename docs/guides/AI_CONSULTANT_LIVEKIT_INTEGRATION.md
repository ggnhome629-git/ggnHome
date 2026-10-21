# AI Consultant voice UX and LiveKit integration

## Current change

The homepage AI Consultant remains the entry point. Voice startup is now explicit:

1. The consultant can open and show its rule-based greeting without asking for microphone access or attempting speech playback.
2. The visitor clicks **Enable microphone**. The browser permission request is made from that user gesture; the temporary permission stream is closed immediately.
3. After access is granted, **Start voice conversation** becomes the explicit activation action.
4. The greeting is spoken before hands-free recognition begins. The footer microphone stays disabled until voice mode has been activated.
5. Text input, rule-based requirement collection, live property search, lead submission, and the existing saved conversation continue to use the current GgnHome APIs.

## LiveKit architecture

LiveKit Agents is a server-side realtime-agent framework, not a client-side speech library that can be added to a React component by itself. A production connection needs all of the following:

- A LiveKit project/server and server-side values `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`.
- A token endpoint in GgnHome that creates short-lived room credentials. The API secret must never be sent to the browser.
- A deployed LiveKit Agents worker that joins the room and processes the caller's audio.
- Speech-to-text and text-to-speech providers. The existing Groq keys may be used server-side for supported Groq features, but they do not by themselves provide a complete bidirectional voice stack; choose/configure a TTS provider too.
- The worker must call or share the same rule-based business logic as `server/services/aiConsultant/engine.js` for requirements, then use `/api/ai-consultant/search` and existing enquiry flow. It must not invent property availability or bypass explicit consent for lead submission.

## Recommended operating policy

- **Default:** deterministic question bank and rule-based state machine; search results always come from the existing GgnHome database/search engine.
- **Optional Groq assist:** only for normalizing ambiguous, free-form utterances into known slots or improving a clarification prompt. Validate the result against allowed slots and the same deterministic engine.
- **Voice:** LiveKit should own realtime audio, turn detection, transcript events, and agent session lifecycle once deployed. The assistant's existing custom UI should remain; show connection/listening/speaking status and transcript bubbles.
- **Fallback:** if LiveKit is not configured or the room/agent is unavailable, text mode and current property-search behavior must still work. Do not silently claim realtime voice is connected.

## Deployment checklist before enabling LiveKit in production

1. Add LiveKit credentials to the backend host's secret environment, not to React's `REACT_APP_*` variables.
2. Deploy the token endpoint and the separate Python or Node.js LiveKit Agents worker.
3. Configure an STT provider and a TTS provider; set language behavior for English, Hindi, and Hinglish as supported.
4. Connect the React voice stage after the visitor clicks **Start voice conversation**. Handle connect failures and disconnects without losing the existing text conversation.
5. Test desktop and mobile HTTPS deployments, denied permission, no microphone, no speech, barge-in, first greeting playback, repeat turns, reconnects, search results, and enquiry consent.
6. Only expose a LiveKit-enabled flag after the agent health/config endpoint confirms the feature is configured.

## References

- LiveKit Agents: https://github.com/livekit/agents
- Agents documentation: https://docs.livekit.io/agents/
- React voice frontend guide: https://docs.livekit.io/frontends/start/react-quickstart/
- Voice AI quickstart: https://docs.livekit.io/agents/start/voice-ai/

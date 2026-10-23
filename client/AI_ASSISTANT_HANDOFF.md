# AI Consultant Quest and Handoff

The public AI property consultant uses the quest flow in \`client/src/components/aiConsultant/AiConsultantQuest.jsx\`.

- The quick-question experience is rendered by \`quest/QuestStage.jsx\`.
- **Chat** and **Type a message** open \`quest/QuestHandoff.jsx\`, a separate screen within the same assistant dialog.
- Handoff continues the same conversation state. It renders existing assistant messages, quick-answer chips, property results, guest lead capture, and review actions; it must not navigate into the former legacy chat layout.
- Guest lead capture and enquiry review auto-open the handoff screen because their forms require visible, interactive controls.
- The public V2/version badge and its frontend manifest checker have been removed. The existing site-wide \`CacheRefreshWatcher\` remains responsible for the established server cache-version refresh mechanism.

When changing the flow, verify both entry points—Chat and Type a message—plus result cards, guest lead capture, and enquiry review on desktop and mobile.
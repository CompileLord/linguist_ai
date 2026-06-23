# Stage 5: AI Interactions

## PRD Coverage (Sections 3.7, 3.8, 10.3)
Implementing the real-time AI capabilities via WebSockets, focusing on the AI Live Tutor and Real World Missions roleplay scenarios.

## Detailed Frontend Flows & Architecture

### 1. Global AI Live Tutor (PRD 3.7)
- **Flow**: User clicks the persistent floating Tutor button. A chat interface slides out. 
- **WebSocket Streaming**: The backend uses WebSockets to stream the LLM response token-by-token. This creates the illusion of real-time typing.
- **Context Injection**: When the WebSocket opens, the frontend sends a payload containing the current `user_id`, `ui_language`, and `context_lesson_id` (if the user is currently looking at a specific lesson).

### 2. Real World Missions (PRD 3.8)
- **Flow**: User navigates to `/missions`. Selects a scenario (e.g., "Job Interview").
- **Implementation**: Reuses the exact same Chat UI components as the Tutor, but routes to a different WebSocket endpoint/handler on the backend that has a specific system prompt.
- **Completion Trigger**: The backend will emit a specific JSON signal over the WebSocket (`{"event": "mission_complete", "feedback": {...}}`). The frontend listens for this event to unmount the chat and mount the Feedback UI.

## Tasks (Todo List)
- [ ] Build a generic, highly reusable `<ChatUI />` component ecosystem (`MessageList`, `MessageBubble`, `ChatInput`).
- [ ] Implement `useWebSocketChat` hook wrapping the native `WebSocket` API to handle connections, disconnections, and message appending.
- [ ] Implement the Live Tutor slide-out panel accessible from the `Topbar`.
- [ ] Build the `/missions` selection grid, filtering available missions by the user's CEFR level and Goals.
- [ ] Build the Mission Roleplay interface.
- [ ] Add the Mission Completion listener that transitions the UI to the AI's final assessment screen.
- [ ] Ensure Markdown inside chat bubbles is parsed in real-time as it streams.

## Best Practices (How to make it better)
- **What to Use**: `react-use-websocket` (highly robust connection management). `react-markdown` and `remark-gfm` for parsing streamed text.
- **Auto-Scrolling**: Use a `useRef` on the bottom of the chat container. Whenever `messages` changes, trigger `ref.current.scrollIntoView({ behavior: 'smooth' })`.
- **Typing Indicators**: Show a pulsing dot animation (`<div className="animate-pulse">...</div>`) when a request is sent but the first token hasn't arrived yet.

## Avoiding Problems, Bugs & Errors
- **React Re-render Bottlenecks (Critical)**: If the chat array has 50 messages, and the 51st message is streaming token-by-token, updating the entire array state 10 times a second will cause catastrophic lag. *Solution*: Separate the active streaming message into its own localized state variable within a separate component (`<StreamingBubble />`). Only append it to the main `messages` array when the stream finishes.
- **Connection Drops**: Mobile networks drop WebSockets frequently. The frontend must implement exponential backoff reconnection logic. Do not clear the chat UI if the socket drops; show an offline banner and attempt to reconnect.
- **Input Spamming**: Disable the `<ChatInput />` while the AI is responding to prevent users from queueing up conflicting requests unless the backend explicitly supports interruption.

# Realtime and chat (Phase 4)

The NestJS `/jobs` Socket.IO namespace authenticates from the access-token session cookie and checks that the user and session remain active. The Redis adapter supports multiple API instances; transports include WebSocket and polling. A disconnect requires a new handshake and revalidation.

Clients emit `conversation:join`, `message:send`, `typing`, and `message:read`. A join and each event checks conversation participation. Message bodies are sanitized, persisted before room broadcast, and use `(conversation, sender, clientMessageKey)` idempotency. HTTP pagination at `GET /api/v1/jobs/conversations/:id/messages?before=...` provides catch-up and polling fallback. Conversation access begins after an active/accepted quote or booking.

Events currently include `request:match`, `quote:new`, `quote:accepted`, `quote:not_selected`, `booking:status`, `message:new`, `typing`, and `receipt:read`. Payloads contain IDs and user-entered message text needed by participants; they do not include KYC or phone fields. Admin conversation browsing is not exposed in this phase; moderation queue access requires `chat.moderate`.

Offline clients should queue messages with a client-generated idempotency key, show pending/sent/failed states, and replay on reconnect. If Socket.IO is unavailable, poll the HTTP messages endpoint. The API supports idempotent replay; the current web interface does not yet implement a durable offline queue or connect to the socket namespace.

## Events

| Event | Direction | Purpose |
|---|---|---|
| `conversation:join` | client → server | Join only after participant and quote/booking checks |
| `message:send` | client → server | Persist idempotent message then broadcast |
| `typing` | client → server / room | Ephemeral typing status after authorization |
| `message:read` | client → server / room | Persist participant last-read time and emit receipt |
| `message:new` | server → room | New persisted message |
| `receipt:read` | server → room | Read marker |
| `request:match`, `quote:new`, `quote:accepted`, `quote:not_selected`, `booking:status` | server → user/room | Marketplace and booking updates |

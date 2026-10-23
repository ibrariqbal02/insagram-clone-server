# Project Plan: Instagram clone → Speakyard

This file is the project's memory. Every decision and every finished step is recorded here,
so work can continue in any new session. Update it after each step.

## Goal

Turn the Instagram clone (React + Vite client, Express + MongoDB server) into **Speakyard**:
a web and mobile (Android first) app where people practice speaking English and other languages.

**Current focus (MVP):** live voice calls with real people, plus an AI speaking partner.
A new user can practice with the AI right after signing up, before any human call.
Posts, reels and other Instagram features are hidden from the MVP navigation (code kept for later).

## Decisions so far

| Date | Decision |
|---|---|
| 2026-10-23 | Product: language practice and entertainment app (web + Android, iOS later) |
| 2026-10-23 | Mobile approach: wrap the existing React client with **Capacitor** (one codebase) |
| 2026-10-23 | Hosting: client on Vercel, server on Render/Railway/Fly (needs always-on server for sockets), MongoDB Atlas, Cloudinary |
| 2026-10-23 | Name confirmed: **Speakyard** (owner still to check domain, Play Store, trademark) |
| 2026-10-23 | Work branch in both repos: `assistant/tender-curie-l8kmyp` |
| 2026-10-23 | MVP focus: **human practice calls** (1-to-1 voice, video later) + **AI practice partner** for new users. Posts/reels hidden for now |
| 2026-10-23 | Calls: WebRTC through a managed service (**LiveKit Cloud** first choice, Agora as backup); server issues room tokens. Socket.IO for matching, presence and call invites |
| 2026-10-23 | AI partner: speech-to-text → assistant (conversation + corrections) → text-to-speech. Free daily AI minutes limit to control cost |
| 2026-10-23 | Domain: owner choosing between speakyard.com / .app / .net / speak-yard.com |

Name alternatives: Talkwell, Chatterleaf. Rejected because already used: SpeakLoop, Wordmate,
Chatterbox, Chatterbug, Speaky, Talkpal.

## Existing features to reuse

- Auth: register, login, JWT access (15m) + refresh (7d) cookies, OTP password reset by email
- Follow/followers → language partners
- Conversations, group chats, voice messages → practice chat and study rooms
- Posts (images/videos), comments → "correct my sentence" posts
- Reels → short video lessons and speaking challenges
- Search → find partners by language and level
- Notifications → streak reminders, "someone corrected you"
- Server integration tests (Jest + supertest + mongodb-memory-server)

## Roadmap

| Phase | Work | Status |
|---|---|---|
| 0 | New name, branding, rename repos | Name confirmed; branding and repo rename to do |
| 1 | Production hardening (details below) | In progress (1.1–1.10 done) |
| 2 | MVP: AI practice + human practice calls (details below) | Not started |
| 3 | Capacitor Android build + push notifications (FCM) | Not started |
| 4 | Google Play release | Not started |
| 5 | Video calls, group voice rooms, chat corrections/translation, flashcards, leaderboards, Pro plan | Not started |

## Phase 1: Production hardening

Each item is a small, testable step. Tick it when done and pushed.

### Server security
- [x] 1.1 Validate env vars on startup (fail fast if `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, Cloudinary, mail are missing); add `.env.example`
- [x] 1.2 CORS origins from `CLIENT_URLS` env instead of the hardcoded list in `src/index.ts`
- [x] 1.3 `helmet` security headers, `compression`, JSON body size limit
- [x] 1.4 Rate limiting (`express-rate-limit`): strict on login, register, forgot-password, verify-OTP; general limit on `/api`
- [x] 1.5 Hash the reset OTP before storing it, limit OTP attempts
- [x] 1.6 Central error handler: hide internal messages in production, 404 handler, consistent `{ success, message }` shape
- [ ] 1.7 Input validation (express-validator) on every route that takes a body; sanitize against NoSQL injection. Done: sanitize middleware + auth routes. To do: post, comment, conversation, message routes

### Auth for mobile
- [x] 1.8 `isAuthenticated` / `optionalAuth` accept `Authorization: Bearer <token>` as well as the cookie
- [x] 1.9 Login and refresh return tokens in the body for mobile clients; refresh token rotation, hashed refresh token in DB
- [x] 1.10 Cookie settings from env (`secure`, `sameSite`) so web on Vercel and server on another domain both work

### Real-time
- [x] 1.11 Add Socket.IO server with JWT auth on connect
- [x] 1.12 Emit new messages, edits, deletes, read receipts, typing and online status
- [x] 1.13 Client: socket hook, update React Query cache from events, keep polling only as a fallback

### Data and performance
- [ ] 1.14 MongoDB indexes (messages by conversation + createdAt, notifications by recipient, posts by author + createdAt, text index for search)
- [ ] 1.15 Cursor pagination on feed, messages, notifications, comments
- [ ] 1.16 Graceful shutdown (close HTTP server and Mongo connection on SIGTERM)

### Observability
- [ ] 1.17 Structured logging with `pino` + request logging, replace `console.log`
- [ ] 1.18 `GET /api/health` endpoint (checks DB)
- [ ] 1.19 Sentry for server and client crash reports

### Safety (required before any call with strangers goes live)
- [ ] 1.20 Report user (also from inside a call) / report message endpoints + admin review list
- [ ] 1.21 Block user (blocked users are never matched, cannot call, message or find you)
- [ ] 1.22 Delete account (in app + public web page), removes user data and Cloudinary files

### Client
- [ ] 1.23 Env-driven API URL and socket URL, `.env.example`, stop committing `.env`
- [ ] 1.24 Error boundary, offline/error screens, loading states
- [ ] 1.25 Fix lint and type errors, production build passes

### CI and deploy
- [ ] 1.26 GitHub Actions: install, lint, typecheck, test, build on every push (server + client)
- [ ] 1.27 Deploy server (Render/Railway) with env vars, MongoDB Atlas with IP allowlist and backups
- [ ] 1.28 Deploy client to Vercel pointing at the new server

Known issue: 6 old tests fail on main (post.controller, feed.controller) because tests are out of date with the code. Fix in 1.26 (CI).

Done when: all boxes ticked, CI green, app running in production on the new hosts.

Phase 1 priority order for the MVP: 1.11–1.13 (sockets, needed for calls) → 1.20–1.22 (safety) →
1.18, 1.16, 1.17 → 1.23–1.28. 1.14–1.15 and the rest of 1.7 only where MVP screens use them.

## Phase 2: MVP (AI practice + human practice calls)

### 2A Profile and onboarding
- [ ] 2.1 User fields: nativeLanguages, learningLanguages [{ code, level A1–C2 }], country, interests, birth year (18+ for calls)
- [ ] 2.2 Onboarding screens after register: pick languages and level, goals, mic permission
- [ ] 2.3 Simplify navigation: Home (Practice), Calls history, Messages, Profile. Hide posts/reels

### 2B AI practice partner (first thing a new user does)
- [ ] 2.4 Server `ai` module: assistant API for the tutor, per-language system prompt, level-aware, short replies, gentle corrections
- [ ] 2.5 Voice loop: record → speech-to-text → assistant → text-to-speech → play (start push-to-talk; streaming later)
- [ ] 2.6 Topics/scenarios (introduce yourself, ordering food, job interview, travel)
- [ ] 2.7 End-of-session feedback: mistakes, better phrases, new words, simple score
- [ ] 2.8 Free daily AI minutes limit, usage tracking per user

### 2C Human practice calls
- [ ] 2.9 LiveKit setup: server endpoint creates room + access token; client joins with LiveKit SDK (audio only)
- [ ] 2.10 "Practice now" matching queue over Socket.IO: match by learning language ↔ native/fluent language and level; skip blocked users
- [ ] 2.11 Call screen: mute, speaker, end, timer, topic suggestion card, report/block button
- [ ] 2.12 Direct call to a friend/partner (invite, ring, accept/decline, missed call)
- [ ] 2.13 After-call rating (1–5, "good partner"), save call history (who, language, duration)
- [ ] 2.14 Presence: online partners list, "available to talk" toggle

### 2D Keep users coming back
- [ ] 2.15 Streaks and XP for AI sessions and calls, daily goal (e.g. 10 minutes speaking)
- [ ] 2.16 Push/in-app notifications: partner online, missed call, streak reminder

Done when: a new user can sign up, finish onboarding, talk with the AI, get matched with a human,
complete a voice call, rate it, and report/block if needed — on web and Android.

## Phase 4 checklist: Google Play

1. Play Console developer account ($25 once, ID verification)
2. Signed Android App Bundle (.aab); back up the upload key
3. Target the API level Play currently requires
4. Store listing: icon, screenshots, descriptions, privacy policy URL
   - Microphone permission explanation; declare voice data use for AI (speech-to-text) in Data safety
   - User-generated content policy: report, block, moderation, terms of use
5. Data safety form, content rating, target audience
6. New personal accounts: closed test with the required number of testers (12 at last check) for 14 days
7. Apply for production access

## Log

- 2026-10-23: Reviewed both repos. Wrote this plan. Proposed name Speakyard.
- 2026-10-23: Name Speakyard confirmed. Server: done 1.1–1.6, 1.8–1.10, part of 1.7. Notes:
  - Refresh tokens are now stored hashed, so every user must log in again once after deploy.
  - New env vars: CLIENT_URLS, COOKIE_SECURE, COOKIE_SAMESITE, RATE_LIMIT_API_MAX (see .env.example).
  - Forgot-password now answers 200 even for unknown emails (no account discovery).
  - Mobile clients send `X-Client-Platform: mobile` to get tokens in the JSON body and use `Authorization: Bearer`.
- 2026-10-23: Focus changed: MVP is human practice calls + AI practice partner. Added Phase 2 (2.1–2.16), reordered Phase 1.
- 2026-10-24: Real-time chat (1.11–1.13) done, server and client.
  - Server: `src/socket/index.ts` — Socket.IO attached to the same HTTP server as Express (`src/index.ts`
    now creates an `http.Server` and passes it to both). JWT auth on connect reads the token from
    `handshake.auth.token`, a `Bearer` header, or the `accessToken` cookie (same sources as the HTTP
    middleware). Each socket joins a `user:<id>` room; `message.controller.ts` emits `message:new` /
    `message:update` / `message:delete` to every participant's room after each DB write. Typing
    (`typing:start`/`typing:stop` → `typing:update`) and read receipts (`message:read`, which also
    flips `Message.isRead` in the DB) are handled socket-side by looking up the conversation's
    participants per event — no conversation-room joins needed. Online/offline presence is tracked
    in-memory (per-process socket counts) and broadcast to a user's conversation partners on first
    connect / last disconnect. Single-instance only for now (no Redis adapter) — fine for the planned
    one-server hosting; revisit if the server is ever scaled horizontally.
  - Client: `src/lib/socket.ts` (singleton, `withCredentials: true`, connects to the API origin minus
    `/api`) and `src/hooks/useSocket.ts` — `useChatSocket` (mounted once in `ProtectedRoute`) patches
    the `["messages", conversationId]` and `["conversations"]` React Query caches from socket events;
    `useTypingIndicator` / `usePresence` / `useMarkConversationRead` are used locally in `ChatWindow`.
    Polling in `useMessage.ts` is now a fallback only (messages 1s → 15s, conversations 3s → 20s).
  - Known pre-existing issue, not touched: `ChatWindow.test.tsx`, `Home.test.tsx`, `Login.test.tsx`
    and several other component tests already failed before this change (`useNavigate()`/router
    context errors, and `src/api/axios.ts`'s `import.meta.env` not compiling under ts-jest's
    CommonJS module target) — same class of issue as the backend's documented failing suite. New
    coverage for this work lives in `tests/Integration /useSocket.test.ts` (hooks, mocking
    `src/lib/socket.ts`) and the backend's `tests/unit/socket.test.ts` +
    `tests/integration/socket.test.ts` (real Socket.IO server + `socket.io-client`, real DB).

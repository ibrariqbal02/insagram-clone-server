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
| 2026-10-24 | Domain bought: **speakyard.net** (registered via Wix; use Wix only for DNS, not as the website). Web app: speakyard.net (Vercel), API: api.speakyard.net (Render). Same site, so cookies can use SameSite=Lax |
| 2026-10-24 | MVP scope: real-time chat + 1-to-1 audio/video calls + group calls + AI calls; remove all Instagram branding |

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
| 2 | MVP: chat, audio/video/group calls, AI calls (details below) | Not started |
| 3 | Capacitor Android build + push notifications (FCM) | Not started |
| 4 | Google Play release | Not started |
| 5 | Chat corrections/translation, flashcards, leaderboards, live rooms, Pro plan | Not started |

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

## Phase 2: MVP (chat + audio/video/group calls + AI calls)

### 2A Brand, profile and onboarding
- [ ] 2.0 Rebrand to Speakyard: remove every "Instagram" name/logo/wording, new logo + favicon + app title, colors, meta tags, README
- [x] 2.1 User fields: nativeLanguages, learningLanguages [{ code, level A1–C2 }], country, interests, birth year (18+ for calls with strangers)
- [x] 2.2 Onboarding screens after register: pick languages and level, goals, mic/camera permission (mic only so far — see Log)
- [ ] 2.3 Navigation: Home (Practice), Messages, Calls, Profile (+ Explore kept). Hide reels/create post from main nav, keep code (built differently this session — see Log, needs reconciling)

### 2B Human calls (LiveKit)
- [ ] 2.9 LiveKit: server endpoint creates room + access token (only participants allowed); client LiveKit SDK; env vars
- [ ] 2.10 1-to-1 audio and video calls from chat and profile: invite/ring over Socket.IO, accept/decline, busy, missed call, timeout
- [ ] 2.11 Call screen: mute, camera on/off, switch camera, speaker, end, timer, network quality, topic card, report/block
- [ ] 2.12 Group calls from group conversations (audio/video, up to 8): start, join/leave, "call in progress" banner in chat
- [ ] 2.13 "Practice now" random matching queue: learning language ↔ native/fluent, level; skip blocked users; 18+ only
- [ ] 2.14 Call history (audio/video/group/AI, duration, language) + after-call rating
- [ ] 2.15 Presence: online partners list, "available to talk" toggle

### 2C AI calls (practice partner, first thing a new user does)
- [ ] 2.4 Server `ai` module: assistant API tutor, per-language and level-aware prompt, short replies, gentle corrections
- [ ] 2.5 AI call screen like a phone call: speak → speech-to-text → assistant → text-to-speech → play (push-to-talk first)
- [ ] 2.6 Topics/scenarios (introduce yourself, ordering food, job interview, travel)
- [ ] 2.7 End-of-call feedback: mistakes, better phrases, new words, simple score
- [ ] 2.8 Free daily AI minutes limit, usage tracking per user

### 2D Keep users coming back
- [ ] 2.16 Streaks and XP for AI calls and human calls, daily speaking goal
- [ ] 2.17 Notifications: incoming call, missed call, partner online, streak reminder

Done when: a new user can sign up, finish onboarding, do an AI call, chat, make audio/video/group calls,
get matched with a stranger, rate the call, and report/block — on web and Android.

Order of work: see `docs/COMMANDS.md`.

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
- 2026-10-24: Monorepo note — github.com/ibrariqbal02/speakyard (backend/ + frontend/speakyard-frontend/)
  was a stale pre-hardening snapshot; synced it to a `assistant/tender-curie-l8kmyp` branch there with the
  full current state through 1.13 (full replace, not merged to its `main`). The split repos
  (insagram-clone-server / insagram-clone-client) remain the ones this plan and project notes files track.
  The frontend's working folder is now `speakyard-frontend/` (renamed from `instagram-clone-frontend/`)
  to match that monorepo's naming; `frontend/project notes` and this file were updated to match, but
  `backend/project notes`'s note about the client's folder name is still stale (one line, not fixed yet).
- 2026-10-24: Domain speakyard.net bought. Scope now includes video and group calls and rebrand (2.0). Added docs/COMMANDS.md with the ordered commands.
- 2026-10-24: Phase 2.1–2.2 done, 2.3 built but **diverges from the plan text above** — this session
  started from "do 2.1-2.3" against the plan as it read *before* the domain/rebrand/COMMANDS.md commit
  landed (same day, different session — COMMANDS.md's own "only one assistant session on the branch at a
  time" rule wasn't followed here). Flagging rather than silently reconciling:
  - Server: `User.model.ts` gained `nativeLanguages` ([String]), `learningLanguages`
    ([{ code, level: A1-C2 }]), `country`, `interests` ([String]), `birthYear` (number, nullable),
    and `onboardingCompleted` (bool, default false — existing users read back `false` via Mongoose's
    schema default even though the field isn't in their stored document yet, so no migration was
    needed). New `PATCH /api/auth/onboarding` (`completeOnboarding` in `auth.controller.ts`) saves all
    of these in one call and sets `onboardingCompleted = true`; validated in `auth.routes.ts`
    (`onboardingRules`) with express-validator — at least one native language, at least one
    `{code, level}` learning language with a valid CEFR level, and (if a birth year is given) age 18+.
    Matches 2.1 as written either way.
  - Client onboarding: new `src/pages/Onboarding/Onboarding.tsx` — a 5-step flow (native languages →
    learning language+level → country/interests → birth year → **mic-only** permission via
    `navigator.mediaDevices.getUserMedia`) that posts to the new endpoint via
    `useCompleteOnboarding` (`useAuth.ts`) and redirects to `/`. `ProtectedRoute.tsx` now redirects any
    authenticated user with `onboardingCompleted !== true` to `/onboarding` (skipped if already there,
    no loop). Language/level/interest option lists live in `src/data/languages.ts`, shared by
    Onboarding and the new Practice page. **Gap vs. 2.2 as now written:** no camera permission request
    yet — add it once video calls (2.10+) exist.
  - Client nav: simplified `Sidebar.tsx` (desktop nav + mobile tab) to exactly Home, Calls, Messages,
    Profile — **no Explore/Search item**, and hid Search/Notifications/Create-post/Reels from nav, not
    just Reels/Create-post. The old Notifications/Search/Reels/Create-post badge and fill-icon logic
    tied to those removed nav items was deleted as dead code. Nothing was deleted: Search,
    Notifications, Create post, Archive, Settings, and the old feed (moved `/` → `/feed`) all still
    have working routes in `AppRoutes.tsx`, just unlinked from nav. `/` renders a new
    `src/pages/Practice/Practice.tsx` placeholder (AI practice partner is 2.4-2.8, not built yet) and
    `/calls` a new `src/pages/Calls/Calls.tsx` empty-state placeholder (human calls are 2.9-2.15).
    Also fixed the nav/mobile-header wordmark, which still said "Instagram", to "Speakyard" (full
    rebrand is the separate 2.0, not done). **To reconcile:** either add an Explore nav item back
    (pointing at the existing `/search` page) and restore Notifications to nav to match 2.3 as now
    worded, or treat the stricter 4-item nav as the real decision and edit 2.3's wording instead —
    whoever picks this up next should choose one and update this file.
  - Tests: backend `tests/integration/onboarding.controller.test.ts` (controller unit tests + real
    supertest+express-validator checks for the validation rules). Client: `Onboarding.test.tsx` (full
    5-step flow incl. validation and the under-18 block), `Practice.test.tsx`, `Calls.test.tsx`, new
    `ProtectedRoute.test.tsx` cases for the onboarding redirect, and an `authApi.test.ts` case for
    `completeOnboarding`. No new regressions: same pre-existing 6 backend / 11 frontend failing suites
    as before this change (confirmed by re-running the full suite before and after).

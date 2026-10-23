# Project Plan: Instagram clone → Speakyard

This file is the project's memory. Every decision and every finished step is recorded here,
so work can continue in any new session. Update it after each step.

## Goal

Turn the Instagram clone (React + Vite client, Express + MongoDB server) into **Speakyard**:
a web and mobile (Android first) app where people practice English and other languages
with partners, and have fun doing it (challenges, streaks, short videos).

## Decisions so far

| Date | Decision |
|---|---|
| 2026-10-23 | Product: language practice and entertainment app (web + Android, iOS later) |
| 2026-10-23 | Mobile approach: wrap the existing React client with **Capacitor** (one codebase) |
| 2026-10-23 | Hosting: client on Vercel, server on Render/Railway/Fly (needs always-on server for sockets), MongoDB Atlas, Cloudinary |
| 2026-10-23 | Name confirmed: **Speakyard** (owner still to check domain, Play Store, trademark) |
| 2026-10-23 | Work branch in both repos: `assistant/tender-curie-l8kmyp` |

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
| 2 | MVP language features | Not started |
| 3 | Capacitor Android build + push notifications (FCM) | Not started |
| 4 | Google Play release | Not started |
| 5 | AI partner, flashcards, quizzes, leaderboards, live voice rooms, Pro plan | Not started |

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
- [ ] 1.11 Add Socket.IO server with JWT auth on connect
- [ ] 1.12 Emit new messages, edits, deletes, read receipts, typing and online status
- [ ] 1.13 Client: socket hook, update React Query cache from events, keep polling only as a fallback

### Data and performance
- [ ] 1.14 MongoDB indexes (messages by conversation + createdAt, notifications by recipient, posts by author + createdAt, text index for search)
- [ ] 1.15 Cursor pagination on feed, messages, notifications, comments
- [ ] 1.16 Graceful shutdown (close HTTP server and Mongo connection on SIGTERM)

### Observability
- [ ] 1.17 Structured logging with `pino` + request logging, replace `console.log`
- [ ] 1.18 `GET /api/health` endpoint (checks DB)
- [ ] 1.19 Sentry for server and client crash reports

### Play Store requirements (start now, needed later)
- [ ] 1.20 Report user / report post / report message endpoints + admin review list
- [ ] 1.21 Block user (blocked users cannot message, see posts, or find you)
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

## Phase 2 preview: MVP language features

- Profile: native languages, learning languages, level (A1–C2), country, interests
- Partner matching by language pair and level
- Chat: correct a message, translate a message
- Streaks, XP, daily speaking challenge
- Onboarding flow for new users

## Phase 4 checklist: Google Play

1. Play Console developer account ($25 once, ID verification)
2. Signed Android App Bundle (.aab); back up the upload key
3. Target the API level Play currently requires
4. Store listing: icon, screenshots, descriptions, privacy policy URL
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

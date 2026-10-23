# Speakyard: commands for coding assistant

Paste one command at a time into coding assistant (VS Code), opened on the folder that holds both repos.
Before each one, run `git pull` in both repos. After each one, test it with the checklist assistant gives you,
then move to the next. Only one assistant session should work on the branch at a time.

Every command follows the rules in `project notes` (read plan, tests, tick steps, log, commit, push).

## C1. Rebrand + onboarding (2.0–2.3)
```
Speakyard: do steps 2.0-2.3 in server and client.
Remove every Instagram name/logo/text, use Speakyard branding.
```

## C2. Safety (1.20–1.22) — needed before calls with strangers
```
Speakyard: do steps 1.20-1.22 in server and client.
Report and block must also work from chat and call screens.
```

## C3. Audio + video calls, 1-to-1 (2.9–2.11)
Needs: a LiveKit Cloud project (livekit.io) → API key, API secret, URL in the server `.env`.
```
Speakyard: do steps 2.9-2.11 in server and client using LiveKit.
1-to-1 audio and video calls from chat and profile, ringing over Socket.IO.
```

## C4. Group calls + random partner + history (2.12–2.15)
```
Speakyard: do steps 2.12-2.15 in server and client.
```

## C5. AI calls (2.4–2.8)
Needs: Anthropic API key, and a speech-to-text / text-to-speech key (e.g. Deepgram) in the server `.env`.
```
Speakyard: do steps 2.4-2.8 in server and client.
AI call screen should feel like a phone call. Use the latest assistant model.
```

## C6. Streaks + notifications (2.16–2.17)
```
Speakyard: do steps 2.16-2.17 in server and client.
```

## C7. Production + deploy on speakyard.net (rest of Phase 1)
Needs: Render (server, paid always-on instance for sockets/calls), Vercel (client), MongoDB Atlas, Sentry.
```
Speakyard: do the remaining Phase 1 steps (1.7, 1.14-1.19, 1.23-1.28).
Web on speakyard.net (Vercel), API on api.speakyard.net (Render).
Give me the exact DNS records to add in Wix and every env var to set on Render and Vercel.
```

## C8. Android app (Phase 3)
Needs: Android Studio installed.
```
Speakyard: do Phase 3. Wrap the client with Capacitor for Android (app id net.speakyard.app),
mic/camera permissions, push notifications with Firebase, and give me steps to build a signed .aab.
```

## C9. Play Store (Phase 4)
```
Speakyard: help me with Phase 4. Write the privacy policy and delete-account pages,
store listing text, and Data safety answers.
```

## Other short commands
- `Continue Speakyard plan` — does the next unticked steps
- `Speakyard: show plan status`
- `Speakyard: fix this bug: <describe what you saw>`

# MASTER PROMPT: Build "Huddle", an AI-powered live multiplayer quiz platform

You are a senior full-stack engineer. Build Huddle end to end, in phases. After each phase: make sure it runs, summarize what you built, list any assumptions, and wait for me to say "continue" before starting the next phase. Do not skip ahead, and do not stub features with fake data unless I ask.

## 1. Product summary
Huddle is a Kahoot-style live quiz platform with AI quiz generation. A host creates a quiz by (a) uploading a file, (b) typing a prompt, or (c) building it manually. The host then runs a live room where players join via link or code with a name and avatar (no account needed). Hosts can also schedule a quiz and email invite links to players.

The app name is "Huddle". Use it everywhere: page titles, metadata, logo text, email templates, README, and package name.

Users:
- Host (authenticated with Google via Supabase Auth): creates quizzes, runs and schedules sessions, sees results.
- Player (anonymous): joins a room, answers questions, sees the leaderboard.

## 2. Project setup (do this first, exactly)
Initialize the project with:

    npx shadcn@latest init --preset b3yNou --template next

- Do not use create-next-app separately. The command above scaffolds the Next.js project and the shadcn theme.
- Keep the generated theme, fonts, radius and CSS variables from the preset. Do not override them with custom colors.
- Confirm the project uses the App Router, TypeScript (strict) and Tailwind.

## 3. UI rules (strict)
- Use ONLY shadcn/ui components for all UI. Add each one with `npx shadcn@latest add <component>` when needed.
- Do not install or use any other UI library (no MUI, Chakra, Ant, Mantine, Headless UI, DaisyUI, etc.).
- Do not hand-build a component that shadcn already provides. Compose from shadcn primitives instead.
- Components likely needed: button, input, textarea, label, form, select, checkbox, switch, tabs, card, dialog, alert-dialog, sheet, drawer, dropdown-menu, popover, tooltip, badge, avatar, progress, table, calendar, date picker (calendar + popover), command, separator, skeleton, sonner (toasts), scroll-area, accordion, alert, radio-group, slider, toggle-group, sidebar, breadcrumb, pagination, chart.
- Icons: lucide-react only (the shadcn default). Google's logo is not in lucide, so use a small inline SVG inside a shadcn Button for the "Continue with Google" button.
- Forms: react-hook-form + Zod through shadcn's Form component.
- Where no shadcn component exists (e.g. drag-and-drop reorder, QR code, confetti), use a minimal headless library such as dnd-kit, and style the result only with shadcn tokens and Tailwind classes.
- Support light and dark mode via the preset's theme tokens.
- Responsive: mobile-first for the player experience (most players join on phones), desktop-first for the host dashboard and presenter view.
- Accessibility: keyboard navigable, visible focus states, correct aria labels.

## 4. Tech stack (fixed, do not substitute)
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS
- Supabase: Postgres, Auth, Realtime (Broadcast + Presence), Storage, Row Level Security
- **Auth: Supabase Auth with Google OAuth only** (no email/password, no other providers). Use `@supabase/supabase-js` and `@supabase/ssr`.
- AI: provider-agnostic wrapper supporting Gemini, Groq and OpenRouter with a fallback chain (try the primary, fall back on error or timeout). Keys come from env vars.
- Validation: Zod for every API input and every LLM output
- File parsing (server-side): pdf-parse (PDF), mammoth (DOCX), a PPTX text extractor, plain text for TXT
- Email: Resend, with .ics calendar attachments
- Scheduled jobs: Supabase pg_cron or Vercel Cron for reminder emails
- Deploy target: Vercel
- Data fetching and state: React Server Components where possible, TanStack Query for client data, Zustand for live-room client state

## 5. Features (all required)

### 5.1 Auth (Supabase Google login) and host dashboard
Authentication flow:
- Login page (/login) has a single shadcn Button: "Continue with Google". It calls `supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin}/auth/callback` } })`.
- Create the route handler `/auth/callback` that calls `exchangeCodeForSession(code)` and then redirects to `/dashboard` (or to the `next` param if present and safe, same-origin only).
- Create Supabase clients with `@supabase/ssr`: browser client, server client (cookies), and a middleware client. Add `middleware.ts` that refreshes the session on every request and redirects unauthenticated users away from /dashboard/** to /login, and signed-in users away from /login to /dashboard.
- Always use `supabase.auth.getUser()` (not `getSession()`) for server-side auth checks.
- Add a Postgres trigger on `auth.users` insert that creates a `profiles` row with name and avatar_url taken from the Google metadata.
- Sign out action in the sidebar user menu (shadcn DropdownMenu + Avatar showing the Google profile picture).
- Include a README section "Google auth setup" with these steps:
  1. Google Cloud Console: create an OAuth 2.0 Client ID (Web application). Under Authorized redirect URIs add `https://<project-ref>.supabase.co/auth/v1/callback`. Add `http://localhost:3000` and the production domain under Authorized JavaScript origins.
  2. Supabase Dashboard > Authentication > Providers > Google: enable it and paste the Client ID and Client Secret.
  3. Supabase Dashboard > Authentication > URL Configuration: set Site URL to the production URL and add `http://localhost:3000/**` and the Vercel preview/production URLs to the Redirect URLs allow-list.
- Players never need to sign in. Only hosts do.

Dashboard:
- Dashboard layout uses the shadcn Sidebar. It lists: my quizzes (title, question count, last edited), upcoming scheduled sessions, past sessions.
- Actions: create quiz, duplicate quiz, delete quiz (with AlertDialog confirm), start live now, schedule.

### 5.2 Quiz creation
1. **From file**: upload PDF/DOCX/PPTX/TXT (max 20MB) to Supabase Storage, extract text server-side, sanitize it, and warn if the text is too short. Host picks question count, difficulty (easy/medium/hard/mixed) and type (MCQ / True-False / Mixed). The LLM returns structured JSON, validated with Zod, and loaded into the editor as a draft.
2. **From prompt**: same options and pipeline, with a topic or description instead of a file.
3. **Manual builder**: add a question with 2-6 options, a marked correct answer, a per-question timer, points, and an optional image. Drag-and-drop reorder.
4. **Editor (shared by all three modes)**: edit any field, delete a question, regenerate a single question (optionally with an instruction like "make it harder"), set a quiz-wide default timer and points, cover image and theme.
5. Rate-limit AI generation per host (e.g. 20 generations/day, configurable). Show a clear error and a retry on LLM failure.

LLM prompt requirements: return ONLY JSON matching the schema, exactly one correct answer per question, plausible distractors, no duplicate questions, questions grounded in the provided source text, and difficulty matching the request.

### 5.3 Live room (Huddle room)
- Host starts a session: system generates a 6-character room code, a shareable join link and a QR code.
- Players open the link or enter the code, type a display name, pick an avatar (grid of avatar options built with shadcn Avatar), and land in a lobby. No sign-in required.
- Lobby shows joined players in real time (Supabase Presence). Host can kick a player.
- Host controls: start, next question, extend timer, end session. Host has two views: a presenter view (big screen: question, timer, answer counts, leaderboard) and a control view (their own device).
- Players see the question and answer buttons on their device, a countdown, then right/wrong feedback with points earned.
- Timers are server-authoritative: store the question start time on the server and compute remaining time from server time, never from client clocks.
- Scoring: base points for a correct answer plus an optional speed bonus (faster correct answer, more points). Show a leaderboard after every question and a final podium for the top 3.
- Reconnect: a player who drops for under 30 seconds can rejoin with the same identity (store a player token in localStorage) without losing score. A host disconnect does not end the session; state lives in Postgres.
- Anti-copy deterrents on the player question view: disable text selection (user-select: none), right-click, and copy/cut shortcuts; log tab-switch/blur events during a question and show the count to the host. State clearly in the code comments and docs that this is deterrence, not proctoring.

### 5.4 Scheduling and email invites
- Host can schedule a session for a future date and time with timezone (shadcn Calendar + Popover date picker, time select).
- Invite players by email: manual entry, CSV upload, or pasted list.
- Resend sends an invite with quiz title, host name, scheduled time, a one-click join link and an .ics attachment. Name the email sender "Huddle".
- Automated reminders (default 24h and 15min before, host-configurable) via a cron job.
- Track invite status per email: sent, opened, joined.
- Reschedule or cancel a session and notify invitees.
- A public open-join link that goes to the same room as the email invite link.

### 5.5 Results and analytics
- Post-session report: final leaderboard, per-question accuracy, average response time, most-missed questions (shadcn Table + Chart).
- Export results to CSV.

### 5.6 Branding and themes
- Quiz cover image, a few room theme options, and an optional host logo in the lobby and presenter view, all on the free tier.

## 6. Data model (Supabase / Postgres)
Create migrations in /supabase/migrations for:
- profiles (id -> auth.users, name, avatar_url, created_at), auto-created by the auth.users trigger described in 5.1
- quizzes (id, owner_id, title, source_type, theme, cover_image_url, default_timer_seconds, default_points, created_at, updated_at)
- questions (id, quiz_id, text, options jsonb, correct_index, timer_seconds, points, image_url, order_index)
- sessions (id, quiz_id, host_id, room_code unique, status [scheduled|lobby|live|ended|cancelled], scheduled_at, timezone, public_slug, current_question_index, question_started_at, settings jsonb)
- invites (id, session_id, email, status, sent_at, opened_at, joined_at)
- players (id, session_id, display_name, avatar, token, score, connected_at, kicked boolean)
- answers (id, session_id, player_id, question_id, selected_index, is_correct, response_time_ms, points_awarded, submitted_at, unique(player_id, question_id))
- ai_usage (id, owner_id, created_at, provider, tokens) for rate limiting

Row Level Security:
- Hosts (authenticated via Google) can read and write only their own quizzes, questions, sessions and invites, using `auth.uid()` checks.
- Players have no auth account. Give them access only through server route handlers or RPC functions that validate room_code and player token, using the service role key server-side only. Never expose the service role key to the client.
- Correct answers must never be sent to player clients before the question closes.

## 7. Environment variables (.env.example)
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (server only), NEXT_PUBLIC_SITE_URL, GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, RESEND_API_KEY, CRON_SECRET.
Google client ID and secret are configured in the Supabase dashboard, not in the app env.

## 8. Project structure
- /app: routes, route handlers (/api, /auth/callback), server actions
- /components/ui: shadcn components (generated, do not hand-edit beyond theming)
- /components: feature components composed from shadcn
- /lib: supabase clients (browser, server, middleware, admin), ai providers + fallback chain, file parsers, scoring, email, zod schemas
- /supabase/migrations: SQL
- /emails: Huddle-branded email templates
- middleware.ts: session refresh and route protection
- README with setup, env vars, Google auth setup, how to run, and how to deploy to Vercel

## 9. Build phases (stop and wait after each)
1. **Setup + Google Auth**: run the shadcn init command, theme check, Supabase clients and middleware, /login with "Continue with Google", /auth/callback, profiles trigger, protected dashboard shell with Sidebar and user menu with sign out.
2. **Manual authoring**: quiz CRUD, question editor, reorder, image upload.
3. **AI generation**: provider wrapper with fallback, prompt generation, then file upload + extraction, per-question regenerate, rate limiting.
4. **Live room core**: migrations for sessions/players/answers, room creation, join flow, Realtime sync, server-authoritative timer, scoring, leaderboard, host presenter + control views.
5. **Scheduling and invites**: scheduling UI, Resend emails, .ics, reminders cron, invite tracking.
6. **Results, branding, polish**: analytics, CSV export, themes, anti-copy deterrents, reconnect handling, loading and empty states, error boundaries, accessibility pass.

## 10. Quality bar
- TypeScript strict, no `any`, ESLint clean.
- Every API input and LLM output validated with Zod.
- Loading states (Skeleton), empty states, error states, and toasts (Sonner) for every async action.
- No secrets in client code.
- Write short tests for scoring, timer calculation, room code matching, and the LLM output parser.
- Keep commits small and descriptive after each phase.

Start with Phase 1 now.
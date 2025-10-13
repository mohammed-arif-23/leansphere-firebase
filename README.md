# leansphere-firebase

---

# High-Quality Student App (PWA) Transformation Plan

This document is a practical, step-by-step workflow to transform the student side into a modern, minimal, Android-like studying platform with PWA quality.

## Goals
- Clean, distraction-free learner experience (solid surfaces, rounded corners, subtle motion).
- Progressive flow: Home → Learn → Course → Lesson Player.
- AI assistance (Ask AI, Hints) in-lesson.
- Installable PWA with stable app shell and skeleton loading.
- Accessibility and performance as first-class concerns.

## Tech Stack and Key Paths
- Framework: Next.js (App Router) + TypeScript.
- Styling: Tailwind tokens via `src/app/globals.css`.
- UI kit: shadcn/ui components under `src/components/ui/*`.
- App shell: `src/app/layout.tsx`, header `src/components/layout/Header.tsx`, mobile tabs `src/components/layout/BottomTabs.tsx`.
- Student pages:
  - Home: `src/app/page.tsx`
  - Learn: `src/app/learn/page.tsx`
  - Courses (catalog): `src/app/courses/page.tsx`
  - Course detail: `src/app/courses/[courseId]/page.tsx`
  - Lesson player: `src/app/courses/[courseId]/[moduleId]/page.tsx`
- AI: `src/components/ai/StudyPanel.tsx` with APIs:
  - `POST /api/ai/ask` → `src/ai/flows/ask.ts`
  - `POST /api/ai/hints` → `src/ai/flows/smart-hints.ts`
- Skeleton loading: `loading.tsx` files under routes.
- Service worker registration: `src/components/ServiceWorkerRegister.tsx`
- SW file: `public/sw.js`

## Phase 1 — Foundation (Completed)
1) Design tokens and theming
   - File: `src/app/globals.css`
   - Set palette to toned-down aquamarine primary, subtle grays for text/borders, white card surfaces, rounded radius.

2) App shell
   - File: `src/app/layout.tsx`
   - Solid white header (`src/components/layout/Header.tsx`), centered logo, no avatar.
   - Mobile bottom tabs (`src/components/layout/BottomTabs.tsx`).

3) Student pages
   - Learn hub (`/learn`) and Courses catalog (`/courses`) created minimal-first.
   - Course detail rebuilt to solid surfaces and a hero contrast bar.
   - Lesson player integrates StudyPanel as right rail (desktop) or stacked (mobile).

4) AI Assistant
   - `src/components/ai/StudyPanel.tsx` with two tabs: Ask AI and Hints.
   - Endpoints: `POST /api/ai/ask`, `POST /api/ai/hints`.
   - Summary endpoint deprecated (kept as 410 Gone).

5) Skeleton loading
   - `src/app/loading.tsx`
   - `src/app/learn/loading.tsx`
   - `src/app/courses/loading.tsx`
   - `src/app/courses/[courseId]/loading.tsx`
   - `src/app/courses/[courseId]/[moduleId]/loading.tsx`

## Phase 2 — Accessibility and Performance
1) Accessibility (A11y)
   - Tabs ARIA: ensure `role="tablist"`, `aria-selected`, and keyboard navigation on `Tabs`.
   - Focus states: verify visible focus rings (outline using `--ring`).
   - Semantic headings on all pages; ensure labels for interactive controls.

2) Performance
   - Code-split heavy components already lazy: Video, Code Runner, Quiz under `components/course/lazy/*`.
   - Prefetch next lesson assets when showing ModuleNextGate.
   - Use `Suspense` boundaries around AI panel if needed.
   - Audit with Lighthouse; target 90+.

3) Analytics hooks
   - Add client events for: resume click, checkpoint complete, quiz submit, AI ask/hint.
   - Post to `/api/analytics/track` if available.

## Phase 3 — PWA Hardening
1) Manifest
   - Ensure `public/manifest.json` exists with name, short_name, theme_color, background_color, icons (192/512 png).
   - Add `<link rel="manifest" href="/manifest.json" />` if not auto-injected.

2) Service Worker
   - File present: `public/sw.js`. Confirm scope and caching strategy (app shell + static assets).
   - `src/components/ServiceWorkerRegister.tsx` is included in `layout.tsx`.

3) Installability
   - Test on Chrome/Android for “Install app” prompt.
   - Verify TLS, unique icons, and manifest fields.

4) Offline (optional)
   - We intentionally avoid full offline lessons per current scope.
   - Keep basic app shell caching to pass PWA checks without content downloads.

## Phase 4 — Gamification and UX Polish
1) Gamification
   - Streak goal setting (Home/Profile), badges wall, subtle confetti on completions.

2) Micro-interactions
   - Subtle page fades/slide-ups (already present via CSS).
   - Haptic-like feedback via tiny motion (Framer Motion optional; keep minimal).

3) QA and Edge Cases
   - Empty states for no courses/achievements.
   - Network errors in AI panel show helpful messages and cooldown timers.

## Developer Workflow
1) Local dev
   - `npm run dev` (Next.js on port 9002).
2) Build & start
   - `npm run build`
   - `npm start`
3) Lint & types
   - `npm run lint`
   - `npm run typecheck`

## Configuration
- Environment variables
  - `.env.local` for secrets (JWT, DB, Genkit keys). Do not commit secrets.
- AI (Genkit)
  - `src/ai/genkit.ts` configures the provider (Google AI model). Ensure API keys via env.


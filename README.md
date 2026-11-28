# Daily Paradox

An immersive daily arithmetic deduction puzzle built on Reddit's Devvit platform with React 19, Tailwind CSS 4, Vite, and Hono.

---

## 🧩 Game Concept

Every day, Reddit players worldwide receive the same puzzle:
- **Starting Number** & **Target Number**
- **Move Limit** & **Par Goal**
- **3–4 Operation Buttons** (e.g. `+5`, `*2`, `-1`, `+4`)

### The Paradox Mechanic
Exactly **one** operation button is a "Paradox" — its button label lies, and it secretly behaves differently under the hood (e.g. `+4` actually adds `6`, or `+2` inverts to subtract `2`).

Players observe the arithmetic equation log, deduce the altered behavior through trial and error, and hit the target in as few moves as possible.

---

## 🌟 Community & Social Features (Phase 9)

- **🏆 Daily Leaderboard:**
  - Real-time community standings ranked by: **Score > Fewer Moves > Fewer Hints > Earlier Time > Alphabetical Username**.
  - Server-side validated to prevent score tampering.
  - Friendly empty state before anyone has played.
- **✨ Spoiler-Safe Result Cards:**
  - Compact summary with puzzle number, score, move count, par, streak, and an emoji deduction trail (`🟪` paradox move, `🟦` normal move, `🎯` target reached).
  - Keeps the secret rule hidden by default.
  - Optional **"Include Paradox Reveal"** checkbox adds Reddit spoiler tags (`>!Secret Rule: ...!<`) only when explicitly requested by the player.
- **💬 Reddit Community Loop:**
  - One-tap **"Discuss on Reddit"** connects directly to post comments via Reddit's native `navigateTo` API, encouraging strategy comparison and community engagement without mandatory commenting.
- **📱 Native Share Sheet:**
  - Integrates with Devvit's mobile `showShareSheet` with automatic fallback to clipboard copy and toast notifications.

---

## 🛠️ Architecture & Tech Stack

- **Frontend:** React 19, Tailwind CSS 4, Vite (compiled into `dist/client/`)
  - `splash.html`: Lightweight inline view for the Reddit feed.
  - `game.html`: Full-screen expanded game experience.
- **Backend:** Node.js v22/24 serverless environment with Hono (`dist/server/index.cjs`)
  - Validates move sequences server-side by simulating authoritative puzzle definitions.
  - Persists player progress, daily streaks (UTC midnight aligned), and daily leaderboards via Devvit Redis.
- **Testing:** Native Node test runner with 85+ unit tests across 34 suites covering arithmetic safety, BFS solvability, streak rules, leaderboard ranking, and API endpoints.

---

## 🚀 Development & Commands

- `npm run test:unit`: Run all unit tests with Node's native runner
- `npm run test:types`: Verify TypeScript compilation with `tsc --build`
- `npx eslint src`: Run ESLint over TypeScript source files
- `npm run build`: Compile production client and server bundles with Vite
- `npm run dev`: Launch live interactive playtest mode on Reddit (`devvit playtest`)
- `npm run deploy`: Upload app version to Devvit

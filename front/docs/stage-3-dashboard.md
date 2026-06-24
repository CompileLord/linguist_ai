# Stage 3: Dashboard & Navigation

## PRD Coverage (Sections 3.6, 3.12, 3.13)

The main application shell, persistent layout, daily learning queue, gamification visualization, and navigation structure.

## Detailed Frontend Flows & Architecture

### 1. App Shell Layout

- **Flow**: User logs in -> redirected to `/dashboard`. The App Shell wraps all routes inside `/dashboard/*`.
- **Desktop**: A persistent left-side navigation sidebar.
- **Mobile**: A bottom tab bar to maximize vertical screen real estate.
- **Topbar**: Contains breadcrumbs, the current target language flag, and a global "AI Tutor" floating button.

### 2. Gamification Widget (PRD 3.12)

- **Flow**: Fetch `user_gamification` stats. Display `total_xp`, `current_game_level`, and `current_streak`.
- **Implementation**: The Streak logic must compute if the user has been active "today". The frontend should pass `Intl.DateTimeFormat().resolvedOptions().timeZone` to the backend to ensure the day boundary is accurate for the user's specific location, avoiding false streak resets.

### 3. Spaced Repetition Queue (PRD 3.6)

- **Flow**: Display a highly visible card: "Review: N items due today". Clicking it navigates to `/review`.
<!-- here -->

### 4. Next Lesson Generator

- **Flow**: If the user has a pending lesson, show "Continue Lesson". If none, show "Generate Next Lesson". Clicking "Generate" triggers the backend `AI Lesson Generator` (PRD 3.4) and transitions to a loading state.

## Tasks (Todo List)

- [ ] Create persistent Layout (`src/app/(protected)/layout.tsx`).
- [ ] Implement responsive Sidebar (Desktop) and Bottom Tab Bar (Mobile).
- [ ] Build Topbar component with global AI Tutor quick-access button.
- [ ] Build the Dashboard Page (`/dashboard/page.tsx`).
- [ ] Component: Gamification Header (XP Bar, Level Badge, Streak Fire icon).
- [ ] Component: "Review Queue" Card (calls backend to get count of items due).
- [ ] Component: "Next Lesson" Action Card.
- [ ] Component: Recent Achievements mini-feed (PRD 3.13).
- [ ] Setup SWR/React Query for dashboard data fetching to allow automatic polling/refetching when window regains focus.

## Best Practices (How to make it better)

- **What to Use**: React Server Components (RSC) for fetching initial layout data. `lucide-react` for clean, consistent SVG icons.
- **Data Fetching**: Use Next.js Parallel Routes (`@gamification`, `@queue`) in the Dashboard layout. This allows the Gamification stats to load instantly even if the Spaced Repetition query takes longer, preventing the whole page from blocking.
- **Gamification Polish**: When XP increases, use a counting animation library (like `react-countup`) to animate the numbers rolling to the new value.

## Avoiding Problems, Bugs & Errors

- **Cumulative Layout Shift (CLS)**: The Dashboard relies on several independent API calls. _Solution_: Hardcode the minimum height (e.g., `min-h-[200px]`) for the widget containers and render beautiful Skeleton UI blocks. This prevents the page from aggressively jumping around as data arrives.
- **Timezone Streak Bugs**: Streaks break easily if the server assumes UTC but the user is in Asia. _Solution_: The frontend must explicitly send the `X-Timezone-Offset` header on every request, or pass the local ISO string, so the backend evaluates "midnight" correctly.

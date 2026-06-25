# Frontend Handoff

## Current Status

- [x] **Stage 1 (Setup)**: Scaffold architecture folders, setup RTK / RTK Query, configure next-intl, setup error boundaries and WebSockets.
- [x] **Stage 2 (Onboarding)**: Implement registration, language select, placement test wizard, and goal selection.
- [x] **Stage 3 (Dashboard & Navigation)**: Implement persistent app layouts (sidebar, mobile bottom bar, header), dynamic gamification telemetry, spaced repetition queue counts, dynamic lesson generator actions, and skeleton loader blocks to prevent Cumulative Layout Shift (CLS).

---

## Stage 2 (Onboarding & Assessment) Detailed Summary

In Stage 2, we built the full entry-level user onboarding flows. 
- **Registration**: Created `/register` using `react-hook-form` and `zod` for robust client-side validation, error handling, and redirection.
- **Onboarding Wizard**: Built `/onboarding` layout and page wrapping a multi-step animation flow with `framer-motion`.
  - **Step 1 (UI Language Selection)**: Dynamic selection of the user's interface locale, updating translation dictionaries.
  - **Step 2 (Placement Type Selection)**: Allows users to choose between starting the adaptive diagnostic test or self-selecting their language level.
  - **Step 3 (Diagnostic Test)**: Houses adaptive question state machines where answering questions dynamically updates indices and demonstrates progress. Added a polished **framer-motion slide transition** between questions (old question slides left & fades, new question slides in from the right) to make the experience smooth and interactive.
  - **Step 4 (Self-Select Level Step - *New*)**: A manual selection grid presenting CEFR levels (A1 to C2) with translations in English, Russian, and Tajik, allowing users who skip the test to explicitly pick their starting proficiency.
  - **Step 5 (Assessment Results)**: Highlights the user's final calculated CEFR language score (A1-C1).
  - **Step 6 (Goal Selection)**: Renders a selection grid with constraints (1 to 3 learning goals) and validation checks prior to letting the user finalize onboarding. Handles back navigation gracefully (directs back to self-select or diagnostic results based on the path taken).

---

## Stage 3 (Dashboard & Navigation) Detailed Summary

In Stage 3, we built the persistent App Shell and dynamic dashboard experience:
- **App Shell Layout (`src/app/[locale]/(app)/layout.tsx`)**:
  - **Desktop Navigation**: A left-side fixed navigation sidebar containing application tabs (Dashboard, Missions, Tutor, Progress) and mastery levels.
  - **Mobile Navigation**: A sticky bottom tab bar optimized for touch screens.
  - **Global Header**: Shows dynamic streak (local fire department icon) and total XP. Integrates a floating AI Tutor quick-access button.
  - **Desktop Footer**: Displays a level progress bar dynamically highlighting XP progress between the current level and the next.
- **Dashboard Page (`src/app/[locale]/(app)/dashboard/page.tsx`)**:
  - **Primary Action Card (Lesson Generator)**: Renders continuing a current lesson or generating the next lesson.
  - **Secondary Review Card**: Showcases items currently due in the Spaced Repetition Queue, with direct navigation to `/review`.
  - **Quick Actions**: Horizontal scrolling container for AI Tutor, Real World Missions, Exams, and Vocabulary.
  - **Recent Activity**: Activity log rendering detailed achievements and XP gained per activity.
- **Gamification Enhancements**: Integrated `react-countup` to animate the XP value dynamically upon dashboard load.
- **CLS Prevention**: Setup precise CSS height boundaries and custom Tailwind skeleton loading grids. When queries are loading, the UI resolves to skeleton components instead of jumping layout locations, preventing Cumulative Layout Shift.

---

## Mock APIs & Backend Integration

Because the backend services for stats, lessons, activities, and reviews are not fully completed, we integrated mock query functions in RTK Query using `queryFn`. These attempt to fetch real backend routes first and fall back gracefully to mock payloads only when hitting 404s.

The following files contain mock implementations:

### 1. [dashboardApi.ts](file:///c:/Users/Admin/Desktop/linguist_ai/front/src/services/dashboardApi.ts)
- **`getGamificationStats`**: Matches path `/gamification/stats`.
- **`getRecentActivity`**: Matches path `/dashboard/activity`.
- **`getNextLesson`**: Matches path `/dashboard/next-lesson`.

### 2. [reviewApi.ts](file:///c:/Users/Admin/Desktop/linguist_ai/front/src/services/reviewApi.ts)
- **`getReviewStats`**: Matches path `/review/stats`.

### How to transition to the real Backend:
1. Ensure the corresponding backend controllers and routes are implemented.
2. In the api files, remove the `async queryFn(...)` logic completely.
3. Replace them with standard RTK Query standard definitions:
   ```typescript
   getGamificationStats: builder.query<GamificationStats, void>({
     query: () => '/gamification/stats',
     providesTags: ['Profile'],
   }),
   ```

---

## Notes for Next Session (Stage 4: Learning Core)

The next step is to tackle **Stage 4: Learning Core**.
- **Objective**: Build the dynamic interactive screen that executes lessons generated by the AI, parses lesson content, plays TTS audio pronunciations, corrects user errors, and handles flashcard review drills.
- **Components to build**:
  - `<TheoryBlock />` (using `react-markdown` to render formatted AI copy securely)
  - `<VocabularyList />` (incorporating Play icons linking to audio and preventing overlap)
  - `<MultipleChoice />` and `<FillInTheGap />` (exercise answering forms)
  - `<ErrorCorrectionAlert />` (rendering LLM detailed correction alerts)
  - `/review` (spaced repetition flashcard swipe interface)

# Stage 2: On boarding & Assessment

## PRD Coverage (Sections 3.2, 3.3)

Implementation of the user registration, initial placement test, and learning goal selection.

## Detailed Frontend Flows & Architecture

### 1. Registration Flow

- **Flow**: User inputs username and password -> Submit to `/auth/register` -> Backend returns JWT.
- **State**: Save JWT to `localStorage` and update RTK auth state. Redirect to Language Selection.

### 2. Placement Test Wizard (PRD 3.2)

- **Flow**:
  1. Ask user to pick UI Language (updates `next-intl` locale).
  2. Ask to "Self-select" level or "Take Test".
  3. If Test: Fetch first question. User answers -> Submit answer -> Backend returns next question based on correctness (Adaptive).
  4. Repeat for 10-15 questions.
  5. Show final CEFR level (A1-C1).

### 3. Goal Selection (PRD 3.3)

- **Flow**: Display grid of goals (Travel, Work, IELTS). User selects 1-3 goals. Submit to backend to finalize profile.

## Tasks (Todo List)

- [x] Build `/register` page with `react-hook-form` and `zod` validation.
- [x] Build `/onboarding` layout to house the multi-step wizard.
- [x] Step 1: UI Language Selection buttons.
- [x] Step 2: Level Assessment selection (Self vs. Test).
- [x] Step 3: Diagnostic Test Interface:
  - [x] Render adaptive question and multiple-choice answers.
  - [x] Implement a progress bar indicator.
  - [x] Handle backend network latency between questions.
- [x] Step 4: Goal Selection Grid (min 1, max 3 constraints).
- [x] Create a final summary screen welcoming the user and redirecting to Dashboard.

## Best Practices (How to make it better)

- **What to Use**: `react-hook-form` + `zod` for forms. `framer-motion` for smooth wizard transitions.
- **UX Polish**: Between the adaptive questions, slide the old question out to the left and the new question in from the right. This makes the 10-15 questions feel like a breeze rather than a chore.
- **Prefetching**: When the user is answering the final question, trigger a background fetch for the Dashboard layout so the transition is instant.

## Avoiding Problems, Bugs & Errors

- **Lost Progress on Refresh**: Users might accidentally hit refresh. _Solution_: Sync the wizard step index and the accumulated answers to `sessionStorage`. If the component mounts and sees data in `sessionStorage`, restore the state.
- **Form Spamming**: A user might click "Next" multiple times rapidly, triggering multiple API calls. _Solution_: Disable the submit button and show a spinner while `isSubmitting` is true.
- **Empty States**: Do not allow the user to proceed if they haven't selected a goal. Disable the "Continue" button dynamically using Zod validation criteria.

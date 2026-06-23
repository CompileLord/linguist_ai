# Stage 6: Exams & Progress Analytics

## PRD Coverage (Sections 3.9, 3.10, 3.14)
Formal assessment mechanisms (Writing and Listening exams) and the weekly data aggregation reporting (AI Coach).

## Detailed Frontend Flows & Architecture

### 1. AI Writing Exam (PRD 3.9)
- **Flow**: User receives a prompt -> Types essay in a textarea -> Submits to backend -> Backend LLM evaluates the text based on multiple dimensions -> Frontend visualizes the JSON response.
- **Implementation**: Needs a distraction-free layout (hide sidebar/topbar). Implement a live word counter. Display results using a Radar Chart mapped to the 5 grading criteria (Grammar, Vocabulary, Cohesion, Naturalness, Style).

### 2. AI Listening Exam (PRD 3.10)
- **Flow**: User listens to audio -> Answers multiple-choice questions -> Views score and the correct transcript.
- **Implementation**: The audio player is standard HTML5. The questions are fetched. *Crucially*, the transcript text must not be fetched or stored in state until the submit button is pressed.

### 3. AI Coach Weekly Report (PRD 3.14)
- **Flow**: The backend runs a cron job to generate a report. The frontend simply fetches `GET /reports/latest`.
- **Implementation**: Purely a UI presentation task. Render styled cards for "Strengths", "Weaknesses", and "Recommended Plan".

## Tasks (Todo List)
- [ ] Build `/exams/writing` flow:
  - [ ] Implement distraction-free Layout wrapper.
  - [ ] Build robust Textarea with real-time word counting.
  - [ ] Build the Results View utilizing `recharts` for the Radar Chart.
- [ ] Build `/exams/listening` flow:
  - [ ] Implement audio player restricted to 2 plays max.
  - [ ] Build multiple-choice question UI.
  - [ ] Implement the fetch logic that retrieves the transcript only *after* submission.
- [ ] Build the AI Coach Report View component (accessible via the Dashboard or Profile).
- [ ] Add toast notifications and badge modals for when a user earns a new Achievement (PRD 3.13) during exams.

## Best Practices (How to make it better)
- **What to Use**: `recharts` for the Writing Exam radar chart. `sonner` or `react-toastify` for Achievement notifications.
- **Focus Mode**: Hide the primary navigation shell. If the user tries to click the browser's "Back" button mid-exam, intercept it using a Next.js router event listener and show a confirmation modal ("Are you sure you want to leave? Your progress will be lost.").

## Avoiding Problems, Bugs & Errors
- **Preventing Exam Cheating (Critical)**: For the listening exam, do not send the `transcript` in the initial payload. If it's in the React state or the Network tab payload, users can inspect the page and read it before listening. It must be a separate API call made only after the exam is submitted.
- **Long Request Timeouts**: Evaluating a 300-word essay using Vertex AI might take 30 to 60 seconds depending on the model. Ensure the `axios` or `fetch` timeout limit is set to at least 60000ms for this specific endpoint to prevent premature 504 Gateway Timeouts on the client.
- **Data Loss**: Writing a long essay takes effort. Cache the `textarea` value to `sessionStorage` on every `onChange` event. If the user accidentally reloads the page, pull the value from `sessionStorage` to restore their essay. Clear the storage only upon successful API submission.

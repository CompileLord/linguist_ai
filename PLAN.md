# Linguist AI — Full Fix & Feature Plan

## Overview
This document covers every issue reported, what is broken, where the problem lives, and exactly what will change.

---

## 1. i18n — Missing `Lessons.loading` key
**Problem:** `lessons/[lesson_id]/page.tsx:93` calls `t("loading")`. Neither `en.json` nor `ru.json` contain a `loading` key inside the `Lessons` namespace. Next-intl throws MISSING_MESSAGE at runtime.  
**Fix:** Add `"loading": "Loading lesson..."` to `Lessons` in `front/messages/en.json` and `"loading": "Загрузка урока..."` in `front/messages/ru.json`.

---

## 2. Dashboard — Review Queue card should preview words + translations
**Problem:** The secondary "Review Queue" card on `dashboard/page.tsx` only shows `X items ready for review`. The user wants to see actual vocabulary words and their translations so the card is informative.  
**Fix:** Import `useGetReviewQueueQuery` in `dashboard/page.tsx`, fetch up to 4 items (batch_size: 4), and render a mini-list inside the Review Queue card showing each word alongside its translation in the user's locale. This sits below the "X items ready" summary line.

---

## 3. Vocabulary / Lesson play button — backend 404 when audio missing
**Problem:** Lesson vocabulary `VocabItem` objects get their `audio_url` set during lesson generation via TTS. If TTS failed, `audio_url` is `null` and no play button is shown. For the dictionary vocabulary page, items that exist in DB but have no audio_url show a `volume_off` icon (not clickable). Calling `/vocabulary/{id}/audio` for words that aren't in the DB raises `VocabularyNotFoundError` → 404.  
**Fix (backend):** Add a new endpoint `POST /lessons/tts` that accepts `{ text, language_code }` and returns `{ audio_url }`. This endpoint bypasses the vocabulary DB — it goes directly to `TextToSpeechService.synthesize_and_store()`. No DB record needed.  
**Fix (frontend, lesson vocab step):** When `v.audio_url` is null/missing, show a clickable "volume_off" button. On click, call `POST /lessons/tts` with the word and infer language from the lesson's language_id (use a static map or pass it from the lesson object). Cache the returned URL in component state so subsequent clicks play without re-fetching.  
**Fix (frontend, vocabulary page):** Change `volume_off` dead icon into a button that, on click, calls `POST /vocabulary/{vocab.id}/audio` (this works since dictionary items ARE in the DB). On success, play the returned url.

---

## 4. Reading section — Interactive answer canvas (right sliding panel)
**Problem:** The Reading step (step 2) in `lessons/[lesson_id]/page.tsx` currently renders comprehension questions as a static read-only list. The user wants an interactive right-side canvas that slides in from the right, where each question has a text input for the answer.  
**Fix (frontend):** Redesign step 2 layout:  
- Add state: `readingAnswers: string[]`, `readingSubmitted: boolean`, `readingFeedback: QuestionFeedback[] | null`, `readingPanelOpen: boolean`  
- Layout: Two-column flex when panel is open — left: reading text (main content), right: sliding canvas panel  
- Animation: use `framer-motion` `AnimatePresence` with `x: "100%"` → `x: 0` slide-in from right. The panel appears when user first focuses any answer field or clicks "Answer Questions" button  
- Canvas: numbered list of questions each with a `<textarea>` input. Submit button at bottom.  
- After submitting, show AI feedback per question (see item 5).  
- Transition from Vocabulary step to Reading step uses the existing `slide` animation; additionally, once in Reading, trigger `readingPanelOpen = true` after a 400ms delay so the canvas smoothly appears.

---

## 5. Backend — AI reading feedback endpoint
**New endpoint:** `POST /lessons/{lesson_id}/reading-feedback`  
**Request body (`ReadingFeedbackRequest`):**
```json
{
  "reading_title": "...",
  "reading_text": "...",
  "comprehension_questions": ["q1", "q2", ...],
  "user_answers": ["ans1", "ans2", ...],
  "user_level": "B1"
}
```
**Response (`ReadingFeedbackResponse`):**
```json
{
  "feedback": [
    {
      "question": "...",
      "user_answer": "...",
      "is_correct": true,
      "feedback_text": "Perfect! ...",
      "correct_example": "..."
    }
  ]
}
```
**Implementation:**  
- New schemas in `back/app/schemas/lesson.py`: `ReadingFeedbackRequest`, `QuestionFeedback`, `ReadingFeedbackResponse`  
- New service method `generate_reading_feedback()` in `LessonGeneratorService` that uses `ai_provider.generate_structured()` with `ReadingFeedbackResponse` schema  
- New prompt: `back/prompts/lessons/reading_feedback.txt` — instructs AI to give short, friendly per-question feedback, say "Perfect!" for minor mistakes, use $native_language for feedback  
- New router endpoint in `back/app/api/routers/lessons.py`  
**Frontend:** New RTK Query mutation in `front/src/services/lessonApi.ts`: `useSubmitReadingFeedbackMutation`. After call returns, display feedback section in the canvas panel with color-coded results (green border = correct, red border = wrong), showing feedback text and the correct example.

---

## 6. Lesson listening — Make interactive (not a mock)
**Problem:** The Listening step (step 3) in `lessons/[lesson_id]/page.tsx` renders questions with correct answers already highlighted in green (`oi === q.correct_index`). The user sees the answer before selecting anything. This defeats the purpose.  
**Fix:** Add state:
- `listeningAnswers: Record<number, number>` — maps question index → selected option index  
- `listeningSubmitted: boolean`  

Before submission: options render as plain buttons (no color). User selects one option per question. "Submit Answers" button is enabled when all questions are answered.  
After submission: options show colors — user's chosen correct option = green, user's wrong choice = red, the actual correct option when user was wrong = green outline. Then "Next" button goes to Exercises.

---

## 7. Lesson prompt — TTS-friendly listening script
**Problem:** The listening_script generated by AI sometimes contains formatting that breaks TTS (markdown, tables, code blocks, speaker label formatting).  
**Fix:** Update `back/prompts/lessons/lesson_generation.txt` — add explicit note to `listening_script` block: "Script must be PLAIN TEXT only — no markdown, no asterisks, no tables, no code blocks. Dialogue format: use 'Speaker Name: ...' on each line. Suitable for direct TTS synthesis."

---

## 8. Exercise section — Show correct answer when wrong
**Problem:** In step 4 (Exercises), when `exChecked = true` and `exCorrect = false`, the feedback box shows only the `explanation`. The user does not see what the correct answer was (especially for fill_blank, translation, reorder exercises that don't have visible options).  
**Fix:** In the feedback `<motion.div>` inside step 4, add a line when `!exCorrect`:
```tsx
<p className="text-sm mt-2">
  <span className="font-semibold">Correct answer: </span>
  <span className="font-mono">{currentEx.correct_answer}</span>
</p>
```

---

## 9. Quiz — Colored feedback before advancing
**Problem:** In step 5 (Quiz), after clicking "Submit Answer" the app immediately records the answer and moves to the next question with no visual feedback. The options stay gray — user never knows which was correct vs wrong.  
**Fix:** Add `quizChecked: boolean` state.  
- On "Submit Answer" click: set `quizChecked = true`, record tentative answer locally  
- Render options with colors: user's selected correct choice = green, user's wrong choice = red, the correct option (when user was wrong) = green outline  
- Button changes to "Next Question" / "Finish Quiz"  
- On "Next Question" click: call the actual `nextQuiz()` logic and reset `quizChecked = false`, `selectedQuiz = null`

---

## File Change Summary

### Backend
| File | Change |
|------|--------|
| `back/app/schemas/lesson.py` | Add `ReadingFeedbackRequest`, `QuestionFeedback`, `ReadingFeedbackResponse` |
| `back/app/api/routers/lessons.py` | Add `POST /{lesson_id}/reading-feedback` endpoint + `POST /tts` endpoint |
| `back/app/services/lesson_generator_service.py` | Add `generate_reading_feedback()` method |
| `back/prompts/lessons/lesson_generation.txt` | Update listening_script TTS guidance |
| `back/prompts/lessons/reading_feedback.txt` | **NEW** — AI feedback prompt |

### Frontend
| File | Change |
|------|--------|
| `front/messages/en.json` | Add `Lessons.loading` |
| `front/messages/ru.json` | Add `Lessons.loading` |
| `front/src/app/[locale]/(app)/dashboard/page.tsx` | Add review queue word+translation preview to Review Queue card |
| `front/src/app/[locale]/(app)/lessons/[lesson_id]/page.tsx` | Fix 3,4,6,8,9 — audio fallback, reading canvas, listening interactivity, exercise correct answer display, quiz colored feedback |
| `front/src/services/lessonApi.ts` | Add `submitReadingFeedback` mutation + `generateLessonTts` mutation |

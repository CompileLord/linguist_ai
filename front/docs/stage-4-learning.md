# Stage 4: Learning Core

## PRD Coverage (Sections 3.4, 3.5, 3.6, 3.11)
The core engine for rendering dynamic AI-generated lessons, interactive exercises, Smart Vocabulary flashcards, and inline Error Correction.

## Detailed Frontend Flows & Architecture

### 1. Dynamic Lesson Rendering (PRD 3.4)
- **Flow**: The backend returns a complex JSON (`lessons.content`). The frontend must dynamically map this JSON to specific React components.
  - `block.type === 'theory'` -> `<TheoryBlock />`
  - `block.type === 'vocabulary'` -> `<VocabularyList />`
  - `block.type === 'exercise_multiple_choice'` -> `<MultipleChoice />`

### 2. Smart Vocabulary & TTS (PRD 3.5)
- **Flow**: The vocabulary list includes Google TTS URLs. 
- **Implementation**: The frontend maps an `HTMLAudioElement` to each word's play button.

### 3. Inline Error Correction (PRD 3.11)
- **Flow**: User answers a fill-in-the-gap question incorrectly. The component sends the wrong answer to the backend. The backend returns a specific, LLM-generated explanation (e.g., "You used Past Simple, but the context implies Present Perfect.").
- **Implementation**: Render a distinct, red/orange alert box right below the input field detailing the mistake in the user's `ui_language`.

### 4. Spaced Repetition UI (PRD 3.6)
- **Flow**: Standard flashcard flow. Front of card -> Click "Reveal" -> Back of card -> User clicks "Knew it" / "Forgot it".

## Tasks (Todo List)
- [ ] Build the Lesson Data Parser: a utility that takes the raw AI JSON and maps it to React components securely.
- [ ] Component: `<TheoryBlock />` using `react-markdown` to render formatted text.
- [ ] Component: `<VocabularyList />` with embedded Play icons for audio playback.
- [ ] Component: `<MultipleChoice />` with instant success/fail visual feedback.
- [ ] Component: `<FillInTheGap />` input forms.
- [ ] Component: `<ErrorCorrectionAlert />` to display the AI's explanation for a mistake (PRD 3.11).
- [ ] Build the Spaced Repetition Flashcard Screen (`/review`).
- [ ] Implement HTML5 Audio Context manager to prevent multiple TTS files from playing simultaneously.

## Best Practices (How to make it better)
- **What to Use**: `react-markdown` with strict plugins to prevent XSS. CSS Grid for the flashcards layout.
- **Optimistic UI**: When a user clicks "I knew it" on a flashcard, immediately animate the card swiping away and show the next one, *then* send the API request in the background. If the API request fails, silently retry or show a small toast error.
- **Audio Preloading**: As soon as the user enters the lesson, instantiate `new Audio(url)` in the background for the vocabulary words. When they click play, the sound will be instantaneous.

## Avoiding Problems, Bugs & Errors
- **Malformed AI JSON**: LLMs hallucinate structure. If the backend fails to catch a malformed exercise block, the frontend might try to map over an `undefined` array and crash. *Solution*: Use rigorous optional chaining (`exercise.options?.map()`) and fallback error boundaries within the lesson parser so only the broken question disappears, not the whole lesson.
- **Overlapping Audio**: If a user spams the "Play" button on 5 different words, it creates a cacophony. *Solution*: Maintain a global ref to the `currentAudio`. Before `.play()` is called on a new word, call `.pause()` on `currentAudio`.
- **XSS Attacks**: AI outputs must be treated as untrusted. Never use `dangerouslySetInnerHTML`. Always use a safe markdown parser that strips `<script>` tags.

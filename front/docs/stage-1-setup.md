# Stage 1: Setup & Foundation

## PRD Coverage (Sections 1, 3.1, 4, 7, 8)

This stage establishes the Next.js frontend architecture, routing, design system, API layers, and multi-language support required for the MVP.

## Detailed Frontend Flows & Architecture

### 1. Project Initialization & Architecture

We use **Next.js 15 (App Router)** because it provides SSR/SSG out of the box, which improves performance and SEO, and is highly compatible with the WebSocket requirements.

- **`src/app/`**: Contains the routing logic.
- **`src/components/`**: Atomic UI components (Buttons, Inputs, Modals).
- **`src/features/`**: Domain-specific logic (e.g., `features/lessons`, `features/onboarding`).
- **`src/services/`**: API fetching logic (`apiClient.ts`) and WebSocket managers.
- **`src/store/`**: Global state management (Zustand).

### 2. Multi-Language Architecture (PRD 3.1)

The interface must support Tajik, Russian, and English. The target language is English.

- **Flow**: User's `ui_language` is stored in the RTK Auth slice and synced to `localStorage`.
- **Implementation**: We will use `next-intl` to wrap the app in an `IntlProvider`. All hardcoded strings must be abstracted into `messages/en.json`, `messages/ru.json`, and `messages/tg.json`.

### 3. API Communication & Security (PRD 7)

- **Flow**: Frontend makes calls to FastAPI backend.
- **Implementation**: Create a centralized API slice using RTK Query (`src/services/api.ts`).
  - Configure `fetchBaseQuery` to automatically attach the JWT from the Redux state or `localStorage` into the `Authorization: Bearer <token>` header.
  - Intercept `401 Unauthorized` responses within RTK Query to trigger a token refresh or dispatch a logout action to clear state and redirect to `/login`.

### 4. WebSocket Foundation

- **Flow**: Persistent connection for AI Live Tutor.
- **Implementation**: Create a custom hook `useWebSocketManager` using the native `WebSocket` API.

## Tasks (Todo List)

- [x] Initialize Next.js 15 App Router with TypeScript.
- [x] Install and configure Tailwind CSS.
- [x] Scaffold `src/` directory (`components`, `features`, `services`, `store`, `types`, `utils`).
- [x] Setup `next-intl` for Tajik, Russian, and English UI languages.
- [x] Create RTK Query base API slice (`api.ts`) with JWT injection and 401 handling.
- [x] Implement `useWebSocketManager` hook with auto-reconnect logic.
- [x] Setup global RTK store and `authSlice` for User state.
- [x] Configure `tailwind.config.ts` with brand colors and typography.
- [x] Add global Error Boundary (`error.tsx`) to prevent entire app crashes.

## Best Practices (How to make it better)

- **What to Use**: Next.js App Router, Tailwind CSS, Redux Toolkit (RTK), RTK Query, `next-intl`.
- **Optimization**: Use React Server Components for pages that don't need interactivity (like static landing pages or policy pages) to reduce client-side bundle size.
- **Design System**: Avoid inline Tailwind classes that are repeated (e.g., `btn-primary`). Extract them into `@apply` rules in `globals.css` or create reusable React components.

## Avoiding Problems, Bugs & Errors

- **State Management**: Redux Toolkit (RTK) for global state (e.g., user profile, JWT token, current language).
- **Data Fetching**: RTK Query for caching backend responses and managing API lifecycle, plus native `fetch` for Server Components.
  - **Hydration Errors**: `next-intl` and `localStorage` (for JWT) can cause React hydration mismatch errors. _Solution_: Only read from `localStorage` inside a `useEffect` hook, never during the initial server render.
- **Memory Leaks**: WebSocket connections that aren't closed when a component unmounts will multiply and crash the browser tab. _Solution_: Always `ws.close()` inside the hook's `return () => {}` cleanup function.
- **XSS & Prompt Injection (PRD 7)**: While the backend handles sanitization, the frontend must strictly escape any user-generated content rendered on screen. Do not use `dangerouslySetInnerHTML` directly on user input.

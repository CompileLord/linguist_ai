# Frontend Handoff

## Current Status
- [x] Initialize Next.js with Tailwind CSS
- [x] Define frontend task stages in `docs/` folder
- [x] **Stage 1 (Setup)**: Scaffold architecture folders, setup RTK / RTK Query, configure next-intl, setup error boundaries and WebSockets.
- [ ] **Stage 2 (Onboarding)**: Implement registration, language select, placement test wizard, and goal selection.

## Notes for Next Session
- **Stage 1 is complete!** Redux Toolkit is setup in `src/store`. Base API is at `src/services/api.ts`. Next-Intl uses `[locale]` as the root parameter.
- The next step is to tackle Stage 2 (Onboarding).
- Remember to use `react-hook-form` and `zod` for the registration flow, and `framer-motion` for transitions in the placement test wizard.

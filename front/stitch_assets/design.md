---
name: Lumina Axiom
colors:
  surface: '#13121c'
  surface-dim: '#13121c'
  surface-bright: '#393842'
  surface-container-lowest: '#0e0d16'
  surface-container-low: '#1c1a24'
  surface-container: '#201e28'
  surface-container-high: '#2a2933'
  surface-container-highest: '#35343e'
  on-surface: '#e5e0ee'
  on-surface-variant: '#c8c4d8'
  inverse-surface: '#e5e0ee'
  inverse-on-surface: '#312f39'
  outline: '#928ea1'
  outline-variant: '#474555'
  surface-tint: '#c6bfff'
  primary: '#c6bfff'
  on-primary: '#2700a0'
  primary-container: '#6e5bff'
  on-primary-container: '#fffeff'
  inverse-primary: '#563fe6'
  secondary: '#c7bfff'
  on-secondary: '#2a039d'
  secondary-container: '#422db2'
  on-secondary-container: '#b4abff'
  tertiary: '#ffb688'
  on-tertiary: '#512400'
  tertiary-container: '#bb5b00'
  on-tertiary-container: '#ffffff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c6bfff'
  on-primary-fixed: '#160066'
  on-primary-fixed-variant: '#3d1acf'
  secondary-fixed: '#e4dfff'
  secondary-fixed-dim: '#c7bfff'
  on-secondary-fixed: '#170065'
  on-secondary-fixed-variant: '#422db2'
  tertiary-fixed: '#ffdbc7'
  tertiary-fixed-dim: '#ffb688'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#733500'
  background: '#13121c'
  on-background: '#e5e0ee'
  surface-variant: '#35343e'
typography:
  display:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style
The design system is engineered for high-performance AI interfaces, prioritizing mental clarity and technical precision. The aesthetic is rooted in **Minimalism** with a heavy emphasis on **Corporate Modern** refinements. It aims to evoke a sense of calm authority and deep focus, specifically targeting developers, researchers, and enterprise users.

The visual narrative avoids decorative flourishes in favor of utility and understated luxury. It utilizes a "dark-first" architecture where depth is communicated through tonal layering and subtle 1px borders rather than aggressive shadows. The overall emotional response should be one of reliability and silent power, reflecting the sophisticated nature of the underlying intelligence.

## Colors
This design system utilizes a restricted, high-fidelity dark palette to minimize eye strain and maximize focus. 

- **Primary Accent (#6E5BFF):** Used for primary actions, active states, and critical paths.
- **Accent Glow (#8B7CFF):** Reserved for subtle data visualizations, hover glows, and AI-state indicators.
- **Surfaces:** The background remains #0A0A0C to create a "void" effect, while the primary surface (#15151A) defines functional areas.
- **Borders:** A consistent #2A2A32 creates a crisp, architectural structure without the weight of shadows.

## Typography
The typographic scale emphasizes legibility and hierarchy. **Hanken Grotesk** provides a sharp, modern geometric feel for headings, while **Inter** ensures comfortable long-form reading for AI outputs. 

For technical metadata and language names, **Geist** is used to provide a monospaced-adjacent feel that reinforces the tool's technical nature. All headings should use a slightly tighter letter-spacing to maintain a dense, professional look. Avoid using font weights below 400 to ensure high contrast against the dark background.

## Layout & Spacing
The design system follows a **fixed grid** philosophy for its primary workspace, transitioning to a fluid model for internal content components. 

The desktop layout is centered around a 12-column grid with a maximum width of 1440px. Large 64px (xl) margins are used for top-level sections to create an expansive, "premium" feel. For AI chat interfaces, content should be constrained to a 800px center column to ensure line-length readability. Use a 4px base unit for all component-level spacing (padding, gaps) to maintain rigorous mathematical alignment.

## Elevation & Depth
Depth is achieved through **Tonal Layers** and **Low-contrast Outlines**. Avoid using ambient shadows for standard UI elements. 

- **Level 0 (Background):** #0A0A0C — The base canvas.
- **Level 1 (Surface):** #15151A — Used for sidebars, cards, and input containers.
- **Level 2 (Overlay):** #1C1C24 — Used for modals and floating menus.
- **Stroke:** Every interactive element must have a 1px border (#2A2A32).
- **Focus State:** Instead of shadows, use a 1px solid Primary Accent (#6E5BFF) border with a subtle 4px outer glow of the Accent Glow (#8B7CFF) at 20% opacity.

## Shapes
The shape language is structured but approachable. A standard **14px radius** is applied to all primary cards and tiles to create a "container" feel that feels modern and soft without being playful. 

Smaller interactive elements like buttons and input fields use a more disciplined **8px radius** to maintain a sense of precision. Icons should utilize a 1.5px or 2px stroke weight to match the architectural lines of the UI.

## Components
- **Buttons:** Primary buttons use a solid #6E5BFF fill with white text. Secondary buttons use a transparent background with a #2A2A32 border. All button transitions should be 200ms ease-out.
- **Input Fields:** Use #15151A for the fill with a #2A2A32 border. On focus, the border transitions to #6E5BFF.
- **AI Response Cards:** Elevated using the 14px radius. Use a subtle gradient stroke (from #2A2A32 to #6E5BFF at 10% opacity) to indicate active AI generation.
- **Chips/Badges:** Use Geist for the font. Background should be #1C1C24 with no border for a cleaner look.
- **Lists:** Items should be separated by 1px horizontal rules (#2A2A32). Hover states should shift the background color slightly to #1C1C24.
- **Glow Elements:** Use the Accent Glow (#8B7CFF) only for "active intelligence" indicators, such as a pulsing 2px dot next to the AI's name or a soft blur behind a primary CTA.
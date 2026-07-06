# UI Model

## UI Direction

The interface should feel operational, trustworthy, and efficient. We use a premium clear glassmorphism aesthetic inspired by Stripe and Linear.

## Design System Foundation (PH-006)

### 1. Typography & Hierarchy
- **Headings**: `Outfit` (sans-serif) for high scannability, structural confidence, and premium branding.
- **Body & Controls**: `Inter` (sans-serif) for clear readability, dense tables, and interface data.
- **Code & Identifiers**: System monospace for IDs (e.g., `P-1093`).

### 2. Colors & Semantic Layout
- **Neutrals**: `Stone` shades for clean contrasts in light mode.
- **Brand Accent**: `Sand` palette (`#fcf8f2` to `#321c09`) with a golden-warm tone.
- **Feedback States**:
  - Success: `Emerald`
  - Warning: `Amber`
  - Error: `Rose`

### 3. Reusable UI Kit
Established under `@/components/ui/`:
- `Button`: Core action wrapper (primary, secondary, outline, ghost, danger).
- `Card`: Container with interactive hover translations and content sections.
- `Badge`: Semantic status labels.
- `Table`: Responsive table cells with border-collapsing.
- `Form Controls`: Styled `Input`, `Select`, `Textarea`, `Label`, `Checkbox`, `Switch`.
- `Alert`: Visual block for validation states.

### 4. Iconography
- Handled exclusively via `lucide-react` flat vector graphics.
- **Rule**: Emojis are strictly banned from CTAs, links, and buttons.

## Primary Surfaces

- Executive dashboard
- Tenant administration
- Partner management
- Commercial operations
- Content and enablement
- Reporting and analytics
- Future AI Content Studio

## UX Rules

- Make navigation obvious.
- Reduce cognitive load in administrative flows.
- Keep important actions visible.
- Present dense business data with strong hierarchy.
- Support desktop and mobile from the start.

## Visual Rules

- Prefer clear hierarchy over decoration.
- Use a consistent design system.
- Avoid visual drift across modules.
- Keep motion purposeful and restrained.

## Frontend Boundary

UI work belongs to Antigravity.

- Codex does not change UI implementation.
- Backend and UI changes should never be mixed in one ownership step.



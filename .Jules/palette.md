## 2024-05-18 - ARIA labels for icon-only buttons
**Learning:** Icon-only buttons using the UI component `<Button size="icon">` need explicit `aria-label`s for accessibility, even if they have tooltips in some contexts. The `aria-label` provides a readable name for screen readers.
**Action:** When adding or updating icon-only buttons (`<Button size="icon">`), always verify that an `aria-label` is present and accurately describes the button's action.

## 2026-09-20 - Inner TooltipTrigger Button Accessibility
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not inherit accessible names from their `TooltipContent` (screen readers may ignore tooltip content on direct focus).
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label`, ideally reusing the exact translation key (e.g. `t('settings:ai.editProvider')`) from the associated `TooltipContent`.

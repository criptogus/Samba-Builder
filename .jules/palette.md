## 2024-05-24 - TooltipTrigger inner element accessibility
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not inherit accessible names from their `TooltipContent`.
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label`, reusing the exact translation key or text string used in the tooltip content.

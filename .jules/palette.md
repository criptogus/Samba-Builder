## 2025-02-18 - TooltipTrigger inner element accessibility
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not inherit accessible names from their `TooltipContent`. Screen readers may ignore tooltip content on direct focus, leaving the button unlabelled.
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label` matching the text in the `TooltipContent` (or its localized key).

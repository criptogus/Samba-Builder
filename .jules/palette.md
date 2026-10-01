## 2024-05-18 - Missing ARIA Labels on Icon-only Tooltip Triggers
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not inherit accessible names from their `TooltipContent`. Screen readers may ignore tooltip content on direct focus when the trigger lacks a recognizable name.
**Action:** Always verify that an inner icon-only `<Button>` inside a `<TooltipTrigger>` has an explicit `aria-label`. Use the same text as the `TooltipContent` (or translation key if applicable) to maintain consistency.

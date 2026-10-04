## 2024-05-18 - Missing ARIA labels in TooltipTrigger render props
**Learning:** Icon-only buttons used as `render` props inside `TooltipTrigger`s do not automatically inherit accessible names from their `TooltipContent`. Screen readers may ignore the tooltip content when the button receives direct focus.
**Action:** Always verify that an inner icon-only `<Button>` or `<button>` inside a `<TooltipTrigger render={<button />}>` has an explicit `aria-label`, matching the string or translation key used in the `<TooltipContent>`.

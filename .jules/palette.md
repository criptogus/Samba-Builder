## 2025-02-14 - TooltipTrigger aria-label Requirement
**Learning:** The `@base-ui/react/tooltip`'s `<TooltipTrigger>` component, when wrapping non-interactive elements (like SVG icons or `<div>`s) without using `asChild` or a `render` prop, defaults to rendering a `<button>`. If it lacks an `aria-label`, it becomes an inaccessible empty button to screen readers.
**Action:** Always provide an explicit `aria-label` directly on the `<TooltipTrigger>` element (matching its `<TooltipContent>`) when wrapping non-interactive content.

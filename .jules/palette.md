## 2025-02-14 - TooltipTrigger aria-label Requirement
**Learning:** The `@base-ui/react/tooltip`'s `<TooltipTrigger>` component, when wrapping non-interactive elements (like SVG icons or `<div>`s) without using `asChild` or a `render` prop, defaults to rendering a `<button>`. If it lacks an `aria-label`, it becomes an inaccessible empty button to screen readers.
**Action:** Always provide an explicit `aria-label` directly on the `<TooltipTrigger>` element (matching its `<TooltipContent>`) when wrapping non-interactive content.
## 2025-02-14 - Keyboard Accessibility on Non-Interactive Click Targets
**Learning:** In React/JSX, attaching `onClick` handlers to non-interactive semantics (e.g., `<div>` used as file dropzones or `<span>` used for custom triggers) renders them inaccessible to keyboard users, preventing activation via Tab and Enter/Space keys. Wrapping them around existing buttons causes nested interactive elements.
**Action:** Before converting a non-interactive element to a button, ensure it does not wrap another button. To make a pure `<div>` or `<span>` accessible, strictly add `role="button"`, `tabIndex={0}`, and an `onKeyDown` handler listening for `Enter` and ` ` (Space) to proxy the click event.
## 2024-05-30 - Form Accessibility

**Learning:** Unlabeled forms using generic UI components (like `Input`, `Textarea` from `shadcn/ui`) without associated `<Label>`s or explicitly matching `htmlFor` and `id` tags can easily creep into complex dialogs like `CreatePromptDialog.tsx`.
**Action:** When adding or auditing complex form dialogs with multiple inputs, explicitly check for and add a surrounding structure containing `<Label htmlFor="matching-id">` coupled with `<Input id="matching-id">`.

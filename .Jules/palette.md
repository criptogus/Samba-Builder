## 2024-05-18 - Missing ARIA labels on Icon-only Dialog Triggers

**Learning:** I noticed that a lot of icon-only buttons like `DialogTrigger` and `AlertDialogTrigger` in this app don't have explicit `aria-label`s. Because these are icon buttons they use `title` for hover tooltips, but without `aria-label` they may not be properly read by screen readers.

**Action:** When inspecting or modifying icon-only components, specifically check if they lack an `aria-label`. If they use `title`, this can be mapped to `aria-label`.

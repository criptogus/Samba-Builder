## 2024-05-16 - XSS vulnerability via dangerouslySetInnerHTML
**Vulnerability:** Found `dangerouslySetInnerHTML` being used in `src/pro/main/ipc/handlers/local_agent/subagents/review_ruleset.ts` and `scaffold/src/components/ui/chart.tsx` but the project rules prohibit this (see project memory memory memory memory memory memory memory memory memory memory memory).
**Learning:** `dangerouslySetInnerHTML` is prohibited in `src/` by project rules.
**Prevention:** Avoid using `dangerouslySetInnerHTML` in the project. Use other methods for rendering HTML.

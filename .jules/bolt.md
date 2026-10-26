## 2024-05-18 - Memoizing hooks and list items to prevent re-renders
**Learning:** List items that rely on callbacks from custom hooks (e.g., `useOpenApp`, `useSelectChat`) or inline event handlers (e.g., `handleToggleSelect`) can cause full list re-renders when globally tracked IDs change, even if boolean list flags (e.g., `isSelected`) are correctly derived. Returning un-memoized object references from custom hooks silently breaks `React.memo` shallow equality comparisons.
**Action:** When implementing or optimizing list items, ensure that custom hook return values (especially objects containing callbacks) are wrapped in `useMemo`, and the internal hook functions are wrapped in `useCallback`. Ensure local callback props passed to list items are also wrapped in `useCallback`, and the list items themselves are wrapped in `React.memo` to prevent unnecessary render cycles.

## 2024-05-19 - Mutating shared constants used for memoization
**Learning:** When replacing inline empty array fallbacks (e.g., `data ?? []`) with a stable constant (like `EMPTY_ARRAY`) to prevent unnecessary React re-renders, ensure the array is not subsequently mutated (e.g., using `.push()`) in the hook's logic. Mutating a shared constant array will cause dangerous side effects globally.
**Action:** When extracting fallbacks to `EMPTY_ARRAY`, explicitly declare it as `const EMPTY_ARRAY = Object.freeze([]) as never[];` to guarantee immutability and catch accidental mutations during development.

## 2024-05-24 - Centralizing immutable shared array constants
**Learning:** Defining local `const EMPTY_ARRAY` within individual hooks leads to duplicate references across the application. Creating a centralized, globally accessible constant (`src/lib/constants.ts`) standardizes the optimization and reduces bundle size by providing a single shared immutable reference across all consumers.
**Action:** Always import `EMPTY_ARRAY` from a global `constants.ts` file instead of defining it locally per hook, reducing duplication and standardizing the referential equality pattern globally.

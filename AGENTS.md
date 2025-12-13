# Repository Guidelines

## Project Structure & Module Organization

- Keep React + TypeScript code inside `src/`. Use `src/main.tsx` as the Vite entry, `src/components/` for reusable charts/forms, `src/pages/` for routed views, `src/hooks/` for shared logic, and `src/services/npmClient.ts` for the npm downloads API wrapper.
- Mirror UI files with colocated tests or stories inside `src/__tests__/` or `src/components/FooChart/FooChart.test.tsx` so ownership stays obvious. Keep derived types in `src/types/` (e.g., `DownloadSeries.ts`).
- Store static assets in `public/` and build artifacts in `dist/`. Automation or data-migration helpers belong in `scripts/` with executable bit set.

## Build, Test, and Development Commands

- `npm install` – install dependencies defined in `package.json`.
- `npm run dev` – start the Vite dev server at `http://localhost:5173`, hot-reloading React views.
- `npm run build` – compile and type-check the project, emitting production assets to `dist/`.
- `npm run preview` – locally serve the built bundle to validate production behavior.
- `npm run lint` – run ESLint + Prettier (fix with `npm run lint -- --fix`).
- `npm test` – execute Vitest suites once; add `--watch` for TDD and `--coverage` to enforce coverage.

## Coding Style & Naming Conventions

- Use 2-space indentation, semicolons, and TypeScript `strict` mode. Prefer functional components and hooks over classes.
- Name components and files with `PascalCase` (`DownloadChart.tsx`), hooks with `useCamelCase`, and utilities with `camelCase`.
- Keep modules focused (~200 LOC). Centralize fetch logic in `src/services/` and reuse chart color constants via `src/constants/colors.ts`.

## Testing Guidelines

- Vitest plus `@testing-library/react` is the default stack. Place tests beside implementation or under `src/__tests__/`, naming them `ComponentName.test.tsx`.
- Mock HTTP requests with MSW or `vi.mock` to avoid hitting the live npm API. Prefer behavior assertions over implementation details.
- Target ≥80% statement coverage; run `npm test -- --coverage` in CI. For regressions, add scenario-focused tests before patching the fix.

## Commit & Pull Request Guidelines

- Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`). Keep subject lines ≤72 chars and describe scope, e.g., `feat(chart): add multi-series legend`.
- Open pull requests with a summary of intent, screenshots for UI changes, reproduction steps for bug fixes, and linked issue keys (e.g., `Closes #42`).
- Before requesting review, ensure `npm run lint` and `npm test` pass, check for unused deps, and confirm `.env` secrets are excluded from git.

## Security & Configuration Tips

- Store API endpoints and analytics keys in `.env` using `VITE_` prefixes (`VITE_NPM_API_BASE=https://api.npmjs.org`). Never commit `.env*` files.
- When sharing reproducible issues, sanitize package names that are private or NDA-bound, and rotate personal npm tokens immediately if exposure is suspected.

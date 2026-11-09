# Frontend conventions and UX rules

## Stack

Expo SDK 57, React Native 0.86, React 19, expo-router. **JavaScript only**: no
TypeScript files, no `.ts`/`.tsx`. Dependencies are added only when the need is
real; the current set is Expo's plus nothing else.

## Language rules

- **Code in English**: file names, directories, route paths, exported symbols,
  components, hooks, comments, commit messages.
- **UI copy in Italian**: everything the user reads, including error messages,
  empty states and accessibility labels.
- Camel-case function and variable names inside `api/` and `services/` are still
  Italian (`ottieniCatalogo`, `creaSegnalazione`) from the previous codebase;
  they are renamed module by module when the file is rewritten against the real
  endpoints. New code is English from the start.

## File and function size

Many small files beat few large ones: 200 to 400 lines is typical, 800 is the
ceiling. Functions stay under 50 lines with early returns and at most four
nesting levels. When a screen grows past that, the stateful part moves into a
hook under `src/hooks/`.

## Naming

`camelCase` for variables and functions, `PascalCase` for components and types,
`UPPER_SNAKE_CASE` for constants, `use*` for hooks, `is/has/should/can` for
booleans. A component file exports a component with the same name as the file.

## States are explicit

Every screen that loads data shows exactly one of:

| State | Rule |
| --- | --- |
| Loading | `LoadingScreen` for the first load, inline indicator for a refresh |
| Empty | `EmptyState` with a variant that matches the situation (`dati`, `mercato`, `non-disponibile`) and an action only when the user can do something |
| Error | `Banner` with the message and a "Riprova" button that repeats the failed request as it was |
| Not available | "coming soon" copy when the endpoint does not exist; never invented data, never a dead button that pretends to work |

A button whose endpoint is missing stays visible but disabled, with a line of
copy explaining it is not available yet. A feature without a backend renders an
empty state, never fake content.

## Data and hooks

- Screens never call `fetch`; they call a hook.
- A hook owns one concern: filters, pagination, retry, focus refresh.
- Out-of-order responses never overwrite newer ones: each request carries a
  sequence number and only the latest applies.
- "Load more" appends a copy (`[...current, ...page]`); nothing is mutated.
- The API layer is the only place that knows backend field names; screens read
  the normalised shape. The API modules and their functions are English; the
  normalised objects still use the UI-shape keys the surviving components read
  (`descrizione`, `categorie`, `offerente`, `mansione`, `stato`, `idCategoria`).
  Each key is renamed together with the component that consumes it
  (`docs/decisions.md` D020).
- Home ordering lives in `src/services/relevance.js`: the loaded page puts first
  the services sharing a category with the viewer's requests, then the rest,
  keeping the backend's newest-first order inside each group. It is a declared
  limitation of the page, not of the catalog — the ordering the product wants is
  `sort=relevance` on the backend (`docs/backend-gaps.md` G1). With no request
  categories, the order is untouched.

## Theme

Colours, spacing and radii come from `src/theme/tokens.js` through `useTokens()`.
Screens never hard-code a colour: light and dark must both work, and the user
chooses (system, light, dark) from the profile. Animations respect the reduced
motion preference.

## Accessibility and copy

Touch targets are at least 44 pt; interactive elements carry
`accessibilityRole`, `accessibilityLabel` and, where relevant, `accessibilityState`.
Copy says what happened and what the user can do next, in Italian, without
technical details and without emoji.

## Validation

Form validation lives in one module (`src/validation/`) with functions that
return the first error message or `null`. Messages are Italian and specific.
Validation covers shape only (required, length, email format, URL points at a
PNG or JPEG); business rules stay on the backend, which is the only authority.

## Pre-push gate

```bash
cd Frontend
npx expo lint
npx tsc --noEmit
```

Both must pass before any push. `tsc` reads JavaScript and catches syntax
errors; it does not type-check JavaScript, so it is a syntax net, not a type
check.

Unit tests run with jest (`npm test`, preset `jest-expo`, no other test library)
and cover the pure modules: `src/services/relevance.js` and `src/validation/`.
They are **not** part of the gate yet: the suite is new and non-blocking, so a
red test is a signal to fix before pushing, not a reason to weaken an assertion.
`collectCoverageFrom` is limited to those two modules, and the suite runs at
99% statements / 80% branches on them.

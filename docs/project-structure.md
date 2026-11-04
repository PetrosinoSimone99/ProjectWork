# Project structure

```text
ProjectWork/
├── AGENTS.md                  # rules binding AI agents and humans (root)
├── README.md                  # team roster only; details live here in docs/
├── docs/                      # this documentation set (index: README.md)
│
├── Backend/                   # Symfony 7.4 backend (read-only for frontend dev)
│   ├── compose.yaml           # Docker Desktop stack: MySQL 8.0 + PHP 8.3 dev
│   ├── compose.override.yaml  # (empty on purpose; base exposes all ports)
│   ├── docker/                # Dockerfile for the dev-only PHP container
│   ├── public/                # web entry (index.php); doc root of the server
│   ├── src/
│   │   ├── Controller/        # REST controllers (one per domain area)
│   │   ├── Entity/            # Doctrine entities (schema v2 tables)
│   │   ├── Repository/        # queries (chains, chat, users, reports…)
│   │   ├── Service/           # domain: chains, matching, compatibility, clock
│   │   ├── Manager/           # cross-entity workflows (chat, users)
│   │   ├── Command/           # CLI: create-staff, process chains
│   │   ├── EventSubscriber/   # account-active filter, CORS
│   │   └── DTO/, Query/       # payload shapes, composite reads
│   ├── config/                # packages, routes (JWT keys in config/jwt, gitignored)
│   ├── migrations/            # Doctrine migrations (schema history)
│   └── tests/                 # PHPUnit (SQLite in-memory / var/)
│
├── Frontend/                  # Expo/React Native app (frontend dev's area)
│   ├── app.json               # Expo config (name: baratto-lo-app)
│   ├── package.json           # scripts: start / android / ios / web / lint
│   ├── eslint.config.js
│   └── src/
│       ├── api/               # network boundary (see frontend.md)
│       │   ├── config.js      # env vars, host resolution, fake-mode switch
│       │   ├── client.js      # fetch wrapper with auth headers
│       │   ├── barattolo.js   # endpoint calls; ONLY fake-vs-real bifurcation
│       │   ├── normalizzazioni.js  # backend payload → view model mapping
│       │   ├── aree/          # per-domain consumer groupings
│       │   └── finti/         # canned data for demo/fake mode
│       ├── auth/              # auth-context.jsx (session), token-store.js (secure storage)
│       ├── navigazione/       # rotte-tab.js: single source of tab names/titles/icons
│       ├── app/               # expo-router routes
│       │   ├── (auth)/        # login.jsx, register.jsx
│       │   ├── (tabs)/        # index, loop, offro-e-cerco, accordi, profilo
│       │   └── *.jsx          # secondary routes: chat, accordo, scambi, token,
│       │                      # segnala, staff, staff-utenti, modifica-profilo…
│       ├── components/        # reusable UI (App* primitives + domain widgets)
│       ├── accordi/           # pure logic module for agreements (stati.js)
│       └── theme/             # tokens.js, theme-context.jsx, theme-store.js
│
├── Context_and_DB_V2/         # read-only reference set
│   ├── LAST_DB_TO_USE.txt     # pointer to the authoritative dump name
│   ├── barattolo_v2_*.sql     # dated dumps (latest includes token_redemptions)
│   ├── API docs/              # CHAINS_API.md, DATABASE_AND_API_GUIDE.md, TOKEN_REDEMPTIONS_API.md
│   ├── baratto-context.md     # schema design intent, gaps, decision notes
│   └── new_user_stories_v2.md # functional requirements
│
└── Archive/                   # frozen material (never touched)
```

## Naming language (note)

Historical frontend filenames and identifiers are in Italian (`accordi`,
`offro-e-cerco`, `finti`, `normalizzazioni`…). They are **grandfathered**:
new files, new symbols, comments and docs must be English (root `AGENTS.md`,
[decisions.md](decisions.md) D001). When touching legacy Italian modules,
keep consistency inside the file until a proper rename pass is negotiated;
`app.json` schematics and route names are user language (Italian UI copy) and
are not "code language".

## Conventions

- One semantic unit per file; shared UI primitives keep the `App` prefix
  (`AppButton`, `AppInput`, `AppText`…).
- Route names come from `src/navigazione/rotte-tab.js` alone — tab bar and
  web menu read the same list, so they cannot diverge.
- Theme values come from `src/theme/tokens.js` via `useTokens()`, never from
  ad-hoc hex codes.

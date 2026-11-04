# Workflow (git, for humans)

This is the human-readable twin of the rules in the root [`AGENTS.md`](../AGENTS.md)
("Git workflow"); where they differ, AGENTS.md wins. AI agents follow AGENTS.md
literally; humans read this.

## Branches

- `main` — shared, protected by convention: **no direct commits**.
- `andrea-frontend` — Andrea's working branch (this is where all frontend
  work lives). Other team members keep analogous branches (see remotes).

## Every session begins with a sync check

```bash
git fetch origin
git rev-list --left-right --count origin/main...andrea-frontend
```

Report "A behind / B ahead"; decide the sync (next section) **before**
starting new work — never mix sync and feature work in one commit.

## Syncing with main: merge, not rebase

```bash
git merge origin/main
```

Rebase is forbidden on published branches: shared history must not be
rewritten (at least one teammate keeps a local copy of the branch).

## Committing

```bash
git add -p                 # one logical change at a time
git commit                 # Conventional Commits, English, no AI footers
```

Example titles: `feat: agreement states on real routes`, `fix: api port
collision error message`, `docs: database map v2 with gaps`. Documentation
updates ride in the same commit as the change they document.

## Pushing

| Target | Rule |
| --- | --- |
| `andrea-frontend` (`git push`) | Always allowed, after the pre-push gate (`npx expo lint` + `npx tsc --noEmit` in `Frontend/`) |
| `main` | **Explicit per-push authorization from Andrea, after showing** what will be pushed (commit list + diff summary + whether it fast-forwards). One push's approval is not granted for the next one |
| Force any branch to `main` | Never |
| `--force` in general | Only with explicit discussed need, never on `main` |

## Pushing to main (when authorized)

```bash
# from andrea-frontend, after approval:
git checkout main
git merge --ff-only andrea-frontend   # or explicit merge if history warrants
git push origin main
git checkout andrea-frontend
```

`--ff-only` fails loudly if main moved meanwhile — re-run the sync-check
ritual first.

## File ownership (mirror of AGENTS.md)

| Path | Frontend dev |
| --- | --- |
| `Frontend/`, `docs/` | free |
| `Backend/` | read-only, **except** `compose.yaml`, `compose.override.yaml`, `docker/` (Docker runtime, reported in changelog) |
| `Context_and_DB_V2/` | read-only |
| `Archive/` | never |
| Root files | ask first |

## What this buys us

- Andrea's branch is never blocked by backend colleagues.
- `main` receiving a push always has Andrea's eyes on the delta first.
- AI agents can push freely to the feature branch without endangering the
  shared line, and must ask before anything touches `main`.

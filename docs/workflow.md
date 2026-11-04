# Workflow — copy-paste git commands

The rules live in the root `AGENTS.md` ("Git workflow", "Commits"); it wins on
every disagreement. This file only holds the commands, so nobody has to
retype them.

## Session start — sync check

```bash
git fetch origin
git rev-list --left-right --count origin/main...andrea-frontend
git rev-list --left-right --count HEAD...origin/andrea-frontend
```

Report the delta before touching anything. Sync and feature work never share a
commit.

## Sync with main

```bash
git merge origin/main
```

Never `git rebase` on a published branch.

## Commit

```bash
git add -p
git commit
```

## Pre-push gate

```bash
cd Frontend
npx expo lint
npx tsc --noEmit
```

Red gate, no push.

## Push the working branch

```bash
git push origin andrea-frontend
```

## Push to main (only after explicit authorization)

```bash
git checkout main
git merge --ff-only andrea-frontend
git push origin main
git checkout andrea-frontend
```

`--ff-only` fails loudly if `main` moved meanwhile: re-run the sync check
before retrying.

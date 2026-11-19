# `/ship` prompt — Baratto-lo frontend remediation

Copy the block below into the session, verbatim.

---

```text
/ship Frontend remediation from the full audit — class L. Brief: docs/audits/full-audit-2026-11-18.md (read §3 Corrections, §4 Priority list and §7 Prescribed order before anything else, and do not re-derive them). Raw evidence: .impeccable/critique/evidence/frontend-2026-11-18/ (assessment-a … assessment-g, the mobile and desktop captures, the measurement log). Frontend/ only, plus docs/ and the Docker exception files; Backend/ is read-only. Use the /impeccable skill for every visual step, in the order the audit prescribes, one command per step with an explicit target: harden (P1-1, P1-2, P1-3, P1-6, P1-7, P1-8, P1-9 + orphan aria-level + native error announcement) → clarify (the vocabulary cluster, the high-stakes labels, the "Ho capito" banners, "1 di 1", the "il server" copy) → shape (P1-5 completion path, P1-4 see-the-trade-before-accepting) → bolder + layout + distill + colorize/quieter (draw the directional barter, the catalog row at 412, the chat measure, the >4-option decision points, the accent rule) → optimize (virtualize /agreements and /staff-users, expo-image, native driver, focus-refetch policy, skeletons) → adapt (tablet size classes) → audit (re-score web + native) → polish (the P3 sweep, including DESIGN.md's three wrong table rows). Do NOT "fix": the 404 route (it renders correctly; the blank state is Metro's first-visit compile in dev mode), heading structure (correctly levelled — the real defect is orphan aria-level on 11 nodes), or the backend latency (out of scope for the frontend: state it in the demo, do not hide it behind a spinner). Dark theme on /chat, /edit-profile and /user/<id>, the notifications panel's error state, and every native surface were NOT measured — if a step needs them, measure first and say so; do not claim they were reviewed. Working tree: it is dirty on purpose and those files are NOT in-progress work of this task — untracked docs/audits/full-audit-2026-11-18.md, docs/audits/full-audit-2026-11-18-ship-prompt.md, .impeccable/**, login-390.png, plus an already-modified docs/changelog.md and a staged rename docs/workflow-verification-2026-11-18.md → docs/audits/ from an earlier session. Make them block 0 (commit the doc set first, or set them aside explicitly) instead of treating them as the current block under the cold-resume rule. Parallelism: at most 8 child launches per call, concurrency is fixed in settings (6) and must never be passed as a parameter, one subagent call per turn at most. If a child hangs inside a long tool call, stop it with {action:"stop"} and relaunch a replacement run — do not raise a timeout, a checkpoint steer does not land inside a tool call. Never run browser measurements with more than two Playwright contexts live: on this Expo dev server each route then takes 5-30 s, captures show the Bundling overlay, and this session lost two findings that way (a "blank 404" and a "missing heading structure", both false). Constraints: branch andrea-frontend only, never main, no force-push; every pushed commit passes `cd Frontend && npx expo lint && npx tsc --noEmit`; docs updated in the same commit as the change they document; no AI-attribution footers; Italian in chat, English in artifacts. One stop only: the plan with its lock, in the same message. Give me the triage line first, then the plan.
```

---

## Why the prompt is shaped this way

**The corrections travel with the task.** Two of the loudest findings in the raw
passes are wrong (`§3`), and an agent that reads only `assessment-a.md` or
`assessment-c-audit.md` will "fix" a 404 and a heading structure that both work. The
prompt names them explicitly, so the failure mode is not "the agent missed a finding"
but "the agent rewrote a non-bug".

**The order is not cosmetic.** `harden` comes first because a design pass on top of a
screen that silently eats a 2000-character note is decoration. `clarify` comes before
`bolder` because the surfaces get rewritten afterwards and the wording must be final,
not redrafted. `shape` comes before every visual step because "what an agreement is"
decides what the card, the panel and the confirmation must show. `optimize` comes
after the lists are decided, so virtualization is not written twice. `polish` is last
by definition.

**Scope is bounded by what was actually measured.** The prompt states the four
surfaces nobody measured (three dark screens, the notifications panel's error state,
every native surface) and requires measuring before claiming.

**The dirty tree is declared, not cleaned.** `ship.md`'s cold-resume rule says the
modified files found by `git status --porcelain` *are* the in-progress block. Here they
are audit artifacts and another session's staged rename. Left undeclared, a class L run
opens the audit `.md` as if it were its own half-finished work. Declaring them keeps
the rule intact and makes block 0 honest: commit the doc set, then start.

**Operational facts come from the handoff, not from memory.** `maxSubagentSpawnsPerRun`
is 8 and `concurrency` is 6 in settings (`ship-dev/MASTER-HANDOFF.md` §2), so the
prompt says 8 and forbids passing the concurrency parameter at all. The hung-child rule
is handoff §4.2.10, learned the hard way in this very session: a child stopped inside a
`bash` call is not saved by `checkpointBeforeDeadlineMs`, and raising the timeout only
buys a longer hang. The browser-contention rule is §3.1 of the audit, learned twice.

**The pre-push gate is quoted, not remembered.** `npx expo lint && npx tsc --noEmit`,
with the honest caveat from `AGENTS.md`: `tsc --noEmit` does not type-check `.js`/`.jsx`
here (`allowJs` without `checkJs`), so a green gate is not type safety.

**One stop.** `/ship` gives a single human gate (plan + lock in the same message). The
prompt asks for it up front, so the session does not stop again mid-way for a decision
the audit already made.

## Expected class and cost

`L`: the audit names ~70 findings, 11 of them P1, across `Frontend/src` in many files
plus `docs/`. Expect the plan to split into ≤ 8 lanes per call (`harden` paths,
`clarify` copy, `shape` decision, visual composition, `optimize`, `adapt`, `polish`)
with `docs/DESIGN.md` and `Frontend/src/theme/tokens.js` marked `shared` — the two
files every lane would otherwise want.

Per the handoff's measurement protocol, a lane that reports `0` written files or
> 20 k output tokens is a mis-sized block, not a slow agent: split it before relaunching.

## If you want to start smaller

Replace the task line with one of these, keeping the brief, the corrections list and the
dirty-tree clause:

```text
/ship Fix the four failure paths that lose work — brief: docs/audits/full-audit-2026-11-18.md §4 P1-1, P1-2, P1-6, P1-7, P1-8. Frontend/ only, /impeccable harden, branch andrea-frontend.
```

```text
/ship Fix the vocabulary cluster and the high-stakes labels — brief: docs/audits/full-audit-2026-11-18.md §4 (Vocabulary) plus assessment-g-copy.md. Italian copy only, no layout change, /impeccable clarify.
```

```text
/ship Decide and implement the completion path for a finished exchange — brief: docs/audits/full-audit-2026-11-18.md §4 P1-5, /impeccable shape first. Read Backend/ for what the API allows before proposing.
```

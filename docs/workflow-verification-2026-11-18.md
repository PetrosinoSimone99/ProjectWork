# Workflow verification — 2026-11-18

Implementation target: `andrea-frontend`, starting at `8e6e79c`. No merge,
rebase, commit or push. The pre-existing `/output/` and `/tmp/` ignore rules
remain as unstaged user changes.

## Results

- PHPUnit full suite on isolated SQLite: **113 tests, 1,406 assertions**;
  97 passed and 16 skipped because they require dedicated MySQL databases.
- All 15 skipped staff cases then ran on `staff_check_workflow_test`:
  **15 passed, 298 assertions**, including concurrent staff operations.
- Workflow suite on the migrated reference schema in `workflow_checks_test`:
  **7 passed, 97 assertions**. This includes the skipped concurrent-queue case,
  concurrent matching, idempotent message handling, dates surviving sheet
  confirmation, participant-only chat, transactional rollback, credit/refund
  once, role pagination, optional signup and migration duplicate preflight.
- Jest: **39 suites, 410 tests passed**.
- Expo lint: passed without warnings. `tsc --noEmit`: passed.
- Web export: passed, output in ignored `tmp/workflow-web`.
- PHP source syntax and `git diff --check`: passed.
- MySQL migration: applied successfully to the newly initialized local stack;
  workflow tests additionally import a fresh reference schema and run it again
  in an isolated database. Development data/volumes were not reset.
- Demo generator: generated 7 users/14 services in `workflow_demo_test`; exported
  dump reimported successfully into `workflow_demo_restore_test`. Repeating the
  generator against populated data was refused before changes.
- Docker backend healthy; async and scheduler consumers running. HTTP smoke
  against IPv4 loopback returned 200 for login, profile, owned offers, queues,
  agreements, notifications and paginated staff-role filtering.

## Limit

A visual browser smoke check could not be completed: the integrated browser
could not reach the temporary loopback web server. This is not counted as a
passed UI check. Component tests and the production web export passed; no
physical iOS/Android device run was performed.

## Migration notes

Run `php tools/upgrade-workflows.php` (also run by backend Compose startup).
The preflight reports duplicate owner/type service slots or active queue slots
without deleting rows. MySQL DDL is not transactional; partial migrations need
repair rather than an automatic database reset. Historical queue dates remain
null when unknown. Unresolved legacy proposal services yield a controlled 409.

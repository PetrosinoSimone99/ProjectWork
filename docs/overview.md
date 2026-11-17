# Overview

Baratto-lo lets people exchange services without money. An account publishes
what it **offers** and what it **looks for**; the home shows what other people
offer; a proposal starts the conversation and, once both sides accept, the
exchange becomes an agreement with a chat to settle the practical details.

The exchange is **pairwise and directional**: one agreement means "this user
provides this service to that user". There is no closed loop to complete and no
minimum group size. Longer paths (A receives from B, B receives from C) are
just independent agreements that happen to line up.

## Actors

| Actor | What they do |
| --- | --- |
| **User** | Registers, logs in, publishes and manages their own services, browses the home, opens a service detail, sends a proposal, accepts or refuses the proposals they receive, chats inside an accepted agreement, edits their profile, reports another user |
| **Staff** | Logs in, activates or deactivates accounts, changes roles, examines and closes reports, reads the audit trail of their own actions |

## The five tabs (after login)

| # | Tab | What it does | State today |
| --- | --- | --- | --- |
| 1 | **Servizi** (home) | Every service other people offer, ordered by relevance: first everything that shares a category with what the viewer looks for, newest first, then everything else. Filters: free text, categories, location. A card opens the detail popup. | Working against the real backend; the relevance ordering is computed by the backend (`backend-gaps.md` G1 landed) |
| 2 | **Match** | Queues: a standing offer or request the backend will match in the background | Working: the tab creates and cancels a queue and lists the account's own; the server refuses a second active queue and the UI gates both create actions (`decisions.md` D025). No match ever arrives, because nothing consumes the `async` transport in the local stack (`backend-gaps.md` G12) |
| 3 | **Offro e cerco** | The user's own services: create, edit, suspend and reactivate, delete, and restore from a "Deleted" section | Working |
| 4 | **Accordi** | Three sections (sent, in progress, concluded) plus a bell with the proposals waiting for an answer | Working: proposals, answers, cancellation, both sheet routes (each side fills its own row and confirms the other's) and the chat. What remains of `backend-gaps.md` G6 is the missing `serviceId` and the counterpart id |
| 5 | **Profilo** | Name, surname, location, bio, profile photo URL, theme, logout, staff entry when the role allows it | Working |

Outside the tab bar: the notifications inbox, the report screen and the staff
area (reports list, user list), all reachable from the profile.

## The lifecycle: proposal, agreement, chat

1. **Proposal.** From a service detail popup the user presses "Invia proposta".
   Nothing is filled in: the proposal is deliberately blind, meaning "I want
   this service". The recipient decides by looking at what the proposer offers
   and looks for.
2. **Notification.** Two things tell the user something arrived: the bell in the
   agreements tab, which counts the proposals waiting for **their** answer, and
   the notifications inbox in the profile, which lists every backend event
   (proposal, answer, sheet, match, chat message, staff decision). The inbox is
   polled: the backend has no push channel.
3. **Agreement.** Both sides accepting creates the agreement, and only then can
   the chat be opened: it is the only way to reach a chat with someone.
4. **Details inside the chat.** Either participant fills the agreement sheet
   (place, service, start and end datetime) and the other one reviews and
   confirms it. Until confirmed the agreement stays "details to be defined".
5. **Conclusion.** When the agreed end datetime passes, the agreement is
   concluded: the card keeps the day and the time, and the chat can no longer be
   opened. A service that is not delivered is a contested agreement, which is
   staff territory.

Every step has a screen today (`docs/api.md`): the sheet form, the confirmation
and the chat inside an accepted agreement. The conclusion in step 5 is written by
the backend's end-date scheduler, which needs a worker nobody starts yet
(`backend-gaps.md` G12).

## What is deliberately not in the product

- **No swipe feed, no chain exchanges, no compensation tokens.** These were
  earlier designs, now archived: the code was removed from the backend and the
  frontend, and the schema has no tables for them.
- **No payments.** Nothing in the app has a monetary value.
- **No automatic arbitration.** Staff examine reports; the rules for a
  non-delivered service are a product gap, not something to invent in code.

## Glossary

| Term | Meaning |
| --- | --- |
| **Offer / Request** | The two types of a service: what the user provides, what the user looks for. On the wire the values are `OFFER` and `REQUEST` |
| **Service** | One row in `services`: owner, type, description, categories, optional location, remote flag, suspended flag, soft delete |
| **Proposal** | A blind request for someone else's service; accepted or refused by the recipient |
| **Agreement** | The exchange unit created when both sides accept: one provider, one beneficiary, one service |
| **Agreement sheet** | The details compiled inside the chat (place, service, start and end) and confirmed by the other participant |
| **Queue** | A service waiting for a counterpart in the schema (`service_queues`), used by the future matching engine |
| **Report** | A user-submitted complaint about another user, processed by staff |
| **Staff operation log** | Audit trail of staff actions, kept after the subjects are deleted |

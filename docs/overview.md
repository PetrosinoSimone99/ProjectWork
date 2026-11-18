# Overview

Baratto-lo lets people exchange services without money. An account publishes
what it **offers** and what it **looks for**; the home shows what other people
offer; a proposal starts the conversation and, once both sides accept, the
exchange becomes an agreement with a chat to settle the practical details.

Direct exchanges are **pairwise and reciprocal**, with one offer per participant.
Queue matches represent one directional delivery. There is no closed loop to complete and no
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
| 2 | **Match** | Queues: a standing offer or request the backend will match in the background | Working: the tab creates and cancels a queue and lists the account's own; the server refuses a second active queue and the UI gates both create actions (`decisions.md` D025). A request queue costs one credit. The async and scheduler consumers run in the local stack |
| 3 | **Offro e cerco** | The user's own services: one offer and one request, published at registration and editable here | Working — editing only: suspend, delete and the "Eliminati" section are gone (`decisions.md` D028) |
| 4 | **Accordi** | Three sections (sent, in progress, concluded) plus a bell with the proposals waiting for an answer | Working: proposals, answers, cancellation, the sheet written from inside the chat and the chat itself |
| 5 | **Profilo** | Name, surname, location, bio, profile photo URL, theme, logout, staff entry when the role allows it | Working |

Outside the tab bar: the report screen and the staff area (reports list, user
list), all reachable from the profile, plus the notifications inbox, which is a
panel opened from the same profile and not a route of its own.

## The lifecycle: proposal, agreement, chat

1. **Proposal.** From a service detail popup the user presses "Invia proposta".
   The selected service and the sender’s own offer are retained in the proposal. The recipient decides by looking at what the proposer offers
   and looks for. When two people propose to each other, the second proposal
   accepts the first instead of creating a second exchange: both see one
   accepted agreement.
2. **Notification.** Two things tell the user something arrived: the bell in the
   agreements tab, which counts the proposals waiting for **their** answer, and
   the notifications panel in the profile, which lists every backend event
   (proposal, answer, sheet, match, chat message, staff decision) and marks the
   rows it shows as read. The API exposes a live stream
   (`GET /api/stream`, see [api.md](api.md#live-stream-server-sent-events)) and
   the app is connected to it: one connection per app, and every screen re-reads
   its own `GET` when a frame says something changed
   ([frontend.md](frontend.md#data-and-hooks)). Polling stays only as a slowed
   fallback for when the stream is down.
3. **Agreement.** Both sides accepting creates the agreement, and only then can
   the chat be opened: it is the only way to reach a chat with someone. The
   "In corso" card offers exactly two actions, "Apri chat" and "Annulla
   scambio".
4. **Details inside the chat.** Either participant opens the sheet from the chat
   ("Crea accordo") and writes the one thing the system cannot know: a
   description of the place and the practical details. Start and end are written
   by the backend — the acceptance of the proposal and the confirmation of the
   sheet — and shown as `GG/MM/AAAA HH:MM`. The first participant who sends the
   sheet locks the round: the other reads it and can only confirm or refuse.
5. **Conclusion.** Confirming the sheet ends the exchange: `end_date` is written,
   the agreement becomes `COMPLETED` and both participants receive a
   notification naming the counterpart, the service and the two timestamps.
   Participants retain read access to the chat, and the concluded card keeps its
   "Apri chat" so that record stays reachable (`decisions.md` D030); new messages
   require an accepted agreement.

Every step has a screen today (`docs/api.md`): the sheet form, the confirmation
and the chat inside an accepted agreement. The conclusion in step 5 is written by
whoever confirms the sheet (`decisions.md` D028); the backend's end-date
scheduler, consumed by the dedicated Compose worker, keeps its own path but can
no longer complete an exchange agreement.

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
| **Proposal** | A service-bound request for someone else's service; accepted or refused by the recipient |
| **Agreement** | The exchange unit created when both sides accept: one provider, one beneficiary, one service |
| **Agreement sheet** | The details of an exchange: a description written once by one participant, with the start and end timestamps written by the backend and confirmed by the other participant |
| **Queue** | A service waiting for a counterpart in the schema (`service_queues`), used by the future matching engine |
| **Report** | A user-submitted complaint about another user, processed by staff |
| **Staff operation log** | Audit trail of staff actions, kept after the subjects are deleted |

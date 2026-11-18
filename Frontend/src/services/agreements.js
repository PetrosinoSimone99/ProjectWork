/**
 * Agreement classification: the pure rules that map every agreement of
 * `GET /get-agreements` to the section of the tab that shows it.
 *
 * The same file also holds the delivery-sheet helpers (`sheetsFor`,
 * `isSheetCompiled`, `statoScheda`) that pick the sheet rows belonging to the
 * viewer and say which move is theirs; both halves are pure and read only what
 * the agreement already carries.
 *
 * The real lifecycle (`AgreementManager::createExchangeAgreement` and
 * `sendResponse`) decides the rules:
 *
 * - The creator's proposal is born with `response: true` (role `Provider`)
 *   and the other participant's with `response: null`, so a `PENDING`
 *   agreement whose *my* proposal still has `response: null` is always one
 *   waiting for **me** -> `toAnswer` (the bell). With my `response: true`
 *   I have already answered and the other side has not -> `sent`.
 * - A `PENDING` agreement without my proposal cannot be classified: it is
 *   dropped instead of guessed into a list.
 * - `ACCEPTED` stays `inProgress` while its sheet has no end date or an end
 *   date still in the future; an end date not after `now`, `REFUSED`, `VOID`,
 *   `CANCELLED`, `COMPLETED` and `CONTESTED` are `concluded` (a missing sheet
 *   never hides an accepted exchange from "in progress"). `CONTESTED` is the
 *   staff-side dispute: the backend enum carries it, so it is closed history
 *   rather than a row that silently disappears. `CANCELLED` is what the
 *   backend writes when someone cancels an accepted exchange (it replaced
 *   `VOID`, which legacy rows still carry) and `COMPLETED` is written by the
 *   backend's end-date scheduler once every delivery is complete.
 *
 * Every function copies: the returned arrays are new and the input is never
 * mutated. `now` is an optional parameter so the tests pin the clock; an
 * invalid clock expires nothing (it fails toward "in progress").
 */


function emptyBuckets() {
  return { toAnswer: [], sent: [], inProgress: [], concluded: [] };
}


const STATI_CONCLUSI = new Set(['REFUSED', 'VOID', 'CANCELLED', 'COMPLETED', 'CONTESTED']);

/** The viewer's own proposal of an agreement, `null` when it does not exist. */
function myProposal(agreement, myUsername) {
  if (typeof myUsername !== 'string' || myUsername === '' || !Array.isArray(agreement.proposte)) {
    return null;
  }
  return (
    agreement.proposte.find(
      (proposta) => proposta && typeof proposta.username === 'string' && proposta.username === myUsername,
    ) ?? null
  );
}



/**
 * The section of one agreement, or `null` when it cannot be classified
 * (missing agreement, unknown status, `PENDING` without my proposal — and
 * `PENDING` with my answer `false`, which the backend cannot produce because
 * one answer is final and changes the status).
 */
function sectionOf(agreement, myUsername) {
  if (!agreement || typeof agreement !== 'object') {
    return null;
  }
  const stato = typeof agreement.stato === 'string' ? agreement.stato.trim().toUpperCase() : null;

  if (stato === 'PENDING') {
    const mine = myProposal(agreement, myUsername);
    if (mine && mine.risposta === null) {
      return 'toAnswer';
    }
    if (mine && mine.risposta === true) {
      return 'sent';
    }
    return null;
  }

  if (stato === 'ACCEPTED') {
    return 'inProgress';
  }

  if (STATI_CONCLUSI.has(stato)) {
    return 'concluded';
  }

  return null;
}

/**
 * Splits agreements into `{toAnswer, sent, inProgress, concluded}`.
 * Rows that do not fit a rule are dropped, never guessed into a section;
 * a non-array input yields four empty arrays.
 */
export function classifyAgreements(agreements, myUsername) {
  const buckets = emptyBuckets();
  if (!Array.isArray(agreements)) {
    return buckets;
  }
  for (const agreement of agreements) {
    const section = sectionOf(agreement, myUsername);
    if (section !== null) {
      buckets[section].push(agreement);
    }
  }
  return buckets;
}

/**
 * The other participant's username, or `null`: when the agreement or my own
 * username is missing, or my proposal is the only one there is.
 */
export function counterpartOf(agreement, myUsername) {
  if (typeof myUsername !== 'string' || myUsername === '' || !Array.isArray(agreement?.proposte)) {
    return null;
  }
  const other = agreement.proposte.find(
    (proposta) =>
      proposta &&
      typeof proposta.username === 'string' &&
      proposta.username !== '' &&
      proposta.username !== myUsername,
  );
  return other ? other.username : null;
}

/**
 * The two sheet rows that concern the viewer: `{mia, altra}`, both `null`
 * when there is nothing to show. **A row is never invented**: without the
 * viewer's username, or with no row matching, the side stays `null` and the
 * screen draws nothing for it.
 *
 * The split comes from the backend, not from a guess: an accepted agreement
 * carries one row per participant (`createBlankDetails` on both, one row
 * each), and
 *
 * - `mia` is the row whose `username === myUsername` — on the wire
 *   `providerUsername`, the `ad.user` the sender looks the row up by
 *   (`Backend/src/Manager/AgreementManager.php:149-175`), so it is the row
 *   **I fill**;
 * - `altra` is the row whose `beneficiario === myUsername` — on the wire
 *   `beneficiaryUsername`, the `ad.beneficiary` the confirm route looks up
 *   (`AgreementManager.php:201-228`), so it is the row **I confirm**.
 *
 * Both participants therefore get one row to fill and one to confirm: the
 * two rows are different, and each side of the pair is found by exactly one
 * of the two usernames (`normalizeAgreementSheet` in `api/normalizers.js`).
 */
export function sheetsFor(accordo, myUsername) {
  const nessuna = { mia: null, altra: null };
  if (typeof myUsername !== 'string' || myUsername === '' || !Array.isArray(accordo?.schede)) {
    return nessuna;
  }
  const mia = accordo.schede.find((riga) => riga && riga.username === myUsername) ?? null;
  const altra = accordo.schede.find((riga) => riga && riga.beneficiario === myUsername) ?? null;
  return { mia, altra };
}

/**
 * Which move the viewer has on the delivery sheet of one agreement, as the
 * chat needs it before it draws anything:
 *
 * - `daCompilare`: no sheet has been sent yet — the viewer writes the first one
 *   ("Crea accordo");
 * - `inAttesaDiConferma`: the viewer's row is `COMPILED` and the other side has
 *   not confirmed, so there is nothing left to do but wait;
 * - `daConfermare`: the other side's row is `COMPILED` — the first sender locked
 *   the round, the viewer can only accept or refuse it;
 * - `confermata`: the row the viewer had to confirm carries
 *   `beneficiarioAccettato`, so the exchange is agreed on the details too.
 *
 * The four words are the contract (`docs/briefs/agreements-workflow/plan.md`),
 * not display copy: a screen decides which panel to open from this value and
 * never re-reads the rows itself. The check order matters — a confirmed row is
 * also `COMPILED`, so `confermata` is asked first. An agreement with no sheet
 * rows, or a missing username, is `daCompilare`, which is the only honest
 * reading of "we have not heard from anyone yet".
 */
export function statoScheda(accordo, myUsername) {
  const { mia, altra } = sheetsFor(accordo, myUsername);
  if (altra !== null && altra.beneficiarioAccettato === true) {
    return 'confermata';
  }
  if (isSheetCompiled(mia)) {
    return 'inAttesaDiConferma';
  }
  if (isSheetCompiled(altra)) {
    return 'daConfermare';
  }
  return 'daCompilare';
}

/**
 * `true` only for a row the backend marked `COMPILED`. The enum has exactly
 * two values (`UNCOMPILED`/`COMPILED`, `AgreementDetailsStatus`) and the
 * normaliser upper-cases the wire word, so anything else — including a
 * missing row — counts as not compiled: the screen must never offer the
 * confirm button or read a blank row as finished.
 */
export function isSheetCompiled(scheda) {
  return scheda?.stato === 'COMPILED';
}

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { ApiError } from '@/api/client';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { UserServicesMiniCard } from './UserServicesMiniCard';
import { Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-locations';
import { space, target, useTokens } from '@/theme/tokens';

/**
 * The service detail panel of the home catalog.
 *
 * Shows what the product decided a person needs to judge an offer before
 * writing anything: who publishes it (name and username), where it happens
 * (the service location, or "Da remoto" when the service has none and is
 * remote), and the categories with the full description.
 *
 * Two actions, both honest:
 * - "Segnala" is real: it opens the report route, which calls `POST /reports`;
 * - "Invia proposta" is real too (decision 3): the parent performs the call
 *   through `onSendProposal(servizio)` (`POST /create-exchange-agreement`
 *   sends the **person**, never a service — duplicates with the same person
 *   are possible and are not masked), while this panel owns the states:
 *   "Invio…" on a disabled button while the call flies, an Italian error
 *   line under the button on failure, no retry loop. On success
 *   `onProposalSent(servizio, username)` tells the parent to close the popup
 *   and show its banner (decision 9).
 *
 * The "what they offer and look for" block is `UserServicesMiniCard`: it asks
 * `GET /users/{id}/services` for the person's other publications and owns its own
 * five states.
 *
 * The owner row is the way into that person's profile: `onOpenProfile(persona)`
 * is the parent's route, called only when the owner has an integer id and the
 * callback exists — otherwise the row stays the plain text it always was. The
 * panel never imports the router and never names a route.
 */
export function ServiceDetailModal({
  servizio,
  onClose,
  onReport,
  onSendProposal,
  onProposalSent,
  onOpenProfile,
}) {
  const t = useTokens();
  const owner = servizio?.offerente ?? {};
  const name = nomePersona(owner);
  const categories = servizio?.categorie?.length ? servizio.categorie : null;
  const description = servizio?.descrizione ?? '';
  const publishedAt = formatIsoDate(servizio?.pubblicatoIl);

  // Send-proposal states are keyed by service id, so a response that arrives
  // after the panel moved to another person cannot touch the new panel: the
  // "in flight" flag only counts for the service it was started for, and an
  // error is displayed only for the service that produced it. No effect and no
  // state reset on prop change: the key does the scoping.
  const [invioPer, setInvioPer] = useState(null); // id of the service being sent
  const [erroreInvio, setErroreInvio] = useState(null); // {id, messaggio}
  const servizioId = Number.isInteger(servizio?.id) ? servizio.id : null;
  const invio = servizioId !== null && invioPer === servizioId;
  const erroreVisibile =
    erroreInvio !== null && erroreInvio.id === servizioId ? erroreInvio.messaggio : null;

  // Without an owner id there is no person to propose to: the button stays
  // disabled instead of firing a request the backend must reject.
  const haPersona = Number.isInteger(owner.id);
  const invioDisabilitato = invio || !haPersona || typeof onSendProposal !== 'function';
  // Same predicate for "Segnala": without an owner id the parent's handler
  // returns silently, so the tap would do nothing and say nothing (C2).
  const segnalazioneDisabilitata = !haPersona || typeof onReport !== 'function';

  // The owner row opens the profile only when there is a person to open and a
  // parent that knows how to: the same integer predicate the proposal uses.
  const apriProfilo = haPersona && typeof onOpenProfile === 'function';
  // A `button` makes its descendants presentational, so the name and the
  // username go into the label instead of being announced on their own (F50,
  // `ServiceCard`'s shape): the row shows both, the label says both.
  const nomeProfilo = owner.username ? `${name} (@${owner.username})` : name;

  async function inviaProposta() {
    if (!servizio || invioDisabilitato) {
      return;
    }
    const inviatoId = servizioId;
    setInvioPer(inviatoId);
    setErroreInvio(null);
    try {
      await onSendProposal(servizio);
    } catch (err) {
      // The API area already maps every status to Italian copy; only an
      // error from outside that layer gets its own generic line.
      setErroreInvio({
        id: inviatoId,
        messaggio: err instanceof ApiError ? err.message : 'Non è stato possibile inviare la proposta. Riprova.',
      });
      // Functional reset: a send started for another service stays busy.
      setInvioPer((corrente) => (corrente === inviatoId ? null : corrente));
      return;
    }
    setInvioPer((corrente) => (corrente === inviatoId ? null : corrente));
    // The parent decides whether to close: if the panel already moved on, the
    // success belongs to a service that is no longer open.
    onProposalSent?.(servizio, owner.username ?? null);
  }
  // Only the service's own location: falling back to the owner's city would
  // claim a place for a service that has none (a remote-only offer), which is
  // exactly the datum the product cares about here.
  const location = servizio?.localita ?? null;
  const remote = servizio?.daRemoto === true;
  // One place line: the location when there is one, otherwise the mode, and
  // "not indicated" when neither says anything.
  const place = location
    ? localitaPerDisplay(location)
    : remote
      ? 'Da remoto'
      : 'Località non indicata';

  // The name and the username as they are drawn, with or without a way to open
  // the profile: one row, one place to keep the two lines in step.
  const rigaProprietario = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
      <AppIcon name="person-circle-outline" size={18} color={t.textSecondary} />
      <AppText>{name}</AppText>
      {owner.username ? (
        <AppText variant="small" tone="secondary">
          @{owner.username}
        </AppText>
      ) : null}
    </View>
  );

  return (
    <ModalShell
      visible={servizio !== null}
      onClose={onClose}
      titolo="Dettaglio del servizio"
      etichettaChiudi="Chiudi il dettaglio"
      // L'azione primaria del pannello sta fuori dal corpo che scorre (audit
      // F70): con il testo al 200 % il comando non scappa via insieme alla
      // descrizione, e la nota che lo spiega resta accanto a lui nel corpo.
      footer={
        // Nota e comando insieme: la frase spiega cosa succede premendolo, e
        // resta appiccicata a lui invece di finire tre blocchi sopra (F70).
        <View style={{ gap: space.sm }}>
          <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
            La proposta è alla cieca, non vincolante: la decide l'altra persona.
          </AppText>
          <AppButton
            label={invio ? 'Invio…' : 'Invia proposta'}
            icon="swap-horizontal-outline"
            onPress={() => void inviaProposta()}
            disabled={invioDisabilitato}
          />
        </View>
      }
    >
      {servizio ? (
        <View style={{ gap: space.md }}>
          <View
            style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}
          >
            {categories ? (
              categories.map((category) => (
                <Chip key={category.id} background={t.serviceBg}>
                  <AppText variant="caption" style={{ color: t.serviceText }}>
                    {category.nome}
                  </AppText>
                </Chip>
              ))
            ) : (
              <Chip background={t.serviceBg}>
                <AppText variant="caption" style={{ color: t.serviceText }}>
                  Categoria non disponibile
                </AppText>
              </Chip>
            )}
          </View>

          <AppText variant="heading">{description}</AppText>

          <View style={{ gap: space.xs }}>
            <AppText variant="small" tone="secondary">
              Pubblicato da
            </AppText>
            {apriProfilo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Apri il profilo di ${nomeProfilo}`}
                onPress={() => onOpenProfile(owner)}
                // The house feedback of an openable row (`ServiceCard`), and the
                // house touch target: a pressable row is not exempt from the
                // 44 pt rule just because it is a line of text.
                style={({ pressed }) => ({
                  opacity: pressed ? 0.7 : 1,
                  minHeight: target.min,
                  justifyContent: 'center',
                })}
              >
                {rigaProprietario}
              </Pressable>
            ) : (
              rigaProprietario
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <AppIcon
                name={
                  location
                    ? 'location-outline'
                    : remote
                      ? 'videocam-outline'
                      : 'help-circle-outline'
                }
                size={16}
                color={t.textSecondary}
              />
              <AppText variant="small" tone="secondary">
                {`Si svolge: ${place}`}
              </AppText>
            </View>
            {location && remote ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="videocam-outline" size={16} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {`Disponibile anche ${etichettaModalita(true)}`}
                </AppText>
              </View>
            ) : null}
            {publishedAt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <AppIcon name="calendar-outline" size={16} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {`Pubblicato il ${publishedAt}`}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* G3 is closed: `GET /users/{id}/services` returns this person's
              other publications, and the card owns its own states. The panel
              also passes the service it is showing, so the card never repeats
              it. */}
          <UserServicesMiniCard ownerId={owner.id} ownerNome={name} apertoDaEscludere={servizio} />

          <View style={{ gap: space.sm }}>
            {erroreVisibile ? (
              // Prosa, non una pillola: `label` invece di `caption` (audit UX
              // F48). `caption` è maiuscolo e spaziato, e un messaggio d'errore
              // in maiuscolo si legge come un'etichetta di interfaccia.
              <AppText variant="label" tone="danger" style={{ textAlign: 'center' }}>
                {erroreVisibile}
              </AppText>
            ) : null}
          </View>

          <View style={{ gap: space.xs }}>
            <AppButton
              label="Segnala"
              variant="ghost"
              icon="flag-outline"
              onPress={() => onReport?.(servizio)}
              disabled={segnalazioneDisabilitata}
              accessibilityLabel={`Segnala ${name} alla staff`}
            />
            {/* La nota dice cosa succede premendo il comando, oppure perché non
                si può premere: senza persona da segnalare la frase descriverebbe
                un'azione che non partirà (C2). */}
            <AppText variant="label" tone="secondary" style={{ textAlign: 'center' }}>
              {haPersona
                ? 'La segnalazione arriva alla staff, che la esamina e decide.'
                : 'La segnalazione non è disponibile: manca la persona da segnalare.'}
            </AppText>
          </View>
        </View>
      ) : null}
    </ModalShell>
  );
}

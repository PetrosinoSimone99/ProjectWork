import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ApiError } from '@/api/client';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { Chip } from './Card';
import { formatIsoDate } from '@/services/dates';
import { etichettaModalita, nomePersona } from '@/services/offer-request';
import { localitaPerDisplay } from '@/services/italian-regions';
import { radius, space, useTokens } from '@/theme/tokens';

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
 * The "what they offer and look for" block is the third declared gap (G3): the
 * public profile of another user does not exist, so the box says it is not
 * available instead of showing the owner's own data as if it were a summary.
 */
export function ServiceDetailModal({
  servizio,
  onClose,
  onReport,
  onSendProposal,
  onProposalSent,
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

  return (
    <ModalShell
      visible={servizio !== null}
      onClose={onClose}
      titolo="Dettaglio del servizio"
      etichettaChiudi="Chiudi il dettaglio"
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons name="person-circle-outline" size={18} color={t.textSecondary} />
              <AppText>{name}</AppText>
              {owner.username ? (
                <AppText variant="small" tone="secondary">
                  @{owner.username}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
              <Ionicons
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
                <Ionicons name="videocam-outline" size={16} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {`Disponibile anche ${etichettaModalita(true)}`}
                </AppText>
              </View>
            ) : null}
            {publishedAt ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="calendar-outline" size={16} color={t.textSecondary} />
                <AppText variant="small" tone="secondary">
                  {`Pubblicato il ${publishedAt}`}
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Declared gap G3: no public profile endpoint for another user. */}
          <View
            style={{
              gap: space.xs,
              padding: space.md,
              borderRadius: radius.input,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.background,
            }}
          >
            <AppText variant="small" style={{ fontWeight: '600' }}>
              Cosa offre e cerca
            </AppText>
            <AppText variant="small" tone="secondary">
              Non disponibile per ora: di questa persona vediamo la scheda e il servizio che
              ti interessa, non le sue altre offerte e ricerche.
            </AppText>
          </View>

          <View style={{ gap: space.sm }}>
            <AppButton
              label={invio ? 'Invio…' : 'Invia proposta'}
              icon="swap-horizontal-outline"
              onPress={() => void inviaProposta()}
              disabled={invioDisabilitato}
            />
            {/* F09: the inline help at the point of doubt — a proposal is
                blind, non-binding and decided by the other person. */}
            <AppText variant="small" tone="secondary" style={{ textAlign: 'center' }}>
              La proposta è alla cieca, non vincolante: la decide l'altra persona.
            </AppText>
            {erroreVisibile ? (
              <AppText variant="caption" tone="danger" style={{ textAlign: 'center' }}>
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
              accessibilityLabel={`Segnala ${name} alla staff`}
            />
            <AppText variant="caption" tone="secondary" style={{ textAlign: 'center' }}>
              La segnalazione arriva alla staff, che la esamina e decide.
            </AppText>
          </View>
        </View>
      ) : null}
    </ModalShell>
  );
}

import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppButton } from './AppButton';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { etichettaModalita, nomeCategoria, nomePersona } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Dettaglio di un servizio del catalogo: mansione per esteso, categoria,
 * modalità, località dell'annuncio e autore con username, più le due azioni
 * possibili — contattare l'autore o proporgli un accordo.
 *
 * Non esiste il ramo «è il tuo annuncio»: nel catalogo arrivano solo i servizi
 * degli altri (le proprie voci non entrano, per decisione del titolare), quindi
 * non c'è nessun pulsante nascosto da gestire.
 *
 * Il modulo della proposta vive in `/nuovo-accordo`: qui si passa solo l'id già
 * noto della persona, perché il backend non espone un elenco di utenti da cui
 * cercarla. Il modale è estratto da `(tabs)/index.jsx` (era `DetailModal`).
 */
export function ModalDettaglioServizio({ servizio, categorie = [], onChiudi }) {
  const router = useRouter();
  const t = useTokens();
  const offerente = servizio?.offerente ?? {};
  const nome = nomePersona(offerente);
  const categoria = nomeCategoria(categorie, servizio?.idCategoria) ?? 'Categoria non disponibile';
  const mansione = servizio?.mansione?.trim() || 'Mansione non indicata';
  // Senza un id valido non si può contattare né proporre: i due pulsanti restano
  // disabilitati invece di mandare un `utenteId` inesistente.
  const azioniPossibili = Number.isInteger(offerente.id);

  return (
    <Modal visible={servizio !== null} transparent animationType="fade" onRequestClose={onChiudi}>
      <View
        style={{
          flex: 1,
          backgroundColor: t.overlay,
          justifyContent: 'center',
          padding: space.lg,
        }}
      >
        {/* Sfondo chiudibile: su web `Alert` non esiste e il tocco fuori dal
            pannello è l'unico modo per annullare. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chiudi dettaglio"
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
          onPress={onChiudi}
        />
        {servizio ? (
          <Card style={{ gap: space.md, position: 'relative', zIndex: 1 }}>
            <View
              style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', alignItems: 'center' }}
            >
              <Chip background={t.serviceBg}>
                <AppText variant="caption" style={{ color: t.serviceText }}>
                  {categoria}
                </AppText>
              </Chip>
              <Chip background={t.background}>
                <Ionicons
                  name={servizio.daRemoto ? 'globe-outline' : 'storefront-outline'}
                  size={12}
                  color={t.textSecondary}
                />
                <AppText variant="caption" style={{ color: t.textSecondary }}>
                  {etichettaModalita(servizio.daRemoto)}
                </AppText>
              </Chip>
            </View>

            <AppText variant="heading">{mansione}</AppText>

            <View style={{ gap: space.xs }}>
              <AppText variant="small" tone="secondary">
                Pubblicato da
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                <Ionicons name="person-circle-outline" size={18} color={t.textSecondary} />
                <AppText>{nome}</AppText>
                {offerente.username ? (
                  <AppText variant="small" tone="secondary">
                    @{offerente.username}
                  </AppText>
                ) : null}
              </View>
              {/* Località dell'annuncio e località della persona: la prima è dove
                  si svolge il servizio, la seconda dove sta chi lo offre. Si
                  mostrano solo se ci sono. */}
              {servizio.localita ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Ionicons name="location-outline" size={16} color={t.textSecondary} />
                  <AppText tone="secondary">{servizio.localita}</AppText>
                </View>
              ) : null}
              {offerente.localita ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
                  <Ionicons name="home-outline" size={16} color={t.textSecondary} />
                  <AppText variant="small" tone="secondary">
                    {nome} si trova a {offerente.localita}
                  </AppText>
                </View>
              ) : null}
            </View>

            <View style={{ gap: space.sm }}>
              <AppButton
                label={`Contatta ${nome}`}
                icon="chatbubble-ellipses-outline"
                disabled={!azioniPossibili}
                onPress={() => {
                  onChiudi();
                  router.push({
                    pathname: '/chat',
                    params: {
                      utenteId: String(offerente.id),
                      nome: offerente.nome ?? '',
                      cognome: offerente.cognome ?? '',
                      username: offerente.username ?? '',
                      titolo: mansione,
                    },
                  });
                }}
              />
              <AppButton
                label="Proponi accordo"
                variant="secondary"
                icon="swap-horizontal-outline"
                disabled={!azioniPossibili}
                onPress={() => {
                  onChiudi();
                  router.push({
                    pathname: '/nuovo-accordo',
                    params: {
                      id: String(offerente.id),
                      nome,
                      username: offerente.username ?? '',
                    },
                  });
                }}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chiudi dettaglio servizio"
              onPress={onChiudi}
              style={({ pressed }) => ({
                alignSelf: 'flex-end',
                backgroundColor: pressed ? t.primaryPressed : t.primary,
                borderRadius: radius.pill,
                paddingHorizontal: space.lg,
                paddingVertical: space.sm,
              })}
            >
              <AppText style={{ color: t.onPrimary, fontWeight: '700' }}>Chiudi</AppText>
            </Pressable>
          </Card>
        ) : null}
      </View>
    </Modal>
  );
}

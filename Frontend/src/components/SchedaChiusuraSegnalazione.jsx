import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppCheckbox } from './AppCheckbox';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { Card } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  ELENCO_ESITI,
  ESITI_CHIUSURA,
  ETICHETTE_ESITO,
  LIMITE_NOTA,
  puoSelezionare,
  richiedeToken,
} from '@/servizi/staff';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * La scheda di chiusura: gli esiti, il beneficiario del token e la nota.
 *
 * Non è un `Modal`: è il **pannello** che la schermata mette dentro il suo
 * `Modal`, così la conferma finale resta un `ModalConferma` a sé — un solo
 * livello di finestra alla volta, come nella scelta del servizio per il buono.
 *
 * La regola dell'**esclusività** è visibile e non solo applicata: con «nessun
 * provvedimento» le altre tre caselle si disabilitano e la riga lo dice; le tre
 * vere si combinano fra loro. La scelta di chi riceve il token compare **solo**
 * con `TOKEN_ASSEGNATO`, dall'elenco dei partecipanti al fatto.
 *
 * Non valida e non decide: `validaChiusura` (in `servizi/staff.js`) produce gli
 * errori che qui si mostrano, e il pulsante non si disabilita in base a una
 * seconda regola.
 */
export function SchedaChiusuraSegnalazione({
  segnalazione,
  esiti,
  nota,
  idBeneficiario,
  errori = {},
  azioneInCorso = false,
  onCambiaEsito,
  onCambiaNota,
  onCambiaBeneficiario,
  onConferma,
  onAnnulla,
}) {
  const t = useTokens();
  const soloNessunProvvedimento =
    esiti.length === 1 && esiti[0] === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO;
  const conToken = richiedeToken(esiti);
  const partecipanti = Array.isArray(segnalazione.partecipanti) ? segnalazione.partecipanti : [];

  return (
    <Card style={{ position: 'relative', zIndex: 1, maxHeight: '85%' }}>
      <View style={{ gap: space.xs }}>
        <AppText variant="heading">Chiudi la segnalazione</AppText>
        <AppText variant="small" tone="secondary">
          {`Decidi l'esito per ${nomePersona(segnalazione.segnalato)}. L'esito cambia la vita di due persone: la conferma finale riassume cosa sta per succedere.`}
        </AppText>
      </View>

      <View accessibilityRole="group" accessibilityLabel="Esiti della chiusura" style={{ gap: space.xs }}>
        {ELENCO_ESITI.map((esito) => {
          const selezionabile = puoSelezionare(esiti, esito);
          return (
            <View key={esito} style={{ gap: 2 }}>
              <AppCheckbox
                label={ETICHETTE_ESITO[esito]}
                value={esiti.includes(esito)}
                disabled={!selezionabile || azioneInCorso}
                onChange={() => onCambiaEsito(esito)}
              />
              {esito === ESITI_CHIUSURA.NESSUN_PROVVEDIMENTO && soloNessunProvvedimento ? (
                <AppText variant="small" tone="secondary" style={{ paddingLeft: 30 }}>
                  Le altre scelte sono disattivate: «nessun provvedimento» esclude qualsiasi altro
                  esito.
                </AppText>
              ) : null}
            </View>
          );
        })}
      </View>
      {errori.esiti ? (
        <AppText variant="small" tone="danger">
          {errori.esiti}
        </AppText>
      ) : null}

      {conToken ? (
        <View style={{ gap: space.xs }}>
          <AppText variant="small" style={{ fontWeight: '600' }}>
            Chi riceve il token
          </AppText>
          <AppText variant="small" tone="secondary">
            In una catena i danneggiati possono essere più di uno: scegli chi riceve il buono.
          </AppText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Beneficiario del token"
            style={{ gap: space.xs }}
          >
            {partecipanti.map((persona) => {
              const scelto = Number(idBeneficiario) === Number(persona.id);
              return (
                <Pressable
                  key={String(persona.id)}
                  accessibilityRole="radio"
                  accessibilityLabel={nomePersona(persona)}
                  accessibilityState={{ checked: scelto, disabled: azioneInCorso }}
                  aria-checked={scelto}
                  disabled={azioneInCorso}
                  onPress={() => onCambiaBeneficiario(persona.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: space.sm,
                    paddingVertical: space.xs,
                    borderRadius: radius.input,
                    backgroundColor: pressed ? t.border : 'transparent',
                  })}
                >
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: scelto ? t.primary : t.border,
                      backgroundColor: t.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {scelto ? (
                      <View
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: radius.pill,
                          backgroundColor: t.primary,
                        }}
                      />
                    ) : null}
                  </View>
                  <AppText variant="small" style={{ flex: 1 }}>
                    {nomePersona(persona)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          {errori.beneficiario ? (
            <AppText variant="small" tone="danger">
              {errori.beneficiario}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <AppInput
        label={soloNessunProvvedimento ? 'Nota (facoltativa)' : 'Nota'}
        value={nota}
        onChangeText={onCambiaNota}
        placeholder="Scrivi cosa hai valutato e perché: la nota resta agli atti."
        multiline
        autoCapitalize="sentences"
        maxLength={LIMITE_NOTA}
        contatore={`${nota.length}/${LIMITE_NOTA}`}
        error={errori.nota}
      />
      <AppText variant="small" tone="secondary">
        {soloNessunProvvedimento
          ? 'Senza provvedimenti la nota è facoltativa.'
          : 'La nota è obbligatoria quando c\'è un provvedimento: dice su cosa si è basata la decisione.'}
      </AppText>

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <AppButton
          label="Annulla"
          variant="secondary"
          onPress={onAnnulla}
          disabled={azioneInCorso}
          style={{ flex: 1 }}
        />
        <AppButton
          label="Rivedi e chiudi"
          icon="checkmark-done-outline"
          onPress={onConferma}
          disabled={azioneInCorso}
          accessibilityLabel={`Rivedi e chiudi la segnalazione su ${nomePersona(segnalazione.segnalato)}`}
          style={{ flex: 1 }}
        />
      </View>

      {azioneInCorso ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name="hourglass-outline" size={16} color={t.textSecondary} />
          <AppText variant="small" tone="secondary">
            Sto chiudendo la segnalazione…
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

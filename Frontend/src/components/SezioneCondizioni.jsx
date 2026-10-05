import { useState } from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { Card, Chip } from './Card';
import { nomePersona } from '@/servizi/offerta-ricerca';
import {
  STATI_CONDIZIONI,
  VISTE,
  aOraLocaleIso,
  etichettaStatoCondizioni,
  formattaDataOra,
  validaData,
  validaOra,
} from '@/servizi/catene';
import { space, useTokens } from '@/theme/tokens';

/**
 * Le condizioni di una catena **confermata** (vincolo 8 del piano): per ogni
 * arco la riga «provider → beneficiario» con luogo, orario e stato; il form
 * «Proponi le condizioni» **solo per il mio arco da provider** senza condizioni
 * in attesa o accettate; «Accetta/Rifiuta» **solo per il mio arco da
 * beneficiario** in attesa; le prestazioni con «Conferma ricezione» per chi
 * deve ancora ricevere.
 *
 * L'orario di inizio si compone con `aOraLocaleIso` (data `AAAA-MM-GG` + ora
 * `HH:MM` + fuso del dispositivo): **nessun componente scrive date a mano**.
 * La validazione client-side è esplicita e per campo; gli errori del backend
 * arrivano nel `errore` della schermata, e il form mantiene i valori scritti.
 *
 * Il caso «condizioni identiche a delle già rifiutate» (risposta con lo stesso
 * accordo in `REJECTED`) è letto dallo stato **della riga che torna**: la
 * rilettura della catena lo mostra rifiutato, e il messaggio dice di cambiare
 * luogo o orario.
 */

/** Luogo: tra 1 e 255 caratteri dopo trim, come vuole il contratto. */
const LIMITE_LUOGO = 255;

/** Validazione del form: `{luogo?, data?, ora?}` con i messaggi per campo. */
function validaForm(luogo, data, ora) {
  const errori = {};
  const luogoPulito = luogo.trim();
  if (luogoPulito.length < 1 || luogoPulito.length > LIMITE_LUOGO) {
    errori.luogo = 'Scrivi un luogo di 1–255 caratteri.';
  }
  if (!validaData(data)) {
    errori.data = 'Data non valida: usa il formato AAAA-MM-GG.';
  }
  if (!validaOra(ora)) {
    errori.ora = 'Ora non valida: usa il formato HH:MM.';
  }
  return errori;
}

function RigaCondizioni({ condizioni, azioneInCorso, onDecidiCondizioni }) {
  const t = useTokens();
  const decisa = condizioni.stato !== STATI_CONDIZIONI.IN_ATTESA;
  const miaDaDecidere = condizioni.sonoBeneficiario && !decisa;
  const inCorso =
    azioneInCorso?.tipo === 'decidiCondizioni' && azioneInCorso.idRiga === condizioni.id;

  return (
    <View
      style={{
        borderColor: t.border,
        borderWidth: 1,
        borderRadius: 12,
        padding: space.md,
        gap: space.xs,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
        <AppText style={{ fontWeight: '600' }}>
          {`${nomePersona(condizioni.provider)} → ${nomePersona(condizioni.beneficiario)}`}
        </AppText>
        <Chip background={t.background}>
          <AppText variant="caption" style={{ color: t.textSecondary }}>
            {etichettaStatoCondizioni(condizioni.stato) ?? 'Stato sconosciuto'}
          </AppText>
        </Chip>
      </View>
      {condizioni.luogo ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Ionicons name="location-outline" size={14} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {condizioni.luogo}
          </AppText>
        </View>
      ) : null}
      {condizioni.inizio ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
          <Ionicons name="time-outline" size={14} color={t.textSecondary} />
          <AppText variant="small" tone="secondary" style={{ flexShrink: 1 }}>
            {`Inizio: ${formattaDataOra(condizioni.inizio) ?? condizioni.inizio}`}
          </AppText>
        </View>
      ) : null}

      {miaDaDecidere ? (
        <View style={{ flexDirection: 'row', gap: space.sm, flexWrap: 'wrap', marginTop: space.xs }}>
          <AppButton
            label="Accetta le condizioni"
            icon="checkmark-outline"
            loading={inCorso}
            onPress={() => onDecidiCondizioni(condizioni.id, 'ACCETTA')}
            accessibilityLabel="Accetta le condizioni proposte per il servizio che riceverai"
          />
          <AppButton
            label="Rifiuta"
            variant="secondary"
            icon="close-outline"
            onPress={() => onDecidiCondizioni(condizioni.id, 'RIFIUTA')}
            accessibilityLabel="Rifiuta le condizioni proposte: chi le ha proposte potrà proporne delle nuove"
          />
        </View>
      ) : null}

      {condizioni.sonoProvider && !decisa ? (
        <AppText variant="small" tone="secondary">
          In attesa della risposta di {nomePersona(condizioni.beneficiario)}.
        </AppText>
      ) : null}
    </View>
  );
}

function FormCondizioni({ catena, azioneInCorso, onProponi }) {
  const t = useTokens();
  const [luogo, setLuogo] = useState('');
  const [data, setData] = useState('');
  const [ora, setOra] = useState('');
  const [errori, setErrori] = useState({});

  // Il mio arco da provider: il partecipante che sono io offre al suo
  // `offreAChiave`, se il backend l'ha dichiarato. Senza verso, nessun form:
  // il destinatario non si deduce.
  const io = catena.partecipanti.find((partecipante) => partecipante.sonoIo);
  const destinatario = io?.offreAChiave
    ? catena.partecipanti.find((partecipante) => partecipante.chiave === io.offreAChiave)
    : null;

  // Le condizioni del mio arco da provider, divise per stato: con una in attesa
  // o accettata il backend rifiuterebbe una nuova proposta con `409`, quindi il
  // form non si propone. Le **accettate** però hanno già una risposta: non sono
  // «in attesa» e vogliono un riscontro di completamento, non l'attesa (P58).
  const condizioniSulMioArco = destinatario
    ? catena.condizioni.filter((condizioni) => condizioni.sonoProvider)
    : [];
  const condizioniInAttesaSulMioArco = condizioniSulMioArco.filter(
    (condizioni) => condizioni.stato === STATI_CONDIZIONI.IN_ATTESA,
  );
  const condizioniAccettateSulMioArco = condizioniSulMioArco.filter(
    (condizioni) => condizioni.stato === STATI_CONDIZIONI.ACCETTATE,
  );
  const condizioniRifiutateSulMioArco = condizioniSulMioArco.filter(
    (condizioni) => condizioni.stato === STATI_CONDIZIONI.RIFIUTATE,
  );

  if (!destinatario) {
    return (
      <AppText variant="small" tone="secondary">
        Chi offre cosa a chi non è ancora stato comunicato: le condizioni si propongono quando il
        verso del tuo servizio è dichiarato.
      </AppText>
    );
  }

  function invia() {
    const erroriTrovati = validaForm(luogo, data, ora);
    setErrori(erroriTrovati);
    if (Object.keys(erroriTrovati).length > 0) {
      return;
    }
    const inizio = aOraLocaleIso(data, ora);
    if (inizio === null) {
      setErrori({ data: 'Data o ora non valide.' });
      return;
    }
    onProponi({
      recipientUserId: destinatario.persona.id,
      location: luogo.trim(),
      startAt: inizio,
    });
  }

  return (
    <View style={{ gap: space.sm }}>
      {condizioniAccettateSulMioArco.length > 0 ? (
        <AppText variant="small" style={{ color: t.successText }}>
          {`Le condizioni sono state accettate da ${nomePersona(destinatario.persona)}: luogo e orario sono confermati.`}
        </AppText>
      ) : condizioniInAttesaSulMioArco.length > 0 ? (
        <AppText variant="small" tone="secondary">
          Le tue condizioni sono in attesa della risposta di{' '}
          {nomePersona(destinatario.persona)}: nessuna azione finché non decide.
        </AppText>
      ) : (
        <>
          {condizioniRifiutateSulMioArco.length > 0 ? (
            <AppText variant="small" style={{ color: t.danger }}>
              Le condizioni precedenti sono state rifiutate: proponi un luogo o un orario diversi.
            </AppText>
          ) : null}
          <AppInput
            label={`Luogo per ${nomePersona(destinatario.persona)}`}
            value={luogo}
            onChangeText={(testo) => setLuogo(testo)}
            placeholder="Dove si svolge lo scambio?"
            maxLength={LIMITE_LUOGO}
            error={errori.luogo}
            editable={azioneInCorso === null}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Data di inizio (AAAA-MM-GG)"
                value={data}
                onChangeText={(testo) => setData(testo)}
                placeholder="2026-10-04"
                keyboardType="numbers-and-punctuation"
                error={errori.data}
                editable={azioneInCorso === null}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppInput
                label="Ora (HH:MM)"
                value={ora}
                onChangeText={(testo) => setOra(testo)}
                placeholder="14:00"
                keyboardType="numbers-and-punctuation"
                error={errori.ora}
                editable={azioneInCorso === null}
              />
            </View>
          </View>
          <AppButton
            label="Proponi le condizioni"
            icon="chatbubble-ellipses-outline"
            loading={azioneInCorso?.tipo === 'proponiCondizioni'}
            onPress={invia}
            accessibilityLabel="Proponi le condizioni di luogo e orario per il tuo servizio"
            style={{ alignSelf: 'flex-start' }}
          />
        </>
      )}
    </View>
  );
}

export function SezioneCondizioni({ catena, azioneInCorso, onProponi, onDecidiCondizioni, onConfermaRicezione }) {
  const t = useTokens();
  if (catena?.vista !== VISTE.CATENA.CONFERMATA) {
    return null;
  }

  const prestazioniDaRicevere = catena.prestazioni.filter(
    (prestazione) => prestazione.ricevutoIl === null,
  );

  return (
    <Card>
      <View style={{ gap: space.md }}>
        <AppText variant="heading">Le condizioni dello scambio</AppText>

        {catena.condizioni.length === 0 ? (
          <AppText variant="small" tone="secondary">
            Nessuna condizione proposta: chi deve fornire il servizio propone luogo e orario.
          </AppText>
        ) : (
          <View style={{ gap: space.sm }}>
            {catena.condizioni.map((condizioni) => (
              <RigaCondizioni
                key={condizioni.chiave}
                condizioni={condizioni}
                azioneInCorso={azioneInCorso}
                onDecidiCondizioni={onDecidiCondizioni}
              />
            ))}
          </View>
        )}

        <FormCondizioni
          catena={catena}
          azioneInCorso={azioneInCorso}
          onProponi={onProponi}
        />

        <View style={{ gap: space.sm }}>
          <AppText variant="heading">Le prestazioni</AppText>
          {catena.prestazioni.length === 0 ? (
            <AppText variant="small" tone="secondary">
              Le prestazioni compaiono quando le condizioni vengono accettate.
            </AppText>
          ) : (
            <View style={{ gap: space.xs }}>
              {catena.prestazioni.map((prestazione) => (
                <View
                  key={prestazione.chiave}
                  style={{
                    borderColor: t.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: space.md,
                    gap: space.xs,
                  }}
                >
                  <AppText style={{ fontWeight: '600' }}>
                    {`${nomePersona(prestazione.provider)} → ${nomePersona(prestazione.beneficiario)}`}
                  </AppText>
                  {prestazione.ricevutoIl ? (
                    <AppText variant="small" style={{ color: t.successText }}>
                      {`Ricevuto il ${formattaDataOra(prestazione.ricevutoIl) ?? prestazione.ricevutoIl}`}
                    </AppText>
                  ) : prestazione.sonoBeneficiario ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                      <Ionicons name="hand-left-outline" size={15} color={t.textSecondary} />
                      <AppButton
                        label="Conferma ricezione"
                        icon="checkmark-done-outline"
                        loading={
                          azioneInCorso?.tipo === 'confermaRicezione' &&
                          azioneInCorso.idRiga === prestazione.id
                        }
                        onPress={() => onConfermaRicezione(prestazione.id)}
                        accessibilityLabel="Conferma di aver ricevuto il servizio atteso"
                        style={{ alignSelf: 'flex-start' }}
                      />
                    </View>
                  ) : (
                    <AppText variant="small" tone="secondary">
                      In attesa che {nomePersona(prestazione.beneficiario)} confermi la ricezione.
                    </AppText>
                  )}
                </View>
              ))}
            </View>
          )}
          {prestazioniDaRicevere.length > 0 ? (
            <AppText variant="small" tone="secondary">
              Quando tutte le ricezioni sono confermate, la catena si conclude: le ricevute vanno
              bene in qualsiasi ordine.
            </AppText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

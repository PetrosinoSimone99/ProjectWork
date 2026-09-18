import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';
import { ApiError } from '@/api/client';
import { AVVISO_DEMO, USA_DATI_FINTI } from '@/api/config';
import {
  aggiornaPubblicazione,
  cambiaStatoPubblicazione,
  creaPubblicazione,
  eliminaPubblicazione,
  ottieniCategorie,
  ottieniPubblicazioni,
} from '@/api/barattolo';
import {
  STATI_PUBBLICAZIONE,
  TIPI_VOCE,
  aggiornaVoce,
  nuovaVoce,
  senzaChiave,
  validaVoce,
} from '@/servizi/offerta-ricerca';
import { useAggiornamento } from '@/hooks/useAggiornamento';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/AppText';
import { AppButton } from '@/components/AppButton';
import { Banner } from '@/components/Banner';
import { Card } from '@/components/Card';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ModalConferma } from '@/components/ModalConferma';
import { SezionePubblicazioni, SEZIONI_PUBBLICAZIONI } from '@/components/SezionePubblicazioni';
import { space, useTokens } from '@/theme/tokens';

/**
 * Offro e cerco: pubblica e gestisci le proprie offerte e ricerche.
 *
 * Le voci hanno la **stessa forma della registrazione** (categoria + mansione +
 * «da remoto»), più la località dell'annuncio; la forma del dato e le sue regole
 * vivono in `src/servizi/offerta-ricerca.js` e non si ridichiarano qui. Il form
 * di pubblicazione è uno solo (`FormVoceServizio`) e serve creazione e modifica.
 *
 * L'elenco non ha una copia locale come verità: dopo ogni scrittura riuscita si
 * richiama `carica()`, così «ho pubblicato e non lo vedo» non esiste per
 * costruzione. I Banner di esito sono l'unica scrittura ottimistica.
 */

/** Il testo del Banner di esito, con la parola giusta per il tipo di voce. */
function testoEsito(azione, tipo) {
  const nome = tipo === TIPI_VOCE.OFFERTA ? 'Offerta' : 'Ricerca';
  switch (azione) {
    case 'creata':
      return `${nome} pubblicata.`;
    case 'aggiornata':
      return 'Modifica salvata.';
    case 'sospesa':
      return `${nome} sospesa: non è più visibile agli altri.`;
    case 'ripubblicata':
      return `${nome} di nuovo pubblicata.`;
    case 'eliminata':
      return `${nome} eliminata.`;
    default:
      return '';
  }
}

/** Il messaggio della Card quando le categorie non sono utilizzabili. */
function messaggioCategorie(stato, dettaglio) {
  if (stato === 'caricamento') {
    return 'Sto caricando le categorie: servono per pubblicare e per modificare.';
  }
  if (stato === 'vuoto') {
    return 'Non ci sono categorie disponibili.';
  }
  return `Non riesco a caricare le categorie: senza, non posso farti pubblicare né modificare.${
    dettaglio ? ` ${dettaglio}` : ''
  }`;
}

/** Il testo della conferma di eliminazione, con l'avviso quando è l'ultima voce. */
function messaggioEliminazione(voce, ultimaDelTipo) {
  if (!voce) {
    return '';
  }
  const avviso = ultimaDelTipo
    ? voce.tipo === TIPI_VOCE.OFFERTA
      ? ' Senza offerte non entri nel match: potrai pubblicarne una nuova quando vuoi.'
      : ' Senza ricerche non entri nel match: potrai pubblicarne una nuova quando vuoi.'
    : '';
  return `${voce.mansione.trim() || 'Questa voce'} sparisce dall'elenco e non si recupera. Gli accordi già avviati non cambiano.${avviso}`;
}

export default function OffroECercoScreen() {
  const { token, utente } = useAuth();
  const t = useTokens();

  const [pubblicazioni, setPubblicazioni] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroreElenco, setErroreElenco] = useState(null);

  const [categorie, setCategorie] = useState([]);
  const [statoCategorie, setStatoCategorie] = useState('caricamento');
  const [erroreCategorie, setErroreCategorie] = useState(null);

  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [erroreForm, setErroreForm] = useState(null);
  const [salvataggio, setSalvataggio] = useState(false);

  const [azioneInCorso, setAzioneInCorso] = useState(null);
  const [eliminazione, setEliminazione] = useState(null);
  const [esito, setEsito] = useState(null);

  const carica = useCallback(async () => {
    if (!token || !utente) {
      return;
    }
    setLoading(true);
    setErroreElenco(null);
    try {
      setPubblicazioni(await ottieniPubblicazioni(token, utente.id));
    } catch (err) {
      setErroreElenco(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [token, utente]);

  const caricaCategorie = useCallback(async () => {
    try {
      const elenco = await ottieniCategorie(token);
      setCategorie(elenco);
      setStatoCategorie(elenco.length > 0 ? 'pronto' : 'vuoto');
      setErroreCategorie(null);
    } catch (err) {
      setCategorie([]);
      setStatoCategorie('errore');
      setErroreCategorie(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    }
  }, [token]);

  // Si ricarica a ogni ritorno sulla scheda, come le altre schermate-elenco:
  // al ritorno da un'altra parte i dati devono essere quelli veri, non quelli di prima.
  useFocusEffect(
    useCallback(() => {
      void carica();
      void caricaCategorie();
    }, [carica, caricaCategorie]),
  );

  const ricaricaTutto = useCallback(async () => {
    await Promise.all([carica(), caricaCategorie()]);
  }, [carica, caricaCategorie]);

  const { refreshing, onRefresh } = useAggiornamento(ricaricaTutto);

  const categoriePronte = statoCategorie === 'pronto';
  const lista = pubblicazioni ?? [];
  const offerte = lista.filter((voce) => voce.tipo === TIPI_VOCE.OFFERTA);
  const ricerche = lista.filter((voce) => voce.tipo === TIPI_VOCE.RICERCA);

  /** Riprova delle categorie: si torna allo stato di caricamento e si richiede. */
  function riprovaCategorie() {
    setStatoCategorie('caricamento');
    setErroreCategorie(null);
    void caricaCategorie();
  }

  function apriNuova(tipo) {
    setEsito(null);
    setErroreForm(null);
    setFieldErrors({});
    // La località nasce da quella della persona, se la sessione la conosce:
    // è la stessa persona, e cambiarla resta un tocco.
    const vuota = nuovaVoce(tipo);
    setForm({
      tipo,
      voce: utente?.localita ? aggiornaVoce(vuota, 'localita', utente.localita) : vuota,
    });
  }

  function apriModifica(voce) {
    setEsito(null);
    setErroreForm(null);
    setFieldErrors({});
    // Copia: «Annulla» scarta senza lasciare modifiche a metà.
    setForm({ tipo: voce.tipo, voce: { ...voce } });
  }

  function cambiaCampoForm(campo, valore) {
    setForm((corrente) =>
      corrente ? { ...corrente, voce: aggiornaVoce(corrente.voce, campo, valore) } : corrente,
    );
    // L'errore del campo sparisce appena lo si corregge: resterebbe rosso
    // proprio mentre l'utente sta sistemando il dato.
    setFieldErrors((correnti) => senzaChiave(correnti, campo));
  }

  function annullaForm() {
    setForm(null);
    setFieldErrors({});
    setErroreForm(null);
  }

  async function salva() {
    if (!form || !token || !utente) {
      return;
    }
    const errori = validaVoce(form.voce, categorie);
    setFieldErrors(errori);
    if (Object.keys(errori).length > 0) {
      return;
    }

    setErroreForm(null);
    setSalvataggio(true);
    const inModifica = Number.isInteger(form.voce.id);
    try {
      if (inModifica) {
        await aggiornaPubblicazione(token, utente.id, form.voce);
      } else {
        await creaPubblicazione(token, utente.id, form.voce);
      }
      setEsito(testoEsito(inModifica ? 'aggiornata' : 'creata', form.tipo));
      setForm(null);
      setFieldErrors({});
      await carica();
    } catch (err) {
      // Il form non si svuota: i dati digitati restano.
      setErroreForm(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setSalvataggio(false);
    }
  }

  /** Una scrittura su una voce esistente: azione, esito, poi si rilegge l'elenco. */
  async function eseguiAzione(voce, nome, azione, messaggio) {
    if (!token || !utente) {
      return;
    }
    setEsito(null);
    setErroreElenco(null);
    setAzioneInCorso({ id: voce.id, nome });
    try {
      await azione();
      setEsito(messaggio);
      await carica();
    } catch (err) {
      setErroreElenco(err instanceof ApiError ? err.message : 'Errore imprevisto. Riprova.');
    } finally {
      setAzioneInCorso(null);
    }
  }

  function cambiaStato(voce) {
    const sospesa = voce.stato === STATI_PUBBLICAZIONE.SOSPESA;
    const nuovoStato = sospesa ? STATI_PUBBLICAZIONE.PUBBLICATA : STATI_PUBBLICAZIONE.SOSPESA;
    void eseguiAzione(
      voce,
      'stato',
      () => cambiaStatoPubblicazione(token, utente.id, voce.id, voce.tipo, nuovoStato),
      testoEsito(sospesa ? 'ripubblicata' : 'sospesa', voce.tipo),
    );
  }

  async function confermaEliminazione() {
    const voce = eliminazione;
    if (!voce) {
      return;
    }
    await eseguiAzione(
      voce,
      'elimina',
      () => eliminaPubblicazione(token, utente.id, voce.id, voce.tipo),
      testoEsito('eliminata', voce.tipo),
    );
    setEliminazione(null);
  }

  // Spinner a schermo pieno solo al primo caricamento: i ricarichi successivi
  // (focus della scheda, pull-to-refresh) lasciano il contenuto a schermo.
  if (loading && pubblicazioni === null) {
    return <LoadingScreen label="Carico le tue pubblicazioni…" />;
  }

  const ricaricoInCorso = loading && pubblicazioni !== null;
  const vociEliminazione = !eliminazione
    ? []
    : eliminazione.tipo === TIPI_VOCE.OFFERTA
      ? offerte
      : ricerche;

  return (
    <Screen scroll withBottomInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={{ gap: space.xs }}>
        <AppText variant="title">Offro e cerco</AppText>
        <AppText variant="small" tone="secondary">
          Le tue offerte e le tue ricerche: qui le pubblichi, le correggi e decidi quando non sono
          più visibili.
        </AppText>
      </View>

      {USA_DATI_FINTI ? (
        <Banner kind="info" message={AVVISO_DEMO} />
      ) : null}

      {esito ? <Banner kind="success" message={esito} /> : null}

      {categoriePronte ? null : (
        <Card>
          <AppText variant="small" tone="secondary">
            {messaggioCategorie(statoCategorie, erroreCategorie)}
          </AppText>
          {statoCategorie === 'caricamento' ? null : (
            <AppButton label="Riprova" variant="secondary" onPress={riprovaCategorie} />
          )}
        </Card>
      )}

      {erroreElenco ? (
        <>
          <Banner kind="error" message={erroreElenco} />
          <AppButton
            label="Riprova"
            variant="secondary"
            icon="refresh-outline"
            onPress={() => void carica()}
          />
        </>
      ) : null}

      {SEZIONI_PUBBLICAZIONI.map((sezione) => (
        <SezionePubblicazioni
          key={sezione.chiave}
          sezione={sezione}
          voci={sezione.tipo === TIPI_VOCE.OFFERTA ? offerte : ricerche}
          categorie={categorie}
          statoCategorie={statoCategorie}
          form={form}
          fieldErrors={fieldErrors}
          erroreForm={erroreForm}
          categoriePronte={categoriePronte}
          salvataggio={salvataggio}
          azioneInCorso={azioneInCorso}
          onApriNuova={() => apriNuova(sezione.tipo)}
          onCambiaCampo={cambiaCampoForm}
          onSalva={salva}
          onAnnullaForm={annullaForm}
          onModifica={apriModifica}
          onCambiaStato={cambiaStato}
          onElimina={setEliminazione}
        />
      ))}

      {ricaricoInCorso ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: space.sm }}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : null}

      <ModalConferma
        visible={eliminazione !== null}
        titolo={
          eliminazione?.tipo === TIPI_VOCE.RICERCA
            ? 'Eliminare questa ricerca?'
            : "Eliminare quest'offerta?"
        }
        messaggio={messaggioEliminazione(eliminazione, vociEliminazione.length <= 1)}
        etichettaConferma="Elimina"
        onConferma={() => void confermaEliminazione()}
        onAnnulla={() => setEliminazione(null)}
        loading={azioneInCorso?.nome === 'elimina'}
      />
    </Screen>
  );
}

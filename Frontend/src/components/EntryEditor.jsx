import { View } from 'react-native';
import { AppCheckbox } from './AppCheckbox';
import { AppInput } from './AppInput';
import { CategorySelector } from './CategorySelector';
import { LIMITE_MANSIONE, TIPI_VOCE } from '@/services/offer-request';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Una voce di «cosa offro» o «cosa cerco»: categoria + mansione. La casella
 * «da remoto» è attiva e il valore (`voce.daRemoto`) viaggia come `isRemote` nel
 * contratto (il backend lo modella dalla PR #34). Dalla registrazione si manda
 * solo `isRemote` (`api/index.js` → `aCorpoVoci`), mai `isSuspended`: una
 * voce appena creata è pubblicata.
 *
 * È un blocco singolo, non un blocco ripetibile: la regola di prodotto
 * (2026-11-11) è **una voce per tipo**, quindi la schermata ne disegna una sola
 * e si occupa di crearla quando manca e di validarla. Qui c'è solo il disegno di
 * una voce, senza stato proprio: tutto passa da `onCambia`, così una sola
 * funzione della schermata aggiorna la voce in modo immutabile.
 *
 * **Niente cestino.** Nella registrazione la voce è obbligatoria (il backend
 * rifiuta `offers`/`requests` vuoti, `AuthController::validateServices`): togliere
 * una cosa che si è costretti ad avere non è un'azione, è un giro a vuoto che
 * perde quello che è stato scritto. Le azioni distruttive sulle voci che esistono
 * vivono su «Offro e cerco», dove la card ha i suoi comandi.
 *
 * **Niente intestazione** («Cosa offri №1»): la sezione che lo contiene ha già il
 * titolo, e con una voce sola il numero non distingue niente — senza il numero
 * sarebbe la stessa riga ripetuta due volte di fila.
 *
 * I limiti e i messaggi di errore non vivono qui: arrivano da
 * `src/services/offer-request.js` (le regole) e dalla schermata (gli errori
 * già calcolati). Un componente che valida da sé è il modo più rapido per avere
 * due regole diverse nella stessa app.
 *
 * **`bloccato` è un valore che scende, non uno stato locale.** Mentre una
 * scrittura è in volo la schermata non sa più che farsene dei tocchi: il blocco
 * nasce da un unico valore derivato in cima (`offer-and-request.jsx`) e arriva
 * qui già deciso. Se ognuno dei campi decidesse da sé quando spegnersi, lo
 * stesso salvataggio avrebbe tanti giudizi quanti sono i controlli, e basterebbe
 * un campo distratto per lasciare passare una seconda scrittura. Per questo non
 * c'è nessuno `useState` del blocco: c'è solo l'inoltro ai tre controlli che
 * compongono la voce, con le prop che ognuno ha già (`disabled` sulla categoria e
 * sulla casella «da remoto», `editable` sulla mansione). Con la prop assente la
 * registrazione si comporta come prima: `EntriesSection` non la passa.
 */

const TESTI_TIPO = {
  [TIPI_VOCE.OFFERTA]: {
    titolo: 'Cosa offri',
    segnaposto: 'es. ripetizioni di analisi per il biennio',
  },
  [TIPI_VOCE.RICERCA]: {
    titolo: 'Cosa cerchi',
    segnaposto: 'es. qualcuno che mi monti una libreria',
  },
};

export function EntryEditor({
  voce,
  categorie,
  statoCategorie,
  errori = {},
  onCambia,
  bloccato = false,
  style,
}) {
  const testi = TESTI_TIPO[voce.tipo];
  const t = useTokens();

  return (
    <View
      style={[
        {
          gap: space.md,
          padding: space.md,
          borderWidth: 1,
          borderColor: t.border,
          borderRadius: radius.input,
        },
        style,
      ]}
    >
      <CategorySelector
        label="Categoria"
        categorie={categorie}
        value={voce.idCategoria}
        onChange={(idCategoria) => onCambia('idCategoria', idCategoria)}
        error={errori.idCategoria ?? null}
        stato={statoCategorie}
        disabled={bloccato}
      />

      <AppInput
        label="Mansione"
        // Il nome accessibile porta la sezione: le due voci di una schermata
        // hanno lo stesso campo visibile «Mansione», e senza questa distinzione
        // uno screen reader ne annunciava due identici (audit UX F18).
        accessibilityLabel={`Mansione — ${testi.titolo.toLowerCase()}`}
        value={voce.mansione}
        onChangeText={(mansione) => onCambia('mansione', mansione)}
        placeholder={testi.segnaposto}
        multiline
        maxLength={LIMITE_MANSIONE}
        contatore={`${voce.mansione.length}/${LIMITE_MANSIONE}`}
        error={errori.mansione ?? null}
        editable={!bloccato}
      />

      <AppCheckbox
        label="Il servizio si può svolgere da remoto"
        value={voce.daRemoto}
        onChange={(daRemoto) => onCambia('daRemoto', daRemoto)}
        disabled={bloccato}
      />
    </View>
  );
}

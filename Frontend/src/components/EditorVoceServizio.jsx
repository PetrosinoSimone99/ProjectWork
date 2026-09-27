import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// IMPORT SOSPESO: la casella «da remoto» è tolta dalla UI (decisione del titolare,
// 27 settembre 2026) finché il backend non modella il campo. Quando arriva
// (`isRemote` in `services` + contratto, vedi `temp/gruppo-2-domande/23`), si
// decommentano l'import qui sotto e il blocco `AppCheckbox` più avanti.
// import { AppCheckbox } from './AppCheckbox';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { SelettoreCategoria } from './SelettoreCategoria';
import { LIMITE_MANSIONE, TIPI_VOCE } from '@/servizi/offerta-ricerca';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Una voce di «cosa offro» o «cosa cerco»: categoria + mansione. La casella
 * «da remoto» è **sospesa** (commentata qui sotto): il contratto non modella
 * il campo e il titolare ha deciso di toglierla dalla UI finché il backend non
 * lo aggiunge (decisione 27 settembre 2026, vedi `temp/gruppo-2-domande/23`).
 * Il dato resta nel modello (`voce.daRemoto`, sempre `false` finché non c'è
 * l'input): quando il campo arriva si decommenta il blocco `AppCheckbox` qui
 * sotto e si riallinea la traduzione in `api/barattolo.js` (`aCorpoVoci`).
 *
 * È un blocco ripetibile: la schermata ne disegna da 1 a `LIMITE_VOCI` per tipo e
 * si occupa di aggiungere, togliere e validare. Qui c'è solo il disegno di una
 * voce, senza stato proprio: tutto passa da `onCambia`, così una sola funzione
 * della schermata aggiorna l'elenco in modo immutabile.
 *
 * I limiti e i messaggi di errore non vivono qui: arrivano da
 * `src/servizi/offerta-ricerca.js` (le regole) e dalla schermata (gli errori
 * già calcolati). Un componente che valida da sé è il modo più rapido per avere
 * due regole diverse nella stessa app.
 *
 * Le due prop `mostraIntestazione` e `mostraRimuovi` (entrambe attive di
 * default) servono al form di pubblicazione della schermata 2, dove la voce è
 * una sola: lì non ha senso il cestino né «Cosa offri №1». Sono additive:
 * `register.jsx` non le passa e si comporta come prima.
 */

const TESTI_TIPO = {
  [TIPI_VOCE.OFFERTA]: {
    titolo: 'Cosa offri',
    segnaposto: 'es. ripetizioni di analisi per il biennio',
    rimozione: "l'offerta",
  },
  [TIPI_VOCE.RICERCA]: {
    titolo: 'Cosa cerchi',
    segnaposto: 'es. qualcuno che mi monti una libreria',
    rimozione: 'la ricerca',
  },
};

export function EditorVoceServizio({
  voce,
  numero,
  categorie,
  statoCategorie,
  errori = {},
  rimuovibile = true,
  mostraIntestazione = true,
  mostraRimuovi = true,
  motivoNonRimuovibile = null,
  onCambia,
  onRimuovi,
  style,
}) {
  const t = useTokens();
  const testi = TESTI_TIPO[voce.tipo];
  // Nel form di pubblicazione la voce è una sola e il titolo lo dà già il form:
  // niente «№1» né cestino (lì si annulla il form, non si toglie una voce).
  const mostraRiga = mostraIntestazione || mostraRimuovi;

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
      {mostraRiga ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: mostraIntestazione ? 'space-between' : 'flex-end',
            gap: space.sm,
          }}
        >
          {mostraIntestazione ? (
            <AppText variant="small" style={{ fontWeight: '700' }}>
              {`${testi.titolo} №${numero}`}
            </AppText>
          ) : null}
          {mostraRimuovi ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Rimuovi ${testi.rimozione} ${numero}`}
              accessibilityState={{ disabled: !rimuovibile }}
              disabled={!rimuovibile}
              onPress={onRimuovi}
              hitSlop={8}
              style={{ opacity: rimuovibile ? 1 : 0.4 }}
            >
              <Ionicons name="trash-outline" size={18} color={t.danger} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <SelettoreCategoria
        label="Categoria"
        categorie={categorie}
        value={voce.idCategoria}
        onChange={(idCategoria) => onCambia('idCategoria', idCategoria)}
        error={errori.idCategoria ?? null}
        stato={statoCategorie}
      />

      <AppInput
        label="Mansione"
        value={voce.mansione}
        onChangeText={(mansione) => onCambia('mansione', mansione)}
        placeholder={testi.segnaposto}
        multiline
        maxLength={LIMITE_MANSIONE}
        contatore={`${voce.mansione.length}/${LIMITE_MANSIONE}`}
        error={errori.mansione ?? null}
      />

      {/* CASSETTA «DA REMOTO» SOSPESA — si riattiva quando il backend aggiunge
          il campo (`isRemote` su `services`, vedi `temp/gruppo-2-domande/23`):
          decommentare anche l'import di `AppCheckbox` in cima al file.
      <AppCheckbox
        label="Il servizio si può svolgere da remoto"
        value={voce.daRemoto}
        onChange={(daRemoto) => onCambia('daRemoto', daRemoto)}
      />
      */}

      {!rimuovibile && motivoNonRimuovibile ? (
        <AppText variant="small" tone="secondary">
          {motivoNonRimuovibile}
        </AppText>
      ) : null}
    </View>
  );
}

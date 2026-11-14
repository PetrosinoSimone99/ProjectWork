import { Pressable, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppCheckbox } from './AppCheckbox';
import { AppInput } from './AppInput';
import { AppText } from './AppText';
import { CategorySelector } from './CategorySelector';
import { LIMITE_MANSIONE, TIPI_VOCE } from '@/services/offer-request';
import { opacity, radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Una voce di «cosa offro» o «cosa cerco»: categoria + mansione. La casella
 * «da remoto» è attiva e il valore (`voce.daRemoto`) viaggia come `isRemote` nel
 * contratto (il backend lo modella dalla PR #34). Dalla registrazione si manda
 * solo `isRemote` (`api/index.js` → `aCorpoVoci`), mai `isSuspended`: una
 * voce appena creata è pubblicata.
 *
 * È un blocco singolo, non un blocco ripetibile: la regola di prodotto
 * (2026-11-11) è **una voce per tipo**, quindi la schermata ne disegna una sola
 * e si occupa di crearla quando manca, di validarla e di toglierla. Qui c'è solo
 * il disegno di una voce, senza stato proprio: tutto passa da `onCambia`, così
 * una sola funzione della schermata aggiorna l'elenco in modo immutabile.
 *
 * I limiti e i messaggi di errore non vivono qui: arrivano da
 * `src/services/offer-request.js` (le regole) e dalla schermata (gli errori
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

export function EntryEditor({
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
              style={{
                // 44 pt: l'icona da 18 + hitSlop 8 era 34 pt, audit UX F17.
                minWidth: target.min,
                minHeight: target.min,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: rimuovibile ? 1 : opacity.disabled,
              }}
            >
              <AppIcon name="trash-outline" size={18} color={t.danger} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <CategorySelector
        label="Categoria"
        categorie={categorie}
        value={voce.idCategoria}
        onChange={(idCategoria) => onCambia('idCategoria', idCategoria)}
        error={errori.idCategoria ?? null}
        stato={statoCategorie}
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
      />

      <AppCheckbox
        label="Il servizio si può svolgere da remoto"
        value={voce.daRemoto}
        onChange={(daRemoto) => onCambia('daRemoto', daRemoto)}
      />

      {!rimuovibile && motivoNonRimuovibile ? (
        <AppText variant="small" tone="secondary">
          {motivoNonRimuovibile}
        </AppText>
      ) : null}
    </View>
  );
}

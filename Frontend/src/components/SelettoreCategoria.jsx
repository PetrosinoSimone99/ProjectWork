import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { radius, space, useTokens } from '@/theme/tokens';

/**
 * Campo della categoria: un `Pressable` che apre la lista in un `Modal`.
 *
 * Perché non un `<select>` o un picker di sistema: nessuna libreria di picker è
 * installata e aggiungerne una richiede l'approvazione del titolare (§7 di
 * `AGENTS.md`). Il `Modal` di react-native è la stessa scelta già fatta per
 * `ModalConferma`, e funziona su web (il target della demo), Android e iOS.
 *
 * Il campo sa distinguere quattro situazioni e le dice con un testo, mai con un
 * silenzio: caricamento, lista pronta, lista vuota, errore. Negli ultimi tre casi
 * che non siano "pronta" il campo è disabilitato: una tendina che si apre su una
 * lista vuota è peggio di una tendina spenta.
 *
 * `aria-expanded` e `aria-checked` viaggiano accanto ad `accessibilityState`
 * perché su web `react-native-web` ignora `accessibilityState` e legge solo gli
 * attributi `aria-*` (su native `aria-*` ha la precedenza, quindi il valore
 * annunciato è lo stesso su tutte le piattaforme).
 */

/** Oltre questa altezza la lista diventa scomoda da scorrere in un telefono. */
const ALTEZZA_MASSIMA_LISTA = 320;

const TESTI_NON_PRONTO = {
  caricamento: 'Caricamento delle categorie…',
  vuoto: 'Nessuna categoria disponibile',
  errore: 'Categorie non disponibili',
};

export function SelettoreCategoria({
  label,
  categorie = [],
  value,
  onChange,
  error,
  stato = 'pronto',
  style,
}) {
  const t = useTokens();
  const [aperto, setAperto] = useState(false);

  const scelta = categorie.find((categoria) => Number(categoria.id) === Number(value)) ?? null;
  const selezionabile = stato === 'pronto' && categorie.length > 0;
  const testo = selezionabile
    ? scelta?.nome ?? 'Scegli una categoria'
    : TESTI_NON_PRONTO[stato] ?? TESTI_NON_PRONTO.errore;

  return (
    <View style={[{ gap: space.xs }, style]}>
      <AppText variant="small" style={{ fontWeight: '600' }}>
        {label}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${testo}`}
        accessibilityState={{ expanded: aperto, disabled: !selezionabile }}
        aria-expanded={aperto}
        disabled={!selezionabile}
        onPress={() => setAperto(true)}
        style={({ pressed }) => [
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
            minHeight: 48,
            paddingHorizontal: space.md,
            borderWidth: 1,
            borderRadius: radius.input,
            backgroundColor: pressed ? t.border : t.surface,
            borderColor: error ? t.danger : t.border,
            opacity: selezionabile ? 1 : 0.55,
          },
        ]}
      >
        <AppText style={{ flex: 1, color: scelta ? t.text : t.textSecondary }}>{testo}</AppText>
        <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
      </Pressable>

      {error ? (
        <AppText variant="small" tone="danger">
          {error}
        </AppText>
      ) : null}

      <Modal
        visible={aperto}
        transparent
        animationType="fade"
        onRequestClose={() => setAperto(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: t.overlay,
            justifyContent: 'center',
            padding: space.lg,
          }}
        >
          {/* Sfondo chiudibile, come in ModalConferma: su web `Alert` non esiste
              e il tocco fuori dal pannello è l'unico modo per annullare. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chiudi l'elenco delle categorie"
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
            onPress={() => setAperto(false)}
          />

          <Card style={{ position: 'relative', zIndex: 1 }}>
            <AppText variant="heading">Scegli una categoria</AppText>
            <ScrollView
              accessibilityRole="radiogroup"
              style={{ maxHeight: ALTEZZA_MASSIMA_LISTA }}
              contentContainerStyle={{ gap: space.xs }}
              keyboardShouldPersistTaps="handled"
            >
              {categorie.map((categoria) => {
                const attiva = Number(categoria.id) === Number(value);
                return (
                  <Pressable
                    key={categoria.id}
                    accessibilityRole="radio"
                    accessibilityLabel={categoria.nome}
                    accessibilityState={{ checked: attiva }}
                    aria-checked={attiva}
                    onPress={() => {
                      onChange(categoria.id);
                      setAperto(false);
                    }}
                    style={({ pressed }) => [
                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: space.sm,
                        paddingVertical: space.md,
                        paddingHorizontal: space.sm,
                        borderRadius: radius.input,
                        backgroundColor: pressed ? t.border : 'transparent',
                      },
                    ]}
                  >
                    <AppText style={{ color: attiva ? t.primary : t.text }}>
                      {categoria.nome}
                    </AppText>
                    {attiva ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

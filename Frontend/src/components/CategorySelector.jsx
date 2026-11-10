import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Campo della categoria: un `Pressable` che apre la lista in un `ModalShell`.
 *
 * Perché non un `<select>` o un picker di sistema: nessuna libreria di picker è
 * installata e aggiungerne una richiede l'approvazione del titolare (§7 di
 * `AGENTS.md`). Il `Modal` di react-native è la stessa scelta già fatta per
 * `ConfirmModal`, e funziona su web (il target della demo), Android e iOS.
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
 *
 * Il pannello è un `ModalShell` (X da 44 pt, Escape sul web, focus dentro) e
 * dentro c'è la stessa ricerca di `ListSelector`, perché una lista di
 * categorie lunga non si scorrerà a mano (F41). Con `etichettaAzzera` —
 * proposta facoltativa, la passa solo chi ha un filtro da azzerare, come la
 * barra filtri della home — la prima riga azzera la sola scelta
 * (`onChange(null)`, F05).
 */

/** Oltre questa altezza la lista diventa scomoda da scorrere in un telefono. */
const ALTEZZA_MASSIMA_LISTA = 320;

const TESTI_NON_PRONTO = {
  caricamento: 'Caricamento delle categorie…',
  vuoto: 'Nessuna categoria disponibile',
  errore: 'Categorie non disponibili',
};

export function CategorySelector({
  label,
  categorie = [],
  value,
  onChange,
  error,
  stato = 'pronto',
  etichettaAzzera = null,
  style,
}) {
  const t = useTokens();
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState('');

  // Filtro come in `ListSelector`: case-insensitive su sottostringa, su copia
  // (l'array ricevuto non viene toccato).
  const normalizza = (testo) => testo.toLowerCase();
  const corrispondono = categorie.filter((categoria) =>
    normalizza(categoria.nome).includes(normalizza(ricerca.trim())),
  );

  const apri = () => {
    setRicerca('');
    setAperto(true);
  };

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
        onPress={apri}
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
            borderColor: error ? t.danger : t.borderInput,
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

      <ModalShell visible={aperto} onClose={() => setAperto(false)} titolo="Scegli una categoria">
        <View style={{ gap: space.sm }}>
          {/* Ricerca come in `ListSelector`: con una lista lunga lo scorrimento
              a mano diventa una caccia (F41). */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              borderWidth: 1,
              borderRadius: radius.input,
              borderColor: t.borderInput,
              backgroundColor: t.surface,
              paddingHorizontal: space.md,
            }}
          >
            <Ionicons name="search" size={18} color={t.textSecondary} />
            <TextInput
              style={{ flex: 1, minHeight: 44, fontSize: 15, color: t.text }}
              value={ricerca}
              onChangeText={setRicerca}
              placeholder="Cerca…"
              placeholderTextColor={t.textSecondary}
              accessibilityLabel={`Cerca in ${label}`}
            />
          </View>

          <ElencoCategorie
            categorieFiltrate={corrispondono}
            value={value}
            onChange={onChange}
            etichettaAzzera={etichettaAzzera}
            onChiudi={() => setAperto(false)}
          />
        </View>
      </ModalShell>
    </View>
  );
}

/**
 * L'elenco scorrevole del pannello: la riga di azzeramento (solo quando la
 * chiamante la chiede) e le categorie che la ricerca lascia passare.
 */
function ElencoCategorie({ categorieFiltrate, value, onChange, etichettaAzzera, onChiudi }) {
  const t = useTokens();
  // La riga di azzeramento è selezionata quando non c'è scelta.
  const azzero = value === null || value === undefined || value === '';
  return (
    <ScrollView
      accessibilityRole="radiogroup"
      style={{ maxHeight: ALTEZZA_MASSIMA_LISTA }}
      contentContainerStyle={{ gap: space.xs }}
      keyboardShouldPersistTaps="handled"
    >
      {etichettaAzzera !== null ? (
        <Pressable
          key="azzera"
          accessibilityRole="radio"
          accessibilityLabel={etichettaAzzera}
          accessibilityState={{ checked: azzero }}
          aria-checked={azzero}
          onPress={() => {
            onChange(null);
            onChiudi();
          }}
          style={({ pressed }) => [
            {
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: space.sm,
              minHeight: target.min,
              paddingVertical: space.md,
              paddingHorizontal: space.sm,
              borderRadius: radius.input,
              backgroundColor: pressed ? t.border : 'transparent',
            },
          ]}
        >
          <AppText style={{ color: azzero ? t.primary : t.text }}>{etichettaAzzera}</AppText>
          {azzero ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
        </Pressable>
      ) : null}
      {categorieFiltrate.length === 0 ? (
        <AppText tone="secondary" style={{ paddingVertical: space.md }}>
          Nessun risultato.
        </AppText>
      ) : (
        categorieFiltrate.map((categoria) => {
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
                onChiudi();
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
              <AppText style={{ color: attiva ? t.primary : t.text }}>{categoria.nome}</AppText>
              {attiva ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

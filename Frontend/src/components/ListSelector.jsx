import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { ModalShell } from './ModalShell';
import { opacity, radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Selettore a tendina generico: un `Pressable` che apre un `ModalShell` con
 * campo di ricerca ed elenco scorrevole di opzioni di tipo stringa (regioni,
 * province, …).
 *
 * Perché modale + elenco e non una libreria di picker: nessuna libreria è
 * installata e aggiungerne una richiede l'approvazione del titolare (§7 di
 * `AGENTS.md`). È la stessa scelta già fatta per `CategorySelector` e
 * `ConfirmModal`: il `Modal` di react-native funziona su web (il target della
 * demo), Android e iOS. La ricerca c'è in entrambi i selettori (F41): gli
 * elenchi che lo useranno (regioni, province, categorie) sono troppo lunghi
 * per scorrerli a mano.
 *
 * Doppio canale accessibilità: `accessibilityState` **e** attributi `aria-*`
 * con lo stesso valore, perché su web `react-native-web` ignora
 * `accessibilityState` e legge solo gli `aria-*` (su native `aria-*` ha la
 * precedenza, quindi il valore annunciato è lo stesso ovunque).
 *
 * Non muta mai `opzioni`: il filtro crea un array nuovo, l'array ricevuto non
 * viene sortato né toccato.
 *
 * Con `etichettaAzzera` (la barra filtri della home) la prima riga dell'elenco
 * è l'azzeramento di quella sola scelta: `onChange('')`, il valore «non
 * scelto» di questo componente (F05).
 */

/** Oltre questa altezza la lista diventa scomoda da scorrere in un telefono. */
const ALTEZZA_MASSIMA_LISTA = 320;

export function ListSelector({
  label,
  placeholder = 'Scegli',
  valore,
  opzioni = [],
  onChange,
  disabled = false,
  errore = null,
  etichettaAzzera = null,
  style,
}) {
  const t = useTokens();
  const [aperto, setAperto] = useState(false);
  const [ricerca, setRicerca] = useState('');

  // Fallback sul vuoto, non solo su `null`: chi chiama passa `''` quando non
  // c'è scelta (registrazione), e con `??` il placeholder sparirebbe.
  const testo = valore ? valore : placeholder;

  // Filtro case-insensitive su sottostringa, su copia: `opzioni` resta intatto.
  const normalizza = (testoRiga) => testoRiga.toLowerCase();
  const corrispondono = opzioni.filter((opzione) =>
    normalizza(opzione).includes(normalizza(ricerca.trim())),
  );

  const apri = () => {
    setRicerca('');
    setAperto(true);
  };

  return (
    <View style={[{ gap: space.xs }, style]}>
      <AppText variant="small" style={{ fontWeight: '600' }}>
        {label}
      </AppText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${testo}`}
        accessibilityState={{ expanded: aperto, disabled }}
        aria-expanded={aperto}
        aria-disabled={disabled}
        disabled={disabled}
        onPress={apri}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.sm,
          minHeight: 48,
          paddingHorizontal: space.md,
          borderWidth: 1,
          borderRadius: radius.input,
          backgroundColor: pressed ? t.border : t.surface,
          borderColor: errore ? t.danger : t.borderInput,
          opacity: disabled ? opacity.disabled : 1,
        })}
      >
        <AppText style={{ flex: 1, color: valore ? t.text : t.textSecondary }}>{testo}</AppText>
        <AppIcon name="chevron-down" size={18} color={t.textSecondary} />
      </Pressable>

      {errore ? (
        <AppText variant="small" tone="danger">
          {errore}
        </AppText>
      ) : null}

      <ModalShell visible={aperto} onClose={() => setAperto(false)} titolo={label}>
        <View style={{ gap: space.sm }}>
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
            <AppIcon name="search" size={18} color={t.textSecondary} />
            <TextInput
              style={{ flex: 1, minHeight: 44, fontSize: 15, color: t.text }}
              value={ricerca}
              onChangeText={setRicerca}
              placeholder="Cerca…"
              placeholderTextColor={t.textSecondary}
              accessibilityLabel={`Cerca in ${label}`}
            />
          </View>

          <ElencoOpzioni
            opzioniFiltrate={corrispondono}
            valore={valore}
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
 * chiamante la chiede) e le opzioni che la ricerca lascia passare.
 */
function ElencoOpzioni({ opzioniFiltrate, valore, onChange, etichettaAzzera, onChiudi }) {
  const t = useTokens();
  const nessunaScelta = !valore;
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
          accessibilityState={{ checked: nessunaScelta }}
          aria-checked={nessunaScelta}
          onPress={() => {
            onChange('');
            onChiudi();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: space.sm,
            minHeight: target.min,
            paddingHorizontal: space.sm,
            borderRadius: radius.input,
            backgroundColor: pressed ? t.border : 'transparent',
          })}
        >
          <AppText
            style={{
              color: nessunaScelta ? t.primary : t.text,
              fontWeight: nessunaScelta ? '700' : '400',
            }}
          >
            {etichettaAzzera}
          </AppText>
          {nessunaScelta ? <AppIcon name="checkmark" size={18} color={t.primary} /> : null}
        </Pressable>
      ) : null}
      {opzioniFiltrate.length === 0 ? (
        <AppText tone="secondary" style={{ paddingVertical: space.md }}>
          Nessun risultato.
        </AppText>
      ) : (
        opzioniFiltrate.map((opzione) => {
          const attiva = opzione === valore;
          return (
            <Pressable
              key={opzione}
              accessibilityRole="radio"
              accessibilityLabel={opzione}
              accessibilityState={{ checked: attiva }}
              aria-checked={attiva}
              onPress={() => {
                onChange(opzione);
                onChiudi();
              }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.sm,
                minHeight: target.min,
                paddingHorizontal: space.sm,
                borderRadius: radius.input,
                backgroundColor: pressed ? t.border : 'transparent',
              })}
            >
              {/* La spunta rende la voce selezionata riconoscibile
                  anche senza colore; il peso del testo aiuta. */}
              <AppText
                style={{ color: attiva ? t.primary : t.text, fontWeight: attiva ? '700' : '400' }}
              >
                {opzione}
              </AppText>
              {attiva ? <AppIcon name="checkmark" size={18} color={t.primary} /> : null}
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

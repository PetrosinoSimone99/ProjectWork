import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from './AppText';
import { Card } from './Card';
import { radius, space, target, useTokens } from '@/theme/tokens';

/**
 * Selettore a tendina generico: un `Pressable` che apre un `Modal` con campo
 * di ricerca ed elenco scorrevole di opzioni di tipo stringa (regioni,
 * province, …).
 *
 * Perché modale + elenco e non una libreria di picker: nessuna libreria è
 * installata e aggiungerne una richiede l'approvazione del titolare (§7 di
 * `AGENTS.md`). È la stessa scelta già fatta per `SelettoreCategoria` e
 * `ModalConferma`: il `Modal` di react-native funziona su web (il target della
 * demo), Android e iOS. Rispetto a `SelettoreCategoria` c'è la ricerca, perché
 * gli elenchi che lo useranno (regioni, province) sono troppo lunghi per
 * scorrerli a mano.
 *
 * Doppio canale accessibilità: `accessibilityState` **e** attributi `aria-*`
 * con lo stesso valore, perché su web `react-native-web` ignora
 * `accessibilityState` e legge solo gli `aria-*` (su native `aria-*` ha la
 * precedenza, quindi il valore annunciato è lo stesso ovunque).
 *
 * Non muta mai `opzioni`: il filtro crea un array nuovo, l'array ricevuto non
 * viene sortato né toccato.
 */

/** Oltre questa altezza la lista diventa scomoda da scorrere in un telefono. */
const ALTEZZA_MASSIMA_LISTA = 320;

export function SelettoreElenco({
  label,
  placeholder = 'Scegli',
  valore,
  opzioni = [],
  onChange,
  disabled = false,
  errore = null,
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
          opacity: disabled ? 0.55 : 1,
        })}
      >
        <AppText style={{ flex: 1, color: valore ? t.text : t.textSecondary }}>{testo}</AppText>
        <Ionicons name="chevron-down" size={18} color={t.textSecondary} />
      </Pressable>

      {errore ? (
        <AppText variant="small" tone="danger">
          {errore}
        </AppText>
      ) : null}

      <Modal visible={aperto} transparent animationType="fade" onRequestClose={() => setAperto(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: t.overlay,
            justifyContent: 'center',
            padding: space.lg,
          }}
        >
          {/* Sfondo chiudibile, come in ModalConferma: toccare fuori dal pannello
              chiude senza selezionare. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Chiudi l'elenco di ${label}`}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 0 }}
            onPress={() => setAperto(false)}
          />

          <Card style={{ position: 'relative', zIndex: 1 }}>
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

              <ScrollView
                accessibilityRole="radiogroup"
                style={{ maxHeight: ALTEZZA_MASSIMA_LISTA }}
                contentContainerStyle={{ gap: space.xs }}
                keyboardShouldPersistTaps="handled"
              >
                {corrispondono.length === 0 ? (
                  <AppText tone="secondary" style={{ paddingVertical: space.md }}>
                    Nessun risultato.
                  </AppText>
                ) : (
                  corrispondono.map((opzione) => {
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
                          setAperto(false);
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
                        {attiva ? <Ionicons name="checkmark" size={18} color={t.primary} /> : null}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

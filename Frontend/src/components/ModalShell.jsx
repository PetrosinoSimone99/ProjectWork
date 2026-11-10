import { useEffect, useId, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { AppText } from './AppText';
import { radius, space, target, useTokens } from '@/theme/tokens';

/** Dove appoggiare il pannello: dialogo centrato, foglio in basso, pannello in alto. */
const ALLINEAMENTO = {
  center: 'center',
  bottom: 'flex-end',
  top: 'flex-start',
};

/** La larghezza del pannello non supera mai la colonna di `Screen` (560). */
const LARGHEZZA_MASSIMA = 560;

/**
 * Gli shell aperti, in ordine di apertura.
 *
 * Serve perché una conferma si apre **sopra** un altro pannello (la campanella
 * degli accordi, la scheda di revisione staff) e ogni istanza ascolta `keydown`
 * sul `document`: `stopPropagation()` non ferma gli altri listener sullo stesso
 * nodo, quindi un solo Escape chiudeva entrambi i pannelli — nella scheda di
 * revisione buttava via esito e nota già digitati. Risponde solo l'ultimo
 * aperto.
 */
const pilaAperta = [];

/**
 * L'involucro unico dei pannelli modali.
 *
 * Prima di questo componente ogni pannello (dettaglio servizio, conferma,
 * selettore di categoria, selettore di regione, campanella degli accordi,
 * scheda di revisione staff) ricostruiva da sé sfondo, chiusura e modo di
 * uscire: quattro modi diversi di chiudere lo stesso tipo di pannello (audit UX
 * F38) e, su web, tre difetti che nessuno di loro poteva correggere da solo —
 * `onRequestClose` non scatta mai (F15), il focus resta fuori dal pannello e lo
 * sfondo è annunciato come un pulsante (F16).
 *
 * Contratto:
 * - `visible` + `onClose` — obbligatori;
 * - `titolo` (facoltativo) diventa l'intestazione del pannello e il nome del
 *   dialogo per le tecnologie assistive; `descrizione` è la riga sotto;
 * - `footer` è la riga delle azioni (di solito due `AppButton`); senza footer
 *   il pannello ha solo l'intestazione e il contenuto;
 * - `align` sceglie il punto di appoggio, `pannelloStyle`/`contenitoreStyle`
 *   coprono i casi che devono ancora posizionarsi da soli (la campanella, che
 *   si apre sopra il proprio pulsante);
 * - `chiudibile = false` toglie Escape, sfondo e X mentre una chiamata è in
 *   corso: il pannello non si può lasciare a metà.
 */
export function ModalShell({
  visible,
  onClose,
  titolo,
  descrizione,
  children,
  footer = null,
  etichettaChiudi = 'Chiudi',
  align = 'center',
  chiudibile = true,
  larghezzaMassima = LARGHEZZA_MASSIMA,
  pannelloStyle,
  contenitoreStyle,
}) {
  const t = useTokens();
  const idIstanza = `pannello-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const idTitolo = `${idIstanza}-titolo`;
  const pannelloRef = useRef(null);
  const chiudiSePossibile = chiudibile ? onClose : undefined;

  // Chi è aperto, e in che ordine: l'effetto dichiarato prima dell'ascoltatore,
  // così al primo `keydown` la pila è già aggiornata.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    pilaAperta.push(idIstanza);
    return () => {
      const indice = pilaAperta.lastIndexOf(idIstanza);
      if (indice !== -1) {
        pilaAperta.splice(indice, 1);
      }
    };
  }, [visible, idIstanza]);

  // Escape sul web: `onRequestClose` è la strada documentata di React Native ma
  // su web non arriva al `Modal` (verificato nell'audit, F15).
  useEffect(() => {
    if (!visible || !chiudibile) {
      return undefined;
    }
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }
    const onKeyDown = (event) => {
      if (event.key !== 'Escape' && event.key !== 'Esc') {
        return;
      }
      // Solo il pannello in cima risponde: senza questo, un Escape chiudeva la
      // conferma **e** il pannello sotto.
      if (pilaAperta[pilaAperta.length - 1] !== idIstanza) {
        return;
      }
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, chiudibile, onClose, idIstanza]);

  // Focus dentro il pannello all'apertura (WCAG 2.4.3): sul web il focus va sul
  // contenitore, che ha `tabIndex={-1}` e quindi si legge dal primo elemento; da
  // nativo si sposta il focus assistivo.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const timer = setTimeout(() => {
      if (Platform.OS === 'web') {
        pannelloRef.current?.focus?.();
        return;
      }
      const nodo = findNodeHandle(pannelloRef.current);
      if (nodo) {
        AccessibilityInfo.setAccessibilityFocus(nodo);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={chiudiSePossibile}
    >
      <View
        style={[
          {
            flex: 1,
            backgroundColor: t.overlay,
            justifyContent: ALLINEAMENTO[align],
            padding: space.lg,
          },
          contenitoreStyle,
        ]}
      >
        {/* Sfondo toccabile ma **fuori** dall'albero di accessibilità: non è un
            controllo, è la stessa uscita della X (F16). */}
        <Pressable
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          focusable={false}
          disabled={!chiudibile}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        />

        <View
          ref={pannelloRef}
          accessibilityViewIsModal
          role="dialog"
          aria-modal
          aria-labelledby={titolo ? idTitolo : undefined}
          tabIndex={-1}
          style={[
            {
              width: '100%',
              maxWidth: larghezzaMassima,
              backgroundColor: t.surface,
              borderColor: t.border,
              borderWidth: 1,
              borderRadius: radius.card,
              padding: space.lg,
              gap: space.md,
            },
            pannelloStyle,
          ]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.sm }}>
            <View style={{ flex: 1, gap: space.xs }}>
              {titolo ? (
                <AppText variant="heading" nativeID={idTitolo}>
                  {titolo}
                </AppText>
              ) : null}
              {descrizione ? (
                <AppText variant="small" tone="secondary">
                  {descrizione}
                </AppText>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={etichettaChiudi}
              onPress={chiudiSePossibile}
              disabled={!chiudibile}
              // 44 pt: era 38 nel dettaglio servizio, 34 altrove (F17).
              style={({ pressed }) => ({
                width: target.min,
                height: target.min,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.pill,
                marginTop: -space.sm,
                marginRight: -space.sm,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <AppIcon name="close" size={20} color={t.textSecondary} label={etichettaChiudi} />
            </Pressable>
          </View>

          {children}

          {footer ? <View style={{ gap: space.sm }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

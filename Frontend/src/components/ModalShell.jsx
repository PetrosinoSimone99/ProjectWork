import { useEffect, useId, useRef } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
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
 * Quota massima dell'altezza della finestra che il pannello può occupare (audit
 * UX F70): oltre, il pannello non lascia vedere che sotto c'è una pagina, e il
 * fuori non si distingue più dall'interfaccia. Il resto lo scorre il corpo.
 */
const QUOTA_ALTEZZA_PANNELLO = 0.85;

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
 * Ciò che il trap del Tab considera raggiungibile, nell'ordine del DOM.
 *
 * Elenco esplicito: gli elementi interattivi nativi non dichiarano `tabindex` e
 * sono comunque fermate del Tab, quindi non basta `[tabindex]`. `[tabindex="-1"]`
 * resta fuori perché non è una fermata (il pannello stesso lo usa per ricevere
 * il focus all'apertura), `[disabled]` perché non riceve focus,
 * `[aria-hidden="true"]` perché non viene letto.
 */
const FOCUSABLE_SELECTOR = [
  '[tabindex]:not([tabindex="-1"])',
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
]
  .map((part) => `${part}:not([disabled]):not([aria-hidden="true"])`)
  .join(', ');

/** I focusabili dentro il pannello: nessuno se il nodo non ha un DOM (nativo). */
function focusablesIn(node) {
  if (!node || typeof node.querySelectorAll !== 'function') {
    return [];
  }
  return Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR));
}

/**
 * Tiene il Tab dentro il pannello: dall'ultimo si torna al primo, dal primo
 * all'indietro si va all'ultimo, e da fuori si entra dal lato giusto. Senza
 * focusabili il pannello prende il focus, che è comunque meglio dello sfondo.
 * `preventDefault()` solo quando il focus lo spostiamo noi: il resto dell'ordine
 * naturale resta quello del browser.
 */
function keepTabInside(event, panel) {
  const focusables = focusablesIn(panel);
  if (focusables.length === 0) {
    event.preventDefault();
    panel.focus?.();
    return;
  }
  const active = document.activeElement;
  const inside = panel.contains(active);
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (!inside || active === first || active === panel) {
      event.preventDefault();
      last.focus();
    }
    return;
  }
  if (!inside || active === last || active === panel) {
    event.preventDefault();
    first.focus();
  }
}

/** Riporta il focus su un nodo se esiste ancora nel documento. */
function restoreFocus(node) {
  if (!node || typeof node.focus !== 'function' || !document.contains(node)) {
    return;
  }
  node.focus();
}

/**
 * L'involucro unico dei pannelli modali.
 *
 * Prima di questo componente ogni pannello (dettaglio servizio, conferma,
 * selettore di categoria, selettore di località, campanella degli accordi,
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
 * - il pannello non supera l'85 % dell'altezza della finestra e **solo il corpo
 *   scorre** (audit UX F70): intestazione e azioni restano ferme, così il
 *   comando non scappa via insieme al testo che si sta leggendo;
 * - `align` sceglie il punto di appoggio — il pannello resta centrato in
 *   orizzontale, `align` muove solo la verticale — `pannelloStyle` /
 *   `contenitoreStyle` coprono i casi che devono ancora posizionarsi da soli
 *   (la campanella, che si apre sopra il proprio pulsante);
 * - `chiudibile = false` toglie Escape, sfondo e X mentre una chiamata è in
 *   corso: il pannello non si può lasciare a metà.
 *
 * Focus (WCAG 2.4.3 e 2.1.2), sul web: all'apertura il focus va sul pannello,
 * il Tab resta dentro e alla chiusura torna sul nodo che ce l'aveva prima, se è
 * ancora nel documento. Il trap è esplicito e vive qui invece di spegnere lo
 * sfondo con `inert`: `react-native-web` monta il `Modal` in un portale sotto
 * `document.body`, quindi «inert tutto il resto» vorrebbe dire spegnere ogni
 * altro figlio di `body`, radici di Expo Router comprese, e un selettore
 * sbagliato spegnerebbe anche il pannello. Da nativo non si tocca il DOM: il
 * focus lo sposta `AccessibilityInfo.setAccessibilityFocus`.
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
  const { height: altezzaFinestra } = useWindowDimensions();
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

  // Escape e Tab sul web: `onRequestClose` è la strada documentata di React
  // Native ma su web non arriva al `Modal` (verificato nell'audit, F15); il Tab
  // invece uscirebbe dal pannello e finirebbe sulla pagina coperta.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return undefined;
    }
    const onKeyDown = (event) => {
      // Solo il pannello in cima risponde: senza questo, un Escape chiudeva la
      // conferma **e** il pannello sotto.
      if (pilaAperta[pilaAperta.length - 1] !== idIstanza) {
        return;
      }
      // Il trap resta anche a pannello non chiudibile: il lavoro è in corso, ma
      // il focus non deve comunque scappare sulla pagina dietro.
      if (event.key === 'Tab') {
        if (pannelloRef.current) {
          keepTabInside(event, pannelloRef.current);
        }
        return;
      }
      if (event.key !== 'Escape' && event.key !== 'Esc') {
        return;
      }
      if (!chiudibile) {
        return;
      }
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [visible, chiudibile, onClose, idIstanza]);

  // Focus dentro il pannello all'apertura e di nuovo sul comando che l'ha
  // aperto alla chiusura (WCAG 2.4.3): sul web il focus va sul contenitore, che
  // ha `tabIndex={-1}` e quindi si legge dal primo elemento; da nativo si sposta
  // il focus assistivo e il DOM non si tocca.
  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const isWeb = Platform.OS === 'web' && typeof document !== 'undefined';
    // Letto prima del timer: dentro il timer il focus è già nel pannello.
    const previousFocus = isWeb ? document.activeElement : null;
    const timer = setTimeout(() => {
      if (isWeb) {
        pannelloRef.current?.focus?.();
        return;
      }
      const nodo = findNodeHandle(pannelloRef.current);
      if (nodo) {
        AccessibilityInfo.setAccessibilityFocus(nodo);
      }
    }, 0);
    return () => {
      clearTimeout(timer);
      if (isWeb) {
        restoreFocus(previousFocus);
      }
    };
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
            // Il pannello è largo al massimo quanto la colonna e `width: '100%'`:
            // senza `alignItems` il figlio si appoggia al bordo iniziale della
            // riga, quindi su uno schermo largo il foglio restava incollato a
            // sinistra con l'overlay vuoto a destra, fuori dalla colonna da cui
            // era partito (audit UX F2). Chi ha un appoggio suo (la campanella)
            // lo dichiara in `contenitoreStyle`.
            alignItems: 'center',
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
              maxHeight: altezzaFinestra * QUOTA_ALTEZZA_PANNELLO,
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
                // `level={1}`: il pannello è un contesto a sé, il suo titolo è
                // la radice della gerarchia dentro il dialogo (F51).
                <AppText variant="heading" level={1} nativeID={idTitolo}>
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
              {/* L'icona è decorativa: il nome sta sul `Pressable` che riceve il
                  tocco. Con lo stesso `label` su entrambi il controllo si
                  annunciava due volte (audit F54). */}
              <AppIcon name="close" size={20} color={t.textSecondary} />
            </Pressable>
          </View>

          {/* Il corpo è l'unica parte che scorre: `flexShrink` gli permette di
              cedere altezza quando il contenuto supera `maxHeight`, mentre
              intestazione e footer restano dove sono (F70). Il `gap` interno
              tiene la distanza fra i figli che prima dava il pannello. */}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: space.md }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          {footer ? <View style={{ gap: space.sm }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

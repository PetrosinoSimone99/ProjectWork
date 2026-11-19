# Lavori indicati dopo la demo (aperti)

Voci nate guardando l'app in funzione dopo il ciclo di remediation. Ognuna ha la
forma di un finding: dove, cosa si vede, cosa deve vedersi, come si verifica.
Non sono misure (`measure-residuals.md`) e non sono passi già fatti (`plan.md`):
sono il prossimo ciclo.

## F1 — `Crediti disponibili` è testo nudo

**Dove.** `Frontend/src/app/(tabs)/match.jsx:240`:

```jsx
{profile !== null ? <AppText variant="small">{`Crediti disponibili: ${profile.crediti ?? 0}`}</AppText> : null}
```

**Cosa si vede.** Una riga di testo piccolo, grigia, senza superficie, senza
icona, appoggiata fra due blocchi. È il numero che decide se l'azione principale
della schermata può partire, e sembra una nota a piè di pagina: è il dato più
importante di `/match` e visivamente è il più debole. Chi guarda la schermata non
sa se quel numero è un'informazione, un avviso o un residuo.

**Cosa deve vedersi.** Un **marchio di dato**, non una frase:

- una riga sola con icona (`ticket-outline`) + etichetta `Crediti disponibili`
  (`AppText variant="small" tone="secondary"`) + valore in evidenza
  (`variant="label"`, `fontWeight: '600'`, `fontVariant: ['tabular-nums']` così
  due saldi diversi hanno la stessa larghezza);
- sfondo `t.background` con `radius.input` e `paddingHorizontal: space.sm`,
  `minHeight: target.min`, allineata a sinistra come i marchi delle card;
- **nessun accento**: il credito non è l'azione primaria e la regola dell'accento
  resta su `Richiedi` (DESIGN.md, lista chiusa). Se serve un segnale quando il
  saldo è zero, è testo (`t.danger`) e una frase che dice cosa fare, non un
  riempimento colorato.

**Vincoli.** Il numero resta `balance` (`profile.crediti ?? 0`), la stessa
sorgente che legge la conferma (`:262`): due numeri diversi nella stessa
schermata sarebbero due verità. Nessun cambio di comportamento: non si tocca
`askRequestConfirm`, `hasCredit` né `CreateQueueActions`. Solo `match.jsx`.

**Verifica.** `npx expo lint && npx tsc --noEmit && npx jest src/app --bail`
verdi; sull'export statico, a 375 e 412, il saldo si legge a colpo d'occhio fra
il titolo e le due azioni, allineato a sinistra, con l'etichetta sopra o accanto
al numero ma **mai** andato a capo in mezzo alla parola; con saldo `0` la riga
dice il vero e l'azione di ricerca è spenta come oggi.

**Perché non è stato fatto nel ciclo.** È un difetto di composizione visto in
demo, non dell'audit del 18/11: il ciclo ha chiuso i suoi P1 e non si è riaperto
per una riga. Va nel prossimo blocco con il suo commit.

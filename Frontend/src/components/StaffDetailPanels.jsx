import { View } from 'react-native';
import { AppText } from './AppText';
import { Banner } from './Banner';
import { ToneChip } from './ToneChip';
import { statusLabel, statusTone } from '@/services/reports';
import { nomePersona } from '@/services/offer-request';
import { formatIsoDate } from '@/services/dates';
import { operationActionLabel, operationTargetLabel } from '@/services/staff';
import { space } from '@/theme/tokens';

/**
 * I due pannelli di sola lettura dell'area staff: la segnalazione intera e una
 * voce del registro col suo `before`/`after`.
 *
 * Non caricano niente: ricevono `{ dati, loading, error }` dalla schermata, che
 * è l'unica a sapere quale riga è stata aperta e cosa è tornato dal backend.
 * Il pannello non inventa campi — mostra quelli che il normalizzatore produce —
 * e se la rilettura fallisce resta leggibile, perché i dati della riga sono già
 * a schermo: l'errore dice solo che il dettaglio è vecchio.
 */

/** Una coppia etichetta/valore: la stessa forma per tutti i campi. */
function DetailRow({ label, children }) {
  return (
    <View style={{ gap: 2 }}>
      <AppText variant="caption" tone="secondary">
        {label}
      </AppText>
      <AppText variant="small">{children}</AppText>
    </View>
  );
}

/** Nome e, quando c'è, lo username: due righe uguali restano distinguibili. */
function personLine(person) {
  const name = nomePersona(person);
  return person?.username ? `${name} · @${person.username}` : name;
}

/** L'esito della rilettura, quando c'è: il pannello sotto resta valido. */
function RefreshNotice({ error, loading, onRetry }) {
  if (error) {
    return (
      <Banner
        kind="error"
        message={`Dettagli non aggiornati: ${error}`}
        etichettaAzione="Riprova"
        onAzione={onRetry}
      />
    );
  }
  if (loading) {
    return (
      <AppText variant="small" tone="secondary">
        Aggiorno i dettagli…
      </AppText>
    );
  }
  return null;
}

/** Il motivo intero è la prova: qui si legge senza troncamenti. */
export function StaffReportDetail({ detail, onRetry }) {
  const report = detail.report;

  return (
    <View style={{ gap: space.md }}>
      <RefreshNotice error={detail.error} loading={detail.loading} onRetry={onRetry} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <ToneChip tono={statusTone(report.stato)}>
          {statusLabel(report.stato) ?? 'Stato sconosciuto'}
        </ToneChip>
        <AppText variant="small" tone="secondary">
          {formatIsoDate(report.creataIl) ?? 'Data non disponibile'}
        </AppText>
      </View>
      <DetailRow label="Motivo">{report.motivo.trim() || 'Motivo non indicato'}</DetailRow>
      <DetailRow label="Segnalato da">{personLine(report.autore)}</DetailRow>
      <DetailRow label="Segnalato">{personLine(report.segnalato)}</DetailRow>
      <DetailRow label="Presa in carico da">
        {report.assegnataA?.id ? personLine(report.assegnataA) : 'Non ancora presa in carico'}
      </DetailRow>
      {report.assegnataIl ? (
        <DetailRow label="Presa in carico il">
          {formatIsoDate(report.assegnataIl) ?? 'Data non disponibile'}
        </DetailRow>
      ) : null}
      <DetailRow label="Nota della staff">
        {report.nota ? report.nota : 'Nessuna nota'}
      </DetailRow>
      {report.rivistaDa?.id || report.rivistaIl ? (
        <>
          <DetailRow label="Chiusa da">
            {report.rivistaDa?.id ? personLine(report.rivistaDa) : 'Non disponibile'}
          </DetailRow>
          <DetailRow label="Chiusa il">
            {report.rivistaIl ? formatIsoDate(report.rivistaIl) ?? 'Data non disponibile' : 'Data non disponibile'}
          </DetailRow>
        </>
      ) : null}
    </View>
  );
}

/**
 * Le chiavi che non si mostrano nemmeno se un giorno comparissero nel registro:
 * il contratto le esclude, questa è la cintura se cambia (la guida API dichiara
 * fuori password, JWT e motivi).
 */
const REDACTED_KEYS = /password|token|secret|jwt|hash/i;

/** Un valore del registro: `null` è un valore, non un campo mancante. */
function operationValue(value, key) {
  if (value === null || value === undefined) {
    return 'nessuno';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  if (key === 'deletedAt' || key === 'assignedAt' || key === 'reviewedAt') {
    return formatIsoDate(String(value)) ?? String(value);
  }
  return String(value);
}

/**
 * Una riga chiave/valore del blocco, con la chiave su una colonna comune: senza
 * una base fissa i valori di uno stesso blocco partirebbero da x diverse.
 *
 * Il valore restringe (`flex: 1`, `minWidth: 0`) e va a capo: un campo lungo
 * come `reviewNote` esce dal pannello se nessuno dei due lati può restringere.
 * `numberOfLines` qui non c'è apposta — il motivo si legge intero. Il `minWidth`
 * della chiave è un minimo, non una misura: con il testo ingrandito la colonna
 * si allarga invece di tagliare il nome del campo. `alignItems: 'flex-start'`
 * tiene la chiave in cima quando il valore occupa più righe.
 */
const changeRowStyle = { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm };
const changeKeyStyle = { flexShrink: 0, minWidth: 88 };
const changeValueStyle = { flex: 1, minWidth: 0 };

/** `before`/`after` come coppie chiave→valore; le chiavi restano del backend. */
function ChangeBlock({ titolo, changes }) {
  const entries = Object.entries(changes ?? {}).filter(([key]) => !REDACTED_KEYS.test(key));
  if (entries.length === 0) {
    return null;
  }
  return (
    <View style={{ gap: space.xs }}>
      <AppText variant="heading">{titolo}</AppText>
      {entries.map(([key, value]) => (
        <View key={key} style={changeRowStyle}>
          <AppText variant="small" tone="secondary" style={changeKeyStyle}>
            {key}
          </AppText>
          <AppText variant="small" style={changeValueStyle}>
            {operationValue(value, key)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** Una voce del registro: la riga di lista più i valori prima/dopo. */
export function StaffOperationDetail({ detail, onRetry }) {
  const operation = detail.operation;
  const hasChanges = operation.prima !== null || operation.dopo !== null;

  return (
    <View style={{ gap: space.md }}>
      <RefreshNotice error={detail.error} loading={detail.loading} onRetry={onRetry} />
      <DetailRow label="Azione">{operationActionLabel(operation.azione) ?? 'Non indicata'}</DetailRow>
      <DetailRow label="Bersaglio">
        {`${operationTargetLabel(operation.bersaglio) ?? 'Non indicato'} ${
          operation.bersaglioId ?? ''
        }`.trim()}
      </DetailRow>
      <DetailRow label="Staff">{operation.staff?.username ?? 'staff'}</DetailRow>
      <DetailRow label="Data">
        {formatIsoDate(operation.creataIl) ?? 'Data non disponibile'}
      </DetailRow>
      {hasChanges ? (
        <>
          <ChangeBlock titolo="Prima" changes={operation.prima} />
          <ChangeBlock titolo="Dopo" changes={operation.dopo} />
        </>
      ) : (
        <AppText variant="small" tone="secondary">
          Questa voce non registra valori prima e dopo.
        </AppText>
      )}
    </View>
  );
}

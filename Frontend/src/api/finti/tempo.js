/**
 * L'ora in forma backend (`AAAA-MM-GG HH:MM:SS`) per i finti: il timestamp che
 * le righe dei dati finti portano come `quando`/`creato_il`, identico al
 * formato che il backend vecchio restituiva. Era in `finti/coda-dati.js` e con
 * la coda finta **si sposta qui** (rimozione, mai duplicazione): lo usano i
 * finti di chat, notifiche, segnalazioni, staff e utenti, che restano.
 */
export function adessoBackend() {
  const data = new Date();
  const due = (numero) => String(numero).padStart(2, '0');
  return (
    `${data.getFullYear()}-${due(data.getMonth() + 1)}-${due(data.getDate())} ` +
    `${due(data.getHours())}:${due(data.getMinutes())}:${due(data.getSeconds())}`
  );
}

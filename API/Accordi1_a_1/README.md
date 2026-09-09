# API accordi 1 a 1

Base URL locale Laragon:

```text
http://localhost/ProjectWork/API/Accordi1_a_1/
```

Tutte le richieste devono contenere il token dell'utente autenticato:

```http
Authorization: Bearer <token>
Content-Type: application/json
```

Le risposte hanno sempre questa forma:

```json
{
  "success": true,
  "message": "Messaggio descrittivo",
  "data": {}
}
```

In caso di errore `success` è `false`. I codici più comuni sono: `400` dati non validi, `401` token non valido, `403` utente non autorizzato, `404` accordo non trovato e `409` stato dell'accordo non compatibile.

## Endpoint

| Metodo | Endpoint | Uso |
| --- | --- | --- |
| `POST` | `crea.php` | Crea una proposta di accordo. |
| `GET` | `elenco.php` | Elenca gli accordi dell'utente autenticato. |
| `GET` | `dettaglio.php?id_accordo=ID` | Mostra un accordo se l'utente partecipa. |
| `POST` | `accetta.php` | Registra l'accettazione di un partecipante. |
| `POST` | `avvia.php` | Porta un accordo accettato in esecuzione. |
| `POST` | `completa.php` | Registra il completamento del partecipante. |
| `POST` | `annulla.php` | Annulla un accordo proposto o accettato. |
| `POST` | `contesta.php` | Contesta un accordo in esecuzione. |

### Creare un accordo

`POST crea.php`

```json
{
  "id_altro_utente": 6,
  "durata_mia": 60,
  "durata_altro": 45
}
```

Le durate sono minuti e devono essere interi positivi. Entrambi i partecipanti partono con `accettazione: false`.

### Azioni su un accordo

Per `accetta.php`, `avvia.php`, `completa.php`, `annulla.php` e `contesta.php` il corpo è uguale:

```json
{
  "id_accordo": 12
}
```

Solo i due partecipanti possono eseguire queste azioni.

## Flusso da usare nel frontend

```text
PROPOSTO -- entrambi accettano --> ACCETTATO -- avvia --> IN_ESECUZIONE
IN_ESECUZIONE -- entrambi completano --> COMPLETATO
PROPOSTO o ACCETTATO -- annulla --> ANNULLATO
IN_ESECUZIONE -- contesta --> CONTESTATO
```

Quando il secondo partecipante chiama `completa.php`, l'API imposta `COMPLETATO` e assegna automaticamente 10 crediti a ciascuno. Una chiamata ripetuta non assegna altri crediti.

Per aggiornare una schermata dopo un'azione, richiama `dettaglio.php?id_accordo=...` oppure `elenco.php`.

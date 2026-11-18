import { acceptAgreementSheet, sendAgreementSheet, sendExchangeProposal } from '../areas/agreements';
import { normalizeAgreement, normalizeAgreements } from '../normalizers';

/**
 * `GET /get-agreements` -> the agreement rows the screens act on.
 *
 * The point of these tests is the sheet: an accepted agreement carries **one
 * `agreementDetails` row per participant** (`AgreementManager::
 * sendAgreementDetails` writes the caller's row, the acceptance created one per
 * side), so the client must keep both and let `services/agreements.js` decide
 * which one belongs to the viewer. `scheda` stays the first row for the
 * classification, which needs exactly one end date.
 */
const SCHEDA_PROVIDER = {
  providerUsername: 'mario.rossi',
  serviceDescription: 'Riparazione biciclette',
  beneficiaryUsername: 'luca.ferrari',
  fromRemote: false,
  startDate: '2026-12-01T09:00:00+00:00',
  endDate: '2026-12-05T18:00:00+00:00',
  beneficiaryAccepted: null,
  status: 'UNCOMPILED',
};

const SCHEDA_BENEFICIARIO = {
  ...SCHEDA_PROVIDER,
  providerUsername: 'luca.ferrari',
  serviceDescription: 'Lezioni di chitarra',
  beneficiaryUsername: 'mario.rossi',
};

const ACCORDO = {
  id: 3,
  agreementStatus: 'ACCEPTED',
  creationDate: '2026-11-09T17:27:40+00:00',
  agreementProposal: [
    { username: 'mario.rossi', role: 'Provider', response: true, responseDate: null },
    { username: 'luca.ferrari', role: 'Beneficiary', response: true, responseDate: null },
  ],
  agreementDetails: [SCHEDA_PROVIDER, SCHEDA_BENEFICIARIO],
};

describe('normalizeAgreement', () => {
  it('keeps every sheet row and still exposes the first one as scheda', () => {
    const accordo = normalizeAgreement(ACCORDO);
    expect(accordo.schede).toHaveLength(2);
    expect(accordo.schede.map((scheda) => scheda.username)).toEqual(['mario.rossi', 'luca.ferrari']);
    expect(accordo.scheda).toEqual(accordo.schede[0]);
  });

  it('normalises a sheet row to the display shape, upper-casing the status', () => {
    const [scheda] = normalizeAgreement(ACCORDO).schede;
    expect(scheda).toMatchObject({
      username: 'mario.rossi',
      descrizione: 'Riparazione biciclette',
      beneficiario: 'luca.ferrari',
      daRemoto: false,
      inizio: '2026-12-01T09:00:00+00:00',
      fine: '2026-12-05T18:00:00+00:00',
      stato: 'UNCOMPILED',
    });
    expect(scheda.beneficiarioAccettato).toBeNull();
  });

  it('an agreement without sheets has an empty list and no scheda', () => {
    const accordo = normalizeAgreement({ ...ACCORDO, agreementDetails: [] });
    expect(accordo.schede).toEqual([]);
    expect(accordo.scheda).toBeNull();
  });

  it('drops a sheet row that names no service instead of claiming one', () => {
    const accordo = normalizeAgreement({
      ...ACCORDO,
      agreementDetails: [{ ...SCHEDA_PROVIDER, serviceDescription: null }],
    });
    expect(accordo.schede).toEqual([]);
    expect(accordo.scheda).toBeNull();
  });

  it('drops an agreement without an id, which no screen could act on', () => {
    expect(normalizeAgreement({ ...ACCORDO, id: null })).toBeNull();
  });
});

describe('normalizeAgreements', () => {
  it('reads success.agreements and returns an empty list for anything else', () => {
    expect(normalizeAgreements({ success: { agreements: [ACCORDO] } })).toHaveLength(1);
    expect(normalizeAgreements({})).toEqual([]);
    expect(normalizeAgreements(null)).toEqual([]);
  });
});

/**
 * The two sheet calls of `api/areas/agreements.js`.
 *
 * The route contract is narrow and worth pinning: `send-agreement-details`
 * reads exactly `{agreementId, fromRemote, startDate, endDate}` (a participant
 * id in the body changes nothing, `docs/api.md`), and
 * `accept-agreement-details/{id}` takes the agreement in the path and no body.
 * The three statuses each route can answer are mapped to Italian here, so no
 * screen translates a status.
 */
const TOKEN = 'test-token';

/** A `Response`-shaped object: `client.js` reads `ok`, `status` and `text()`. */
function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

describe('sendAgreementSheet', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { success: { code: 200 } }));
  });

  it('posts the four fields the route reads, as date-only strings', async () => {
    await sendAgreementSheet(TOKEN, {
      agreementId: 9,
      fromRemote: true,
      startDate: '2026-12-01',
      endDate: '2026-12-05',
    });

    const [url, options] = global.fetch.mock.calls[0];
    expect(String(url).endsWith('/send-agreement-details')).toBe(true);
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({
      agreementId: 9,
      fromRemote: true,
      startDate: '2026-12-01',
      endDate: '2026-12-05',
    });
  });

  it('turns a 400 into the sentence about the two dates', async () => {
    global.fetch.mockResolvedValue(jsonResponse(400, { error: { code: 400 } }));

    await expect(
      sendAgreementSheet(TOKEN, {
        agreementId: 9,
        fromRemote: false,
        startDate: '2026-12-05',
        endDate: '2026-12-01',
      }),
    ).rejects.toMatchObject({
      status: 400,
      message: "Controlla le date: la fine deve venire dopo l'inizio.",
    });
  });

  it('turns a 404 into the sentence about an agreement or sheet that is gone', async () => {
    global.fetch.mockResolvedValue(jsonResponse(404, { error: { code: 404 } }));

    await expect(
      sendAgreementSheet(TOKEN, {
        agreementId: 9,
        fromRemote: false,
        startDate: '2026-12-01',
        endDate: '2026-12-05',
      }),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Non trovo più questo accordo o la sua scheda: ricarica e riprova.',
    });
  });
});

describe('acceptAgreementSheet', () => {
  it('puts the agreement in the path and sends no body', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { success: { code: 200 } }));

    await acceptAgreementSheet(TOKEN, 9);

    const [url, options] = global.fetch.mock.calls[0];
    expect(String(url).endsWith('/accept-agreement-details/9')).toBe(true);
    expect(options.method).toBe('POST');
    expect(options.body).toBeUndefined();
  });

  it('turns the 500 of an already confirmed sheet into its own sentence', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(500, { error: { code: 500 } }));

    await expect(acceptAgreementSheet(TOKEN, 9)).rejects.toMatchObject({
      status: 500,
      message: "Il server non ha accettato la scheda: riprova, e se l'errore resta segnalalo.",
    });
  });
});


describe('service-bound exchange proposals', () => {
  it('sends the selected service together with its owner', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(201, { success: { code: 201 } }));
    await sendExchangeProposal(TOKEN, 7, 12);
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ otherParticipant: 7, serviceId: 12 });
  });
});

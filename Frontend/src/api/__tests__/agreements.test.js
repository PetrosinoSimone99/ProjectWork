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

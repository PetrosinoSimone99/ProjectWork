import { toUpdateBody, updateService } from '../areas/services';

jest.mock('../client', () => ({
  ApiError: class ApiError extends Error {
    constructor(status, message, detail = null) {
      super(message);
      this.status = status;
      this.detail = detail;
    }
  },
  apiFetch: jest.fn(),
}));

// eslint-disable-next-line import/first
import { apiFetch } from '../client';

/** The form row as the screen knows it: one visible category, the whole list beside it. */
function formEntry(overrides = {}) {
  return {
    tipo: 'OFFERTA',
    id: 1,
    idCategoria: 3,
    categoryIds: [3, 5],
    mansione: 'Riparazione biciclette',
    daRemoto: false,
    comune: '',
    provincia: '',
    ...overrides,
  };
}

/** The `PATCH` answer, with both categories still there. */
const UPDATE_ENVELOPE = {
  service: {
    id: 1,
    type: 'OFFER',
    description: 'Riparazione biciclette',
    categories: [{ id: 3 }, { id: 5 }],
    isRemote: false,
    isSuspended: false,
    location: null,
  },
};

beforeEach(() => {
  apiFetch.mockReset();
});

describe('toUpdateBody', () => {
  it('sends the whole list back when the visible category was not touched', () => {
    expect(toUpdateBody(formEntry())).toEqual({
      description: 'Riparazione biciclette',
      categoryIds: [3, 5],
      isRemote: false,
      location: null,
    });
  });

  it('sends only the chosen category when the selection changed', () => {
    expect(toUpdateBody(formEntry({ idCategoria: 7 })).categoryIds).toEqual([7]);
  });

  it('sends a one-element list when the stored list is already single', () => {
    expect(toUpdateBody(formEntry({ categoryIds: [3] })).categoryIds).toEqual([3]);
  });

  it('builds no body without a valid category', () => {
    expect(toUpdateBody(formEntry({ idCategoria: null }))).toBeNull();
  });
});

describe('updateService', () => {
  it('patches the service with the whole list in the body', async () => {
    apiFetch.mockResolvedValue(UPDATE_ENVELOPE);

    const voce = await updateService('token-123', formEntry());

    expect(apiFetch).toHaveBeenCalledWith('offers/1', {
      method: 'PATCH',
      token: 'token-123',
      body: {
        description: 'Riparazione biciclette',
        categoryIds: [3, 5],
        isRemote: false,
        location: null,
      },
    });
    expect(voce.categoryIds).toEqual([3, 5]);
  });
});

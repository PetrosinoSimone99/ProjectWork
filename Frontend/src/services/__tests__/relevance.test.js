import {
  orderByRelevance,
  requestCategoryIds,
  sharesCategory,
} from '../relevance';

/** A catalog row in the normalised shape, with the categories it carries. */
function service(id, categoryIds) {
  return {
    chiave: `offerta-${id}`,
    id,
    descrizione: `Servizio ${id}`,
    categorie: categoryIds.map((categoryId) => ({ id: categoryId, nome: `Categoria ${categoryId}` })),
  };
}

describe('sharesCategory', () => {
  it('returns true when the service has one of the wanted categories', () => {
    expect(sharesCategory(service(1, [3, 4]), new Set([4]))).toBe(true);
  });

  it('returns false when the categories do not overlap', () => {
    expect(sharesCategory(service(1, [3]), new Set([4]))).toBe(false);
  });

  it('returns false for a service without categories', () => {
    expect(sharesCategory({ chiave: 'offerta-9', categorie: [] }, new Set([1]))).toBe(false);
  });

  it('returns false when nothing is wanted', () => {
    expect(sharesCategory(service(1, [1]), new Set())).toBe(false);
  });
});

describe('requestCategoryIds', () => {
  it('collects every category id of the requests without duplicates', () => {
    const requests = [
      { categoryIds: [3, 4] },
      { categoryIds: [4, 5] },
      { idCategoria: 3 },
    ];
    expect(requestCategoryIds(requests)).toEqual([3, 4, 5]);
  });

  it('returns an empty list when the viewer has no requests', () => {
    expect(requestCategoryIds([])).toEqual([]);
    expect(requestCategoryIds(null)).toEqual([]);
  });

  it('ignores values that are not integer ids', () => {
    expect(requestCategoryIds([{ categoryIds: ['x', 2, null] }])).toEqual([2]);
  });
});

describe('orderByRelevance', () => {
  const items = [service(1, [10]), service(2, [20]), service(3, [20, 10]), service(4, [30])];

  it('puts the services sharing a category first, keeping the order inside each group', () => {
    const ordered = orderByRelevance(items, [10]);
    expect(ordered.map((row) => row.id)).toEqual([1, 3, 2, 4]);
  });

  it('does not mutate the received list or its rows', () => {
    const before = items.map((row) => row.id);
    orderByRelevance(items, [20]);
    expect(items.map((row) => row.id)).toEqual(before);
  });

  it('keeps the backend order when the viewer has no request categories', () => {
    expect(orderByRelevance(items, []).map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('returns the same rows, in order, when no service shares a category', () => {
    expect(orderByRelevance(items, [99]).map((row) => row.id)).toEqual([1, 2, 3, 4]);
  });

  it('handles an empty list', () => {
    expect(orderByRelevance([], [1])).toEqual([]);
  });
});

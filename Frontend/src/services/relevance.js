/**
 * Relevance ordering for the home catalog (brief decision 5).
 *
 * Rule: first every service that shares **at least one category** with the
 * viewer's own REQUEST services, then everything else; inside each group the
 * order stays the backend's, which is `createdAt` descending.
 *
 * Limitation, declared instead of hidden: the backend has no relevance order
 * yet (`docs/backend-gaps.md` G1), so this only reorders **the pages already
 * loaded**. Page 2 is not ranked against page 1, and a relevant service on a
 * page nobody loaded does not move up. When `sort=relevance` lands, this module
 * goes away and the hook stops calling it.
 *
 * Pure: copies, never mutates the input array or its rows.
 */

/** The category ids of a catalog row (`categorie: [{id, nome}]`). */
function categoryIdsOf(service) {
  if (!Array.isArray(service?.categorie)) {
    return [];
  }
  return service.categorie
    .map((category) => Number(category?.id))
    .filter((id) => Number.isInteger(id));
}

/** The category ids of the viewer's requests, deduplicated. */
export function requestCategoryIds(requests) {
  const ids = new Set();
  for (const request of requests ?? []) {
    const rowIds = Array.isArray(request?.categoryIds)
      ? request.categoryIds
      : request?.idCategoria === null || request?.idCategoria === undefined
        ? []
        : [request.idCategoria];
    for (const id of rowIds) {
      const numeric = Number(id);
      if (Number.isInteger(numeric)) {
        ids.add(numeric);
      }
    }
  }
  return [...ids];
}

/** `true` when the service shares at least one category with the wanted set. */
export function sharesCategory(service, wantedIds) {
  const wanted = wantedIds instanceof Set ? wantedIds : new Set(wantedIds ?? []);
  if (wanted.size === 0) {
    return false;
  }
  return categoryIdsOf(service).some((id) => wanted.has(id));
}

/**
 * The stable two-group partition described above.
 * Without wanted categories the order is the one it received: no invented
 * ranking.
 */
export function orderByRelevance(services, wantedIds) {
  if (!Array.isArray(services)) {
    return services;
  }
  const wanted = new Set(wantedIds ?? []);
  if (wanted.size === 0) {
    return [...services];
  }
  const relevant = [];
  const rest = [];
  for (const service of services) {
    (sharesCategory(service, wanted) ? relevant : rest).push(service);
  }
  return [...relevant, ...rest];
}

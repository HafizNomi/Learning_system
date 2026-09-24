/**
 * DRF pagination is on globally (PAGE_SIZE 20). A dashboard that renders only
 * `results` silently truncates: an 8-week run is 24 classes, so four of them
 * would simply not appear, and the teacher's "registers to take" count would
 * be wrong rather than merely incomplete.
 *
 * These helpers walk the pages. The cap is a safety net against an unbounded
 * loop, not an expected limit.
 */

const MAX_PAGES = 25;

/** Read one response body whether or not the endpoint is paginated. */
export const unwrapList = (data) =>
  Array.isArray(data) ? data : (data?.results ?? []);

/**
 * Call `request({ ...params, page })` until the API stops returning a `next`.
 * A non-paginated endpoint returns its array on the first call and stops.
 */
export const fetchAllPages = async (request, params = {}) => {
  const all = [];
  let page = 1;

  for (; page <= MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop -- pages are inherently serial
    const { data } = await request({ ...params, page });
    all.push(...unwrapList(data));
    if (!data?.next) break;
  }

  return all;
};

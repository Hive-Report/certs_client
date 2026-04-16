/**
 * In-memory page state store.
 *
 * Keeps the last search results for each page so that navigating away and
 * back does not trigger a new network request.  State lives only for the
 * duration of the browser session (until a hard reload).
 */

const _state = {};

const pageStateStore = {
  /** Read stored state for a page (or null if nothing saved yet). */
  get: (page) => _state[page] ?? null,

  /** Overwrite stored state for a page. */
  set: (page, state) => { _state[page] = state; },

  /** Remove stored state for a page (force re-fetch next visit). */
  clear: (page) => { delete _state[page]; },
};

export default pageStateStore;

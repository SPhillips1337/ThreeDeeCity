/**
 * Versioned save/load for City state.
 *
 * Pure and deterministic: serializeCity / deserializeCity touch no DOM, clock,
 * Math.random, or Three.js, so they run under `node --test`. The authoritative
 * state is the seed (which regenerates terrain), the city name/size, stats,
 * tax rates, and per-tile mutable fields. The derived grids (power/water/
 * traffic/road-access/land-value/pollution/service coverage) are recomputed by
 * City.updateInfrastructureGrids() on the first simulate tick after load, so
 * they are intentionally NOT serialized — a save stays small and self-corrects
 * if any derived grid would have drifted.
 *
 * The format is versioned (mirrors ttd-3js's TransportSaveDocument) so future
 * fields can be added without silently corrupting old saves: deserializeCity
 * rejects any document whose version it does not understand rather than
 * guessing.
 */

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'threedeecity-save';

// Per-tile fields that are authoritative (not derived). Everything else on a
// Tile is either structural (x, y, modules) or recomputed each tick.
const TILE_FIELDS = [
  'type', 'density', 'residents', 'jobs', 'developmentLevel', 'abandoned',
  'happiness', 'commuteTime', 'overlay', 'styleId', 'lotId', 'isAnchor'
];

/** Serialize a City to a versioned JSON document string. */
export function serializeCity(city) {
  const tiles = [];
  for (let x = 0; x < city.size.width; x++) {
    for (let y = 0; y < city.size.height; y++) {
      const t = city.grid[x][y];
      const rec = { x, y, lotSize: { w: t.lotSize.w, h: t.lotSize.h } };
      for (const f of TILE_FIELDS) rec[f] = t[f];
      tiles.push(rec);
    }
  }
  return JSON.stringify({
    version: SAVE_VERSION,
    name: city.name,
    size: { width: city.size.width, height: city.size.height },
    seed: city.seed,
    stats: { ...city.stats, date: city.stats.date.toISOString() },
    taxRates: { ...city.taxRates },
    monthlyExpenses: city.monthlyExpenses,
    tiles
  });
}

/** Parse and validate a serialized document. Throws on any unsupported or
 * malformed input so a bad save can never silently produce a broken city. */
export function deserializeCity(serialized) {
  let doc;
  try { doc = JSON.parse(serialized); }
  catch { throw new Error('Save data is not valid JSON.'); }

  if (!doc || typeof doc !== 'object') throw new Error('Save data is invalid.');
  if (doc.version !== SAVE_VERSION) {
    throw new Error(`Unsupported save version ${doc.version}; expected ${SAVE_VERSION}.`);
  }
  const { name, size, seed, stats, taxRates, monthlyExpenses, tiles } = doc;
  if (!size || !Number.isInteger(size.width) || !Number.isInteger(size.height)) {
    throw new Error('Save data is missing a valid map size.');
  }
  if (!Array.isArray(tiles) || tiles.length !== size.width * size.height) {
    throw new Error('Save tile count does not match the map size.');
  }
  return {
    version: SAVE_VERSION,
    name: typeof name === 'string' ? name : 'New City',
    size,
    seed: String(seed ?? 'threedeecity-default'),
    stats: { ...stats, date: new Date(stats.date) },
    taxRates: { ...taxRates },
    monthlyExpenses: Number(monthlyExpenses) || 0,
    tiles
  };
}

/** Apply a deserialized state onto an existing City instance. The City must
 * have been constructed with the same seed and size so its terrain matches;
 * this copies only the authoritative mutable fields. Derived grids are left to
 * the next simulate tick. */
export function applyCityState(city, state) {
  city.name = state.name;
  for (const rec of state.tiles) {
    const t = city.grid[rec.x][rec.y];
    if (!t) continue;
    for (const f of TILE_FIELDS) t[f] = rec[f];
    t.lotSize = { w: rec.lotSize.w, h: rec.lotSize.h };
  }
  city.stats = { ...state.stats };
  city.taxRates = { ...state.taxRates };
  city.monthlyExpenses = state.monthlyExpenses;
}

/** Browser persistence backed by IndexedDB. Resolves only on a completed
 * transaction (a successful request is not commit evidence — an aborted
 * transaction preserves the previous save). Queues operations so a stale read
 * cannot overwrite a later write. Falls back to localStorage when IndexedDB is
 * unavailable (private browsing, old engines) so saves never hard-fail. */
export function createSaveStore(getFactory = () => window.indexedDB, key = STORAGE_KEY) {
  const useLocalStorage = !getFactory || typeof getFactory() !== 'object';

  const idbOpen = () => new Promise((resolve, reject) => {
    let request;
    try { request = getFactory().open('threedeecity-saves', 1); }
    catch (e) { reject(e); return; }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('saves')) request.result.createObjectStore('saves');
    };
    request.onerror = () => reject(request.error ?? new Error('Save database unavailable'));
    request.onsuccess = () => resolve(request.result);
  });

  const idbTransact = async (value) => {
    const db = await idbOpen();
    try {
      return await new Promise((resolve, reject) => {
        const mode = value === undefined ? 'readonly' : 'readwrite';
        const tx = db.transaction('saves', mode);
        const store = tx.objectStore('saves');
        const req = value === undefined ? store.get(key) : store.put(value, key);
        let result;
        req.onsuccess = () => { result = req.result; };
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error ?? req.error ?? new Error('Save transaction aborted'));
      });
    } finally { db.close(); }
  };

  let tail = Promise.resolve();
  const enqueue = (op) => { const r = tail.then(op, op); tail = r.catch(() => undefined); return r; };

  if (useLocalStorage) {
    return {
      read: () => enqueue(async () => {
        const raw = localStorage.getItem(key);
        return raw === null ? undefined : raw;
      }),
      write: (serialized) => enqueue(async () => { localStorage.setItem(key, serialized); })
    };
  }

  return {
    read: () => enqueue(() => idbTransact()),
    write: (serialized) => enqueue(() => idbTransact(serialized))
  };
}

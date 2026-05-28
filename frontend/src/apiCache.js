/**
 * Lightweight API response cache with TTL support.
 * Prevents redundant GET requests when switching tabs quickly.
 *
 * Usage:
 *   import { cachedGet, invalidateCache } from '../apiCache';
 *   const data = await cachedGet('/api/skills', { ttl: 15000 }); // cache 15s
 *   invalidateCache('/api/skills');  // force refresh on next call
 */

import axios from 'axios';

const BASE_URL = 'http://127.0.0.1:5000';
const cache = new Map(); // key → { data, expiresAt }

/**
 * Makes a GET request with caching.
 * @param {string} path - e.g. '/api/skills'
 * @param {object} opts
 * @param {number}  opts.ttl      - Cache lifetime in ms (default: 10000)
 * @param {object}  opts.headers  - Optional request headers
 * @param {object}  opts.params   - Optional query params (appended to cache key)
 * @returns {Promise<any>} Parsed response data
 */
export async function cachedGet(path, { ttl = 10_000, headers = {}, params = {} } = {}) {
  const cacheKey = path + JSON.stringify(params);
  const now = Date.now();
  const entry = cache.get(cacheKey);

  if (entry && entry.expiresAt > now) {
    return entry.data;
  }

  const res = await axios.get(`${BASE_URL}${path}`, { headers, params });
  cache.set(cacheKey, { data: res.data, expiresAt: now + ttl });
  return res.data;
}

/**
 * Remove a cached entry so the next call fetches fresh data.
 * @param {string} path - Same path used in cachedGet
 * @param {object} params - Optional params (must match what was passed to cachedGet)
 */
export function invalidateCache(path, params = {}) {
  const cacheKey = path + JSON.stringify(params);
  cache.delete(cacheKey);
}

/** Clear the entire cache (e.g. on logout) */
export function clearAllCache() {
  cache.clear();
}

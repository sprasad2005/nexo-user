/**
 * NEXO Universal Data Cache & In-Flight Request Deduplicator
 * Provides Stale-While-Revalidate (SWR) caching, in-flight request deduplication,
 * and cross-tab cache invalidation for instant (0ms) page hydration and smooth background refreshes.
 * Safe for SSR and client environments — does NOT access browser globals during module initialization.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight promise tracker to deduplicate concurrent requests across components
const inFlightRequests = new Map<string, Promise<any>>();

// Invalidation epoch tracker to prevent older race-condition responses from overwriting newer state
const lastInvalidatedAt = new Map<string, number>();

// Max entries to prevent unbounded memory growth
const MAX_CACHE_ENTRIES = 100;

function pruneMemoryCache(): void {
  if (memoryCache.size > MAX_CACHE_ENTRIES) {
    const keys = Array.from(memoryCache.keys());
    // Evict oldest 20 entries
    for (let i = 0; i < 20 && i < keys.length; i++) {
      memoryCache.delete(keys[i]);
    }
  }
}

// Flag to ensure event listener is registered only once on client
let isStorageListenerAttached = false;

function ensureStorageListener(): void {
  if (typeof window === "undefined" || isStorageListenerAttached) return;
  try {
    window.addEventListener("storage", (e: StorageEvent) => {
      if (e.key && e.key.startsWith("nexo_inval_")) {
        const keyOrPrefix = e.key.replace("nexo_inval_", "");
        for (const k of memoryCache.keys()) {
          if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
            memoryCache.delete(k);
          }
        }
      }
    });
    isStorageListenerAttached = true;
  } catch {
    // Graceful fallback for non-standard environments
  }
}

export const nexoDataCache = {
  /**
   * Retrieves full cache entry with timestamp.
   */
  getEntry<T>(key: string): CacheEntry<T> | null {
    ensureStorageListener();
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expiresAt) {
      return mem;
    }
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`nexo_swr_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (
            parsed &&
            typeof parsed.timestamp === "number" &&
            Date.now() < (parsed.expiresAt || parsed.timestamp + 300000)
          ) {
            memoryCache.set(key, parsed);
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  },

  /**
   * Retrieves data from memory or localStorage cache immediately if available.
   * Safe to call on client; returns memory cache or null during SSR.
   */
  get<T>(key: string): T | null {
    return this.getEntry<T>(key)?.data ?? null;
  },

  /**
   * Returns true if valid cached data exists for the given key.
   */
  has(key: string): boolean {
    return this.getEntry(key) !== null;
  },

  /**
   * Stores data in memory and localStorage cache with TTL (in milliseconds).
   */
  set<T>(key: string, data: T, ttlMs = 60000): void {
    ensureStorageListener();
    pruneMemoryCache();

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    memoryCache.set(key, entry);

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`nexo_swr_${key}`, JSON.stringify(entry));
      } catch {
        // Ignore localStorage write quota / privacy mode errors
      }
    }
  },

  /**
   * Invalidates a specific cache key or all keys matching a prefix.
   * Broadcasts to other open tabs via localStorage token.
   */
  invalidate(keyOrPrefix: string): void {
    ensureStorageListener();
    const now = Date.now();
    lastInvalidatedAt.set(keyOrPrefix, now);

    for (const k of memoryCache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
        lastInvalidatedAt.set(k, now);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const toRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k === `nexo_swr_${keyOrPrefix}` || k.startsWith(`nexo_swr_${keyOrPrefix}`))) {
            toRemove.push(k);
          }
        }
        toRemove.forEach((k) => localStorage.removeItem(k));

        // Signal other tabs to drop stale in-memory cache
        localStorage.setItem(`nexo_inval_${keyOrPrefix}`, String(now));
      } catch {
        // Ignore localStorage errors
      }
    }
  },

  /**
   * Performs an SWR fetch:
   * 1. Returns cached data immediately if available.
   * 2. If cached data is fresh (within minRevalidateMs), does NOT make a network call.
   * 3. Deduplicates concurrent requests in flight.
   */
  async fetchSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttlMs?: number;
      minRevalidateMs?: number;
      forceRefresh?: boolean;
      onUpdate?: (freshData: T) => void;
    } = {}
  ): Promise<T> {
    ensureStorageListener();
    const { ttlMs = 60000, minRevalidateMs = 30000, forceRefresh = false, onUpdate } = options;
    const requestStartedAt = Date.now();

    const cachedEntry = this.getEntry<T>(key);

    // If cache is fresh and not forcing refresh, return immediately with NO network request
    if (cachedEntry && !forceRefresh) {
      const age = Date.now() - cachedEntry.timestamp;
      if (age < minRevalidateMs) {
        return cachedEntry.data;
      }
    }

    // If fresh in-flight request exists, reuse it
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    // Trigger network fetch
    const fetchPromise = (async () => {
      try {
        const fresh = await fetcher();

        // Guard against stale response overwriting a mutation that happened during fetch
        const lastInval = lastInvalidatedAt.get(key);
        if (lastInval && lastInval > requestStartedAt) {
          return fresh;
        }

        const isValidFresh =
          fresh !== null &&
          fresh !== undefined &&
          (typeof fresh !== "object" || (fresh as any).success !== false);

        if (isValidFresh) {
          this.set(key, fresh, ttlMs);
        }
        if (onUpdate && isValidFresh) {
          try {
            if (JSON.stringify(cachedEntry?.data) !== JSON.stringify(fresh)) {
              onUpdate(fresh);
            }
          } catch {
            onUpdate(fresh);
          }
        }
        return fresh;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, fetchPromise);

    if (cachedEntry && !forceRefresh) {
      // Return cached immediately, background fetch completes asynchronously
      return cachedEntry.data;
    }

    return fetchPromise;
  },
};

// Aliases for compatibility
export const AdminDataCache = nexoDataCache;
export const adminDataCache = nexoDataCache;
export default nexoDataCache;

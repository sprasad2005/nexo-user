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
  get<T>(key: string): T | null {
    ensureStorageListener();
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expiresAt) {
      return mem.data;
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
            return parsed.data;
          }
        }
      } catch {}
    }
    return mem?.data || null;
  },

  has(key: string): boolean {
    ensureStorageListener();
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expiresAt) return true;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`nexo_swr_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.timestamp === "number") return true;
        }
      } catch {}
    }
    return false;
  },

  set<T>(key: string, data: T, ttlMs = 60000): void {
    ensureStorageListener();
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };
    memoryCache.set(key, entry);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`nexo_swr_${key}`, JSON.stringify(entry));
      } catch {}
    }
  },

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
        localStorage.setItem(`nexo_inval_${keyOrPrefix}`, String(now));
      } catch {}
    }
  },

  async fetchSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttlMs?: number;
      forceRefresh?: boolean;
      onUpdate?: (freshData: T) => void;
    } = {}
  ): Promise<T> {
    ensureStorageListener();
    const { ttlMs = 60000, forceRefresh = false, onUpdate } = options;
    const requestStartedAt = Date.now();
    const cached = this.get<T>(key);

    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    const fetchPromise = (async () => {
      try {
        const fresh = await fetcher();
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
            if (JSON.stringify(cached) !== JSON.stringify(fresh)) {
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

    if (cached && !forceRefresh) {
      return cached;
    }

    return fetchPromise;
  },
};

export const AdminDataCache = nexoDataCache;
export const adminDataCache = nexoDataCache;
export default nexoDataCache;

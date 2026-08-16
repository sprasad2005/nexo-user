/**
 * Centralized High-Performance SWR Cache & In-Flight Request Deduplicator
 * for the NEXO Admin Panel.
 */

type CacheEntry<T> = {
  data: T;
  timestamp: number;
  expiresAt: number;
};

// In-memory cache store
const memoryCache = new Map<string, CacheEntry<any>>();

// In-flight promise tracker to prevent duplicate concurrent network requests
const inFlightRequests = new Map<string, Promise<any>>();

export const AdminDataCache = {
  /**
   * Retrieves data from memory or localStorage cache immediately if available.
   */
  get<T>(key: string): T | null {
    // 1. Check memory cache
    const mem = memoryCache.get(key);
    if (mem && Date.now() < mem.expiresAt) {
      return mem.data;
    }

    // 2. Check localStorage cache
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`nexo_swr_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed.timestamp === "number") {
            // Keep memory cache warm
            memoryCache.set(key, parsed);
            return parsed.data;
          }
        }
      } catch {}
    }

    return mem?.data || null;
  },

  /**
   * Returns true if valid cached data exists for the given key.
   */
  has(key: string): boolean {
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

  /**
   * Stores data in memory and localStorage cache with TTL (in milliseconds).
   */
  set<T>(key: string, data: T, ttlMs = 60000): void {
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

  /**
   * Invalidates a specific cache key or all keys matching a prefix.
   */
  invalidate(keyOrPrefix: string): void {
    for (const k of memoryCache.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        memoryCache.delete(k);
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
      } catch {}
    }
  },

  /**
   * Performs an SWR fetch:
   * 1. Returns cached data immediately if available.
   * 2. Deduplicates concurrent requests in flight.
   * 3. Revalidates in the background and calls onUpdate callback if data changed.
   */
  async fetchSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttlMs?: number;
      forceRefresh?: boolean;
      onUpdate?: (freshData: T) => void;
    } = {}
  ): Promise<T> {
    const { ttlMs = 60000, forceRefresh = false, onUpdate } = options;

    const cached = this.get<T>(key);

    // If fresh in-flight request exists, reuse it
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key)!;
    }

    // Trigger network fetch
    const fetchPromise = (async () => {
      try {
        const fresh = await fetcher();
        this.set(key, fresh, ttlMs);
        if (onUpdate && JSON.stringify(cached) !== JSON.stringify(fresh)) {
          onUpdate(fresh);
        }
        return fresh;
      } finally {
        inFlightRequests.delete(key);
      }
    })();

    inFlightRequests.set(key, fetchPromise);

    if (cached && !forceRefresh) {
      // Return cached immediately, background fetch completes asynchronously
      return cached;
    }

    return fetchPromise;
  },
};

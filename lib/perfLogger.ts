/**
 * Backend Performance Measurement & Slow Query Detection Logger
 */

export function startTiming(label: string) {
  const start = performance.now();

  return {
    end: (slowThresholdMs = 150) => {
      const duration = performance.now() - start;
      if (process.env.NODE_ENV === "development" && duration > slowThresholdMs) {
        console.warn(`⚠️ [SLOW DB QUERY] ${label} took ${duration.toFixed(2)}ms (threshold: ${slowThresholdMs}ms)`);
      }
      return duration;
    },
  };
}

export function createServerTimingHeader(timings: Record<string, number>): string {
  return Object.entries(timings)
    .map(([key, dur]) => `${key};dur=${dur.toFixed(1)}`)
    .join(", ");
}

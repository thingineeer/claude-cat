// Cross-terminal rate-limits cache.
//
// Problem: each Claude Code terminal session receives its OWN stdin JSON.
// An idle terminal never gets updated stdin, so it shows stale usage numbers
// while an active terminal has the real current values.
//
// Solution: the active session writes rate_limits + model to a shared cache
// file (~/.claude/claude-cat/rate-limits-cache.json). Idle sessions read
// that file when their own stdin has no rate_limits.
//
// File schema:
//   {
//     "written_at": <unix seconds>,
//     "rate_limits": { ... },   // verbatim from stdin
//     "model": { ... }          // verbatim from stdin (optional)
//   }
//
// Design constraints:
//   - Never throw in a way that breaks the status line.
//   - Cache is ONLY used when stdin has no rate_limits (idle session).
//   - Cache entries older than MAX_AGE_SEC are ignored — show resting cat
//     rather than ancient numbers.
//   - File writes are atomic (write-to-tmp then rename) so a concurrent
//     read never sees a partial file.

import { readFileSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const CACHE_DIR  = join(homedir(), ".claude", "claude-cat");
const CACHE_FILE = join(CACHE_DIR, "rate-limits-cache.json");

// Cached data older than this is ignored (stale = show resting cat).
// 10 minutes — matches the recommended refreshInterval so an idle terminal
// gets fresh data within one refresh cycle.
const MAX_AGE_SEC = 600;

function hasRateLimits(d) {
  return d && d.rate_limits && typeof d.rate_limits === "object"
    && Object.keys(d.rate_limits).length > 0;
}

// Write current stdin's rate_limits to the shared cache file.
// Called only when stdin actually has rate_limits (active session).
export function writeCacheIfActive(d) {
  if (!hasRateLimits(d)) return;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const payload = JSON.stringify({
      written_at: Math.floor(Date.now() / 1000),
      rate_limits: d.rate_limits,
      ...(d.model ? { model: d.model } : {}),
    });
    // Atomic write: tmp → rename so concurrent readers never see partial data.
    const tmp = join(CACHE_DIR, `.ratelimits-tmp-${randomBytes(4).toString("hex")}.json`);
    writeFileSync(tmp, payload, { encoding: "utf8" });
    renameSync(tmp, CACHE_FILE);
  } catch {
    // Cache write failures must never break the status line.
  }
}

// Read cached rate_limits for an idle session.
// Returns the cached `d`-shaped overlay (rate_limits + optional model),
// or null if cache is missing / too old / unreadable.
export function readCacheForIdle() {
  try {
    const raw = readFileSync(CACHE_FILE, "utf8");
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const age = Math.floor(Date.now() / 1000) - (obj.written_at ?? 0);
    if (age > MAX_AGE_SEC) return null;

    if (!hasRateLimits(obj)) return null;

    return {
      _fromCache: true,
      _cacheAge: age,
      rate_limits: obj.rate_limits,
      ...(obj.model ? { model: obj.model } : {}),
    };
  } catch {
    return null;
  }
}

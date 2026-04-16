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
import { sanitizeText, isSafeWindowKey, clampPct } from "./sanitize.js";

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
// Scrub an incoming payload to only the fields we cache, rejecting
// unsafe keys and stripping control chars from model.display_name.
// Defense-in-depth: even if the server sends junk, the cache stays
// clean so idle sessions reading it don't get compromised.
function cleanForCache(d) {
  const cleanRL = {};
  for (const [k, v] of Object.entries(d.rate_limits || {})) {
    if (!isSafeWindowKey(k)) continue;
    if (!v || typeof v !== "object") continue;
    cleanRL[k] = {
      used_percentage: clampPct(v.used_percentage),
      // Number.isFinite rejects NaN and Infinity in addition to
      // non-numbers, so downstream countdown math can't blow up on
      // a poisoned cache (`new Date(NaN * 1000)` → Invalid Date).
      resets_at: Number.isFinite(v?.resets_at) ? v.resets_at : null,
    };
  }
  const out = { rate_limits: cleanRL };
  if (d.model && typeof d.model === "object") {
    const dn = sanitizeText(d.model.display_name);
    const id = sanitizeText(d.model.id);
    if (dn || id) {
      out.model = {};
      if (dn) out.model.display_name = dn;
      if (id) out.model.id = id;
    }
  }
  return out;
}

export function writeCacheIfActive(d) {
  if (!hasRateLimits(d)) return;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    const clean = cleanForCache(d);
    const payload = JSON.stringify({
      written_at: Math.floor(Date.now() / 1000),
      ...clean,
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

    // Defense-in-depth: rescrub on read too. If an attacker with
    // local write access poisoned the cache file directly (bypassing
    // writeCacheIfActive), the idle session that reads it still sees
    // clean data.
    const clean = cleanForCache(obj);
    if (!hasRateLimits(clean)) return null;

    return {
      _fromCache: true,
      _cacheAge: age,
      ...clean,
    };
  } catch {
    return null;
  }
}

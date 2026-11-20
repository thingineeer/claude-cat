// Cross-terminal rate-limits cache.
//
// Problem: each Claude Code terminal session receives its OWN stdin JSON.
// An idle terminal never gets updated stdin, so it shows stale usage numbers
// while an active terminal has the real current values.
//
// Solution: every session with rate_limits merges them into a shared
// cache file (~/.claude/claude-cat/rate-limits-cache.json), and reads the
// merged view back. Sessions that have no rate_limits yet borrow the
// account that changed most recently.
//
// Several accounts can be live at once — a terminal keeps the account it
// was started with after `cswap` / `/login` switches the Keychain. So the
// cache is bucketed per account, keyed by the weekly window's resets_at
// (one account's weekly windows never overlap; two different future
// resets mean two accounts). Inside a bucket, usage only grows within a
// window, so the merge is monotonic: a later resets_at is a newer window,
// and for the same window the higher percentage is the newer reading.
// That lets an idle terminal (whose stdin still carries the numbers from
// its last reply) show what an active terminal on the same account just
// saw, without stale sessions overwriting fresh ones.
//
// File schema:
//   {
//     "written_at": <unix seconds>,   // top level = the account that
//     "rate_limits": { ... },         //   changed most recently (kept for
//     "model": { ... },               //   older readers, e.g. UsageMaster)
//     "accounts": {
//       "<weekly resets_at>": { "updated_at" (s), "changed_at" (ms), "rate_limits" }
//     }
//   }
//
// Design constraints:
//   - Never throw in a way that breaks the status line.
//   - Sessions WITH rate_limits use only their own account's bucket.
//   - Sessions WITHOUT rate_limits use the top-level (latest account).
//   - Freshness has two tiers:
//       age ≤ MAX_AGE_SEC      → fresh; drives the cat's mood like live
//                                stdin (no _stale flag).
//       MAX_AGE_SEC..STALE_MAX → stale-but-recent; still shown so the
//                                bars don't vanish the moment you step
//                                away, but flagged `_stale: true` so the
//                                renderer dims them and rests the cat
//                                (last-known, not current).
//       age > STALE_MAX_SEC    → ignored; show the resting cat rather
//                                than ancient numbers.
//   - File writes are atomic (write-to-tmp then rename) so a concurrent
//     read never sees a partial file.

import { readFileSync, writeFileSync, mkdirSync, renameSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { sanitizeText, isSafeWindowKey, clampPct } from "./sanitize.js";

const CACHE_DIR  = join(homedir(), ".claude", "claude-cat");
const CACHE_FILE = join(CACHE_DIR, "rate-limits-cache.json");

// Within this age the cache is "fresh" — an idle terminal treats it
// exactly like live stdin (the cat reacts to it). 10 minutes matches the
// recommended refreshInterval so an idle terminal gets fresh data within
// one refresh cycle.
const MAX_AGE_SEC = 600;

// Up to this age the cache is "stale-but-recent" — still rendered, but
// dimmed and flagged so it reads as last-known rather than current. This
// is what keeps the bars from blinking out the moment you stop typing for
// ten minutes. 6 hours: long enough to survive a coffee break or a
// meeting, short enough that the numbers haven't drifted into fiction.
const STALE_MAX_SEC = 6 * 3600;

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
  // Optional chaining is the house style for every `rate_limits.*`
  // access — stay consistent even when we just pre-`|| {}`-ed it.
  for (const [k, v] of Object.entries(d?.rate_limits || {})) {
    if (!isSafeWindowKey(k)) continue;
    if (!v || typeof v !== "object") continue;
    cleanRL[k] = {
      used_percentage: clampPct(v?.used_percentage),
      // Number.isFinite rejects NaN and Infinity in addition to
      // non-numbers, so downstream countdown math can't blow up on
      // a poisoned cache (`new Date(NaN * 1000)` → Invalid Date).
      resets_at: Number.isFinite(v?.resets_at) ? v.resets_at : null,
    };
  }
  const out = { rate_limits: cleanRL };
  if (d?.model && typeof d.model === "object") {
    const dn = sanitizeText(d.model?.display_name);
    const id = sanitizeText(d.model?.id);
    if (dn || id) {
      out.model = {};
      if (dn) out.model.display_name = dn;
      if (id) out.model.id = id;
    }
  }
  return out;
}

const TMP_PREFIX = ".ratelimits-tmp-";
const TMP_MAX_AGE_MS = 10 * 60 * 1000;

// Claude Code can kill a status-line process mid-write, which leaves a
// tmp file behind that never gets renamed. Sweep any that are older than
// a few minutes (a live writer finishes in milliseconds). The directory
// holds a handful of entries, so this is cheap enough for the hot path.
function sweepStaleTmp() {
  try {
    const cutoff = Date.now() - TMP_MAX_AGE_MS;
    for (const name of readdirSync(CACHE_DIR)) {
      if (!name.startsWith(TMP_PREFIX)) continue;
      const p = join(CACHE_DIR, name);
      try {
        if (statSync(p).mtimeMs < cutoff) unlinkSync(p);
      } catch {}
    }
  } catch {}
}

const RESET_TOL_SEC = 180;            // same window if resets differ by ≤ this
const ACCOUNT_MAX_IDLE_SEC = 8 * 86400;

function accountKey(rl) {
  const r = Number(rl?.seven_day?.resets_at);
  return Number.isFinite(r) && r > 0 ? r : null;
}

function findAccount(accounts, key) {
  if (key == null) return accounts.none ? "none" : null;
  for (const k of Object.keys(accounts)) {
    const n = Number(k);
    if (Number.isFinite(n) && Math.abs(n - key) <= RESET_TOL_SEC) return k;
  }
  return null;
}

// Monotonic per-window merge: newer window (later resets_at) wins; for
// the same window the higher percentage wins. Windows that already reset
// are dropped from the stored side.
function mergeWindows(stored, mine, now) {
  const out = {};
  for (const [k, v] of Object.entries(stored || {})) {
    if (v && Number(v.resets_at) > now) out[k] = v;
  }
  for (const [k, v] of Object.entries(mine || {})) {
    const e = out[k];
    const vr = Number(v?.resets_at) || 0;
    const er = Number(e?.resets_at) || 0;
    if (!e
      || vr > er + RESET_TOL_SEC
      || (Math.abs(vr - er) <= RESET_TOL_SEC && v.used_percentage > e.used_percentage)) {
      out[k] = v;
    }
  }
  return out;
}

function readRaw() {
  try {
    const obj = JSON.parse(readFileSync(CACHE_FILE, "utf8"));
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function cleanAccounts(obj, now) {
  const out = {};
  const src = obj?.accounts && typeof obj.accounts === "object" ? obj.accounts : {};
  for (const [k, b] of Object.entries(src)) {
    if (!(k === "none" || /^[0-9]{1,12}$/.test(k))) continue;
    if (!b || typeof b !== "object") continue;
    const updated = Number(b.updated_at) || 0;
    if (now - updated > ACCOUNT_MAX_IDLE_SEC) continue;
    if (k !== "none" && Number(k) <= now) continue;            // that week is over
    const rl = cleanForCache({ rate_limits: b.rate_limits }).rate_limits;
    if (!Object.keys(rl).length) continue;
    out[k] = { updated_at: updated, changed_at: Number(b.changed_at) || updated * 1000, rate_limits: rl };
  }
  return out;
}

// Merge this session's rate_limits into its account bucket and return the
// merged rate_limits to render (never less fresh than the session's own).
// Returns null when stdin has no rate_limits or on any failure.
export function writeCacheIfActive(d) {
  if (!hasRateLimits(d)) return null;
  const now = Math.floor(Date.now() / 1000);
  const mine = cleanForCache(d);
  let merged = mine.rate_limits;
  let tmp = null;
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    sweepStaleTmp();

    const prev = readRaw();
    const accounts = cleanAccounts(prev, now);
    const key = accountKey(mine.rate_limits);
    const slot = findAccount(accounts, key) ?? (key == null ? "none" : String(key));
    const bucket = accounts[slot] || { updated_at: 0, changed_at: 0, rate_limits: {} };
    merged = mergeWindows(bucket.rate_limits, mine.rate_limits, now);
    const changed = JSON.stringify(merged) !== JSON.stringify(bucket.rate_limits);
    accounts[slot] = {
      updated_at: now,
      // ms, so two accounts moving within the same second still order.
      changed_at: changed || !bucket.changed_at ? Date.now() : bucket.changed_at,
      rate_limits: merged,
    };

    // Top level mirrors the account whose usage moved most recently.
    let latest = slot;
    for (const [k, b] of Object.entries(accounts)) {
      if (b.changed_at > accounts[latest].changed_at) latest = k;
    }
    const top = accounts[latest];
    const out = { written_at: top.updated_at, rate_limits: top.rate_limits };
    if (latest === slot && mine.model) out.model = mine.model;
    else if (prev?.model) {
      const pm = cleanForCache({ model: prev.model }).model;
      if (pm) out.model = pm;
    }
    out.accounts = accounts;

    // Atomic write: tmp → rename so concurrent readers never see partial data.
    tmp = join(CACHE_DIR, `${TMP_PREFIX}${randomBytes(4).toString("hex")}.json`);
    writeFileSync(tmp, JSON.stringify(out), { encoding: "utf8" });
    renameSync(tmp, CACHE_FILE);
    tmp = null;
  } catch {
    // Cache write failures must never break the status line — but don't
    // leave the half-written tmp file behind either.
    if (tmp) { try { unlinkSync(tmp); } catch {} }
  }
  return merged;
}

// Read cached rate_limits for an idle session.
// Returns the cached `d`-shaped overlay (rate_limits + optional model),
// or null if cache is missing / too old / unreadable. Entries older than
// MAX_AGE_SEC (but within STALE_MAX_SEC) come back flagged `_stale: true`
// so the renderer can dim them and rest the cat.
export function readCacheForIdle() {
  try {
    const raw = readFileSync(CACHE_FILE, "utf8");
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return null;

    const age = Math.floor(Date.now() / 1000) - (obj.written_at ?? 0);
    if (age > STALE_MAX_SEC) return null;

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
      _stale: age > MAX_AGE_SEC,
      ...clean,
    };
  } catch {
    return null;
  }
}

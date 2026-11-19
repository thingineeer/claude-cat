// Opt-in Fable weekly bar (`--fable-usage`).
//
// Claude Code's statusLine stdin carries only `rate_limits.seven_day` on
// Ultra (verified on 2.1.327); the Fable weekly limit shown in `/usage`
// lives solely in the private `/api/oauth/usage` endpoint, under
// `limits[]` as `{ kind: "weekly_scoped", scope.model.display_name:
// "Fable", percent, resets_at }`. This module is the only place
// claude-cat reads a credential or calls Anthropic, and only when the
// user passes `--fable-usage`.
//
// Shape of the design:
//   • The render path never touches the network or the Keychain. It reads
//     `fable-cache.json`, overlays the Fable bar, and — when the cache is
//     old — spawns a detached refresher (`claude-cat __fable-refresh`)
//     that does the slow part in the background.
//   • The refresher reads the access token (macOS Keychain via
//     /usr/bin/security, else ~/.claude/.credentials.json) and NEVER
//     refreshes it: an expired token means "skip", a 401 means "back
//     off" — Claude Code refreshes its own token. The token never lands
//     in the cache, a log, or stderr.
//   • Account switches are detected without reading the Keychain on
//     render: the cache remembers the account's weekly `resets_at`, and
//     the bar is only shown when it matches the session's own
//     `rate_limits.seven_day.resets_at`.
//   • One refresh at a time across terminals (lock file), at most every
//     5 minutes, with backoff on 401 / 429 / Keychain failures.
//
// Test hook: CLAUDE_CAT_FABLE_FIXTURE=<path> makes the refresher read an
// API response from that file instead of reading credentials or calling
// the network.

import { readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, statSync, openSync, closeSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { clampPct } from "./sanitize.js";

const DIR = () => join(homedir(), ".claude", "claude-cat");
const CACHE = () => join(DIR(), "fable-cache.json");
const LOCK = () => join(DIR(), "fable-refresh.lock");

const TTL_SEC = 300;              // refresh at most every 5 minutes
const MIN_GAP_SEC = 60;           // floor between fetches, even on account change
const LOCK_STALE_MS = 60 * 1000;  // a refresher never runs this long
const RESET_MATCH_TOL_SEC = 180;  // server ISO vs stdin epoch rounding
const BACKOFF = {
  expired: 120,       // Claude Code will refresh its token shortly
  unauthorized: 600,
  rate_limited: 900,
  credential: 6 * 3600, // Keychain refused / no credentials — don't nag
  network: 300,
  bad_response: 1800,
};

const nowSec = () => Math.floor(Date.now() / 1000);

function readJson(path) {
  try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function writeJsonAtomic(path, obj) {
  mkdirSync(DIR(), { recursive: true });
  const tmp = join(DIR(), `.fable-tmp-${randomBytes(4).toString("hex")}.json`);
  try {
    writeFileSync(tmp, JSON.stringify(obj), "utf8");
    renameSync(tmp, path);
  } catch {
    try { unlinkSync(tmp); } catch {}
  }
}

const toEpoch = (iso) => {
  if (typeof iso === "number" && Number.isFinite(iso)) return Math.floor(iso);
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor(t / 1000) : null;
};

// ── response parsing ────────────────────────────────────────────────

// Pull the Fable weekly entry and the account's all-models weekly reset
// out of an `/api/oauth/usage` response. Returns null when the response
// isn't recognizable; `fable: null` when the account has no Fable limit.
export function parseUsage(json) {
  if (!json || typeof json !== "object") return null;

  let fable = null;
  for (const l of Array.isArray(json.limits) ? json.limits : []) {
    if (l?.kind !== "weekly_scoped") continue;
    const name = l?.scope?.model?.display_name;
    if (typeof name !== "string" || !/^fable\b/i.test(name.trim())) continue;
    const pct = Number(l.percent);
    const resets = toEpoch(l.resets_at);
    if (Number.isFinite(pct) && resets) {
      fable = { used_percentage: clampPct(pct), resets_at: resets };
    }
  }
  // Fallback: a top-level `seven_day_<…fable…>` window.
  if (!fable) {
    for (const [k, v] of Object.entries(json)) {
      if (!/^seven_day_[a-z0-9_]*fable/.test(k) || !v || typeof v !== "object") continue;
      const pct = Number(v.utilization ?? v.used_percentage);
      const resets = toEpoch(v.resets_at);
      if (Number.isFinite(pct) && resets) {
        fable = { used_percentage: clampPct(pct), resets_at: resets };
      }
    }
  }

  let weeklyResets = toEpoch(json.seven_day?.resets_at);
  if (!weeklyResets) {
    const all = (json.limits || []).find((l) => l?.kind === "weekly_all");
    weeklyResets = toEpoch(all?.resets_at);
  }
  if (!fable && !weeklyResets) return null;
  return { fable, weekly_resets_at: weeklyResets ?? null };
}

// ── render side (no network, no credentials) ───────────────────────

// Return `d` with `rate_limits.seven_day_fable` added from the cache when
// it belongs to the same account, and kick a background refresh when the
// cache is due. Never throws.
export function applyFableUsage(d, { cliPath, ccVersion } = {}) {
  try {
    const rl = d?.rate_limits;
    const cache = readJson(CACHE());
    const now = nowSec();

    // Already provided by Claude Code itself → nothing to add.
    const native = rl && (rl.seven_day_fable || rl.seven_day_overage_included);

    const sessionWeekly = Number(rl?.seven_day?.resets_at);
    const sameAccount = Boolean(
      cache?.weekly_resets_at && Number.isFinite(sessionWeekly)
      && Math.abs(cache.weekly_resets_at - sessionWeekly) <= RESET_MATCH_TOL_SEC,
    );

    if (!native) maybeRefresh({ cache, sameAccount, sessionWeekly, now, cliPath, ccVersion });

    const f = cache?.fable;
    if (native || !sameAccount || !f) return d;
    // A Fable window whose reset already passed is still injected — the
    // renderer shows it as 0% until the next refresh brings new numbers.
    return {
      ...d,
      rate_limits: {
        ...rl,
        seven_day_fable: { used_percentage: clampPct(f.used_percentage), resets_at: f.resets_at },
      },
    };
  } catch {
    return d;
  }
}

function lockHeld() {
  try { return Date.now() - statSync(LOCK()).mtimeMs < LOCK_STALE_MS; } catch { return false; }
}

function maybeRefresh({ cache, sameAccount, sessionWeekly, now, cliPath, ccVersion }) {
  if (!cliPath) return;
  if (cache?.next_try_at && now < cache.next_try_at) return;     // error backoff
  const fetchedAt = cache?.fetched_at ?? 0;
  const due = !cache
    || now - fetchedAt >= TTL_SEC
    // Account changed (cswap) or the weekly window rolled over — refresh
    // early, but never more than once a minute.
    || (Number.isFinite(sessionWeekly) && !sameAccount && now - fetchedAt >= MIN_GAP_SEC);
  if (!due || lockHeld()) return;

  const args = [cliPath, "__fable-refresh"];
  if (typeof ccVersion === "string" && /^[0-9][0-9a-z.+-]{0,31}$/i.test(ccVersion)) {
    args.push(`--cc-version=${ccVersion}`);
  }
  try {
    spawn(process.execPath, args, { detached: true, stdio: "ignore" }).unref();
  } catch {}
}

// ── refresher (background process) ─────────────────────────────────

function acquireLock() {
  mkdirSync(DIR(), { recursive: true });
  try {
    closeSync(openSync(LOCK(), "wx"));
    return true;
  } catch {
    if (lockHeld()) return false;
    try { unlinkSync(LOCK()); closeSync(openSync(LOCK(), "wx")); return true; } catch { return false; }
  }
}

// `security -w` prints the value followed by a newline — but as a hex
// string when the value contains any non-ASCII byte (observed with
// Claude Code's item). Undo that, then cut to the outermost JSON object.
export function decodeSecurityOutput(raw) {
  let s = String(raw ?? "").replace(/\r?\n$/, "");
  if (!s) return null;
  if (s[0] !== "{" && s.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(s)) {
    s = Buffer.from(s, "hex").toString("utf8");
  }
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  return a >= 0 && b > a ? s.slice(a, b + 1) : null;
}

// Read only the access token and its expiry. Never refreshes, never
// returns or stores the refresh token. `trace` collects step outcomes
// (no secret values) for `__fable-refresh --verbose`.
// Key names only (never values) — enough to tell "wrong item" from
// "schema changed" in `--verbose` output.
function shapeOf(obj) {
  const names = (o) => Object.keys(o || {})
    .map((k) => (/^[A-Za-z][A-Za-z0-9_]{0,40}$/.test(k) ? k : "?"))
    .join(",") || "-";
  const oauth = obj?.claudeAiOauth;
  return `keys=[${names(obj)}]` + (oauth && typeof oauth === "object" ? ` claudeAiOauth=[${names(oauth)}]` : "");
}

function readAccessToken(trace = []) {
  const pick = (raw, src) => {
    const json = src.startsWith("keychain") ? decodeSecurityOutput(raw) : raw;
    if (!json) { trace.push(`${src}: empty or unrecognized output`); return null; }
    let obj;
    try { obj = JSON.parse(json); } catch {
      trace.push(`${src}: not JSON`); return null;
    }
    const o = obj?.claudeAiOauth;
    if (!o || typeof o.accessToken !== "string" || !o.accessToken) {
      trace.push(`${src}: no claudeAiOauth.accessToken (${shapeOf(obj)})`); return null;
    }
    const exp = Number(o.expiresAt) || null;
    // expiresAt is epoch ms; tolerate seconds just in case.
    const expiresAt = exp && exp < 1e12 ? exp * 1000 : exp;
    trace.push(`${src}: access token found${expiresAt ? `, expires in ${Math.round((expiresAt - Date.now()) / 60000)} min` : ""}`);
    return { token: o.accessToken, expiresAt };
  };
  if (process.platform === "darwin") {
    // Claude Code writes the item with account = the macOS user. Ask for
    // that one first — other items can share the service name — then
    // fall back to the first match.
    let user = null;
    try { user = userInfo().username; } catch {}
    const attempts = user ? [["-a", user], []] : [[]];
    for (const acct of attempts) {
      const src = acct.length ? "keychain(account=$USER)" : "keychain(any account)";
      try {
        const raw = execFileSync("/usr/bin/security",
          ["find-generic-password", "-s", "Claude Code-credentials", ...acct, "-w"],
          { encoding: "utf8", timeout: 5000, stdio: ["ignore", "pipe", "ignore"] });
        const got = pick(raw, src);
        if (got) return got;
      } catch (e) {
        trace.push(`${src}: ${e?.status === 44 ? "no such item" : `security failed (${e?.status != null ? `exit ${e.status}` : e?.signal || e?.code || "error"})`}`);
      }
    }
  }
  const dir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude");
  try {
    return pick(readFileSync(join(dir, ".credentials.json"), "utf8"), "credentials.json");
  } catch {
    trace.push("credentials.json: not found");
    return null;
  }
}

async function fetchUsage(ccVersion, trace = []) {
  const fixture = process.env.CLAUDE_CAT_FABLE_FIXTURE;
  if (fixture) {
    const json = readJson(fixture);
    trace.push(json ? "fixture: loaded" : "fixture: unreadable");
    return json ? { ok: true, json } : { ok: false, reason: "bad_response" };
  }

  const cred = readAccessToken(trace);
  if (!cred) return { ok: false, reason: "credential" };
  if (cred.expiresAt && cred.expiresAt <= Date.now()) return { ok: false, reason: "expired" };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${cred.token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": `claude-code/${ccVersion || "2"}`,
        Accept: "application/json",
      },
    });
    trace.push(`usage API: HTTP ${res.status}`);
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (res.status === 429) {
      const ra = Number(res.headers.get("retry-after"));
      return { ok: false, reason: "rate_limited", retryAfter: Number.isFinite(ra) && ra > 0 ? ra : null };
    }
    if (!res.ok) return { ok: false, reason: "network", detail: `http_${res.status}` };
    return { ok: true, json: await res.json() };
  } catch (e) {
    const detail = e?.name === "AbortError" ? "timeout" : (e?.cause?.code || e?.name || "error");
    trace.push(`usage API: ${detail}`);
    return { ok: false, reason: "network", detail: String(detail).slice(0, 40) };
  } finally {
    clearTimeout(timer);
  }
}

export async function runRefresh(argv = []) {
  // --verbose: print each step (never the token) and ignore the backoff
  // window — for a one-off manual check.
  const verbose = argv.includes("--verbose");
  const say = (m) => { if (verbose) process.stdout.write(m + "\n"); };
  if (!acquireLock()) { say("another refresh is running — try again in a minute"); return; }
  const ccVersion = argv.find((a) => a.startsWith("--cc-version="))?.slice("--cc-version=".length);
  const prev = readJson(CACHE()) || {};
  const now = nowSec();
  const trace = [];
  try {
    const r = await fetchUsage(ccVersion, trace);
    const parsed = r.ok ? parseUsage(r.json) : null;
    trace.forEach((t) => say("  " + t));
    if (parsed) {
      writeJsonAtomic(CACHE(), {
        fetched_at: now,
        next_try_at: 0,
        status: "ok",
        detail: null,
        weekly_resets_at: parsed.weekly_resets_at,
        fable: parsed.fable,
      });
      say(parsed.fable
        ? `✔ fable ${parsed.fable.used_percentage}% · resets ${new Date(parsed.fable.resets_at * 1000).toLocaleString()}`
        : "✔ usage fetched — this account has no Fable weekly limit");
    } else {
      const reason = r.ok ? "bad_response" : r.reason;
      const wait = Math.max(r.retryAfter || 0, BACKOFF[reason] || BACKOFF.network);
      // Keep the last good numbers; only push the next attempt out.
      writeJsonAtomic(CACHE(), {
        ...prev, next_try_at: now + wait, status: reason, detail: r.detail ?? null, failed_at: now,
      });
      say(`✖ ${reason} — next automatic try in ${Math.round(wait / 60)} min`);
    }
  } finally {
    try { unlinkSync(LOCK()); } catch {}
  }
}

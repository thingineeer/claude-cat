// Input sanitization for untrusted payload fields.
//
// stdin comes from Claude Code, but its *contents* originate upstream
// (server JSON, cache files written by other processes). Any string
// field we render directly into the terminal has to be stripped of
// control characters, or an attacker who can influence the payload
// can inject ANSI escape sequences:
//
//   • \x1b[2J\x1b[H          clear screen + move cursor home
//   • \x1b]0;TITLE\x07       change terminal window title (OSC 0)
//   • \x1b]8;;url\x07..\x07  embed a clickable hyperlink (OSC 8)
//   • \x07                   BEL spam
//   • \n / \r                split into fake status lines
//
// We strip C0 controls (0x00–0x1F) and DEL (0x7F). This is stricter
// than needed (space/tab survive, but newlines don't) and that's
// intentional — a status line is a single span of printable text.
// Printable Unicode (including CJK and emoji) passes through unchanged.

const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

// Strip control characters from a string. Non-strings (number, null,
// undefined) pass through unchanged so call sites don't have to
// type-check before calling.
export function sanitizeText(v) {
  if (typeof v !== "string") return v;
  return v.replace(CONTROL_CHARS, "");
}

// Validate a rate_limits bucket key. Legitimate keys from Claude Code
// look like `five_hour`, `seven_day`, `seven_day_opus_4x` — alphanum
// plus underscore, starting with a letter. Anything else (path
// traversal, shell metachars, ANSI) is rejected and the renderer
// falls back to displaying the raw key as `?` so the UI isn't
// spoofable via window names.
const SAFE_KEY = /^[a-z][a-z0-9_]*$/i;
export function isSafeWindowKey(k) {
  return typeof k === "string" && k.length <= 64 && SAFE_KEY.test(k);
}

// Clamp a percentage into the plausible [0, 100] range so a malformed
// server value (negative, 999999999%) can't distort bar widths or
// inject extra columns into a single-line layout.
export function clampPct(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
}

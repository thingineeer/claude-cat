// Compute printable width for status-line alignment.
// Counts East Asian Wide / Fullwidth code points as 2 columns, everything
// else as 1. ANSI escape sequences are stripped first. Dependency-free
// to keep cold start fast.
//
// The ranges below cover the practical subset we care about for terminal
// labels: Hangul, CJK ideographs, Hiragana/Katakana, Fullwidth ASCII,
// and common fullwidth punctuation. It's not a full implementation of
// UAX #11, but it produces correct columns for claude-cat's labels.

// Ranges MUST stay sorted ascending — isWide() relies on early-exit.
const WIDE = [
  [0x1100, 0x115F],   // Hangul Jamo
  [0x231A, 0x231B],   // Watch / Hourglass (emoji-presentation by default)
  [0x2328, 0x2328],   // Keyboard
  [0x23E9, 0x23EC],   // Fast-forward etc.
  [0x23F0, 0x23F3],   // Alarm / Hourglass family
  [0x25FD, 0x25FE],   // Medium small square
  [0x2600, 0x26FF],   // Misc Symbols (☕, ☀ …)
  [0x2700, 0x27BF],   // Dingbats
  [0x2E80, 0x303E],   // CJK Radicals, Kangxi Radicals, etc.
  [0x3041, 0x33FF],   // Hiragana, Katakana, Bopomofo, Hangul Compatibility Jamo, CJK Symbols
  [0x3400, 0x4DBF],   // CJK Extension A
  [0x4E00, 0x9FFF],   // CJK Unified Ideographs
  [0xA000, 0xA4CF],   // Yi
  [0xAC00, 0xD7A3],   // Hangul Syllables
  [0xF900, 0xFAFF],   // CJK Compatibility Ideographs
  [0xFE30, 0xFE4F],   // CJK Compatibility Forms
  [0xFF00, 0xFF60],   // Fullwidth ASCII + symbols
  [0xFFE0, 0xFFE6],   // Fullwidth currency etc.
  // Emoji — most modern terminals render these at 2 cells even though
  // Unicode classifies them as Emoji_Presentation rather than EAW.
  [0x1F300, 0x1F5FF], // Misc Symbols & Pictographs (🍣, 💤, 🛌 …)
  [0x1F600, 0x1F64F], // Emoticons
  [0x1F680, 0x1F6FF], // Transport & Map
  [0x1F900, 0x1F9FF], // Supplemental Symbols & Pictographs
];

function isWide(cp) {
  for (let i = 0; i < WIDE.length; i++) {
    const [a, b] = WIDE[i];
    if (cp >= a && cp <= b) return true;
    if (cp < a) return false; // ranges are sorted
  }
  return false;
}

// Zero-width code points that must not count toward display columns.
function isZeroWidth(cp) {
  if (cp === 0x200D) return true;                    // ZWJ
  if (cp >= 0xFE00 && cp <= 0xFE0F) return true;     // Variation Selectors 1–16
  if (cp >= 0xE0100 && cp <= 0xE01EF) return true;   // Variation Selectors Supplement
  if (cp >= 0x0300 && cp <= 0x036F) return true;     // Combining Diacritical Marks
  return false;
}

export function stripAnsi(s) {
  // Strip SGR sequences we use. Keep it intentionally narrow — we know
  // what escapes we emit (CSI m).
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// Printable column width of `s`, honoring East Asian Width + common
// Emoji ranges + zero-width controls for the code points claude-cat
// actually emits.
export function displayWidth(s) {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    const cp = ch.codePointAt(0);
    if (isZeroWidth(cp)) continue;
    w += isWide(cp) ? 2 : 1;
  }
  return w;
}

// Pad `s` on the right with ASCII spaces to reach `cols` columns of
// display width. If `s` is already wider than `cols`, returns it unchanged.
export function padEndDisplay(s, cols) {
  const pad = cols - displayWidth(s);
  return pad > 0 ? s + " ".repeat(pad) : s;
}

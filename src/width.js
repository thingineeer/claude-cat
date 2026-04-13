// Compute printable width for status-line alignment.
// Counts East Asian Wide / Fullwidth code points as 2 columns, everything
// else as 1. ANSI escape sequences are stripped first. Dependency-free
// to keep cold start fast.
//
// The ranges below cover the practical subset we care about for terminal
// labels: Hangul, CJK ideographs, Hiragana/Katakana, Fullwidth ASCII,
// and common fullwidth punctuation. It's not a full implementation of
// UAX #11, but it produces correct columns for claude-cat's labels.

const WIDE = [
  [0x1100, 0x115F], // Hangul Jamo
  [0x2E80, 0x303E], // CJK Radicals Supplement, Kangxi Radicals, etc.
  [0x3041, 0x33FF], // Hiragana, Katakana, Bopomofo, Hangul Compatibility Jamo, CJK Symbols
  [0x3400, 0x4DBF], // CJK Extension A
  [0x4E00, 0x9FFF], // CJK Unified Ideographs
  [0xA000, 0xA4CF], // Yi
  [0xAC00, 0xD7A3], // Hangul Syllables
  [0xF900, 0xFAFF], // CJK Compatibility Ideographs
  [0xFE30, 0xFE4F], // CJK Compatibility Forms
  [0xFF00, 0xFF60], // Fullwidth ASCII + symbols
  [0xFFE0, 0xFFE6], // Fullwidth currency etc.
];

function isWide(cp) {
  for (let i = 0; i < WIDE.length; i++) {
    const [a, b] = WIDE[i];
    if (cp >= a && cp <= b) return true;
    if (cp < a) return false; // ranges are sorted
  }
  return false;
}

export function stripAnsi(s) {
  // Strip SGR sequences we use. Keep it intentionally narrow — we know
  // what escapes we emit (CSI m).
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

// Printable column width of `s`, honoring East Asian Width for the code
// points claude-cat actually emits.
export function displayWidth(s) {
  const plain = stripAnsi(s);
  let w = 0;
  for (const ch of plain) {
    w += isWide(ch.codePointAt(0)) ? 2 : 1;
  }
  return w;
}

// Pad `s` on the right with ASCII spaces to reach `cols` columns of
// display width. If `s` is already wider than `cols`, returns it unchanged.
export function padEndDisplay(s, cols) {
  const pad = cols - displayWidth(s);
  return pad > 0 ? s + " ".repeat(pad) : s;
}

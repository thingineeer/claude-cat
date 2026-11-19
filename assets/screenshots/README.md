# Screenshots

Images used by the READMEs. Keep the filenames stable — the READMEs
reference them by path.

| file | shows | command |
| ---- | ----- | ------- |
| `compact.png` | real Claude Code 2.1.328 capture, one line + `--fable-usage` (README hero) | `npx -y claude-cat@latest --hide=opus,sonnet --fable-usage` |
| `kawaii-full.png` | `--full --kawaii`, week + Fable (Layouts section) | `node bin/cli.js --full --kawaii --no-debug-chip` |
| `configure-wizard.gif` | `claude-cat configure` walkthrough | `node bin/cli.js configure` |

## Re-capturing

Render the command against a fixture with far-future resets (e.g.
`examples/sample-ultra-fable.json`, with `resets_at` edited to a date
a few days out so the reset phrase reads naturally), either from a
real terminal or by converting the ANSI output to HTML and taking an
element screenshot. Crop to the status-line rows and export as PNG.

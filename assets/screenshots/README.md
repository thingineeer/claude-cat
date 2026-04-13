# Screenshots

Terminal captures used by the main README's "Modes at a glance" gallery.
Stored as PNGs rather than GIFs so GitHub can inline them without
autoplaying.

| file                  | mode shown                                          | command                                            |
| --------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `kawaii-full.png`     | `--full --kawaii`, curious mood (English README hero) | `node bin/cli.js --full --kawaii --no-debug-chip`  |
| `kawaii-chill.png`    | `--full --kawaii`, chill mood (Korean README hero)    | `node bin/cli.js --full --kawaii --no-debug-chip`  |
| `compact-short.png`   | default single-line (short labels + `|`)              | `node bin/cli.js --no-debug-chip`                  |

## Re-capturing

1. Temporarily switch `~/.claude/settings.json` statusLine `command`
   to the matching one from the table above (keep `--no-debug-chip`
   so the `[Debug]` chip doesn't show up in the frame).
2. Let the status line settle into the mood you want to showcase.
3. Crop the terminal to just the status-line rows. Export as PNG at
   the terminal's native resolution — no scaling.
4. Drop the file into this directory with the same filename as the
   row in the table so the README keeps working.

Please keep the filenames stable; the main README references them by
path and editing names breaks the inline images.

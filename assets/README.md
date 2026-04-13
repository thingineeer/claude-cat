# Brand assets

Hand-drawn neon line art. Use for docs, social preview, and talk slides.
Terminals themselves render the ASCII cat faces defined in `src/cats.js` —
SVGs here are for the *web* side of the project.

| Asset                | Purpose                  | Usage state (terminal)                         |
| -------------------- | ------------------------ | ---------------------------------------------- |
| `logo.svg`           | README / social preview  | `/ᐠ - ˕ - ᐟ\`                                  |
| `face-chill.svg`     | usage 0–30%              | `/ᐠ - ˕ - ᐟ\`                                  |
| `face-curious.svg`   | usage 30–60%             | `/ᐠ ｡ㅅ｡ᐟ\`                                    |
| `face-alert.svg`     | usage 60–85%             | `/ᐠ •ㅅ• ᐟ\`                                   |
| `face-nervous.svg`   | usage 85–95%             | `/ᐠ ≻ㅅ≺ ᐟ\`                                   |
| `face-critical.svg`  | usage 95%+               | `/ᐠ ✖ㅅ✖ ᐟ\`                                   |

## Style notes

- Background: `#0d1117` (GitHub dark), 24px rounded corners
- Line: 5px, rounded caps, a soft Gaussian glow
- Colors shift with intensity:
  - chill / curious → `#00FF88` (neon green)
  - alert           → `#FFCC33`
  - nervous         → `#FF7733`
  - critical        → `#FF3355` (stronger glow)

All SVGs are 200×200 and scale freely. To render a PNG preview:

```bash
rsvg-convert -w 512 assets/logo.svg -o logo.png
```

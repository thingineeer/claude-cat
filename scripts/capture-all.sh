#!/usr/bin/env bash
# Render every (layout × theme × fixture) combination and write the
# output to tmp/snapshots/. Useful as a hand-reviewed visual check
# before opening a PR — CI only does a smoke run, but this script lets
# the maintainer flip through captures to see the look hold up.
#
# Outputs both:
#   raw/   — with ANSI escapes (paste into a terminal to see the colors)
#   plain/ — ANSI stripped (easy to diff)
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
out="tmp/snapshots"
rm -rf "$out"
mkdir -p "$out/raw" "$out/plain"

layouts=(compact full wide)
themes=(compact kawaii none)
fixtures=(
  examples/sample-stdin.json
  examples/sample-with-sonnet.json
  examples/sample-critical.json
  examples/sample-api-only.json
  examples/sample-warming-up.json
  examples/sample-weekly-saturated.json
  examples/sample-api-cost-only.json
)

strip_ansi() { sed -E $'s/\x1b\\[[0-9;]*m//g'; }

for fx in "${fixtures[@]}"; do
  name="$(basename "$fx" .json)"
  for layout in "${layouts[@]}"; do
    for theme in "${themes[@]}"; do
      tag="${name}__${layout}__${theme}"
      raw="$out/raw/${tag}.txt"
      plain="$out/plain/${tag}.txt"
      LANG=en_US.UTF-8 node bin/cli.js "--layout=${layout}" "--cat=${theme}" <"$fx" >"$raw"
      strip_ansi <"$raw" >"$plain"
    done
  done
done

echo "✓ ${#fixtures[@]} fixtures × ${#layouts[@]} layouts × ${#themes[@]} themes"
echo "  wrote $(find "$out" -type f | wc -l | tr -d ' ') files under $out/"
echo
echo "quick peek:"
for tag in \
  sample-stdin__full__kawaii \
  sample-warming-up__full__kawaii \
  sample-api-cost-only__full__kawaii \
  sample-weekly-saturated__full__kawaii \
  sample-critical__full__kawaii \
  sample-with-sonnet__wide__compact; do
  echo "--- $tag ---"
  cat "$out/plain/${tag}.txt"
  echo
done

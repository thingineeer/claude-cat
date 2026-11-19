#!/usr/bin/env node
const [sub] = process.argv.slice(2);

if (sub === "configure") {
  await import("../src/configure/index.js").then((m) => m.run());
} else if (sub === "update") {
  await import("../src/update.js").then((m) => m.run());
} else if (sub === "__fable-refresh") {
  // Internal: background refresher spawned by `--fable-usage` renders.
  await import("../src/fable.js").then((m) => m.runRefresh(process.argv.slice(3)));
} else if (sub === "--version" || sub === "-v" || sub === "version") {
  await import("../src/update.js").then((m) => console.log(m.ownVersion() ?? "unknown"));
} else {
  await import("../src/statusline.js");
}

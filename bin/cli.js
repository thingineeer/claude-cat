#!/usr/bin/env node
const [sub] = process.argv.slice(2);

if (sub === "configure") {
  await import("../src/configure/index.js").then((m) => m.run());
} else if (sub === "update") {
  await import("../src/update.js").then((m) => m.run());
} else if (sub === "--version" || sub === "-v" || sub === "version") {
  await import("../src/update.js").then((m) => console.log(m.ownVersion() ?? "unknown"));
} else {
  await import("../src/statusline.js");
}

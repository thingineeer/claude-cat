#!/usr/bin/env node
const [sub] = process.argv.slice(2);

if (sub === "configure") {
  await import("../src/configure/index.js").then((m) => m.run());
} else {
  await import("../src/statusline.js");
}

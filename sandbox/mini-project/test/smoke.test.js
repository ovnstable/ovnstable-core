import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const requiredFiles = [
  "README.md",
  "package.json",
  "server.js",
  "public/index.html",
  "public/styles.css",
  "public/app.js",
];

for (const filePath of requiredFiles) {
  const content = await readFile(new URL(`../${filePath}`, import.meta.url), "utf8");
  assert.ok(content.length > 0, `${filePath} should not be empty`);
}

const indexHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
assert.ok(indexHtml.includes("Sandbox / team review"));
assert.ok(indexHtml.includes("app.js"));

const appJs = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
assert.ok(appJs.includes("Only files under sandbox/mini-project/"));

console.log("Sandbox smoke test passed");

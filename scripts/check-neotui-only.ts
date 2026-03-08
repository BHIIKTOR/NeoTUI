import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const forbiddenPaths = [
  "bin",
  "browser",
  pathFragments("docs/", "leg", "acy", "-unsupported.md"),
  pathFragments("docs/", "migration", ".md"),
  "example",
  "index.js",
  pathFragments("initial", "-refactor"),
  "lib",
  pathFragments("neotui-glm5-", "multiagent-report.md"),
  pathFragments("packages/", "leg", "acy"),
  "test",
];

const forbiddenPatterns = [
  pathFragments("neo", "-blessed"),
  pathFragments("@neotui/", "leg", "acy"),
  pathFragments("initial", "-refactor"),
  pathFragments("require('./lib/", "blessed')"),
  pathFragments('require("./lib/', 'blessed")'),
  pathFragments("leg", "acy", ".screen("),
];

const scanRoots = [
  ".editorconfig",
  ".github",
  "README.md",
  "apps",
  "artifacts",
  "bench",
  "biome.json",
  "bunfig.toml",
  "docs",
  "examples",
  "package.json",
  "packages",
  "scripts",
  "skills",
  "tsconfig.base.json",
  "tsconfig.json",
];

const ignoredFiles = new Set(["scripts/check-neotui-only.ts"]);

const textExtensions = new Set([
  "",
  ".css",
  ".json",
  ".js",
  ".jsx",
  ".md",
  ".mjs",
  ".toml",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const failures: string[] = [];

for (const path of forbiddenPaths) {
  if (existsSync(path)) {
    failures.push(`Forbidden path present: ${path}`);
  }
}

for (const root of scanRoots) {
  visit(root);
}

if (failures.length > 0) {
  console.error("NeoTui-only check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("NeoTui-only check passed.");

function visit(path: string): void {
  if (!existsSync(path)) {
    return;
  }

  const stats = statSync(path);
  if (stats.isDirectory()) {
    if (path === "dist" || path.endsWith("/dist")) {
      return;
    }

    for (const entry of readdirSync(path)) {
      if (entry === ".git" || entry === "node_modules") {
        continue;
      }
      visit(join(path, entry));
    }
    return;
  }

  if (!shouldScanText(path)) {
    return;
  }

  if (ignoredFiles.has(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (content.includes(pattern)) {
      failures.push(`Forbidden reference "${pattern}" found in ${path}`);
    }
  }
}

function shouldScanText(path: string): boolean {
  return textExtensions.has(extname(path));
}

function pathFragments(...parts: string[]): string {
  return parts.join("");
}

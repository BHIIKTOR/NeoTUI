import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  ASCIIFontRenderable,
  CodeRenderable,
  createKittyRenderer,
  DiffRenderable,
  LineNumberRenderable,
  MarkdownRenderable,
} from "@neotui/core";
import {
  codeFixture,
  diffAfterFixture,
  diffBeforeFixture,
  largeTextFixture,
  markdownFixture,
} from "@neotui/fixtures";
import {
  type BenchmarkReport,
  type BenchmarkScenarioResult,
  benchmarkScenarioKnown,
  createStats,
  writeJsonArtifact,
} from "@neotui/test-utils";

const MILESTONE = "m11";
const ITERATIONS = 20;
const OUTPUT_PATH = fileURLToPath(
  new URL("../artifacts/benchmarks/m11/advanced-components.json", import.meta.url),
);

async function main(): Promise<void> {
  const scenarios: BenchmarkScenarioResult[] = [
    measure("advanced-markdown-render", () => {
      createAdvancedRenderer("markdown").renderFrame();
    }),
    measure("advanced-code-render", () => {
      createAdvancedRenderer("code").renderFrame();
    }),
    measure("advanced-diff-render", () => {
      createAdvancedRenderer("diff").renderFrame();
    }),
    measure("advanced-large-text-render", () => {
      createAdvancedRenderer("large-text").renderFrame();
    }),
  ];

  for (const scenario of scenarios) {
    if (!benchmarkScenarioKnown(scenario.scenarioId)) {
      throw new Error(`Unknown benchmark scenario: ${scenario.scenarioId}`);
    }
  }

  const report: BenchmarkReport = {
    milestone: MILESTONE,
    capturedAt: new Date().toISOString(),
    runtime: "bun",
    runtimeVersion: Bun.version,
    platform: process.platform,
    arch: process.arch,
    scenarios,
  };

  await writeJsonArtifact(OUTPUT_PATH, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

function createAdvancedRenderer(mode: "markdown" | "code" | "diff" | "large-text") {
  const renderer = createKittyRenderer({
    appName: `bench-${mode}`,
    width: 96,
    height: 28,
    exitOnCtrlC: false,
  });

  renderer.root.updateLayout({ padding: 1, gap: 1 });

  switch (mode) {
    case "markdown":
      renderer.add(
        new MarkdownRenderable({
          markdown: markdownFixture,
          layout: { height: 6 },
        }),
      );
      break;
    case "code":
      renderer.add(
        new CodeRenderable({
          code: codeFixture,
          language: "ts",
          lineNumbers: true,
          layout: { height: 6 },
        }),
        new LineNumberRenderable({
          lines: 8,
          layout: { width: 4, height: 8 },
        }),
      );
      break;
    case "diff":
      renderer.add(
        new DiffRenderable({
          before: diffBeforeFixture,
          after: diffAfterFixture,
          split: true,
          layout: { height: 8 },
        }),
      );
      break;
    case "large-text":
      renderer.add(
        new MarkdownRenderable({
          markdown: largeTextFixture,
          layout: { flexGrow: 1, height: 18 },
        }),
        new ASCIIFontRenderable({
          content: "neo",
          layout: { height: 5 },
        }),
      );
      break;
  }

  return renderer;
}

function measure(scenarioId: string, fn: () => void): BenchmarkScenarioResult {
  const samplesMs: number[] = [];

  for (let index = 0; index < ITERATIONS; index += 1) {
    const startedAt = performance.now();
    fn();
    samplesMs.push(performance.now() - startedAt);
  }

  return {
    scenarioId,
    runtime: "bun",
    iterations: ITERATIONS,
    samplesMs,
    stats: createStats(samplesMs),
  };
}

await main();

import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  BoxRenderable,
  CodeRenderable,
  createKittyRenderer,
  DiffRenderable,
  ImageRenderable,
  InputRenderable,
  MarkdownRenderable,
  SelectRenderable,
  TabSelectRenderable,
  TextareaRenderable,
} from "@neotui/core";
import {
  type BenchmarkReport,
  type BenchmarkScenarioResult,
  benchmarkScenarioKnown,
  createStats,
  writeJsonArtifact,
} from "@neotui/test-utils";

const MILESTONE = "m4";
const ITERATIONS = 25;
const OUTPUT_PATH = fileURLToPath(
  new URL("../artifacts/benchmarks/m4/renderer-baseline.json", import.meta.url),
);

async function main(): Promise<void> {
  const scenarios: BenchmarkScenarioResult[] = [
    measure("renderer-empty-startup", () => {
      const renderer = createKittyRenderer({ appName: "bench-empty", width: 80, height: 24 });
      renderer.renderFrame();
    }),
    measure("renderer-full-render", () => {
      const renderer = createScenarioRenderer();
      renderer.renderFrame();
    }),
    measure("renderer-partial-invalidation", () => {
      const renderer = createScenarioRenderer();
      const input = findInput(renderer.root);

      renderer.renderFrame();
      input?.setValue("updated benchmark");
      renderer.renderFrame();
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

function findInput(node: BoxRenderable): InputRenderable | null {
  for (const child of node.children) {
    if (child instanceof InputRenderable) {
      return child;
    }

    if (child instanceof BoxRenderable) {
      const nested = findInput(child);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function createScenarioRenderer() {
  const renderer = createKittyRenderer({
    appName: "bench-scenario",
    width: 100,
    height: 30,
    exitOnCtrlC: false,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });

  const tabs = new TabSelectRenderable({
    options: ["Overview", "Code", "Docs"],
    descriptions: ["kitten-safe", "fast", "typed"],
    layout: { height: 2 },
  });
  const row = new BoxRenderable({
    layout: { flexDirection: "row", flexGrow: 1, gap: 1 },
  });
  const nav = new SelectRenderable({
    options: ["inputs", "markdown", "diff", "image"],
    layout: { width: "22%", minWidth: 18 },
    title: "nav",
  });
  const content = new BoxRenderable({
    layout: { flexGrow: 1, gap: 1 },
    style: { border: true, title: "content" },
  });
  const input = new InputRenderable({
    value: "benchmark",
    placeholder: "type here",
    layout: { height: 3 },
  });
  const textarea = new TextareaRenderable({
    value: "alpha\nbeta\ngamma",
    layout: { height: 7 },
  });
  const markdown = new MarkdownRenderable({
    markdown: "# Bench\n- renderer\n- widgets\nVisit [docs](https://opentui.com)",
    layout: { height: 6 },
  });
  const diff = new DiffRenderable({
    before: "old line\nsame",
    after: "new line\nsame",
    layout: { height: 6 },
  });
  const code = new CodeRenderable({
    code: "const app = createKittyRenderer();\napp.renderFrame();",
    language: "ts",
    lineNumbers: true,
    layout: { height: 6 },
  });
  const image = new ImageRenderable({
    source: "/tmp/demo.png",
    alt: "preview",
    layout: { height: 5 },
  });

  row.add(nav, content);
  content.add(input, textarea, markdown, diff, code, image);
  renderer.add(tabs, row);

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

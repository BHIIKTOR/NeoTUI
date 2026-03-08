import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { createSelection, EditingBuffer, serializeSelection, wrapText } from "@neotui/core";
import {
  type BenchmarkReport,
  type BenchmarkScenarioResult,
  benchmarkScenarioKnown,
  createStats,
  writeJsonArtifact,
} from "@neotui/test-utils";

const ITERATIONS = 30;
const OUTPUT_PATH = fileURLToPath(
  new URL("../artifacts/benchmarks/m8/text-engine.json", import.meta.url),
);

const sample = Array.from({ length: 10000 }, (_, index) => `line ${index} alpha beta gamma`).join(
  "\n",
);

async function main(): Promise<void> {
  const scenarios: BenchmarkScenarioResult[] = [
    measure("text-wrap-10k", () => {
      wrapText(sample, 80, "word");
    }),
    measure("text-edit-latency", () => {
      const buffer = new EditingBuffer(sample);
      buffer.moveEnd();
      buffer.insert("!");
      buffer.backspace();
    }),
    measure("text-selection-large", () => {
      const selection = createSelection(10, 4000);
      serializeSelection(sample, selection);
    }),
  ];

  for (const scenario of scenarios) {
    if (!benchmarkScenarioKnown(scenario.scenarioId)) {
      throw new Error(`Unknown benchmark scenario: ${scenario.scenarioId}`);
    }
  }

  const report: BenchmarkReport = {
    milestone: "m8",
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

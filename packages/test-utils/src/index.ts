import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  BoxRenderable,
  createKittyRenderer,
  FrameBufferRenderable,
  type KittyRenderer,
  type Renderable,
  ScrollBarRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "@neotui/core";
import { benchmarkScenarioIds, type FixtureNode, type LayoutFixture } from "@neotui/fixtures";

export interface BenchmarkStats {
  minMs: number;
  maxMs: number;
  meanMs: number;
  p50Ms: number;
  p95Ms: number;
}

export interface BenchmarkScenarioResult {
  scenarioId: string;
  runtime: string;
  iterations: number;
  samplesMs: number[];
  stats: BenchmarkStats;
}

export interface BenchmarkReport {
  milestone: string;
  capturedAt: string;
  runtime: string;
  runtimeVersion: string;
  platform: string;
  arch: string;
  scenarios: BenchmarkScenarioResult[];
}

export interface MemoryTerminalOutput {
  chunks: string[];
  columns: number;
  rows: number;
  resizeListeners: Set<() => void>;
  write(chunk: string): void;
  transcript(): string;
  on(event: "resize", listener: () => void): void;
  off(event: "resize", listener: () => void): void;
  emitResize(width: number, height: number): void;
}

export interface MemoryTerminalInput {
  isTTY: true;
  rawModeCalls: boolean[];
  resumeCalls: number;
  pauseCalls: number;
  setRawMode(value: boolean): void;
  resume(): void;
  pause(): void;
}

export interface MemorySignalTarget {
  listeners: Map<string, Set<() => void>>;
  on(signal: string, listener: () => void): void;
  off(signal: string, listener: () => void): void;
  emit(signal: string): void;
}

export function createFrameSnapshot(lines: readonly string[]): string {
  return lines.join("\n");
}

export function createProtocolTranscript(chunks: readonly string[]): string {
  return chunks.join("");
}

export function createStats(samplesMs: readonly number[]): BenchmarkStats {
  const samples = [...samplesMs].sort((left, right) => left - right);

  if (samples.length === 0) {
    return { minMs: 0, maxMs: 0, meanMs: 0, p50Ms: 0, p95Ms: 0 };
  }

  const minMs = samples[0] ?? 0;
  const maxMs = samples.at(-1) ?? 0;
  const meanMs = samples.reduce((total, sample) => total + sample, 0) / samples.length;
  const p50Ms = percentile(samples, 0.5);
  const p95Ms = percentile(samples, 0.95);

  return { minMs, maxMs, meanMs, p50Ms, p95Ms };
}

export async function writeJsonArtifact(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function benchmarkScenarioKnown(scenarioId: string): boolean {
  return benchmarkScenarioIds.includes(scenarioId as (typeof benchmarkScenarioIds)[number]);
}

export function createTestRenderer(width = 40, height = 12): KittyRenderer {
  return createKittyRenderer({
    appName: "test-renderer",
    width,
    height,
    exitOnCtrlC: false,
  });
}

export function renderFixtureToString(fixture: LayoutFixture): string {
  const renderer = createTestRenderer(fixture.width, fixture.height);
  renderer.add(materializeFixtureNode(fixture.tree));
  return renderer.renderToString();
}

export function materializeFixtureNode(node: FixtureNode): Renderable {
  const renderable = createRenderable(node);

  for (const child of node.children ?? []) {
    renderable.add(materializeFixtureNode(child));
  }

  return renderable;
}

export function createMemoryTerminalOutput(width = 80, height = 24): MemoryTerminalOutput {
  const chunks: string[] = [];
  const resizeListeners = new Set<() => void>();

  return {
    chunks,
    columns: width,
    rows: height,
    resizeListeners,
    write(chunk: string) {
      chunks.push(chunk);
    },
    transcript() {
      return chunks.join("");
    },
    on(event: "resize", listener: () => void) {
      if (event === "resize") {
        resizeListeners.add(listener);
      }
    },
    off(event: "resize", listener: () => void) {
      if (event === "resize") {
        resizeListeners.delete(listener);
      }
    },
    emitResize(nextWidth: number, nextHeight: number) {
      this.columns = nextWidth;
      this.rows = nextHeight;

      for (const listener of resizeListeners) {
        listener();
      }
    },
  };
}

export function createMemoryTerminalInput(): MemoryTerminalInput {
  return {
    isTTY: true,
    rawModeCalls: [],
    resumeCalls: 0,
    pauseCalls: 0,
    setRawMode(value: boolean) {
      this.rawModeCalls.push(value);
    },
    resume() {
      this.resumeCalls += 1;
    },
    pause() {
      this.pauseCalls += 1;
    },
  };
}

export function createMemorySignalTarget(): MemorySignalTarget {
  return {
    listeners: new Map(),
    on(signal: string, listener: () => void) {
      const group = this.listeners.get(signal) ?? new Set<() => void>();
      group.add(listener);
      this.listeners.set(signal, group);
    },
    off(signal: string, listener: () => void) {
      const group = this.listeners.get(signal);
      group?.delete(listener);

      if (group && group.size === 0) {
        this.listeners.delete(signal);
      }
    },
    emit(signal: string) {
      const group = this.listeners.get(signal);

      if (!group) {
        return;
      }

      for (const listener of group) {
        listener();
      }
    },
  };
}

function percentile(values: readonly number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }

  const index = Math.min(values.length - 1, Math.floor(values.length * ratio));

  return values[index] ?? 0;
}

function createRenderable(node: FixtureNode): Renderable {
  switch (node.kind) {
    case "box":
      return new BoxRenderable(
        node.props as unknown as ConstructorParameters<typeof BoxRenderable>[0],
      );
    case "text":
      return new TextRenderable(
        node.props as unknown as ConstructorParameters<typeof TextRenderable>[0],
      );
    case "scrollbox":
      return new ScrollBoxRenderable(
        node.props as unknown as ConstructorParameters<typeof ScrollBoxRenderable>[0],
      );
    case "scrollbar":
      return new ScrollBarRenderable(
        node.props as unknown as ConstructorParameters<typeof ScrollBarRenderable>[0],
      );
    case "framebuffer":
      return new FrameBufferRenderable(
        node.props as unknown as ConstructorParameters<typeof FrameBufferRenderable>[0],
      );
  }
}

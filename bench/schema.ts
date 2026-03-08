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

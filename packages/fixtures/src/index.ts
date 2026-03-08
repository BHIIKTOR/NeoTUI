export const smokeFixtureLines = [
  "NeoTui",
  "kitty-first",
  "bun-first",
  "typescript-first",
] as const;

export {
  codeFixture,
  diffAfterFixture,
  diffBeforeFixture,
  largeTextFixture,
  markdownFixture,
} from "./advanced-fixtures";

export {
  type FixtureNode,
  type FixtureNodeKind,
  type LayoutFixture,
  layoutFixtures,
} from "./layout-fixtures";

export const benchmarkScenarioIds = [
  "advanced-code-render",
  "advanced-diff-render",
  "advanced-large-text-render",
  "advanced-markdown-render",
  "bun-core-bootstrap",
  "bun-smoke-scene-build",
  "renderer-empty-startup",
  "renderer-full-render",
  "renderer-partial-invalidation",
  "text-wrap-10k",
  "text-edit-latency",
  "text-selection-large",
] as const;

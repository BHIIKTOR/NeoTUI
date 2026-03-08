import { expect, test } from "bun:test";
import { BoxRenderable, TextRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("debug overlay can be toggled without destabilizing rendering", () => {
  const renderer = createTestRenderer(30, 10);

  renderer.add(
    new BoxRenderable({
      content: "body",
      layout: { width: "100%", height: "100%" },
      style: { border: true, title: "main" },
    }),
  );

  const withoutOverlay = renderer.renderToString();
  renderer.toggleDebugOverlay(true);
  const withOverlay = renderer.renderToString();
  renderer.toggleDebugOverlay(false);
  const restored = renderer.renderToString();

  expect(withOverlay).toContain("frame=");
  expect(withOverlay).not.toBe(withoutOverlay);
  expect(restored).toBe(withoutOverlay);
});

test("console overlay captures logs without corrupting the main tree", () => {
  const renderer = createTestRenderer(40, 12);

  renderer.add(new TextRenderable({ content: "main-ui" }));
  renderer.captureConsole();
  renderer.toggleConsoleOverlay(true);
  console.log("first log line");
  console.error("second log line");
  const snapshot = renderer.renderToString();
  renderer.releaseConsoleCapture();

  expect(snapshot).toContain("console");
  expect(snapshot).toContain("first log line");
  expect(snapshot).toContain("second log line");
  expect(renderer.consoleLines.length).toBeGreaterThanOrEqual(2);
});

test("render tree dump reflects nested structure", () => {
  const renderer = createTestRenderer(30, 10);
  const outer = new BoxRenderable({
    layout: { padding: 1 },
    style: { border: true, title: "outer" },
  });
  outer.add(new TextRenderable({ content: "inner" }));
  renderer.add(outer);
  renderer.renderFrame();

  const dump = renderer.dumpTree();

  expect(dump).toContain("box#");
  expect(dump).toContain("text#");
});

import { expect, test } from "bun:test";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";
import {
  createMemorySignalTarget,
  createMemoryTerminalInput,
  createMemoryTerminalOutput,
  createTestRenderer,
} from "../src/index.ts";

test("renderer can mount and paint a minimal tree", () => {
  const renderer = createTestRenderer(24, 8);

  renderer.add(
    new BoxRenderable({
      content: "hello",
      layout: { width: 12, height: 5 },
      style: { border: true, title: "box" },
    }),
  );

  const snapshot = renderer.renderToString();

  expect(renderer.milestone).toBe("M10");
  expect(snapshot).toContain("┌");
  expect(snapshot).toContain("hello");
});

test("insert remove and reparent behavior are deterministic", () => {
  const renderer = createTestRenderer(30, 10);
  const left = new BoxRenderable({
    layout: { flexDirection: "column", width: "50%" },
    style: { border: true, title: "left" },
  });
  const right = new BoxRenderable({
    layout: { flexDirection: "column", flexGrow: 1 },
    style: { border: true, title: "right" },
  });
  const child = new TextRenderable({ content: "payload" });

  renderer.root.updateLayout({ flexDirection: "row", gap: 1, padding: 1 });
  renderer.add(left, right);
  left.add(child);
  renderer.renderFrame();

  child.reparent(right);
  const diff = renderer.renderFrame();

  expect(diff.changed).toBe(true);
  expect(left.children.length).toBe(0);
  expect(right.children.length).toBe(1);
  expect(right.children[0]).toBe(child);
});

test("localized updates keep dirty rows localized", () => {
  const renderer = createTestRenderer(30, 10);
  const top = new TextRenderable({ content: "top row" });
  const bottom = new TextRenderable({ content: "bottom row" });

  renderer.root.updateLayout({ gap: 2, padding: 1 });
  renderer.add(top, bottom);
  renderer.renderFrame();

  bottom.setContent("bottom changed");
  const diff = renderer.renderFrame();

  expect(diff.dirtyRows.length).toBeLessThanOrEqual(3);
  expect(renderer.metrics.lastInvalidatedIds).toContain(bottom.id);
});

test("renderer strips ansi and control sequences from rendered text content", () => {
  const renderer = createTestRenderer(40, 8);

  renderer.add(
    new BoxRenderable({
      layout: { width: 30, height: 5 },
      style: { border: true, title: "safe" },
      content: "alpha\u001b[31mred\u001b[0m\tbeta\u0007",
    }),
  );

  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("alphared  beta");
  expect(snapshot).not.toContain("\u001b");
  expect(snapshot).not.toContain("[31m");
});

test("live mode reference counting and pause resume are deterministic", async () => {
  const renderer = createTestRenderer(20, 6);
  const initialFrames = renderer.metrics.frameCount;

  renderer.requestLive();
  await Bun.sleep(40);
  renderer.dropLive();
  const afterLiveFrames = renderer.metrics.frameCount;

  renderer.pause();
  await Bun.sleep(20);
  const pausedFrames = renderer.metrics.frameCount;

  renderer.resume();
  renderer.requestRender("resume-test");
  await Bun.sleep(10);

  expect(afterLiveFrames).toBeGreaterThan(initialFrames);
  expect(pausedFrames).toBe(afterLiveFrames);
  expect(renderer.metrics.frameCount).toBeGreaterThan(pausedFrames);
});

test("repeated mount and unmount cycles do not leak tree state", () => {
  const renderer = createTestRenderer(20, 6);

  for (let index = 0; index < 100; index += 1) {
    const node = new TextRenderable({ content: `row-${index}` });
    renderer.root.add(node);
    renderer.root.remove(node);
  }

  renderer.renderFrame();

  expect(renderer.root.countNodes()).toBe(1);
  expect(renderer.metrics.lastRenderedNodeCount).toBe(1);
});

test("live renderer follows terminal resize events", async () => {
  const input = createMemoryTerminalInput();
  const output = createMemoryTerminalOutput(24, 8);
  const signals = createMemorySignalTarget();
  const renderer = createKittyRenderer({
    appName: "resize-test",
    exitOnCtrlC: false,
    input,
    output,
    signalTarget: signals,
    env: { TERM: "xterm-kitty", KITTY_WINDOW_ID: "1" },
  });

  renderer.add(
    new BoxRenderable({
      content: "responsive",
      layout: { width: "100%", height: "100%" },
      style: { border: true, title: "root" },
    }),
  );

  renderer.start();
  output.emitResize(32, 12);
  await Bun.sleep(5);

  const snapshot = renderer.renderToString();

  expect(renderer.width).toBe(32);
  expect(renderer.height).toBe(12);
  expect(snapshot.split("\n")).toHaveLength(12);
  expect(snapshot).toContain("responsive");

  await renderer.destroy();
});

test("absolute layout honors right and bottom offsets", () => {
  const renderer = createTestRenderer(40, 14);
  const host = new BoxRenderable({
    layout: { width: 24, height: 10 },
    style: { border: true, title: "host" },
  });
  const overlay = new BoxRenderable({
    content: "ok",
    layout: { position: "absolute", right: 1, bottom: 1, width: 8, height: 3 },
    style: { border: true, title: "overlay" },
  });

  renderer.root.updateLayout({ padding: 1 });
  host.add(overlay);
  renderer.add(host);
  renderer.renderFrame();

  expect(overlay.layoutState.bounds.x + overlay.layoutState.bounds.width).toBe(
    host.layoutState.innerBounds.x + host.layoutState.innerBounds.width - 1,
  );
  expect(overlay.layoutState.bounds.y + overlay.layoutState.bounds.height).toBe(
    host.layoutState.innerBounds.y + host.layoutState.innerBounds.height - 1,
  );
});

test("flex rows shrink before overflowing their container", () => {
  const renderer = createTestRenderer(72, 16);
  const workspace = new BoxRenderable({
    layout: { width: "100%", height: 10, flexDirection: "row", gap: 1, padding: 1 },
    style: { border: true, title: "workspace" },
  });
  const panes = ["logs", "preview", "inspector"].map(
    (title) =>
      new BoxRenderable({
        content: `${title}\nDrop onto another pane to move this surface.`,
        layout: { flexGrow: 1, padding: 1 },
        style: { border: true, title },
      }),
  );

  workspace.add(...panes);
  renderer.add(workspace);
  renderer.renderFrame();

  for (const pane of panes) {
    expect(pane.layoutState.bounds.x + pane.layoutState.bounds.width).toBeLessThanOrEqual(
      workspace.layoutState.innerBounds.x + workspace.layoutState.innerBounds.width,
    );
  }
});

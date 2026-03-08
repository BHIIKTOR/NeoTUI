import { expect, test } from "bun:test";
import { BoxRenderable, TextRenderable } from "@neotui/core";
import { smokeFixtureLines } from "@neotui/fixtures";
import { createFrameSnapshot, createTestRenderer } from "../src/index.ts";

test("frame snapshot helper is deterministic", () => {
  expect(createFrameSnapshot(smokeFixtureLines)).toBe(
    "NeoTui\nkitty-first\nbun-first\ntypescript-first",
  );
});

test("single primitive golden fixture is deterministic", () => {
  const renderer = createTestRenderer(24, 8);

  renderer.add(
    new BoxRenderable({
      content: "primitive",
      layout: { width: 16, height: 6 },
      style: { border: true, title: "golden" },
    }),
  );

  expect(renderer.renderToString()).toMatchSnapshot();
});

test("nested tree golden fixture is deterministic", () => {
  const renderer = createTestRenderer(32, 10);
  const outer = new BoxRenderable({
    layout: { width: "100%", height: "100%", padding: 1, gap: 1 },
    style: { border: true, title: "root" },
  });
  outer.add(new TextRenderable({ content: "top-line" }));
  outer.add(new BoxRenderable({ content: "inner box", style: { border: true } }));
  renderer.add(outer);

  expect(renderer.renderToString()).toMatchSnapshot();
});

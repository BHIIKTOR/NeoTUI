import { expect, test } from "bun:test";
import {
  Box,
  BoxRenderable,
  delegate,
  FrameBufferConstruct,
  materializeConstruct,
  ScrollBar,
  ScrollBox,
  Text,
} from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("imperative and declarative nodes can coexist in the same tree", () => {
  const renderer = createTestRenderer(30, 10);
  const imperative = new BoxRenderable({
    content: "imperative",
    layout: { width: 12, height: 5 },
    style: { border: true },
  });
  const declarative = materializeConstruct(
    renderer,
    Box(
      {
        layout: { width: 12, height: 5 },
        style: { border: true },
        content: "declarative",
      },
      Text({ content: "child" }),
    ),
  );

  renderer.root.updateLayout({ flexDirection: "row", gap: 1, padding: 1 });
  renderer.add(imperative, declarative);

  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("imperative");
  expect(snapshot).toContain("child");
});

test("delegated construct method queue replays after materialization", () => {
  const renderer = createTestRenderer(24, 8);
  const construct = delegate(
    Box({ layout: { width: 12, height: 5 }, style: { border: true } }),
    (renderable) => {
      if (renderable instanceof BoxRenderable) {
        renderable.setContent("queued");
      }
    },
  );

  const node = materializeConstruct(renderer, construct);
  renderer.add(node);

  expect(renderer.renderToString()).toContain("queued");
});

test("scroll clipping and frame-buffer primitives are deterministic", () => {
  const renderer = createTestRenderer(30, 10);
  const scroll = materializeConstruct(
    renderer,
    ScrollBox(
      {
        layout: { width: 16, height: 6 },
        style: { border: true, title: "scroll" },
        scrollY: 1,
      },
      Text({ content: "row1\nrow2\nrow3\nrow4" }),
    ),
  );
  const bar = materializeConstruct(
    renderer,
    ScrollBar({
      layout: { width: 1, height: 6, position: "absolute", top: 0, left: 17 },
      ratio: 0.5,
    }),
  );
  const frame = materializeConstruct(
    renderer,
    FrameBufferConstruct({
      lines: ["ABCD", "EFGH"],
      layout: { width: 8, height: 3, position: "absolute", top: 6, left: 1 },
    }),
  );

  renderer.add(scroll, bar, frame);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("row2");
  expect(snapshot).not.toContain("row1");
  expect(snapshot).toContain("ABCD");
});

test("construct text nodes can be nested without explicit imperative plumbing", () => {
  const renderer = createTestRenderer(24, 8);
  const node = materializeConstruct(
    renderer,
    Box(
      { style: { border: true }, layout: { width: 20, height: 6 } },
      "literal child",
      Text({ content: "second child" }),
    ),
  );

  renderer.add(node);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("literal child");
  expect(snapshot).toContain("second child");
  expect(snapshot).toContain("┌");
});

test("render pipeline preserves foreground and background cell colors", () => {
  const renderer = createTestRenderer(16, 6);

  renderer.add(
    new BoxRenderable({
      content: "color",
      layout: { width: 12, height: 4 },
      style: {
        border: true,
        fg: "#f5e9d4",
        bg: "#1d1916",
        borderFg: "#f0c674",
        title: "demo",
      },
    }),
  );

  const buffer = renderer.renderToBuffer();
  const borderCell = buffer.getCell(0, 0);
  const contentCell = buffer.getCell(1, 1);

  expect(borderCell).toMatchObject({ char: "┌", fg: "#f0c674", bg: "#1d1916" });
  expect(contentCell).toMatchObject({ char: "c", fg: "#f5e9d4", bg: "#1d1916" });
});

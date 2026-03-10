import { expect, test } from "bun:test";
import {
  ASCIIFontRenderable,
  CodeRenderable,
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
import { createTestRenderer } from "../src/index.ts";

test("advanced components render deterministically", () => {
  const renderer = createTestRenderer(80, 32);

  renderer.root.updateLayout({ gap: 1, padding: 1 });
  renderer.add(
    new MarkdownRenderable({
      markdown: markdownFixture,
      layout: { height: 5 },
    }),
    new CodeRenderable({
      code: codeFixture,
      language: "ts",
      lineNumbers: true,
      layout: { height: 5 },
    }),
    new DiffRenderable({
      before: diffBeforeFixture,
      after: diffAfterFixture,
      layout: { height: 4 },
    }),
    new LineNumberRenderable({
      lines: 3,
      layout: { height: 3, width: 4 },
    }),
    new ASCIIFontRenderable({
      content: "neo",
      layout: { height: 5 },
    }),
    new MarkdownRenderable({
      markdown: largeTextFixture,
      layout: { height: 5 },
    }),
  );

  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("HEADING");
  expect(snapshot).toContain("  1 ");
  expect(snapshot).toContain("createKittyRenderer()");
  expect(snapshot).toContain("/\\");
  expect(snapshot).toContain("line 0 alpha beta");
});

test("markdown renderable supports heading levels beyond h2", () => {
  const renderer = createTestRenderer(60, 8);

  renderer.add(
    new MarkdownRenderable({
      markdown: "### Observability Layer\n#### Prompt Metrics",
      layout: { height: 4 },
    }),
  );

  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("▸ Observability Layer");
  expect(snapshot).toContain("• Prompt Metrics");
  expect(snapshot).not.toContain("### Observability Layer");
  expect(snapshot).not.toContain("#### Prompt Metrics");
});

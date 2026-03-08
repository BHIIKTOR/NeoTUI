import {
  ASCIIFontRenderable,
  CodeRenderable,
  createKittyRenderer,
  DiffRenderable,
  LineNumberRenderable,
  MarkdownRenderable,
} from "@neotui/core";
import {
  codeFixture,
  diffAfterFixture,
  diffBeforeFixture,
  markdownFixture,
} from "@neotui/fixtures";

const renderer = createKittyRenderer({ appName: "advanced-components", width: 84, height: 24 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

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
    lines: 4,
    layout: { width: 4, height: 4 },
  }),
  new ASCIIFontRenderable({
    content: "neo",
    layout: { height: 5 },
  }),
);

console.log(renderer.renderToString());

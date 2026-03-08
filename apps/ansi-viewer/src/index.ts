import { readFileSync } from "node:fs";
import { PanelRenderable, ScrollAreaRenderable } from "@neotui/components";
import { BoxRenderable, CodeRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

const fallbackAnsi = `\u001b[31mRED\u001b[0m demo
\u001b[32mGREEN\u001b[0m sample
\u001b[34mBLUE\u001b[0m preview
line 4
line 5
line 6
line 7`;

export function loadAnsiText(path?: string): string {
  const source = path ? readFileSync(path, "utf8") : fallbackAnsi;
  return stripAnsi(source);
}

export function createAnsiViewerRenderer(path?: string) {
  const renderer = createKittyRenderer({
    appName: "ansi-viewer",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 30,
  });
  const content = loadAnsiText(path);

  renderer.root.updateLayout({ padding: 1, gap: 1 });

  const header = new PanelRenderable({
    title: "header",
    subtitle: "ansi viewer",
    tone: "accent",
    content: "ANSI Viewer\nkitty-only sample app",
    layout: { height: 5 },
  });

  const row = new BoxRenderable({
    layout: { flexDirection: "row", flexGrow: 1, gap: 1 },
  });

  const viewerPanel = new PanelRenderable({
    title: path ? `file:${path}` : "inline-ansi",
    subtitle: "scroll-area",
    tone: "info",
    contentMode: "grow",
    layout: { flexGrow: 1, flexDirection: "column" },
  });
  const viewer = new ScrollAreaRenderable({
    scrollbarVisibility: "always",
    layout: { flexGrow: 1 },
  });
  viewer.add(new TextRenderable({ content }));
  viewerPanel.add(viewer);

  const inspector = new PanelRenderable({
    title: "inspector",
    subtitle: "parsed text",
    tone: "accent",
    contentMode: "grow",
    layout: { width: "38%", flexDirection: "column" },
  });
  inspector.add(
    new CodeRenderable({
      code: content,
      language: "ansi",
      lineNumbers: true,
      layout: { flexGrow: 1 },
    }),
  );

  row.add(viewerPanel, inspector);
  renderer.add(header, row);
  renderer.focus(viewer);

  return renderer;
}

export async function runAnsiViewerSession(path?: string): Promise<void> {
  const renderer = createAnsiViewerRenderer(path);

  try {
    renderer.start();
    await Bun.sleep(75);
  } finally {
    await renderer.destroy();
  }
}

function stripAnsi(value: string): string {
  let result = "";
  let index = 0;

  while (index < value.length) {
    if (value[index] === "\u001b" && value[index + 1] === "[") {
      const terminator = value.indexOf("m", index + 2);

      if (terminator !== -1) {
        index = terminator + 1;
        continue;
      }
    }

    result += value[index] ?? "";
    index += 1;
  }

  return result;
}

if (import.meta.main) {
  const fileFlagIndex = process.argv.indexOf("--file");
  const filePath = fileFlagIndex === -1 ? undefined : process.argv[fileFlagIndex + 1];

  if (process.argv.includes("--session-demo")) {
    await runAnsiViewerSession(filePath);
  } else {
    process.stdout.write(`${createAnsiViewerRenderer(filePath).renderToString()}\n`);
  }
}

import { PanelRenderable, ScrollAreaRenderable, ScrollbarRenderable } from "@neotui/components";
import { createKittyRenderer, TextRenderable } from "@neotui/core";

function createScrollbarRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-scrollbar",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 24,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });
  renderer.root.updateStyle({
    bg: "#14110f",
    fg: "#f2e7d5",
  });

  const hero = new PanelRenderable({
    title: "components:scrollbar",
    content: "Minimal border-mounted scroll indicators for vertical and horizontal scrolling.",
    tone: "accent",
    layout: { height: 5 },
  });

  const body = new PanelRenderable({
    title: "scroll surfaces",
    tone: "info",
    layout: {
      flexDirection: "row",
      gap: 2,
      flexGrow: 1,
      padding: 1,
    },
  });

  const scrollArea = new ScrollAreaRenderable({
    direction: "both",
    scrollbarVisibility: "always",
    layout: {
      width: "62%",
      flexGrow: 1,
    },
  });

  for (let index = 0; index < 12; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `line-${index}: renderer-native scrolling can expose long content without growing the pane width`,
        wrapMode: "none",
        layout: { height: 1 },
      }),
    );
  }

  const standalone = new PanelRenderable({
    title: "standalone",
    tone: "default",
    layout: {
      flexDirection: "column",
      gap: 1,
      width: 22,
    },
  });
  standalone.add(
    new TextRenderable({
      content: "Standalone indicators can also be used in bespoke surfaces.",
      wrapMode: "word",
      layout: { height: 2 },
    }),
    new ScrollbarRenderable({
      orientation: "vertical",
      viewportSize: 4,
      contentSize: 12,
      offset: 4,
      layout: { width: 1, height: 6 },
    }),
    new ScrollbarRenderable({
      orientation: "horizontal",
      viewportSize: 8,
      contentSize: 20,
      offset: 5,
      layout: { width: 16, height: 1 },
    }),
  );

  body.add(scrollArea, standalone);
  renderer.add(hero, body);
  return { renderer, scrollArea };
}

function buildSnapshot(): string {
  const { renderer, scrollArea } = createScrollbarRenderer();
  scrollArea.scrollTo(6, 3);
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, scrollArea } = createScrollbarRenderer();
  try {
    renderer.start();
    renderer.focus(scrollArea);
    scrollArea.scrollTo(6, 3);
    renderer.renderFrame();
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--print") || !isKittyInteractiveRuntime()) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}

function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}

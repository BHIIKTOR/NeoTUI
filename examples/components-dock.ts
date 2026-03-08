import { DockLayoutRenderable, PanelRenderable } from "@neotui/components";
import { BoxRenderable, type ChangeEvent, createKittyRenderer, TextRenderable } from "@neotui/core";

function createDockRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-dock",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 28,
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
    title: "components:dock",
    content:
      "Dock layout replaces the old app-local pane swapping logic.\nDrop on the center to swap, or on an edge to insert before or after a pane.",
    tone: "accent",
    layout: { height: 5 },
  });

  const status = new TextRenderable({
    content: "Current order: logs -> preview -> inspector. Edge drops insert, center drops swap.",
    layout: { height: 1 },
    style: {
      fg: "#c4b39d",
      bg: "#14110f",
    },
  });

  const dock = new DockLayoutRenderable({
    items: [
      {
        id: "logs",
        title: "logs",
        tone: "info",
        node: new BoxRenderable({
          content: "Logs\n\nTail output, queued jobs, and transport diagnostics live here.",
          layout: { flexGrow: 1 },
          style: { fg: "#f2e7d5", bg: "#1d1916" },
        }),
      },
      {
        id: "preview",
        title: "preview",
        tone: "success",
        node: new BoxRenderable({
          content:
            "Preview\n\nDrop on the left or right edge to insert. Drop in the center to swap.",
          layout: { flexGrow: 1 },
          style: { fg: "#f2e7d5", bg: "#1d1916" },
        }),
      },
      {
        id: "inspector",
        title: "inspector",
        tone: "danger",
        node: new BoxRenderable({
          content:
            "Inspector\n\nThe serialized order is deterministic and can drive saved workspaces later.",
          layout: { flexGrow: 1 },
          style: { fg: "#f2e7d5", bg: "#1d1916" },
        }),
      },
    ],
    layout: {
      flexGrow: 1,
    },
  });

  dock.on("reorder", (event) => {
    const detail = event as ChangeEvent<{
      sourceId: string;
      targetId: string;
      placement: "after" | "before" | "swap";
      order: string[];
    }>;
    status.setContent(
      `${detail.value.placement === "swap" ? `Swapped ${detail.value.sourceId} with ${detail.value.targetId}` : `Moved ${detail.value.sourceId} ${detail.value.placement} ${detail.value.targetId}`}. Order: ${detail.value.order.join(" -> ")}`,
    );
  });

  renderer.add(hero, dock, status);
  return { renderer, dock };
}

function buildSnapshot(): string {
  const { renderer } = createDockRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer } = createDockRenderer();
  try {
    renderer.start();
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

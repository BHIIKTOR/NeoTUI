import {
  ButtonRenderable,
  PanelRenderable,
  WindowManagerRenderable,
  WindowRenderable,
} from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";

function createWindowsRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-windows",
    width: process.stdout.columns ?? 100,
    height: Math.max(process.stdout.rows ?? 34, 34),
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
    title: "components:windows",
    content:
      "Floating windows with drag, resize, wrapped or scrollable bodies, and utility layering.",
    tone: "accent",
    layout: { height: 5 },
  });

  const workspace = new PanelRenderable({
    title: "window workspace",
    tone: "info",
    layout: {
      flexGrow: 1,
    },
  });
  const manager = new WindowManagerRenderable({
    layout: {
      flexGrow: 1,
    },
  });

  const inspector = new WindowRenderable({
    title: "Inspector",
    subtitle: "wrap + footer",
    x: 2,
    y: 1,
    width: 42,
    height: 14,
    active: true,
    content: [
      "Drag this title bar to move the window.",
      "Use the bottom-right handle to resize it.",
      "This variant keeps word-wrap on and adds a compact footer.",
    ].join("\n"),
    contentWrapMode: "word",
    contentScrollable: false,
  });
  inspector.addFooter(
    new ButtonRenderable({
      label: "Apply",
      variant: "primary",
      width: 7,
    }),
    new ButtonRenderable({
      label: "Reset",
      variant: "ghost",
      width: 7,
    }),
  );

  const preview = new WindowRenderable({
    title: "Preview",
    subtitle: "wrap only",
    x: 48,
    y: 2,
    width: 30,
    height: 10,
    content:
      "This window shows fixed-size wrapping without inner scrolling. Short content stays pinned at the top.",
    contentWrapMode: "word",
    contentScrollable: false,
  });

  const activity = new WindowRenderable({
    title: "Activity",
    subtitle: "scroll + wrap + bar",
    x: 6,
    y: 15,
    width: 34,
    height: 8,
    content: [
      "12:01 build queued",
      "12:02 preparing workspace",
      "12:03 syncing packages",
      "12:04 compiling core",
      "12:05 compiling components",
      "12:06 running targeted tests",
      "12:07 collecting snapshots",
      "12:08 verifying kitty session",
      "12:09 publishing preview artifact",
      "12:10 waiting for approval",
      "12:11 finalizing release notes",
      "12:12 shipping release candidate",
    ].join("\n"),
    contentWrapMode: "word",
    contentScrollable: true,
  });

  const palette = new WindowRenderable({
    title: "Palette",
    subtitle: "utility window",
    role: "utility",
    x: 44,
    y: 15,
    width: 30,
    height: 8,
    resizable: false,
    maximizable: false,
    content:
      "Utility-role windows stay above document windows without forcing app-local z-index management.",
    contentWrapMode: "word",
    contentScrollable: false,
  });

  manager.addWindow(inspector).addWindow(preview).addWindow(activity).addWindow(palette);
  workspace.add(manager);
  renderer.add(hero, workspace);
  manager.activate(inspector.id);
  return { renderer, manager, inspector };
}

function buildSnapshot(): string {
  const { renderer } = createWindowsRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, manager, inspector } = createWindowsRenderer();
  try {
    renderer.start();
    manager.activate(inspector.id);
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

import { ButtonRenderable, CommandRenderable, PanelRenderable } from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";

function createCommandRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-command",
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
    title: "components:command",
    content:
      "Command is now a reusable keyboard-first surface with deterministic filtering, pinned actions, recent actions, preview, and focus restore.",
    tone: "accent",
    layout: { height: 5 },
  });

  const workspace = new PanelRenderable({
    title: "workspace",
    content:
      "Press Ctrl-C to exit. The command surface opens focused and can close back to the launcher button.",
    tone: "info",
    layout: {
      flexGrow: 1,
    },
  });
  const launcher = new ButtonRenderable({
    label: "Launcher",
    variant: "secondary",
  });
  workspace.add(launcher);

  const command = new CommandRenderable({
    items: [
      {
        id: "deploy-release",
        title: "Deploy Release",
        group: "Release",
        shortcut: "d",
        pinned: true,
      },
      { id: "open-file", title: "Open File", group: "File", shortcut: "o" },
      { id: "open-recent", title: "Open Recent", group: "File", shortcut: "r" },
      { id: "toggle-sidebar", title: "Toggle Sidebar", group: "View", shortcut: "s" },
      { id: "promote-build", title: "Promote Build", group: "Release" },
    ],
    recentIds: ["open-recent"],
    previewTitle: "selected action",
    renderPreview: (item) =>
      item
        ? `${item.title}\n${item.group ?? "General"} command\nshortcut: ${item.shortcut ?? "none"}`
        : null,
  });

  renderer.add(hero, workspace, command);
  renderer.focus(launcher);
  command.open();
  return { renderer, command, launcher };
}

function buildSnapshot(): string {
  const { renderer, command } = createCommandRenderer();
  command.open();
  command.setQuery("re");
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, command } = createCommandRenderer();
  try {
    renderer.start();
    command.open();
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

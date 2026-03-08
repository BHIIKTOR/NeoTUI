import {
  ContextMenuRenderable,
  DropdownMenuRenderable,
  MenuBarRenderable,
  PanelRenderable,
} from "@neotui/components";
import { createKittyRenderer, TextRenderable } from "@neotui/core";

function createMenuRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-menus",
    width: process.stdout.columns ?? 90,
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

  const menubar = new MenuBarRenderable({
    menus: [
      {
        id: "file",
        label: "File",
        items: [
          { id: "new", label: "New File", shortcut: "n" },
          { id: "open", label: "Open…", shortcut: "o" },
          { type: "separator", id: "file-divider" },
          { id: "quit", label: "Quit", shortcut: "q", danger: true },
        ],
      },
      {
        id: "view",
        label: "View",
        items: [
          { id: "palette", label: "Command Palette", shortcut: "p" },
          { id: "sidebar", label: "Toggle Sidebar", checked: true, shortcut: "s" },
        ],
      },
    ],
  });

  const hero = new PanelRenderable({
    title: "components:menus",
    content: "Menu, dropdown, and context-menu surfaces are reusable and start closed by default.",
    tone: "accent",
    layout: { height: 5 },
  });

  const dropdown = new DropdownMenuRenderable({
    triggerLabel: "Workspace",
    items: [
      { type: "label", id: "workspace-label", label: "Workspace" },
      { id: "rename", label: "Rename", shortcut: "r" },
      { id: "share", label: "Share", shortcut: "s" },
      { type: "separator", id: "workspace-divider" },
      { id: "delete", label: "Delete", danger: true, shortcut: "d" },
    ],
  });

  const contextMenu = new ContextMenuRenderable({
    items: [
      { id: "copy", label: "Copy" },
      { id: "duplicate", label: "Duplicate" },
      { type: "separator", id: "ctx-divider" },
      { id: "archive", label: "Archive", danger: true },
    ],
    layout: {
      width: "100%",
      flexGrow: 1,
    },
  });
  const canvas = new PanelRenderable({
    title: "right-click target",
    tone: "default",
    content:
      "Use Enter or click File and View.\nUse Space or click Workspace.\nRight-click here for context actions.",
    layout: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
  });
  contextMenu.add(canvas);

  const content = new PanelRenderable({
    title: "menu playground",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  content.add(
    new TextRenderable({
      content:
        "Nothing opens on boot. Drive the menubar from the keyboard or mouse, then right-click the canvas to test layered menu behavior deliberately.",
      wrapMode: "word",
      layout: { height: 2 },
    }),
    dropdown,
    contextMenu,
  );

  renderer.add(menubar, hero, content);

  return { renderer, menubar, dropdown, contextMenu };
}

function buildSnapshot(): string {
  const { renderer, menubar } = createMenuRenderer();
  renderer.focus(menubar);
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, menubar } = createMenuRenderer();
  try {
    renderer.start();
    renderer.focus(menubar);
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

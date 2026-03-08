import {
  InputFieldRenderable,
  PanelRenderable,
  SidebarRenderable,
  TabsRenderable,
} from "@neotui/components";
import {
  BoxRenderable,
  createKittyRenderer,
  TextareaRenderable,
  TextRenderable,
} from "@neotui/core";

export function createMultiplexRenderer() {
  const renderer = createKittyRenderer({
    appName: "multiplex",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 30,
  });

  renderer.root.updateLayout({ padding: 1, gap: 1 });

  const tabs = new TabsRenderable({
    tabs: [
      { id: "build", label: "build" },
      { id: "logs", label: "logs" },
      { id: "shell", label: "shell" },
    ],
    activeTabId: "build",
    layout: { height: 1 },
  });

  const body = new BoxRenderable({
    layout: { flexDirection: "row", flexGrow: 1, gap: 1 },
  });

  const sidebar = new SidebarRenderable({
    title: "panes",
    groups: [
      {
        id: "panes",
        items: [
          { id: "pane-a", label: "pane-a", shortcut: "1" },
          { id: "pane-b", label: "pane-b", shortcut: "2" },
          { id: "pane-c", label: "pane-c", shortcut: "3" },
          { id: "pane-d", label: "pane-d", shortcut: "4" },
        ],
      },
    ],
    activeItemId: "pane-a",
    layout: { width: "20%", minWidth: 16 },
  });

  const workspace = new PanelRenderable({
    title: "workspace",
    subtitle: "component shell",
    tone: "info",
    contentMode: "grow",
    layout: { flexGrow: 1, flexDirection: "column", gap: 1 },
  });

  const splitRow = new BoxRenderable({
    layout: { flexDirection: "row", flexGrow: 1, gap: 1 },
  });

  const leftPane = new TextareaRenderable({
    value: "build started\nstep 1 ok\nstep 2 ok",
    layout: { width: "50%" },
  });
  const rightPane = new TextareaRenderable({
    value: "tail -f app.log\nrequest 1\nrequest 2",
    layout: { flexGrow: 1 },
  });

  const footer = new BoxRenderable({
    layout: { flexDirection: "row", gap: 1, height: 5 },
  });
  const command = new InputFieldRenderable({
    label: "command",
    description: "Enter a shell command for the active pane.",
    value: "deploy --preview",
    width: "fill",
    fieldLayout: { flexGrow: 1 },
  });
  const status = new TextRenderable({
    content: "active pane: pane-a\nsync output enabled\nclipboard ready",
    layout: { width: "28%" },
  });

  tabs.on("change", (event) => {
    const next = (event as { value: { id: string } }).value.id;
    status.setContent(
      `tab: ${next}\nactive pane: ${sidebar.getActiveItemId() ?? "pane-a"}\nclipboard ready`,
    );
  });
  sidebar.on("select", (event) => {
    const next = (event as { value: { id: string } }).value.id;
    status.setContent(
      `tab: ${tabs.getActiveTabId() ?? "build"}\nactive pane: ${next}\nclipboard ready`,
    );
  });

  splitRow.add(leftPane, rightPane);
  footer.add(command, status);
  workspace.add(splitRow, footer);
  body.add(sidebar, workspace);
  renderer.add(tabs, body);
  renderer.focus(command.input);

  return renderer;
}

export async function runMultiplexSession(): Promise<void> {
  const renderer = createMultiplexRenderer();

  try {
    renderer.start();
    await Bun.sleep(75);
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--session-demo")) {
    await runMultiplexSession();
  } else {
    process.stdout.write(`${createMultiplexRenderer().renderToString()}\n`);
  }
}

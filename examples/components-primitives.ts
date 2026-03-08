import {
  BadgeRenderable,
  ButtonRenderable,
  PanelRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

function createPrimitiveRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-primitives",
    width: process.stdout.columns ?? 80,
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
    title: "components:c2",
    content: "First component primitives built on top of @neotui/core.",
    tone: "accent",
    layout: { height: 5 },
  });

  const badgeRow = new ToolbarRenderable({
    layout: { height: 1 },
  });
  badgeRow.add(
    new BadgeRenderable({ label: "button", tone: "accent" }),
    new BadgeRenderable({ label: "panel", tone: "info" }),
    new BadgeRenderable({ label: "toolbar", tone: "success" }),
    new BadgeRenderable({ label: "badge", tone: "danger", emphasis: "solid" }),
  );

  const actionPanel = new PanelRenderable({
    title: "actions",
    tone: "info",
    layout: { height: 9, gap: 1, flexDirection: "column" },
  });
  const actionText = new TextRenderable({
    content: "Buttons emit press events with keyboard and mouse activation.",
  });
  const actions = new ToolbarRenderable({
    layout: { height: 3 },
  });
  const status = new TextRenderable({
    content: "Press a button to update this line.",
    layout: { height: 1 },
  });

  const buttons = [
    new ButtonRenderable({ label: "Primary", variant: "primary" }),
    new ButtonRenderable({ label: "Secondary", variant: "secondary" }),
    new ButtonRenderable({ label: "Ghost", variant: "ghost" }),
    new ButtonRenderable({ label: "Danger", variant: "danger" }),
  ];

  for (const button of buttons) {
    button.on("press", () => {
      status.setContent(`Pressed ${button.getLabel()}.`);
    });
  }

  actions.add(...buttons);
  actionPanel.add(actionText, actions, status);

  const root = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  root.add(hero, badgeRow, actionPanel);
  renderer.add(root);

  return renderer;
}

function buildSnapshot(): string {
  const renderer = createPrimitiveRenderer();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const renderer = createPrimitiveRenderer();
  try {
    renderer.start();
    console.log("components primitive demo active | Ctrl-C exits");
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

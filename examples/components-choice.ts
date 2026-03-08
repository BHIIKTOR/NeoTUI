import {
  CheckboxRenderable,
  FieldRenderable,
  KbdRenderable,
  PanelRenderable,
  RadioGroupRenderable,
  SliderRenderable,
  SwitchRenderable,
  ToggleGroupRenderable,
  ToggleRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import { createKittyRenderer, TextRenderable } from "@neotui/core";

function createChoiceRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-choice",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 44,
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
    title: "components:choice",
    content: "Choice controls and grouped input surfaces now live in @neotui/components.",
    tone: "accent",
    layout: { height: 5 },
  });

  const shortcutBar = new ToolbarRenderable({
    layout: { height: 1, alignItems: "start" },
  });
  shortcutBar.add(
    new KbdRenderable({ label: "Space" }),
    new TextRenderable({ content: "toggle", layout: { height: 1 } }),
    new KbdRenderable({ label: "Enter" }),
    new TextRenderable({ content: "commit", layout: { height: 1 } }),
    new KbdRenderable({ label: "Arrows" }),
    new TextRenderable({ content: "move", layout: { height: 1 } }),
  );

  const controls = new PanelRenderable({
    title: "interactive controls",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });

  const checkbox = new CheckboxRenderable({
    label: "Enable command hints",
    checked: true,
  });
  const sw = new SwitchRenderable({
    label: "Live preview",
    checked: true,
  });
  const toggle = new ToggleRenderable({
    label: "Pinned",
  });
  const singleGroup = new ToggleGroupRenderable({
    items: [
      { id: "list", label: "List" },
      { id: "split", label: "Split" },
      { id: "grid", label: "Grid" },
    ],
    type: "single",
    value: "split",
  });
  const multiGroup = new ToggleGroupRenderable({
    items: [
      { id: "lineNumbers", label: "Line #" },
      { id: "wrap", label: "Wrap" },
      { id: "minimap", label: "Minimap", disabled: true },
    ],
    type: "multiple",
    value: ["lineNumbers"],
  });
  const radioGroup = new RadioGroupRenderable({
    orientation: "vertical",
    value: "review",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In review" },
      { value: "shipped", label: "Shipped", description: "production ready" },
    ],
  });
  const slider = new SliderRenderable({
    value: 70,
    min: 0,
    max: 100,
    step: 5,
    layout: { width: 28 },
  });

  controls.add(
    checkbox,
    sw,
    toggle,
    new TextRenderable({ content: "View mode", layout: { height: 1 } }),
    singleGroup,
    new TextRenderable({ content: "Editor options", layout: { height: 1 } }),
    multiGroup,
    new TextRenderable({ content: "Release status", layout: { height: 1 } }),
    radioGroup,
    new TextRenderable({ content: "Zoom", layout: { height: 1 } }),
    slider,
  );

  const fields = new PanelRenderable({
    title: "field composition",
    tone: "default",
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 13,
    },
  });

  const volumeField = new FieldRenderable({
    label: "Volume",
    description: "Compose a slider directly into the field wrapper.",
  });
  volumeField.setControl(
    new SliderRenderable({
      min: 0,
      max: 10,
      step: 1,
      value: 6,
      layout: { width: 18 },
    }),
  );

  const notificationsField = new FieldRenderable({
    label: "Notifications",
    description: "Switches can sit inside field surfaces as first-class controls.",
  });
  notificationsField.setControl(
    new SwitchRenderable({
      checked: true,
    }),
  );

  fields.add(volumeField, notificationsField);

  renderer.add(hero, shortcutBar, controls, fields);
  return { renderer, checkbox };
}

function buildSnapshot(): string {
  const { renderer } = createChoiceRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, checkbox } = createChoiceRenderer();
  try {
    renderer.start();
    renderer.focus(checkbox);
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

import {
  InputFieldRenderable,
  PanelRenderable,
  SelectFieldRenderable,
  TextareaFieldRenderable,
} from "@neotui/components";
import { BoxRenderable, createKittyRenderer } from "@neotui/core";

function createFieldRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-fields",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 40,
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
    title: "components:fields",
    content: "Field composition and themed control wrappers now live in @neotui/components.",
    tone: "accent",
    layout: { height: 4 },
  });

  const inputField = new InputFieldRenderable({
    label: "Search",
    description: "Single-line input with placeholder and label-to-focus behavior.",
    placeholder: "Find widgets",
    width: "fill",
    fieldLayout: { width: "100%" },
  });

  const passwordField = new InputFieldRenderable({
    label: "Token",
    description: "Password mode masks visible output.",
    value: "topsecret",
    type: "password",
    width: "fill",
    fieldLayout: { width: "100%" },
  });

  const selectField = new SelectFieldRenderable({
    label: "Status",
    description: "Select uses the dropdown menu surface.",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In review" },
      { value: "shipped", label: "Shipped" },
    ],
    placeholder: "Choose status",
    fieldLayout: { width: "100%" },
  });

  const textareaField = new TextareaFieldRenderable({
    label: "Notes",
    description: "Auto-resize clamps between row limits while keeping the editor usable.",
    value: "This textarea grows with content.\nIt still stays inside bounds.",
    autoResize: true,
    minRows: 2,
    maxRows: 4,
    layout: { width: "100%" },
    fieldLayout: { width: "100%" },
  });

  const form = new PanelRenderable({
    title: "form surfaces",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });
  form.add(inputField, passwordField, selectField, textareaField);

  const textareaModes = new PanelRenderable({
    title: "textarea modes",
    tone: "default",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });
  textareaModes.add(
    new TextareaFieldRenderable({
      label: "Fixed viewport",
      description: "Word wrap stays inside a bounded editor.",
      value:
        "This fixed textarea keeps a stable viewport height.\nAdd more notes here and use the inline scrollbar when content exceeds the body.",
      autoResize: false,
      wrapMode: "word",
      showScrollbars: true,
      layout: { width: "100%", height: 7 },
      fieldLayout: { width: "100%" },
    }),
    new TextareaFieldRenderable({
      label: "No wrap",
      description: "Horizontal scroll remains available for long unbroken lines.",
      value:
        "release/build/output/path=packages/components/src/textarea.ts?mode=editor&viewport=fixed&tracking=neotui-textarea-rewrite",
      autoResize: false,
      wrapMode: "none",
      showScrollbars: true,
      layout: { width: "100%", height: 5 },
      fieldLayout: { width: "100%" },
    }),
    new TextareaFieldRenderable({
      label: "Readonly",
      description: "Readonly still allows navigation, selection, and scroll.",
      value:
        "Readonly editors should still feel inspectable.\nArrow keys, mouse selection, and wheel scrolling should continue to work.",
      readOnly: true,
      autoResize: false,
      wrapMode: "word",
      showScrollbars: true,
      layout: { width: "100%", height: 6 },
      fieldLayout: { width: "100%" },
      error: "Readonly note surfaces should be visually distinct.",
      validationState: "error",
      invalid: true,
    }),
  );

  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: "#14110f",
    },
  });
  body.add(form, textareaModes);

  renderer.add(hero, body);
  return { renderer, inputField, selectField };
}

function buildSnapshot(): string {
  const { renderer } = createFieldRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, inputField } = createFieldRenderer();
  try {
    renderer.start();
    renderer.focus(inputField.input);
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

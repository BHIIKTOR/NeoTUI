import {
  DialogRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  TextareaControlRenderable,
  TextareaFieldRenderable,
  WindowManagerRenderable,
  WindowRenderable,
} from "@neotui/components";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

function createTextareaRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-textarea",
    width: process.stdout.columns ?? 110,
    height: Math.max(process.stdout.rows ?? 60, 60),
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
    title: "components:textarea",
    tone: "accent",
    contentMode: "grow",
    layout: { height: 8 },
  });
  hero.add(
    new TextRenderable({
      content:
        "Multiline textarea controls for forms, dialogs, sheets, drawers, windows, and note-heavy workspace surfaces.",
      wrapMode: "word",
      layout: {
        height: 2,
      },
    }),
    new TextRenderable({
      content:
        "Wrapped and nowrap editors, internal scroll, undo/redo, clipboard copy/cut, and large-paste summaries. On smaller terminals, use PageUp/PageDown, arrows, Home/End, or the mouse wheel to scroll the document below.",
      wrapMode: "word",
      layout: {
        height: 3,
        width: "100%",
      },
      style: {
        fg: "#cfbfa7",
      },
    }),
  );

  const document = new ScrollAreaRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    scrollbarVisibility: "always",
    style: {
      border: false,
      focusable: true,
      bg: "#14110f",
      fg: "#f2e7d5",
      borderFg: "#8f7b63",
    },
  });

  const top = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      height: 24,
    },
    style: {
      bg: "#14110f",
    },
  });

  const fieldModes = new PanelRenderable({
    title: "field modes",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  const autoResizeField = new TextareaFieldRenderable({
    label: "Auto-resize notes",
    description: "Grows between row limits while keeping multiline editing behavior.",
    value: "This textarea grows with content.\nUse it for descriptions and notes.",
    autoResize: true,
    minRows: 2,
    maxRows: 5,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%" },
    fieldLayout: { width: "100%" },
  });

  const readonlyField = new TextareaFieldRenderable({
    label: "Readonly audit note",
    description: "Readonly still permits navigation, selection, and scrolling.",
    value:
      "Readonly textareas should still feel inspectable.\nThe view should not collapse into a dead box just because mutation is disabled.",
    readOnly: true,
    invalid: true,
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 7 },
    fieldLayout: { width: "100%" },
    error: "Readonly + invalid should still render clearly.",
    validationState: "error",
  });

  fieldModes.add(autoResizeField, readonlyField);

  const rawModes = new PanelRenderable({
    title: "editor modes",
    tone: "default",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });

  const wrapped = new TextareaControlRenderable({
    value:
      "Wrapped mode keeps content inside a fixed viewport and uses internal scrolling only when needed.\nThis is the default bounded editor mode for dialogs and panels.",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 7 },
  });

  const nowrap = new TextareaControlRenderable({
    value:
      "release/build/output/path=packages/components/src/textarea.ts?mode=nowrap&tracking=neotui-textarea-rewrite&branch=master",
    autoResize: false,
    wrapMode: "none",
    showScrollbars: true,
    layout: { width: "100%", height: 5 },
  });
  const pasteSummary = new TextareaControlRenderable({
    value: "",
    placeholder: "Paste 5+ lines or a very large payload to collapse it into a summary token.",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    summarizePastedText: true,
    pasteSummaryThreshold: 512,
    layout: { width: "100%", height: 4 },
  });

  rawModes.add(wrapped, nowrap, pasteSummary);

  top.add(fieldModes, rawModes);

  const lab = new PanelRenderable({
    title: "rewrite proving ground",
    tone: "info",
    layout: {
      height: 12,
    },
  });
  const stressEditor = new TextareaControlRenderable({
    value: [
      "# release retrospective",
      "",
      "The multiline rewrite now has a document model, viewport model, controller state, explicit scroll ownership, and host coverage across dialogs, sheets, and windows.",
      "",
      "- verify page navigation",
      "- verify selection survives wrapping",
      "- verify paste summary collapses visually but not in the backing document",
      "- verify undo isolates paste from subsequent typing",
      "",
      "Long nowrap-like payload sample: release/build/output/path=packages/components/src/textarea.ts?mode=editor&tracking=neotui-textarea-rewrite&proof=controller-viewport-split",
    ].join("\n"),
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    summarizePastedText: true,
    pasteSummaryThreshold: 512,
    layout: {
      flexGrow: 1,
      height: 10,
    },
  });
  lab.add(stressEditor);

  const lower = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      height: 18,
    },
    style: {
      bg: "#14110f",
    },
  });

  const dialogHost = new PanelRenderable({
    title: "textarea in dialog",
    tone: "accent",
    contentMode: "grow",
    layout: {
      flexGrow: 1,
    },
  });
  dialogHost.add(
    new TextRenderable({
      content: "The dialog opens inside this host and the editor remains fully interactive.",
      wrapMode: "word",
      layout: { height: 2 },
    }),
  );
  const dialog = new DialogRenderable({
    title: "Edit release notes",
    variant: "info",
    width: "82%",
    height: 12,
  });
  const dialogTextarea = new TextareaControlRenderable({
    value: "Release notes\n\n- multiline editing\n- viewport scrolling\n- wrapped and nowrap modes",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 6 },
  });
  dialog.add(dialogTextarea);
  dialog.open();
  dialogHost.add(dialog);

  const windowHost = new PanelRenderable({
    title: "textarea in window",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexGrow: 1,
    },
  });
  const manager = new WindowManagerRenderable({
    layout: { flexGrow: 1 },
  });
  const notesWindow = new WindowRenderable({
    title: "Workspace notes",
    subtitle: "bounded editor",
    x: 2,
    y: 1,
    width: 44,
    height: 14,
    active: true,
    contentWrapMode: "word",
    contentScrollable: false,
  });
  const windowTextarea = new TextareaControlRenderable({
    value:
      "This textarea lives inside a movable window.\n\nUse this for inspectors, detail panes, and side-workspace editors.\n\nThe editor keeps its own internal scrollbars and selection state.",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 8 },
  });
  notesWindow.body.add(windowTextarea);
  manager.addWindow(notesWindow);
  manager.activate(notesWindow.id);
  windowHost.add(manager);

  lower.add(dialogHost, windowHost);

  document.add(top, lab, lower);
  renderer.add(hero, document);
  return {
    renderer,
    document,
    autoResizeField,
    dialogTextarea,
    pasteSummary,
    stressEditor,
    windowTextarea,
  };
}

function buildSnapshot(): string {
  const { renderer, pasteSummary } = createTextareaRenderer();
  renderer.focus(pasteSummary);
  renderer.dispatchInput(
    `\u001b[200~${[
      "Release scope",
      "Textarea rewrite complete",
      "Copy and cut write through OSC 52",
      "Pastes over five lines collapse visually",
      "Full payload stays in the backing buffer",
      "Moving the cursor reveals the real content",
    ].join("\n")}\u001b[201~`,
  );
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, document } = createTextareaRenderer();
  try {
    renderer.start();
    renderer.focus(document);
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

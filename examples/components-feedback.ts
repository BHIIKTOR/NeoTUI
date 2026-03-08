import {
  EmptyRenderable,
  PanelRenderable,
  ProgressRenderable,
  SpinnerRenderable,
  ToastRenderable,
} from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";

function createFeedbackRenderer() {
  const snapshotMode = process.argv.includes("--print") || !isKittyInteractiveRuntime();
  const renderer = createKittyRenderer({
    appName: "components-feedback",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 32,
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
    title: "components:feedback",
    content: "Loading, progress, empty-state, and toast surfaces are now reusable components.",
    tone: "accent",
    layout: { height: 5 },
  });

  const status = new PanelRenderable({
    title: "work in progress",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 11,
    },
  });
  const spinner = new SpinnerRenderable({
    label: "Indexing workspace",
    frameSet: "line",
  });
  const progress = new ProgressRenderable({
    label: "Upload",
    value: 64,
    variant: "success",
    layout: { width: "100%" },
  });
  const warning = new ProgressRenderable({
    label: "Migration",
    value: 28,
    variant: "warning",
    layout: { width: "100%" },
  });
  status.add(spinner, progress, warning);

  const empty = new EmptyRenderable({
    title: "No saved searches",
    description: "Create a saved search to pin filters and share them with your team.",
    hint: "Use the primary action to create a search.",
    actions: [
      { id: "create", label: "Create Search", variant: "primary" },
      { id: "import", label: "Import", variant: "ghost" },
    ],
    layout: {
      minHeight: 12,
      flexGrow: 1,
    },
  });

  const toast = new ToastRenderable({
    title: "Saved",
    message: "Workspace preferences were written successfully.",
    kind: "success",
    dismissible: !snapshotMode,
    durationMs: snapshotMode ? undefined : 1600,
    layout: {
      position: "absolute",
      right: 2,
      bottom: 1,
      zIndex: 240,
    },
  });

  renderer.add(hero, status, empty, toast);
  return { renderer, spinner, toast, empty };
}

function buildSnapshot(): string {
  const { renderer, toast } = createFeedbackRenderer();
  toast.show();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, spinner, toast, empty } = createFeedbackRenderer();
  try {
    renderer.start();
    spinner.start();
    toast.show();
    renderer.focus(empty);
    renderer.renderFrame();
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    spinner.stop();
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

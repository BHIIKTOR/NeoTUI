import {
  ButtonRenderable,
  DialogRenderable,
  DrawerRenderable,
  OverlayManagerRenderable,
  PanelRenderable,
  SheetRenderable,
  ToastRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

function createDialogRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-dialogs",
    width: process.stdout.columns ?? 92,
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
    title: "components:overlay",
    content:
      "Overlay manager now coordinates dialog, sheet, drawer, toast, and raw managed overlay flows through one exclusive workspace group.",
    tone: "accent",
    layout: { height: 5 },
  });

  const workspace = new PanelRenderable({
    title: "overlay workspace",
    tone: "info",
    layout: { flexGrow: 1 },
    style: {
      bg: "#1d1916",
    },
  });
  const launchers = new ToolbarRenderable({
    layout: { height: 3 },
  });
  const dialogLauncher = new ButtonRenderable({ label: "Dialog", variant: "secondary" });
  const sheetLauncher = new ButtonRenderable({ label: "Sheet", variant: "secondary" });
  const drawerLauncher = new ButtonRenderable({ label: "Drawer", variant: "secondary" });
  const managedLauncher = new ButtonRenderable({ label: "Managed", variant: "ghost" });
  const toastLauncher = new ButtonRenderable({ label: "Toast", variant: "ghost" });
  launchers.add(dialogLauncher, sheetLauncher, drawerLauncher, managedLauncher, toastLauncher);

  const status = new TextRenderable({
    content: "Open a surface to inspect coordination and focus handoff.",
    layout: { height: 1 },
    style: {
      fg: "#c4b39d",
      bg: "#1d1916",
    },
  });
  const workspaceContent = new TextRenderable({
    content:
      "Release queue\n" +
      "- deploy release candidate\n" +
      "- review stacked overlays\n" +
      "- verify focus restore\n" +
      "- close superseded surfaces",
    layout: { flexGrow: 1 },
    style: {
      fg: "#f2e7d5",
      bg: "#1d1916",
    },
  });

  const overlayManager = new OverlayManagerRenderable();

  const dialog = new DialogRenderable({
    title: "Confirm release",
    variant: "info",
    width: "58%",
    height: 10,
  });
  dialog.add(
    new TextRenderable({
      content:
        "This dialog keeps its own focus trap and backdrop, but launch coordination now lives in OverlayManagerRenderable instead of app-local close helpers.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
  );
  const dialogCancel = new ButtonRenderable({ label: "Cancel", variant: "ghost" });
  const dialogConfirm = new ButtonRenderable({ label: "Confirm", variant: "primary" });
  dialog.addFooter(dialogCancel, dialogConfirm);
  dialog.initialFocusTarget = dialogCancel;

  const sheet = new SheetRenderable({
    title: "Details",
    description: "Edge-anchored secondary workflow.",
    side: "right",
    width: "40%",
    showCloseButton: true,
  });
  sheet.add(
    new TextRenderable({
      content:
        "Use the same coordinator to replace a dialog with a sheet without manually closing the previous surface first.",
      wrapMode: "word",
      layout: { height: 4 },
    }),
  );

  const drawer = new DrawerRenderable({
    title: "Build output",
    side: "bottom",
    compact: true,
    height: 9,
    showCloseButton: true,
  });
  drawer.add(
    new TextRenderable({
      content:
        "Drawer uses the same exclusive-group launch path as dialog and sheet, but keeps a compact bottom-mounted shape.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
  );

  const managedOverlay = new BoxRenderable({
    layout: {
      position: "absolute",
      left: "24%",
      top: 6,
      width: "52%",
      height: 8,
    },
    style: {
      border: true,
      visible: false,
      borderFg: "#6caee8",
      title: "managed overlay",
      bg: "#1d1916",
      fg: "#f2e7d5",
    },
    content:
      "Overlay manager can still host arbitrary renderables directly when a surface does not need a dedicated dialog or sheet component.",
  });
  const managedClose = new ButtonRenderable({ label: "Close", variant: "secondary" });
  managedOverlay.add(managedClose);

  const toast = new ToastRenderable({
    title: "Released",
    message: "The overlay workspace completed its status handoff.",
    kind: "info",
    dismissible: true,
    layout: {
      position: "absolute",
      right: 2,
      bottom: 1,
      zIndex: 240,
    },
  });

  overlayManager.register({
    id: "dialog",
    node: dialog,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      dialog.open();
    },
    closeOverlay: (reason) => {
      dialog.close({ reason: normalizeDialogReason(reason) });
    },
    isOverlayOpen: () => dialog.isOpen(),
  });
  overlayManager.register({
    id: "sheet",
    node: sheet,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      sheet.open();
    },
    closeOverlay: (reason) => {
      sheet.close({ reason: normalizeSheetReason(reason) });
    },
    isOverlayOpen: () => sheet.isOpen(),
  });
  overlayManager.register({
    id: "drawer",
    node: drawer,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      drawer.open();
    },
    closeOverlay: (reason) => {
      drawer.close({ reason: normalizeSheetReason(reason) });
    },
    isOverlayOpen: () => drawer.isOpen(),
  });
  overlayManager.register({
    id: "managed",
    node: managedOverlay,
    modal: true,
    initialFocus: managedClose,
    restoreFocus: managedLauncher,
    exclusiveGroup: "workspace-overlays",
  });
  overlayManager.register({
    id: "toast",
    node: toast,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      toast.show();
    },
    closeOverlay: () => {
      toast.hide();
    },
    isOverlayOpen: () => toast.isVisible(),
  });

  dialogLauncher.on("press", () => {
    overlayManager.open("dialog");
    status.setContent("Opened dialog.");
  });
  sheetLauncher.on("press", () => {
    overlayManager.open("sheet");
    status.setContent("Opened sheet.");
  });
  drawerLauncher.on("press", () => {
    overlayManager.open("drawer");
    status.setContent("Opened drawer.");
  });
  managedLauncher.on("press", () => {
    overlayManager.open("managed");
    status.setContent("Opened managed overlay.");
  });
  toastLauncher.on("press", () => {
    overlayManager.open("toast");
    status.setContent("Showing toast.");
  });
  dialogCancel.on("press", () => {
    dialog.close({ reason: "action" });
    status.setContent("Closed dialog.");
  });
  dialogConfirm.on("press", () => {
    dialog.close({ reason: "submit" });
    status.setContent("Confirmed dialog action.");
  });
  managedClose.on("press", () => {
    overlayManager.close("managed", "action");
    status.setContent("Closed managed overlay.");
  });
  dialog.on("close", (event) => {
    status.setContent(`Closed dialog: ${(event as unknown as { reason: string }).reason}.`);
  });
  sheet.on("close", (event) => {
    status.setContent(`Closed sheet: ${(event as unknown as { reason: string }).reason}.`);
  });
  drawer.on("close", (event) => {
    status.setContent(`Closed drawer: ${(event as unknown as { reason: string }).reason}.`);
  });
  toast.on("close", () => {
    status.setContent("Closed toast.");
  });
  overlayManager.on("close", (event) => {
    const detail = event as unknown as { id: string; reason: string };
    if (detail.id === "managed") {
      status.setContent(`Closed managed overlay: ${detail.reason}.`);
    }
  });

  workspace.add(launchers, status, workspaceContent, overlayManager);
  renderer.add(hero, workspace);

  return { renderer, overlayManager };
}

function buildSnapshot(): string {
  const { renderer, overlayManager } = createDialogRenderer();
  overlayManager.open("dialog");
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, overlayManager } = createDialogRenderer();
  try {
    renderer.start();
    overlayManager.open("dialog");
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

function normalizeDialogReason(
  reason?: string,
): "escape" | "backdrop" | "action" | "programmatic" | "submit" {
  switch (reason) {
    case "escape":
    case "backdrop":
    case "action":
    case "submit":
      return reason;
    default:
      return "programmatic";
  }
}

function normalizeSheetReason(reason?: string): "escape" | "backdrop" | "action" | "programmatic" {
  switch (reason) {
    case "escape":
    case "backdrop":
    case "action":
      return reason;
    default:
      return "programmatic";
  }
}

function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}

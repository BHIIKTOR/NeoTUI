import { expect, test } from "bun:test";
import {
  ButtonRenderable,
  ContextMenuRenderable,
  DialogRenderable,
  DrawerRenderable,
  DropdownMenuRenderable,
  MenuBarRenderable,
  OverlayManagerRenderable,
  SheetRenderable,
  TextareaControlRenderable,
  ToastRenderable,
} from "@neotui/components";
import { BoxRenderable, createSyntheticEvent, TextRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("dropdown menu opens from the trigger and selects the active item from the keyboard", () => {
  const renderer = createTestRenderer(60, 16);
  const dropdown = new DropdownMenuRenderable({
    triggerLabel: "Actions",
    items: [
      { type: "label", id: "header", label: "Workspace" },
      { id: "rename", label: "Rename", shortcut: "r" },
      { type: "separator", id: "divider" },
      { id: "delete", label: "Delete", shortcut: "d", danger: true },
    ],
  });
  const selected: string[] = [];

  dropdown.on("select", (event) => {
    selected.push(String((event as { value: { id: string } }).value.id));
  });

  renderer.add(dropdown);
  renderer.renderToString();
  renderer.focus(dropdown);
  renderer.dispatchInput("\u001b[B");

  expect(dropdown.isOpen()).toBe(true);
  expect(renderer.renderToString()).toContain("Rename");

  renderer.dispatchInput("\r");

  expect(selected).toEqual(["rename"]);
  expect(dropdown.isOpen()).toBe(false);
});

test("menubar opens and switches menus with keyboard navigation", () => {
  const renderer = createTestRenderer(70, 18);
  const menubar = new MenuBarRenderable({
    menus: [
      {
        id: "file",
        label: "File",
        items: [
          { id: "new", label: "New File" },
          { id: "open", label: "Open…" },
        ],
      },
      {
        id: "edit",
        label: "Edit",
        items: [
          { id: "undo", label: "Undo" },
          { id: "redo", label: "Redo" },
        ],
      },
    ],
  });

  renderer.add(menubar);
  renderer.renderToString();
  renderer.focus(menubar);
  renderer.dispatchInput("\r");
  expect(renderer.renderToString()).toContain("New File");

  renderer.dispatchInput("\u001b[C");
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Undo");
  expect(snapshot).not.toContain("New File");
});

test("context menu opens at a point and clamps to the viewport", () => {
  const renderer = createTestRenderer(28, 10);
  const contextMenu = new ContextMenuRenderable({
    items: [
      { id: "copy", label: "Copy" },
      { id: "delete", label: "Delete", danger: true },
    ],
    layout: { width: "100%", height: "100%" },
  });

  renderer.add(contextMenu);
  contextMenu.openAt(27, 9);
  const snapshot = renderer.renderToString();
  const popup = (
    contextMenu as unknown as {
      popup: { layoutState: { bounds: { x: number; y: number; width: number; height: number } } };
    }
  ).popup;

  expect(snapshot).toContain("Delete");
  expect(popup.layoutState.bounds.x + popup.layoutState.bounds.width).toBeLessThanOrEqual(28);
  expect(popup.layoutState.bounds.y + popup.layoutState.bounds.height).toBeLessThanOrEqual(10);
});

test("menus align to their anchors even when the root has padding", () => {
  const renderer = createTestRenderer(60, 16);
  renderer.root.updateLayout({ padding: 1, flexDirection: "column", gap: 1 });

  const menubar = new MenuBarRenderable({
    menus: [
      {
        id: "file",
        label: "File",
        items: [{ id: "new", label: "New File" }],
      },
      {
        id: "view",
        label: "View",
        items: [{ id: "palette", label: "Command Palette" }],
      },
    ],
  });
  const dropdown = new DropdownMenuRenderable({
    triggerLabel: "Workspace",
    items: [{ id: "rename", label: "Rename" }],
  });
  const contextMenu = new ContextMenuRenderable({
    items: [{ id: "copy", label: "Copy" }],
    layout: { width: "100%", height: 6 },
  });

  renderer.add(menubar, dropdown, contextMenu);
  renderer.renderToString();

  menubar.openMenu("view");
  dropdown.open();
  contextMenu.openAt(10, 10);
  renderer.renderToString();

  const menubarPopup = (menubar as unknown as { popup: BoxRenderable }).popup;
  const dropdownPopup = (dropdown as unknown as { popup: BoxRenderable }).popup;
  const contextPopup = (contextMenu as unknown as { popup: BoxRenderable }).popup;
  const menuAnchor = (
    menubar as unknown as {
      menuAnchorRect: (index: number) => { x: number; y: number; width: number; height: number };
    }
  ).menuAnchorRect(1);

  expect(menubarPopup.layoutState.bounds.x).toBe(menuAnchor.x);
  expect(menubarPopup.layoutState.bounds.y).toBe(menuAnchor.y + menuAnchor.height);
  expect(dropdownPopup.layoutState.bounds.x).toBe(
    (dropdown as unknown as { trigger: BoxRenderable }).trigger.layoutState.bounds.x,
  );
  expect(dropdownPopup.layoutState.bounds.y).toBe(
    (dropdown as unknown as { trigger: BoxRenderable }).trigger.layoutState.bounds.y +
      (dropdown as unknown as { trigger: BoxRenderable }).trigger.layoutState.bounds.height,
  );
  expect(contextPopup.layoutState.bounds.x).toBe(10);
  expect(contextPopup.layoutState.bounds.y).toBe(11);
});

test("context menu opens from a bubbled right click on a child surface", () => {
  const renderer = createTestRenderer(40, 12);
  const contextMenu = new ContextMenuRenderable({
    items: [
      { id: "copy", label: "Copy" },
      { id: "delete", label: "Delete", danger: true },
    ],
    layout: { width: "100%", height: 8 },
  });
  const target = new BoxRenderable({
    layout: {
      position: "absolute",
      left: 0,
      top: 0,
      right: 0,
      bottom: 0,
    },
    style: {
      border: true,
    },
    content: "Right-click here",
  });

  contextMenu.add(target);
  renderer.add(contextMenu);
  renderer.renderToString();
  renderer.dispatchInput("\u001b[<2;5;5M");

  expect(contextMenu.isOpen()).toBe(true);
  expect(renderer.renderToString()).toContain("Delete");
});

test("dialog traps tab focus and restores focus on escape close", () => {
  const renderer = createTestRenderer(80, 24);
  const launch = new ButtonRenderable({ label: "Launch dialog" });
  const dialog = new DialogRenderable({
    title: "Confirm",
    initialFocus: null,
  });
  const cancel = new ButtonRenderable({ label: "Cancel" });
  const confirm = new ButtonRenderable({ label: "Confirm", variant: "primary" });

  dialog.add(
    new TextRenderable({
      content: "Dialog body",
      layout: { height: 1 },
    }),
  );
  dialog.addFooter(cancel, confirm);

  renderer.add(launch, dialog);
  renderer.renderToString();
  renderer.focus(launch);
  dialog.initialFocusTarget = cancel;
  dialog.open();

  expect(dialog.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(cancel);

  renderer.dispatchInput("\t");
  expect(renderer.focusedNode).toBe(confirm);

  renderer.dispatchEvent(
    renderer.focusedNode,
    createSyntheticEvent({
      type: "key",
      key: "Escape",
      modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      repeat: false,
    }),
  );
  expect(dialog.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launch);
});

test("dialog lays out its footer below the content body", () => {
  const renderer = createTestRenderer(80, 24);
  const dialog = new DialogRenderable({
    title: "Footer layout",
    width: "60%",
    height: 10,
  });
  const cancel = new ButtonRenderable({ label: "Cancel" });
  const confirm = new ButtonRenderable({ label: "Confirm", variant: "primary" });

  dialog.add(
    new TextRenderable({
      content: "Dialog body",
      layout: { height: 1 },
    }),
  );
  dialog.addFooter(cancel, confirm);

  renderer.add(dialog);
  renderer.renderToString();
  dialog.open();
  renderer.renderToString();

  expect(dialog.card.body.children).toContain(dialog.body);
  expect(dialog.card.body.children).toContain(dialog.footer);
  expect(dialog.body.children).not.toContain(dialog.footer);
  expect(dialog.footer.layoutState.bounds.y).toBeGreaterThanOrEqual(
    dialog.body.layoutState.bounds.y + dialog.body.layoutState.bounds.height,
  );
  expect(dialog.footer.layoutState.bounds.width).toBe(
    dialog.card.body.layoutState.innerBounds.width,
  );
  expect(
    dialog.footer.layoutState.bounds.y + dialog.footer.layoutState.bounds.height,
  ).toBeLessThanOrEqual(
    dialog.card.body.layoutState.innerBounds.y + dialog.card.body.layoutState.innerBounds.height,
  );
});

test("dialog centers inside its mounted host instead of the full renderer", () => {
  const renderer = createTestRenderer(100, 30);
  const host = new BoxRenderable({
    layout: {
      position: "absolute",
      left: 10,
      top: 4,
      width: 44,
      height: 14,
    },
    style: {
      border: true,
    },
  });
  const dialog = new DialogRenderable({
    title: "Embedded",
    width: "60%",
    height: 8,
  });

  host.add(dialog);
  renderer.add(host);
  renderer.renderToString();
  dialog.open();
  renderer.renderToString();

  const hostBounds = host.layoutState.innerBounds;
  const cardBounds = dialog.card.layoutState.bounds;
  expect(cardBounds.x).toBeGreaterThanOrEqual(hostBounds.x);
  expect(cardBounds.y).toBeGreaterThanOrEqual(hostBounds.y);
  expect(cardBounds.x + cardBounds.width).toBeLessThanOrEqual(hostBounds.x + hostBounds.width);
  expect(cardBounds.y + cardBounds.height).toBeLessThanOrEqual(hostBounds.y + hostBounds.height);
});

test("dialog backdrop behaves like a scrim and keeps host content visible", () => {
  const renderer = createTestRenderer(80, 24);
  const host = new BoxRenderable({
    content: "Host content should stay visible behind the dialog",
    layout: {
      width: "100%",
      height: "100%",
    },
    style: {
      border: true,
      title: "host",
    },
  });
  const dialog = new DialogRenderable({
    title: "Confirm",
    width: "50%",
    height: 8,
  });

  dialog.add(
    new TextRenderable({
      content: "Dialog body",
      layout: { height: 1 },
    }),
  );

  renderer.add(host);
  host.add(dialog);
  renderer.renderToString();
  dialog.open();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Host content should stay visible");
  expect(snapshot).toContain("Dialog body");
});

test("dialog recomputes its card layout when the renderer resizes", () => {
  const renderer = createTestRenderer(100, 30);
  const dialog = new DialogRenderable({
    title: "Resize aware",
    width: "60%",
    height: 10,
  });

  renderer.add(dialog);
  renderer.renderToString();
  dialog.open();
  renderer.renderToString();

  const before = { ...dialog.card.layoutState.bounds };

  renderer.resize(60, 20);
  renderer.renderToString();

  const after = dialog.card.layoutState.bounds;
  expect(after.width).toBeLessThan(before.width);
  expect(after.height).toBe(10);
  expect(after.x + after.width).toBeLessThanOrEqual(60);
  expect(after.y + after.height).toBeLessThanOrEqual(20);
});

test("dialog hosts an interactive textarea without breaking editing", () => {
  const renderer = createTestRenderer(80, 24);
  const dialog = new DialogRenderable({
    title: "Textarea host",
    width: "60%",
    height: 12,
  });
  const textarea = new TextareaControlRenderable({
    value: "Alpha",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 6 },
  });

  dialog.add(textarea);
  renderer.add(dialog);
  renderer.renderToString();
  dialog.open();
  renderer.focus(textarea);
  renderer.dispatchInput("\nBeta");

  expect(textarea.getValue()).toContain("Beta");
  expect(renderer.renderToString()).toContain("Textarea host");
});

test("overlay manager tracks stack order, backdrops, and focus handoff", () => {
  const renderer = createTestRenderer(80, 24);
  const manager = new OverlayManagerRenderable();
  const baseFocus = new ButtonRenderable({ label: "Base" });

  const first = new BoxRenderable({
    layout: { position: "absolute", left: 10, top: 4, width: 20, height: 6 },
    style: { border: true, visible: false },
  });
  const firstAction = new ButtonRenderable({ label: "First action" });
  first.add(firstAction);

  const second = new BoxRenderable({
    layout: { position: "absolute", left: 18, top: 7, width: 20, height: 6 },
    style: { border: true, visible: false },
  });
  const secondAction = new ButtonRenderable({ label: "Second action" });
  second.add(secondAction);

  renderer.add(baseFocus, manager);
  expect(manager.isVisibleForLayout()).toBe(false);
  manager.register({
    id: "first",
    node: first,
    modal: true,
    initialFocus: firstAction,
    restoreFocus: baseFocus,
  });
  manager.register({
    id: "second",
    node: second,
    modal: true,
    initialFocus: secondAction,
    restoreFocus: firstAction,
  });

  renderer.focus(baseFocus);
  manager.open("first");
  expect(manager.isVisibleForLayout()).toBe(true);
  expect(manager.getTopOverlayId()).toBe("first");
  expect(manager.backdrop.styleProps.visible).toBe(true);
  expect(renderer.focusedNode).toBe(firstAction);

  manager.open("second");
  expect(manager.getTopOverlayId()).toBe("second");
  expect(renderer.focusedNode).toBe(secondAction);

  manager.closeTop("escape");
  expect(manager.getTopOverlayId()).toBe("first");
  expect(renderer.focusedNode).toBe(firstAction);

  manager.closeTop("escape");
  expect(manager.getTopOverlayId()).toBe(null);
  expect(manager.backdrop.styleProps.visible).toBe(false);
  expect(manager.isVisibleForLayout()).toBe(false);
  expect(renderer.focusedNode).toBe(baseFocus);
});

test("overlay manager can coordinate built-in overlay surfaces through one exclusive group", () => {
  const renderer = createTestRenderer(80, 24);
  const manager = new OverlayManagerRenderable();
  const launcher = new ButtonRenderable({ label: "Launch" });
  const dialog = new DialogRenderable({
    title: "Dialog surface",
    width: "50%",
    height: 10,
  });
  const dialogClose = new ButtonRenderable({ label: "Close dialog" });
  dialog.add(
    new TextRenderable({
      content: "Dialog body",
      layout: { height: 1 },
    }),
  );
  dialog.addFooter(dialogClose);
  dialog.initialFocusTarget = dialogClose;

  const sheet = new SheetRenderable({
    title: "Sheet surface",
    side: "right",
    width: 24,
    showCloseButton: true,
  });
  const toast = new ToastRenderable({
    title: "Toast surface",
    message: "Toast body",
    dismissible: true,
    layout: {
      position: "absolute",
      right: 1,
      bottom: 1,
    },
  });

  renderer.add(launcher, manager, dialog, sheet, toast);
  renderer.focus(launcher);

  manager.register({
    id: "dialog",
    node: dialog,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace",
    openOverlay: () => {
      dialog.open();
    },
    closeOverlay: () => {
      dialog.close({ reason: "programmatic" });
    },
    isOverlayOpen: () => dialog.isOpen(),
  });
  manager.register({
    id: "sheet",
    node: sheet,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace",
    openOverlay: () => {
      sheet.open();
    },
    closeOverlay: () => {
      sheet.close({ reason: "programmatic" });
    },
    isOverlayOpen: () => sheet.isOpen(),
  });
  manager.register({
    id: "toast",
    node: toast,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace",
    openOverlay: () => {
      toast.show();
    },
    closeOverlay: () => {
      toast.hide();
    },
    isOverlayOpen: () => toast.isVisible(),
  });

  manager.open("dialog");
  renderer.renderToString();
  expect(manager.getTopOverlayId()).toBe("dialog");
  expect(dialog.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(dialogClose);

  manager.open("sheet");
  renderer.renderToString();
  expect(dialog.isOpen()).toBe(false);
  expect(sheet.isOpen()).toBe(true);
  expect(manager.getTopOverlayId()).toBe("sheet");

  manager.open("toast");
  renderer.renderToString();
  expect(sheet.isOpen()).toBe(false);
  expect(toast.isVisible()).toBe(true);
  expect(manager.getTopOverlayId()).toBe("toast");

  toast.hide();
  renderer.renderToString();
  expect(manager.getTopOverlayId()).toBe(null);
});

test("overlay manager backdrop behaves like a scrim and preserves underlying content", () => {
  const renderer = createTestRenderer(80, 24);
  const host = new BoxRenderable({
    content: "Workspace content remains visible under managed overlays",
    layout: {
      width: "100%",
      height: "100%",
    },
    style: {
      border: true,
      title: "workspace",
    },
  });
  const manager = new OverlayManagerRenderable();
  const overlay = new BoxRenderable({
    layout: {
      position: "absolute",
      left: 20,
      top: 6,
      width: 24,
      height: 6,
    },
    style: {
      border: true,
      title: "managed",
    },
    content: "Managed body",
  });

  renderer.add(host);
  host.add(manager);
  manager.register({
    id: "managed",
    node: overlay,
    modal: true,
  });
  renderer.renderToString();
  manager.open("managed");

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Workspace content remains visible");
  expect(snapshot).toContain("Managed body");
});

test("sheet anchors to the requested side and restores focus on close", () => {
  const renderer = createTestRenderer(80, 24);
  const launch = new ButtonRenderable({ label: "Open sheet" });
  const sheet = new SheetRenderable({
    title: "Inspector",
    side: "right",
    width: 20,
    showCloseButton: true,
  });

  sheet.add(
    new TextRenderable({
      content: "Sheet body",
      layout: { height: 1 },
    }),
  );

  renderer.add(launch, sheet);
  renderer.renderToString();
  renderer.focus(launch);
  sheet.open();
  renderer.renderToString();

  expect(sheet.isOpen()).toBe(true);
  expect(sheet.container.layoutState.bounds.x).toBe(56);
  expect(renderer.focusedNode).toBe(sheet.footer.children[0] ?? null);

  renderer.dispatchEvent(
    renderer.focusedNode,
    createSyntheticEvent({
      type: "key",
      key: "Escape",
      modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      repeat: false,
    }),
  );

  expect(sheet.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launch);
});

test("sheet backdrop behaves like a scrim and keeps the host content visible", () => {
  const renderer = createTestRenderer(80, 24);
  const host = new BoxRenderable({
    content: "Inspector host content should still be readable",
    layout: {
      width: "100%",
      height: "100%",
    },
    style: {
      border: true,
      title: "host",
    },
  });
  const sheet = new SheetRenderable({
    title: "Inspector",
    side: "right",
    width: "35%",
    showCloseButton: true,
  });

  sheet.add(
    new TextRenderable({
      content: "Sheet body",
      layout: { height: 1 },
    }),
  );

  renderer.add(host);
  host.add(sheet);
  renderer.renderToString();
  sheet.open();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Inspector host content should");
  expect(snapshot).toContain("Sheet body");
});

test("sheet anchors to the edge of its mounted host instead of the full renderer", () => {
  const renderer = createTestRenderer(100, 30);
  const host = new BoxRenderable({
    layout: {
      position: "absolute",
      left: 8,
      top: 3,
      width: 50,
      height: 16,
    },
    style: {
      border: true,
    },
  });
  const sheet = new SheetRenderable({
    title: "Embedded sheet",
    side: "right",
    width: "40%",
    showCloseButton: true,
  });

  host.add(sheet);
  renderer.add(host);
  renderer.renderToString();
  sheet.open();
  renderer.renderToString();

  const hostBounds = host.layoutState.innerBounds;
  const sheetBounds = sheet.container.layoutState.bounds;
  expect(sheetBounds.x).toBe(hostBounds.x + hostBounds.width - sheetBounds.width);
  expect(sheetBounds.y).toBe(hostBounds.y);
  expect(sheetBounds.height).toBe(hostBounds.height);
  expect(sheetBounds.x + sheetBounds.width).toBeLessThanOrEqual(hostBounds.x + hostBounds.width);
});

test("sheet recomputes its anchor and size when the renderer resizes", () => {
  const renderer = createTestRenderer(100, 30);
  const sheet = new SheetRenderable({
    title: "Resize aware sheet",
    side: "right",
    width: "40%",
    showCloseButton: true,
  });

  renderer.add(sheet);
  renderer.renderToString();
  sheet.open();
  renderer.renderToString();

  const before = { ...sheet.container.layoutState.bounds };

  renderer.resize(70, 18);
  renderer.renderToString();

  const after = sheet.container.layoutState.bounds;
  expect(after.width).toBeLessThan(before.width);
  expect(after.height).toBe(18);
  expect(after.x + after.width).toBe(70);
});

test("sheet hosts an interactive textarea through editing and resize", () => {
  const renderer = createTestRenderer(90, 24);
  const sheet = new SheetRenderable({
    title: "Sheet editor",
    side: "right",
    width: "42%",
    showCloseButton: true,
  });
  const textarea = new TextareaControlRenderable({
    value: "Alpha",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 8 },
  });

  sheet.add(textarea);
  renderer.add(sheet);
  renderer.renderToString();
  sheet.open();
  renderer.focus(textarea);
  renderer.dispatchInput("\nBeta");
  renderer.resize(72, 20);
  renderer.renderToString();
  renderer.dispatchInput("\u001b[6~");

  expect(textarea.getValue()).toContain("Beta");
  expect(renderer.renderToString()).toContain("Sheet editor");
});

test("drawer opens from the bottom and clamps its compact height", () => {
  const renderer = createTestRenderer(40, 10);
  const drawer = new DrawerRenderable({
    title: "Quick actions",
    compact: true,
    height: 20,
    showCloseButton: true,
  });

  drawer.add(
    new TextRenderable({
      content: "Drawer body",
      layout: { height: 1 },
    }),
  );

  renderer.add(drawer);
  drawer.open();
  renderer.renderToString();

  expect(drawer.isOpen()).toBe(true);
  expect(drawer.container.layoutState.bounds.y + drawer.container.layoutState.bounds.height).toBe(
    10,
  );
  expect(drawer.container.layoutState.bounds.height).toBeLessThanOrEqual(10);
});

import { expect, test } from "bun:test";
import {
  DockLayoutRenderable,
  defaultComponentTheme,
  ScrollAreaRenderable,
  TextareaControlRenderable,
  WindowManagerRenderable,
  WindowRenderable,
} from "@neotui/components";
import { BoxRenderable, createSyntheticEvent } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

const modifiers = {
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
} as const;

test("window supports title-bar dragging, resize handle updates, and control button close", () => {
  const renderer = createTestRenderer(120, 40);
  const window = new WindowRenderable({
    title: "Inspector",
    x: 2,
    y: 2,
    width: 30,
    height: 12,
  });
  window.add(
    new BoxRenderable({
      content: "Window body",
      layout: { flexGrow: 1 },
    }),
  );

  let closed = false;
  window.on("close", () => {
    closed = true;
  });

  renderer.add(window);
  renderer.renderToString();

  renderer.dispatchEvent(window.titleBar, createMouseAliasEvent("dragstart", 4, 3));
  renderer.dispatchEvent(window.titleBar, createMouseAliasEvent("dragmove", 14, 8));
  renderer.dispatchEvent(window.titleBar, createMouseAliasEvent("dragend", 14, 8));
  renderer.renderToString();

  expect(window.layoutProps.left).toBe(12);
  expect(window.layoutProps.top).toBe(7);

  const handleBounds = window.resizeHandle.layoutState.bounds;
  renderer.dispatchEvent(
    window.resizeHandle,
    createMouseAliasEvent("dragstart", handleBounds.x, handleBounds.y),
  );
  renderer.dispatchEvent(
    window.resizeHandle,
    createMouseAliasEvent("dragmove", handleBounds.x + 8, handleBounds.y + 4),
  );
  renderer.dispatchEvent(
    window.resizeHandle,
    createMouseAliasEvent("dragend", handleBounds.x + 8, handleBounds.y + 4),
  );
  renderer.renderToString();

  expect(window.layoutState.bounds.width).toBe(38);
  expect(window.layoutState.bounds.height).toBe(16);

  window.closeButton?.press();
  expect(closed).toBe(true);
  expect(window.styleProps.visible).toBe(false);
});

test("window supports built-in wrapped content and inner scrolling", () => {
  const renderer = createTestRenderer(40, 16);
  const window = new WindowRenderable({
    title: "Content",
    x: 1,
    y: 1,
    width: 20,
    height: 8,
    content:
      "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma.",
    contentWrapMode: "word",
    contentScrollable: true,
  });

  renderer.add(window);
  const initial = renderer.renderToString();

  expect(initial).toContain("Alpha beta gamma");
  expect(window.bodyScrollViewport?.scrollY).toBe(0);
  expect(window.bodyScrollViewport?.verticalScrollbar.styleProps.visible).toBe(true);
  expect(window.bodyScrollViewport?.verticalScrollbar.layoutState.bounds.height).toBeGreaterThan(0);

  window.setContentScrollY(2);
  const scrolled = renderer.renderToString();
  expect(window.bodyScrollViewport?.scrollY).toBe(2);
  expect(window.bodyScrollViewport?.verticalScrollbar.offset).toBe(2);
  expect(scrolled).not.toBe(initial);

  renderer.dispatchEvent(window, createWheelEvent(4, 4, 1));
  renderer.renderToString();
  expect(window.bodyScrollViewport?.scrollY).toBe(2);
});

test("window does not overscroll when scroll mode is enabled but content fits", () => {
  const renderer = createTestRenderer(40, 16);
  const window = new WindowRenderable({
    title: "Short",
    x: 1,
    y: 1,
    width: 22,
    height: 10,
    content: "Short wrapped body that should still fit.",
    contentWrapMode: "word",
    contentScrollable: true,
  });

  renderer.add(window);
  renderer.renderToString();

  renderer.dispatchEvent(window, createWheelEvent(4, 4, 1));
  renderer.renderToString();

  expect(window.bodyScrollViewport?.scrollY).toBe(0);
});

test("window body can host an interactive textarea", () => {
  const renderer = createTestRenderer(80, 24);
  const window = new WindowRenderable({
    title: "Notes",
    x: 2,
    y: 2,
    width: 32,
    height: 14,
  });
  const textarea = new TextareaControlRenderable({
    value: "Alpha",
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 7 },
  });

  window.body.add(textarea);
  renderer.add(window);
  renderer.renderToString();
  renderer.focus(textarea);
  renderer.dispatchInput("\nBeta");

  expect(textarea.getValue()).toContain("Beta");
  expect(renderer.renderToString()).toContain("Notes");
});

test("window footer reserves body space without leaving an extra blank row", () => {
  const renderer = createTestRenderer(80, 24);
  const window = new WindowRenderable({
    title: "Inspector",
    x: 2,
    y: 2,
    width: 32,
    height: 14,
    content: "Alpha\nBeta\nGamma",
    contentWrapMode: "word",
    contentScrollable: false,
  });

  window.addFooter(new BoxRenderable({ content: "Apply" }));
  renderer.add(window);
  renderer.renderToString();

  expect(window.body.layoutProps.padding).toEqual({
    left: 1,
    right: 1,
    bottom: 3,
  });
  expect(window.footerShell.layoutState.bounds.height).toBe(3);
});

test("window manager tracks activation, z-order, minimize handoff, and maximize restore", () => {
  const renderer = createTestRenderer(100, 30);
  const manager = new WindowManagerRenderable();
  const left = new WindowRenderable({
    title: "Left",
    x: 1,
    y: 1,
    width: 28,
    height: 12,
  });
  const right = new WindowRenderable({
    title: "Right",
    x: 18,
    y: 4,
    width: 30,
    height: 12,
  });

  manager.addWindow(left).addWindow(right);
  renderer.add(manager);
  renderer.renderToString();

  manager.activate(right.id);
  renderer.renderToString();
  expect(manager.getActiveWindowId()).toBe(right.id);
  expect((right.layoutProps.zIndex ?? 0) > (left.layoutProps.zIndex ?? 0)).toBe(true);
  expect(right.active).toBe(true);
  expect(left.active).toBe(false);

  manager.minimize(right.id);
  renderer.renderToString();
  expect(right.minimized).toBe(true);
  expect(right.styleProps.visible).toBe(true);
  expect(manager.getActiveWindowId()).toBe(left.id);
  expect(right.layoutProps.left).toBe(0);
  expect(right.layoutProps.top).toBe(27);
  expect(right.layoutProps.height).toBe(3);

  const leftBefore = {
    x: Number(left.layoutProps.left ?? 0),
    y: Number(left.layoutProps.top ?? 0),
    width: left.layoutState.bounds.width,
    height: left.layoutState.bounds.height,
  };

  manager.maximize(left.id);
  renderer.renderToString();
  expect(left.maximized).toBe(true);
  expect(left.layoutState.bounds.width).toBe(manager.layoutState.innerBounds.width);
  expect(left.layoutState.bounds.height).toBe(manager.layoutState.innerBounds.height);

  manager.restore(left.id);
  renderer.renderToString();
  expect(left.maximized).toBe(false);
  expect(left.layoutState.bounds.x).toBe(leftBefore.x);
  expect(left.layoutState.bounds.y).toBe(leftBefore.y);
  expect(left.layoutState.bounds.width).toBe(leftBefore.width);
  expect(left.layoutState.bounds.height).toBe(leftBefore.height);

  left.closeButton?.press();
  renderer.renderToString();
  expect(manager.getActiveWindowId()).toBe(null);
});

test("window manager keeps utility windows above document windows while preserving activation", () => {
  const renderer = createTestRenderer(100, 30);
  const manager = new WindowManagerRenderable();
  const documentA = new WindowRenderable({
    title: "Editor",
    role: "document",
    x: 1,
    y: 1,
    width: 28,
    height: 12,
  });
  const documentB = new WindowRenderable({
    title: "Preview",
    role: "document",
    x: 18,
    y: 4,
    width: 30,
    height: 12,
  });
  const utility = new WindowRenderable({
    title: "Palette",
    role: "utility",
    x: 56,
    y: 2,
    width: 22,
    height: 9,
    resizable: false,
    maximizable: false,
  });

  manager.addWindow(documentA).addWindow(documentB).addWindow(utility);
  renderer.add(manager);
  renderer.renderToString();

  manager.activate(utility.id);
  renderer.renderToString();
  expect(manager.getActiveWindowId()).toBe(utility.id);
  expect(utility.active).toBe(true);
  expect((utility.layoutProps.zIndex ?? 0) > (documentB.layoutProps.zIndex ?? 0)).toBe(true);

  manager.activate(documentB.id);
  renderer.renderToString();
  expect(manager.getActiveWindowId()).toBe(documentB.id);
  expect(documentB.active).toBe(true);
  expect(utility.active).toBe(false);
  expect((utility.layoutProps.zIndex ?? 0) > (documentB.layoutProps.zIndex ?? 0)).toBe(true);

  renderer.dispatchEvent(utility, createMouseEvent("down", 57, 3));
  renderer.renderToString();
  expect(manager.getActiveWindowId()).toBe(utility.id);
  expect(utility.active).toBe(true);
});

test("window manager lays minimized windows out from bottom-left and wraps upward on overflow", () => {
  const renderer = createTestRenderer(40, 20);
  const manager = new WindowManagerRenderable();
  const one = new WindowRenderable({ title: "One", x: 1, y: 1, width: 18, height: 8 });
  const two = new WindowRenderable({ title: "Two", x: 3, y: 2, width: 18, height: 8 });
  const three = new WindowRenderable({ title: "Three", x: 5, y: 3, width: 18, height: 8 });
  const four = new WindowRenderable({ title: "Four", x: 7, y: 4, width: 18, height: 8 });

  manager.addWindow(one).addWindow(two).addWindow(three).addWindow(four);
  renderer.add(manager);
  renderer.renderToString();

  manager.minimize(one.id);
  manager.minimize(two.id);
  manager.minimize(three.id);
  manager.minimize(four.id);
  renderer.renderToString();

  expect(one.layoutProps.left).toBe(0);
  expect(one.layoutProps.top).toBe(17);
  expect(two.layoutProps.left).toBe(13);
  expect(two.layoutProps.top).toBe(17);
  expect(three.layoutProps.left).toBe(26);
  expect(three.layoutProps.top).toBe(17);
  expect(four.layoutProps.left).toBe(0);
  expect(four.layoutProps.top).toBe(13);

  renderer.dispatchEvent(four, createMouseEvent("down", 1, 14));
  renderer.renderToString();

  expect(four.minimized).toBe(false);
  expect(manager.getActiveWindowId()).toBe(four.id);
});

test("window manager anchors minimized windows to the visible scroll viewport of its host", () => {
  const renderer = createTestRenderer(100, 30);
  const scroller = new ScrollAreaRenderable({
    direction: "both",
    layout: {
      width: 42,
      height: 12,
    },
  });
  const manager = new WindowManagerRenderable({
    layout: {
      width: 70,
      height: 20,
    },
  });
  const window = new WindowRenderable({
    title: "Doc",
    x: 2,
    y: 2,
    width: 26,
    height: 10,
  });

  manager.addWindow(window);
  scroller.add(manager);
  renderer.add(scroller);
  renderer.renderToString();

  scroller.scrollTo(5, 6);
  renderer.renderToString();
  manager.minimize(window.id);
  renderer.renderToString();

  expect(Number(window.layoutProps.left ?? 0)).toBe(5);
  expect(Number(window.layoutProps.top ?? 0)).toBe(13);
});

test("dock layout reorders panes from drag events and preserves visible hover state", () => {
  const renderer = createTestRenderer(96, 24);
  const dock = new DockLayoutRenderable({
    items: [
      { id: "logs", title: "Logs", node: new BoxRenderable({ content: "Logs" }), tone: "info" },
      {
        id: "preview",
        title: "Preview",
        node: new BoxRenderable({ content: "Preview" }),
        tone: "success",
      },
      {
        id: "inspector",
        title: "Inspector",
        node: new BoxRenderable({ content: "Inspector" }),
        tone: "danger",
      },
    ],
  });

  renderer.add(dock);
  renderer.renderToString();

  const firstPane = dock.children[0] as BoxRenderable;
  const secondPane = dock.children[1] as BoxRenderable;
  const secondBounds = secondPane.layoutState.bounds;
  const dragPreview = (dock as unknown as { dragPreview: BoxRenderable }).dragPreview;

  renderer.dispatchEvent(firstPane, createMouseAliasEvent("dragstart", 4, 4));
  renderer.dispatchEvent(firstPane, createMouseAliasEvent("dragmove", 16, 6));
  renderer.renderToString();
  expect(dragPreview.styleProps.visible).toBe(true);
  expect(dragPreview.layoutProps.left).toBe(12);
  expect(dragPreview.layoutProps.top).toBe(0);

  renderer.dispatchEvent(
    firstPane,
    createMouseAliasEvent(
      "dragmove",
      secondBounds.x + Math.floor(secondBounds.width / 2),
      secondBounds.y + Math.floor(secondBounds.height / 2),
    ),
  );
  renderer.renderToString();
  expect(secondPane.styleProps.borderFg).toBe(defaultComponentTheme.accent);

  renderer.dispatchEvent(
    dock,
    createMouseEvent(
      "up",
      secondBounds.x + Math.floor(secondBounds.width / 2),
      secondBounds.y + Math.floor(secondBounds.height / 2),
    ),
  );
  renderer.renderToString();

  expect(dock.serializeOrder()).toEqual(["preview", "logs", "inspector"]);
  expect(dragPreview.styleProps.visible).toBe(false);

  renderer.resize(120, 28);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Preview");
  expect(snapshot).toContain("Inspector");
});

test("dock layout inserts a dragged pane before a target when dropped on the leading edge", () => {
  const renderer = createTestRenderer(96, 24);
  const dock = new DockLayoutRenderable({
    items: [
      { id: "logs", title: "Logs", node: new BoxRenderable({ content: "Logs" }), tone: "info" },
      {
        id: "preview",
        title: "Preview",
        node: new BoxRenderable({ content: "Preview" }),
        tone: "success",
      },
      {
        id: "inspector",
        title: "Inspector",
        node: new BoxRenderable({ content: "Inspector" }),
        tone: "danger",
      },
    ],
  });

  renderer.add(dock);
  renderer.renderToString();

  const sourcePane = dock.children[2] as BoxRenderable;
  const targetPane = dock.children[1] as BoxRenderable;
  const targetBounds = targetPane.layoutState.bounds;
  const dropIndicator = (dock as unknown as { dropIndicator: BoxRenderable }).dropIndicator;

  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent("dragstart", targetBounds.x + targetBounds.width + 8, targetBounds.y + 2),
  );
  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent(
      "dragmove",
      targetBounds.x + 1,
      targetBounds.y + Math.floor(targetBounds.height / 2),
    ),
  );
  renderer.renderToString();

  expect(dropIndicator.styleProps.visible).toBe(true);
  expect(Number(dropIndicator.layoutProps.width ?? 0)).toBeGreaterThan(0);
  expect(Number(dropIndicator.layoutProps.left ?? 0)).toBe(
    targetBounds.x - dock.layoutState.bounds.x,
  );

  renderer.dispatchEvent(
    dock,
    createMouseEvent(
      "up",
      targetBounds.x + 1,
      targetBounds.y + Math.floor(targetBounds.height / 2),
    ),
  );
  renderer.renderToString();

  expect(dock.serializeOrder()).toEqual(["logs", "inspector", "preview"]);
  expect(dropIndicator.styleProps.visible).toBe(false);
});

test("dock layout inserts a dragged pane after a target in column mode", () => {
  const renderer = createTestRenderer(72, 28);
  const dock = new DockLayoutRenderable({
    direction: "column",
    items: [
      { id: "logs", title: "Logs", node: new BoxRenderable({ content: "Logs" }), tone: "info" },
      {
        id: "preview",
        title: "Preview",
        node: new BoxRenderable({ content: "Preview" }),
        tone: "success",
      },
      {
        id: "inspector",
        title: "Inspector",
        node: new BoxRenderable({ content: "Inspector" }),
        tone: "danger",
      },
    ],
  });

  renderer.add(dock);
  renderer.renderToString();

  const sourcePane = dock.children[0] as BoxRenderable;
  const targetPane = dock.children[1] as BoxRenderable;
  const targetBounds = targetPane.layoutState.bounds;
  const dropIndicator = (dock as unknown as { dropIndicator: BoxRenderable }).dropIndicator;

  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent("dragstart", targetBounds.x + 3, targetBounds.y - 4),
  );
  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent(
      "dragmove",
      targetBounds.x + Math.floor(targetBounds.width / 2),
      targetBounds.y + targetBounds.height - 1,
    ),
  );
  renderer.renderToString();

  expect(dropIndicator.styleProps.visible).toBe(true);
  expect(Number(dropIndicator.layoutProps.height ?? 0)).toBeGreaterThan(0);
  expect(Number(dropIndicator.layoutProps.top ?? 0)).toBeGreaterThan(
    targetBounds.y - dock.layoutState.bounds.y,
  );

  renderer.dispatchEvent(
    dock,
    createMouseEvent(
      "up",
      targetBounds.x + Math.floor(targetBounds.width / 2),
      targetBounds.y + targetBounds.height - 1,
    ),
  );
  renderer.renderToString();

  expect(dock.serializeOrder()).toEqual(["preview", "logs", "inspector"]);
  expect(dropIndicator.styleProps.visible).toBe(false);
});

function createMouseAliasEvent(alias: "dragstart" | "dragmove" | "dragend", x: number, y: number) {
  return createSyntheticEvent({
    type: "mouse",
    action: "move",
    button: "left",
    x,
    y,
    wheelDelta: 0,
    modifiers,
    alias,
  } as const);
}

function createMouseEvent(action: "down" | "up", x: number, y: number) {
  return createSyntheticEvent({
    type: "mouse",
    action,
    button: "left",
    x,
    y,
    wheelDelta: 0,
    modifiers,
  } as const);
}

function createWheelEvent(x: number, y: number, wheelDelta: -1 | 1) {
  return createSyntheticEvent({
    type: "mouse",
    action: "wheel",
    button: "none",
    x,
    y,
    wheelDelta,
    modifiers,
  } as const);
}

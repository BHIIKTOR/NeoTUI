import { expect, test } from "bun:test";
import {
  ButtonRenderable,
  CommandRenderable,
  DialogRenderable,
  DockLayoutRenderable,
  DrawerRenderable,
  InputFieldRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  SheetRenderable,
  SidebarRenderable,
  TabsRenderable,
  TextareaFieldRenderable,
} from "@neotui/components";
import {
  CONTROL_SEQUENCES,
  createSyntheticEvent,
  TerminalSession,
  withTerminalSession,
} from "@neotui/core";
import {
  buildPlaygroundMessage,
  createPlaygroundRenderer,
  isKittyInteractiveRuntime,
} from "../../../apps/playground/src/index.ts";
import {
  createMemorySignalTarget,
  createMemoryTerminalInput,
  createMemoryTerminalOutput,
} from "../src/index.ts";

test("playground message reports the active bootstrap surface", () => {
  const message = buildPlaygroundMessage();

  expect(message).toContain("NeoTui");
  expect(message).toContain("kitty-native renderer");
  expect(message).toContain("kitty");
});

test("playground runtime detection only enables live mode for kitty ttys", () => {
  expect(isKittyInteractiveRuntime({ TERM: "xterm-kitty" }, true)).toBe(true);
  expect(isKittyInteractiveRuntime({ KITTY_WINDOW_ID: "1" }, true)).toBe(true);
  expect(isKittyInteractiveRuntime({ TERM: "xterm-256color" }, true)).toBe(false);
  expect(isKittyInteractiveRuntime({ TERM: "xterm-kitty" }, false)).toBe(false);
});

test("playground mouse clicks switch the visible surface", () => {
  const renderer = createPlaygroundRenderer();
  const nav = findPlaygroundSidebar(renderer);

  renderer.renderFrame();
  clickSidebarItem(renderer, nav, "inputs");

  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("surface:inputs");
  expect(snapshot).toContain("command");
  expect(snapshot).not.toContain("surface:overview");
});

test("playground hero grows to fit its multiline copy without hidden scrolling", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const hero = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable && node.title === "NeoTui" && node.isVisibleForLayout(),
  );

  expect(hero.body instanceof ScrollAreaRenderable).toBe(false);
  expect(hero.layoutState.bounds.height).toBeGreaterThanOrEqual(7);
  expect(renderer.renderToString()).toContain(
    "overview shows all sections; core, components, overlay, and workspace narrow the catalog",
  );
});

test("playground top tabs filter the left rail and overview restores all groups", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  const tabs = findNode(
    renderer,
    (node): node is TabsRenderable =>
      node instanceof TabsRenderable &&
      node.tabs.some((tab) => tab.id === "overview") &&
      node.tabs.some((tab) => tab.id === "workspace"),
  );

  tabs.setActiveTab("components");
  renderer.renderFrame();

  expect(nav.groups).toHaveLength(1);
  expect(nav.groups[0]?.id).toBe("components-sections");
  expect(nav.groups[0]?.items.map((item) => item.id)).toEqual([
    "command",
    "primitives",
    "navigation",
    "menus",
    "fields",
    "choice",
    "feedback",
    "data",
    "temporal",
  ]);
  expect(renderer.renderToString()).toContain("surface:navigation");

  clickSidebarItem(renderer, nav, "temporal");
  renderer.renderFrame();
  expect(renderer.renderToString()).toContain("surface:temporal");

  tabs.setActiveTab("overview");
  renderer.renderFrame();

  expect(nav.groups.map((group) => group.id)).toEqual(["all-sections"]);
  expect(nav.groups[0]?.items.map((item) => item.id)).toEqual([
    "overview",
    "inputs",
    "markdown",
    "code",
    "diff",
    "image",
    "dialog",
    "command",
    "overlay",
    "drag",
    "windows",
    "primitives",
    "navigation",
    "menus",
    "fields",
    "choice",
    "feedback",
    "data",
    "temporal",
  ]);
  expect(nav.getActiveItemId()).toBe("temporal");
  expect(renderer.renderToString()).toContain("surface:temporal");
});

test("playground inputs surface keeps fields compact and exposes a scroll host", () => {
  const renderer = createPlaygroundRenderer();
  const nav = findPlaygroundSidebar(renderer);

  renderer.renderFrame();
  clickSidebarItem(renderer, nav, "inputs");
  renderer.renderFrame();

  const intro = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable &&
      node.title === "field wrappers" &&
      node.isVisibleForLayout(),
  );
  const scrollArea = findNode(
    renderer,
    (node): node is ScrollAreaRenderable =>
      node instanceof ScrollAreaRenderable &&
      node.isVisibleForLayout() &&
      node.styleProps.border === false &&
      node.layoutState.bounds.height > 1 &&
      node.layoutState.bounds.y >= intro.layoutState.bounds.y + intro.layoutState.bounds.height,
  );
  const inputField = findNode(
    renderer,
    (node): node is InputFieldRenderable =>
      node instanceof InputFieldRenderable && node.label === "command" && node.isVisibleForLayout(),
  );
  const textareaField = findNode(
    renderer,
    (node): node is TextareaFieldRenderable =>
      node instanceof TextareaFieldRenderable &&
      node.label === "notes" &&
      node.isVisibleForLayout(),
  );

  const gap =
    textareaField.layoutState.bounds.y -
    (inputField.layoutState.bounds.y + inputField.layoutState.bounds.height);
  const introY = intro.layoutState.bounds.y;

  expect(gap).toBeLessThanOrEqual(2);
  expect(renderer.renderToString()).toContain("NeoTui");
  expect(scrollArea.getScrollPosition().y).toBe(0);

  scrollArea.setScrollY(999);
  renderer.renderFrame();

  expect(intro.layoutState.bounds.y).toBe(introY);
  expect(scrollArea.getScrollPosition().y).toBeGreaterThan(0);
  expect(renderer.renderToString()).toContain("normal");
});

test("playground component panels grow when their controls would otherwise be clipped", () => {
  const renderer = createPlaygroundRenderer();
  const nav = findPlaygroundSidebar(renderer);

  renderer.renderFrame();
  clickSidebarItem(renderer, nav, "primitives");
  renderer.renderFrame();

  const actionPanel = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable && node.title === "actions" && node.isVisibleForLayout(),
  );
  expect(actionPanel.body instanceof ScrollAreaRenderable).toBe(false);
  expect(actionPanel.layoutState.bounds.height).toBeGreaterThan(8);
});

test("playground windows section exposes a scrollable workspace when the sample windows exceed the pane", () => {
  const renderer = createPlaygroundRenderer();
  const nav = findPlaygroundSidebar(renderer);

  renderer.renderFrame();
  clickSidebarItem(renderer, nav, "windows");
  renderer.renderFrame();

  const workspace = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable && node.title === "windows" && node.isVisibleForLayout(),
  );

  expect(workspace.body instanceof ScrollAreaRenderable).toBe(true);

  const scrollHost = workspace.body as ScrollAreaRenderable;
  scrollHost.scrollTo(999, 999);
  renderer.renderFrame();

  expect(scrollHost.getScrollPosition().y).toBeGreaterThan(0);
  expect(scrollHost.getScrollPosition().x).toBeGreaterThanOrEqual(0);
});

test("playground command section opens an interactive palette and closes on escape", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findNode(
    renderer,
    (node): node is SidebarRenderable =>
      node instanceof SidebarRenderable && node.layoutProps.width === "22%",
  );
  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Open command palette",
  );
  const command = findNode(
    renderer,
    (node): node is CommandRenderable => node instanceof CommandRenderable,
  );

  clickSidebarItem(renderer, nav, "command");
  renderer.renderFrame();
  expect(renderer.focusedNode).toBe(launcher);

  launcher.press();
  renderer.renderFrame();

  expect(command.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(command.queryInput);
  expect(command.preview.styleProps.visible).toBe(true);
  expect(renderer.renderToString()).toContain("selected action");
  expect(renderer.renderToString()).toContain("PINNED");
  expect(renderer.renderToString()).toContain("Deploy Release");

  renderer.dispatchInput("\u001b[114u\u001b[101u");
  renderer.renderFrame();
  expect(command.queryInput.getValue()).toBe("re");

  renderer.dispatchInput("\u001b[B");
  renderer.renderFrame();
  expect(command.selectedIndex).toBe(1);
  expect(renderer.renderToString()).toContain("Open Recent");

  renderer.dispatchInput("\u001b[27u");
  renderer.renderFrame();
  expect(command.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launcher);
});

test("playground command section opened by mouse keeps query focus for live typing", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findNode(
    renderer,
    (node): node is SidebarRenderable =>
      node instanceof SidebarRenderable && node.layoutProps.width === "22%",
  );
  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Open command palette",
  );
  const command = findNode(
    renderer,
    (node): node is CommandRenderable => node instanceof CommandRenderable,
  );

  clickSidebarItem(renderer, nav, "command");
  renderer.renderFrame();

  const bounds = launcher.layoutState.bounds;
  const x = bounds.x + Math.floor(bounds.width / 2);
  const y = bounds.y + Math.floor(bounds.height / 2);

  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}M`);
  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}m`);
  renderer.renderFrame();

  expect(command.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(command.queryInput);
  expect(command.queryInput.focused).toBe(true);

  renderer.dispatchInput("\u001b[114u\u001b[101u");
  renderer.renderFrame();

  expect(command.queryInput.getValue()).toBe("re");
});

test("playground command section recovers after focus drifts out of the palette", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findNode(
    renderer,
    (node): node is SidebarRenderable =>
      node instanceof SidebarRenderable && node.layoutProps.width === "22%",
  );
  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Open command palette",
  );
  const command = findNode(
    renderer,
    (node): node is CommandRenderable => node instanceof CommandRenderable,
  );

  clickSidebarItem(renderer, nav, "command");
  renderer.renderFrame();

  launcher.press();
  renderer.renderFrame();
  expect(command.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(command.queryInput);

  renderer.focus(nav);
  expect(renderer.focusedNode).toBe(nav);

  renderer.dispatchInput("\u001b[114u\u001b[101u");
  renderer.renderFrame();
  expect(renderer.focusedNode).toBe(command.queryInput);
  expect(command.queryInput.getValue()).toBe("re");

  renderer.dispatchInput("\u001b[27u");
  renderer.renderFrame();
  expect(command.isOpen()).toBe(false);
});

test("playground overlay section keeps workspace content visible when a sheet opens", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findNode(
    renderer,
    (node): node is SidebarRenderable =>
      node instanceof SidebarRenderable && node.layoutProps.width === "22%",
  );
  const sheetLauncher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Sheet",
  );

  clickSidebarItem(renderer, nav, "overlay");
  renderer.renderFrame();
  sheetLauncher.press();
  renderer.renderFrame();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("surface:overlay");
  expect(snapshot).toContain("workspace | overlay host");
  expect(
    findNode(
      renderer,
      (node): node is SheetRenderable =>
        node instanceof SheetRenderable && !(node instanceof DrawerRenderable) && node.isOpen(),
    ),
  ).toBeDefined();
});

test("playground overlay workspace keeps launchers visible inside a grow host", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "overlay");
  renderer.renderFrame();

  const workspace = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable &&
      node.title === "workspace" &&
      node.subtitle === "overlay host" &&
      node.isVisibleForLayout(),
  );
  const managedLauncher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Managed overlay" &&
      node.isVisibleForLayout(),
  );

  expect(workspace.body instanceof ScrollAreaRenderable).toBe(false);
  expect(renderer.renderToString()).toContain("Managed overlay");
  expect(
    managedLauncher.layoutState.bounds.x + managedLauncher.layoutState.bounds.width,
  ).toBeLessThanOrEqual(
    workspace.layoutState.innerBounds.x + workspace.layoutState.innerBounds.width,
  );
});

test("playground overlay dialog action buttons remain clickable", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "overlay");
  renderer.renderFrame();

  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Dialog" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, launcher);
  renderer.renderFrame();

  const cancel = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Cancel" &&
      node.isVisibleForLayout() &&
      node.layoutState.bounds.width > 0 &&
      node.layoutState.bounds.height > 0,
  );
  clickButton(renderer, cancel);
  renderer.renderFrame();

  expect(
    findOptionalNode(
      renderer,
      (node): node is DialogRenderable =>
        node instanceof DialogRenderable && node.title === "Confirm release" && node.isOpen(),
    ),
  ).toBeUndefined();
});

test("playground overlay drawer close button remains clickable", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "overlay");
  renderer.renderFrame();

  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Drawer" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, launcher);
  renderer.renderFrame();

  const close = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Close" &&
      node.isVisibleForLayout() &&
      node.layoutState.bounds.width > 0 &&
      node.layoutState.bounds.height > 0,
  );
  clickButton(renderer, close);
  renderer.renderFrame();

  expect(
    findOptionalNode(
      renderer,
      (node): node is DrawerRenderable => node instanceof DrawerRenderable && node.isOpen(),
    ),
  ).toBeUndefined();
});

test("playground overlay launchers replace prior component surfaces instead of stacking them", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "overlay");
  renderer.renderFrame();

  const sheetLauncher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Sheet" &&
      node.isVisibleForLayout(),
  );
  const drawerLauncher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Drawer" &&
      node.isVisibleForLayout(),
  );

  clickButton(renderer, sheetLauncher);
  renderer.renderFrame();
  expect(
    findNode(
      renderer,
      (node): node is SheetRenderable =>
        node instanceof SheetRenderable && !(node instanceof DrawerRenderable) && node.isOpen(),
    ),
  ).toBeDefined();

  drawerLauncher.press();
  renderer.renderFrame();

  expect(
    findNode(
      renderer,
      (node): node is DrawerRenderable => node instanceof DrawerRenderable && node.isOpen(),
    ),
  ).toBeDefined();
  expect(
    findOptionalNode(
      renderer,
      (node): node is SheetRenderable =>
        node instanceof SheetRenderable && !(node instanceof DrawerRenderable) && node.isOpen(),
    ),
  ).toBeUndefined();
  expect(
    findOptionalNode(
      renderer,
      (node): node is DialogRenderable =>
        node instanceof DialogRenderable && node.title === "Confirm release" && node.isOpen(),
    ),
  ).toBeUndefined();
});

test("playground dialog footer buttons remain clickable inside the input dialog", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "dialog");
  renderer.renderFrame();

  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Input focus dialog" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, launcher);
  renderer.renderFrame();

  const submit = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Submit" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, submit);
  renderer.renderFrame();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Submitted modal input: NeoTui");
  expect(snapshot).not.toContain("dialog:input");
});

test("playground basic dialog close button responds to mouse clicks over the workspace host", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "dialog");
  renderer.renderFrame();

  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Basic dialog" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, launcher);
  renderer.renderFrame();

  const close = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Close" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, close);
  renderer.renderFrame();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Closed the basic dialog.");
  expect(snapshot).not.toContain("dialog:basic");
});

test("playground stacked dialog launcher opens the second layer by mouse", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "dialog");
  renderer.renderFrame();

  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Stacked dialogs" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, launcher);
  renderer.renderFrame();

  const next = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Open second layer" &&
      node.isVisibleForLayout(),
  );
  clickButton(renderer, next);
  renderer.renderFrame();

  const top = findNode(
    renderer,
    (node): node is DialogRenderable =>
      node instanceof DialogRenderable && node.title === "dialog:stack-top" && node.isOpen(),
  );

  expect(top.isOpen()).toBe(true);
  expect(renderer.renderToString()).toContain("dialog:stack-top");
});

test("playground dialogs open against the full dialog surface instead of the workspace host", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "dialog");
  renderer.renderFrame();

  const workspace = findNode(
    renderer,
    (node): node is PanelRenderable =>
      node instanceof PanelRenderable &&
      node.title === "workspace" &&
      node.subtitle === "dialog host" &&
      node.isVisibleForLayout(),
  );
  const launcher = findNode(
    renderer,
    (node): node is ButtonRenderable =>
      node instanceof ButtonRenderable &&
      typeof node.getLabel === "function" &&
      node.getLabel() === "Input focus dialog" &&
      node.isVisibleForLayout(),
  );

  clickButton(renderer, launcher);
  renderer.renderFrame();

  const dialog = findNode(
    renderer,
    (node): node is DialogRenderable =>
      node instanceof DialogRenderable && node.title === "dialog:input" && node.isOpen(),
  );

  expect(dialog.card.layoutState.bounds.y).toBeLessThan(workspace.layoutState.bounds.y);
});

test("playground drag section supports edge insertion in the dock workspace", () => {
  const renderer = createPlaygroundRenderer();
  renderer.renderFrame();

  const nav = findPlaygroundSidebar(renderer);
  clickSidebarItem(renderer, nav, "drag");
  renderer.renderFrame();

  const dock = findNode(
    renderer,
    (node): node is DockLayoutRenderable =>
      node instanceof DockLayoutRenderable && node.isVisibleForLayout(),
  );

  const sourcePane = dock.children[2] as PanelRenderable;
  const targetPane = dock.children[1] as PanelRenderable;
  const targetBounds = targetPane.layoutState.bounds;

  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent(
      "dragstart",
      sourcePane.layoutState.bounds.x + 2,
      sourcePane.layoutState.bounds.y + 2,
    ),
  );
  renderer.dispatchEvent(
    sourcePane,
    createMouseAliasEvent(
      "dragmove",
      targetBounds.x + 1,
      targetBounds.y + Math.floor(targetBounds.height / 2),
    ),
  );
  renderer.renderFrame();

  expect(dock.serializeOrder()).toEqual(["logs", "preview", "inspector"]);

  renderer.dispatchEvent(
    dock,
    createMouseEvent(
      "up",
      targetBounds.x + 1,
      targetBounds.y + Math.floor(targetBounds.height / 2),
    ),
  );
  renderer.renderFrame();

  expect(dock.serializeOrder()).toEqual(["logs", "inspector", "preview"]);
  expect(renderer.renderToString()).toContain("Moved inspector before preview");
});

test("terminal session restores terminal state after normal exit", async () => {
  const input = createMemoryTerminalInput();
  const output = createMemoryTerminalOutput();
  const signals = createMemorySignalTarget();
  const session = new TerminalSession({
    env: { TERM: "xterm-kitty", KITTY_WINDOW_ID: "1" },
    input,
    output,
    signalTarget: signals,
  });

  await withTerminalSession(session, async () => {
    output.write("payload");
  });

  expect(session.isDestroyed()).toBe(true);
  expect(input.rawModeCalls).toEqual([true, false]);
  expect(output.transcript()).toContain(CONTROL_SEQUENCES.enterAlternateScreen);
  expect(output.transcript()).toContain(CONTROL_SEQUENCES.exitAlternateScreen);
});

test("terminal session restores terminal state after handled exception", async () => {
  const input = createMemoryTerminalInput();
  const output = createMemoryTerminalOutput();
  const signals = createMemorySignalTarget();
  const session = new TerminalSession({
    env: { TERM: "xterm-kitty", KITTY_WINDOW_ID: "1" },
    input,
    output,
    signalTarget: signals,
  });

  const error = new Error("boom");

  await expect(
    withTerminalSession(session, async () => {
      throw error;
    }),
  ).rejects.toThrow("boom");

  expect(session.lifecycleEvents).toContain("session:handled-error");
  expect(input.rawModeCalls).toEqual([true, false]);
  expect(output.transcript()).toContain(CONTROL_SEQUENCES.showCursor);
  expect(output.transcript()).toContain(CONTROL_SEQUENCES.exitAlternateScreen);
});

test("terminal session destroy is idempotent", async () => {
  const session = new TerminalSession({
    env: { TERM: "xterm-kitty", KITTY_WINDOW_ID: "1" },
    input: createMemoryTerminalInput(),
    output: createMemoryTerminalOutput(),
    signalTarget: createMemorySignalTarget(),
  });

  session.activate();
  await session.destroy();
  await session.destroy();

  expect(session.lifecycleEvents).toContain("session:destroy:noop");
});

function findNode<T>(
  renderer: ReturnType<typeof createPlaygroundRenderer>,
  predicate: (node: unknown) => node is T,
): T {
  const node = findOptionalNode(renderer, predicate);
  if (!node) {
    throw new Error("Expected node was not found in the playground tree.");
  }

  return node;
}

function findOptionalNode<T>(
  renderer: ReturnType<typeof createPlaygroundRenderer>,
  predicate: (node: unknown) => node is T,
): T | undefined {
  const stack: unknown[] = [renderer.root];

  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      continue;
    }

    if (predicate(node)) {
      return node;
    }

    if (
      typeof node === "object" &&
      node !== null &&
      "children" in node &&
      Array.isArray((node as { children?: unknown[] }).children)
    ) {
      stack.push(...((node as { children: unknown[] }).children ?? []));
    }
  }
  return undefined;
}

function findPlaygroundSidebar(renderer: ReturnType<typeof createPlaygroundRenderer>) {
  return findNode(
    renderer,
    (node): node is SidebarRenderable =>
      node instanceof SidebarRenderable && node.layoutProps.width === "22%",
  );
}

function clickSidebarItem(
  renderer: ReturnType<typeof createPlaygroundRenderer>,
  sidebar: SidebarRenderable,
  itemId: string,
): void {
  const subtitleOffset = sidebar.subtitle && !sidebar.collapsed ? 1 : 0;
  let bodyRowIndex = 0;
  let found = false;

  for (const group of sidebar.groups) {
    if (!sidebar.collapsed) {
      bodyRowIndex += 1;
    }

    const groupCollapsed = group.collapsed === true;
    if (groupCollapsed) {
      continue;
    }

    const itemIndex = group.items.findIndex((item) => item.id === itemId);
    if (itemIndex !== -1) {
      bodyRowIndex += itemIndex;
      found = true;
      break;
    }

    bodyRowIndex += group.items.length;
  }

  if (!found) {
    throw new Error(`Sidebar item ${itemId} was not found or is currently collapsed.`);
  }

  const x = sidebar.layoutState.innerBounds.x + 1;
  const y = sidebar.layoutState.innerBounds.y + subtitleOffset + bodyRowIndex;

  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}M`);
  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}m`);
}

function clickButton(
  renderer: ReturnType<typeof createPlaygroundRenderer>,
  button: ButtonRenderable,
): void {
  const bounds = button.layoutState.bounds;
  const x = bounds.x + Math.floor(bounds.width / 2);
  const y = bounds.y + Math.floor(bounds.height / 2);

  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}M`);
  renderer.dispatchInput(`\u001b[<0;${x + 1};${y + 1}m`);
}

function createMouseAliasEvent(alias: "dragstart" | "dragmove" | "dragend", x: number, y: number) {
  return createSyntheticEvent({
    type: "mouse",
    action: "move",
    button: "left",
    x,
    y,
    wheelDelta: 0,
    modifiers: {
      shift: false,
      alt: false,
      ctrl: false,
      meta: false,
    },
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
    modifiers: {
      shift: false,
      alt: false,
      ctrl: false,
      meta: false,
    },
  } as const);
}

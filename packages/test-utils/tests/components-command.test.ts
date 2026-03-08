import { expect, test } from "bun:test";
import { ButtonRenderable, CommandRenderable } from "@neotui/components";
import { BoxRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("command filters from input, moves selection, submits, and restores focus", () => {
  const renderer = createTestRenderer(80, 20);
  const launcher = new ButtonRenderable({ label: "Launch" });
  const palette = new CommandRenderable({
    items: [
      { id: "open-file", title: "Open File", group: "File" },
      { id: "open-docs", title: "Open Docs", group: "File" },
      { id: "deploy", title: "Deploy Release", group: "Deploy", shortcut: "Enter" },
      { id: "toggle-sidebar", title: "Toggle Sidebar", group: "View" },
    ],
  });

  let selectedId = "";
  palette.on("select", (event) => {
    selectedId = (event as { value: { item: { id: string } } }).value.item.id;
  });

  renderer.add(launcher, palette);
  renderer.renderToString();
  renderer.focus(launcher);

  palette.open();
  palette.setQuery("op");
  expect(renderer.focusedNode).toBe(palette.queryInput);
  expect(palette.queryInput.getValue()).toBe("op");

  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\r");

  expect(selectedId).toBe("open-docs");
  expect(palette.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launcher);
});

test("command open refocuses the query input when the overlay is already visible", () => {
  const renderer = createTestRenderer(80, 20);
  const launcher = new ButtonRenderable({ label: "Launch" });
  const palette = new CommandRenderable({
    items: [{ id: "open-file", title: "Open File", group: "File" }],
    open: true,
  });

  renderer.add(launcher, palette);
  renderer.renderToString();
  renderer.focus(launcher);

  expect(renderer.focusedNode).toBe(launcher);
  palette.open();

  expect(renderer.focusedNode).toBe(palette.queryInput);
});

test("command overlay traps Tab on the query input and still closes on Escape", () => {
  const renderer = createTestRenderer(80, 20);
  const launcher = new ButtonRenderable({ label: "Launch" });
  const palette = new CommandRenderable({
    items: [{ id: "open-file", title: "Open File", group: "File" }],
  });

  renderer.add(launcher, palette);
  renderer.renderToString();
  renderer.focus(launcher);

  palette.open();
  expect(renderer.focusedNode).toBe(palette.queryInput);

  renderer.dispatchInput("\t");
  expect(renderer.focusedNode).toBe(palette.queryInput);

  renderer.dispatchInput("\u001b[27u");
  expect(palette.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launcher);
});

test("command overlay reclaims query focus when its background is clicked", () => {
  const renderer = createTestRenderer(80, 20);
  const palette = new CommandRenderable({
    items: [
      { id: "open-file", title: "Open File", group: "File" },
      { id: "open-recent", title: "Open Recent", group: "File" },
    ],
  });

  renderer.add(palette);
  renderer.renderToString();
  palette.open();
  renderer.renderToString();

  const bounds = palette.panel.layoutState.bounds;
  const backgroundX = bounds.x + 2;
  const backgroundY = bounds.y + bounds.height - 2;

  renderer.dispatchInput(`\u001b[<0;${backgroundX + 1};${backgroundY + 1}M`);
  renderer.dispatchInput(`\u001b[<0;${backgroundX + 1};${backgroundY + 1}m`);
  renderer.renderToString();

  expect(renderer.focusedNode).toBe(palette.queryInput);

  renderer.dispatchInput("x");
  renderer.renderToString();
  expect(palette.queryInput.getValue()).toBe("x");
});

test("command overlay still handles typing and escape after focus drifts outside", () => {
  const renderer = createTestRenderer(80, 20);
  const launcher = new ButtonRenderable({ label: "Launch" });
  const palette = new CommandRenderable({
    items: [
      { id: "open-file", title: "Open File", group: "File" },
      { id: "open-recent", title: "Open Recent", group: "File" },
    ],
  });

  renderer.add(launcher, palette);
  renderer.renderToString();
  renderer.focus(launcher);
  palette.open();
  renderer.renderToString();

  renderer.focus(launcher);
  expect(renderer.focusedNode).toBe(launcher);

  renderer.dispatchInput("\u001b[114u\u001b[101u");
  renderer.renderToString();

  expect(renderer.focusedNode).toBe(palette.queryInput);
  expect(palette.queryInput.getValue()).toBe("re");

  renderer.dispatchInput("\u001b[27u");
  renderer.renderToString();

  expect(palette.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(launcher);
});

test("command overlay centers within its mounted host and resizes with it", () => {
  const renderer = createTestRenderer(100, 30);
  const host = new BoxRenderable({
    layout: {
      position: "absolute",
      left: 12,
      top: 4,
      width: 50,
      height: 14,
    },
    style: {
      border: true,
    },
  });
  const palette = new CommandRenderable({
    items: [{ id: "open-file", title: "Open File", group: "File" }],
  });

  host.add(palette);
  renderer.add(host);
  renderer.renderToString();
  palette.open();
  renderer.renderToString();

  const hostBounds = host.layoutState.innerBounds;
  const before = { ...palette.panel.layoutState.bounds };
  expect(before.x).toBeGreaterThanOrEqual(hostBounds.x);
  expect(before.y).toBeGreaterThanOrEqual(hostBounds.y);
  expect(before.x + before.width).toBeLessThanOrEqual(hostBounds.x + hostBounds.width);
  expect(before.y + before.height).toBeLessThanOrEqual(hostBounds.y + hostBounds.height);

  renderer.resize(70, 20);
  renderer.renderToString();

  const after = palette.panel.layoutState.bounds;
  expect(after.width).toBeLessThanOrEqual(hostBounds.width);
  expect(after.x).toBeGreaterThanOrEqual(hostBounds.x);
  expect(after.y).toBeGreaterThanOrEqual(hostBounds.y);
});

test("command can render a live preview panel for the selected item", () => {
  const renderer = createTestRenderer(80, 20);
  const palette = new CommandRenderable({
    items: [
      {
        id: "deploy-release",
        title: "Deploy Release",
        group: "Release",
        subtitle: "ship rc.1",
        shortcut: "d",
      },
      {
        id: "promote-build",
        title: "Promote Build",
        group: "Release",
        subtitle: "move staging to prod",
        shortcut: "p",
      },
    ],
    renderPreview: (item) =>
      item
        ? `${item.title}\n${item.subtitle ?? "No subtitle"}\nshortcut: ${item.shortcut ?? "none"}`
        : null,
  });

  renderer.add(palette);
  renderer.renderToString();
  palette.open();
  renderer.renderToString();

  expect(palette.preview.styleProps.visible).toBe(true);
  expect(renderer.renderToString()).toContain("Deploy Release");
  expect(renderer.renderToString()).toContain("shortcut: d");

  renderer.dispatchInput("\u001b[B");
  renderer.renderToString();

  expect(renderer.renderToString()).toContain("Promote Build");
  expect(renderer.renderToString()).toContain("shortcut: p");
});

test("command can render pinned and recent sections without duplicating items", () => {
  const renderer = createTestRenderer(80, 20);
  const palette = new CommandRenderable({
    items: [
      {
        id: "deploy-release",
        title: "Deploy Release",
        group: "Release",
        pinned: true,
      },
      {
        id: "open-recent",
        title: "Open Recent",
        group: "File",
      },
      {
        id: "toggle-sidebar",
        title: "Toggle Sidebar",
        group: "View",
      },
    ],
    recentIds: ["open-recent", "deploy-release"],
  });

  renderer.add(palette);
  renderer.renderToString();
  palette.open();
  renderer.renderToString();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("PINNED");
  expect(snapshot).toContain("RECENT");
  expect(snapshot.indexOf("Deploy Release")).toBeLessThan(snapshot.indexOf("Open Recent"));
  expect((snapshot.match(/Deploy Release/g) ?? []).length).toBe(1);
});

test("command selections promote items into a most-recent-first section", () => {
  const renderer = createTestRenderer(80, 20);
  const launcher = new ButtonRenderable({ label: "Launch" });
  const palette = new CommandRenderable({
    items: [
      { id: "open-file", title: "Open File", group: "File" },
      { id: "open-recent", title: "Open Recent", group: "File" },
      { id: "toggle-sidebar", title: "Toggle Sidebar", group: "View" },
    ],
  });

  renderer.add(launcher, palette);
  renderer.renderToString();
  renderer.focus(launcher);

  palette.open();
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\r");
  expect(palette.isOpen()).toBe(false);

  palette.setQuery("");
  palette.open();
  renderer.renderToString();

  const firstSnapshot = renderer.renderToString();
  expect(firstSnapshot).toContain("RECENT");
  expect(firstSnapshot.indexOf("Open Recent")).toBeLessThan(firstSnapshot.indexOf("FILE"));

  palette.recordRecent("toggle-sidebar");
  renderer.renderToString();

  const secondSnapshot = renderer.renderToString();
  expect(secondSnapshot.indexOf("Toggle Sidebar")).toBeLessThan(
    secondSnapshot.indexOf("Open Recent"),
  );

  palette.clearRecent();
  renderer.renderToString();
  expect(renderer.renderToString()).not.toContain("RECENT");
});

import { expect, test } from "bun:test";
import {
  BreadcrumbRenderable,
  ScrollAreaRenderable,
  ScrollbarRenderable,
  SeparatorRenderable,
  SidebarRenderable,
  TabsRenderable,
} from "@neotui/components";
import { TextRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("separator renders labeled horizontal chrome", () => {
  const renderer = createTestRenderer(24, 4);
  const separator = new SeparatorRenderable({
    label: "nav",
    layout: { width: "100%" },
  });

  renderer.add(separator);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("nav");
});

test("tabs support keyboard and mouse activation", () => {
  const renderer = createTestRenderer(40, 6);
  const tabs = new TabsRenderable({
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "logs", label: "Logs", badge: "9" },
      { id: "docs", label: "Docs" },
    ],
    activeTabId: "overview",
    activationMode: "manual",
  });

  renderer.add(tabs);
  renderer.focus(tabs);
  renderer.dispatchInput("\u001b[C");
  expect(tabs.getActiveTabId()).toBe("overview");
  renderer.dispatchInput("\r");
  expect(tabs.getActiveTabId()).toBe("logs");

  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;23;1M");
  expect(tabs.getActiveTabId()).toBe("logs");
});

test("breadcrumb truncates and emits select events", () => {
  const renderer = createTestRenderer(50, 4);
  const breadcrumb = new BreadcrumbRenderable({
    items: [
      { id: "root", label: "workspace" },
      { id: "docs", label: "docs" },
      { id: "components", label: "components" },
      { id: "c3", label: "c3" },
    ],
    maxVisibleItems: 3,
  });
  const selected: string[] = [];

  breadcrumb.on("select", (event) => {
    selected.push(String((event as { value: { id: string } }).value.id));
  });

  renderer.add(breadcrumb);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("…");

  renderer.focus(breadcrumb);
  renderer.dispatchInput("\u001b[D");
  renderer.dispatchInput("\r");

  expect(selected).toEqual(["components"]);
});

test("scroll area supports keyboard and wheel scrolling", () => {
  const renderer = createTestRenderer(24, 8);
  const scrollArea = new ScrollAreaRenderable({
    layout: { width: "100%", height: 6 },
  });

  for (let index = 0; index < 8; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `line-${index}`,
        layout: { height: 1 },
      }),
    );
  }

  renderer.add(scrollArea);
  renderer.focus(scrollArea);
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\u001b[B");
  expect(scrollArea.getScrollPosition().y).toBe(2);

  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<64;2;2M");
  expect(scrollArea.getScrollPosition().y).toBe(3);
});

test("scrollbar supports standalone metrics and both-axis scroll areas", () => {
  const renderer = createTestRenderer(32, 10);
  const vertical = new ScrollbarRenderable({
    orientation: "vertical",
    viewportSize: 4,
    contentSize: 10,
    offset: 3,
    layout: { width: 1, height: 4 },
  });
  const horizontal = new ScrollbarRenderable({
    orientation: "horizontal",
    viewportSize: 6,
    contentSize: 12,
    offset: 3,
    layout: { width: 8, height: 1 },
  });
  const scrollArea = new ScrollAreaRenderable({
    direction: "both",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 8 },
  });

  for (let index = 0; index < 10; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `line-${index}-abcdefghijklmnopqrstuvwxyz`,
        wrapMode: "none",
        layout: { height: 1 },
      }),
    );
  }

  renderer.add(vertical, horizontal, scrollArea);
  renderer.focus(scrollArea);
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\u001b[C");

  expect(scrollArea.getScrollPosition()).toEqual({ x: 1, y: 1 });
  expect(scrollArea.verticalScrollbar.isVisibleForLayout()).toBe(true);
  expect(scrollArea.horizontalScrollbar.isVisibleForLayout()).toBe(true);
  expect(renderer.renderToString()).toContain("█");
});

test("sidebar supports keyboard selection, collapse, and mouse activation", () => {
  const renderer = createTestRenderer(40, 14);
  const sidebar = new SidebarRenderable({
    title: "nav",
    collapsible: true,
    groups: [
      {
        id: "main",
        label: "Main",
        items: [
          { id: "overview", label: "Overview" },
          { id: "docs", label: "Docs" },
          { id: "settings", label: "Settings" },
        ],
      },
    ],
    activeItemId: "overview",
    layout: { width: 18, height: 12 },
  });
  const selected: string[] = [];

  sidebar.on("select", (event) => {
    selected.push(String((event as { value: { id: string } }).value.id));
  });

  renderer.add(sidebar);
  renderer.focus(sidebar);
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\r");
  expect(sidebar.getActiveItemId()).toBe("docs");
  expect(selected).toEqual(["docs"]);

  sidebar.toggleCollapsed();
  expect(sidebar.collapsed).toBe(true);
  expect(sidebar.layoutProps.width).toBe(sidebar.collapsedWidth);

  sidebar.toggleCollapsed();
  expect(sidebar.collapsed).toBe(false);
  expect(sidebar.layoutProps.width).toBe(18);

  sidebar.toggleCollapsed();
  expect(sidebar.collapsed).toBe(true);

  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;2;3M");
  expect(sidebar.getActiveItemId()).toBe("overview");
});

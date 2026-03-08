import { expect, test } from "bun:test";
import {
  BadgeRenderable,
  ButtonRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  TableRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import { BoxRenderable, type SubmitEvent } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("button supports keyboard and mouse activation", () => {
  const renderer = createTestRenderer(40, 12);
  const button = new ButtonRenderable({ label: "Launch", variant: "primary" });
  let presses = 0;

  button.on("press", () => {
    presses += 1;
  });

  renderer.add(button);
  renderer.focus(button);
  renderer.dispatchInput("\r");
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;2;2M");
  renderer.dispatchInput("\u001b[<0;2;2m");

  expect(presses).toBe(2);
});

test("button emits submit payload and honors disabled state", () => {
  const renderer = createTestRenderer(40, 12);
  const button = new ButtonRenderable({ label: "Disabled", disabled: true });
  const submissions: string[] = [];

  button.on("submit", (event) => {
    const submit = event as SubmitEvent<{ label: string }>;
    submissions.push(submit.value.label);
  });

  renderer.add(button);
  renderer.focus(button);
  renderer.dispatchInput("\r");

  expect(submissions).toEqual([]);

  button.setDisabled(false);
  renderer.focus(button);
  renderer.dispatchInput("\r");

  expect(submissions).toEqual(["Disabled"]);
});

test("panel, toolbar, and badge render composed chrome", () => {
  const renderer = createTestRenderer(60, 12);
  const panel = new PanelRenderable({
    title: "meta",
    subtitle: "c2",
    content: "components online",
    layout: { height: 5 },
  });
  const toolbar = new ToolbarRenderable({
    layout: { height: 1 },
  });
  toolbar.add(
    new BadgeRenderable({ label: "button", tone: "accent" }),
    new BadgeRenderable({ label: "panel", tone: "info" }),
  );

  renderer.add(panel, toolbar);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("meta | c2");
  expect(snapshot).toContain("components online");
  expect(snapshot).toContain("button");
  expect(snapshot).toContain("panel");
});

test("panel content modes support grow, fit, and scroll policies", () => {
  const renderer = createTestRenderer(90, 30);
  const growPanel = new PanelRenderable({
    title: "grow",
    contentMode: "grow",
  });
  growPanel.add(
    new BoxRenderable({
      content: "line 1\nline 2\nline 3",
    }),
  );

  const fitPanel = new PanelRenderable({
    title: "fit",
    contentMode: "fit",
    layout: {
      width: 36,
      height: 8,
    },
  });
  const fitTable = new TableRenderable({
    columns: [
      { id: "service", header: "Service", width: 14 },
      { id: "status", header: "Status", width: 10 },
      { id: "owner", header: "Owner", width: 12 },
    ],
    rows: [
      { id: "alpha", cells: { service: "api", status: "Ready", owner: "Platform" } },
      { id: "beta", cells: { service: "web", status: "Review", owner: "Frontend" } },
      { id: "gamma", cells: { service: "worker", status: "Draft", owner: "Infra" } },
      { id: "delta", cells: { service: "docs", status: "Ready", owner: "Docs" } },
    ],
    layout: {
      flexGrow: 1,
    },
  });
  fitPanel.add(fitTable);

  const scrollPanel = new PanelRenderable({
    title: "scroll",
    contentMode: "scroll",
    layout: {
      width: 28,
      height: 8,
    },
  });
  for (let index = 0; index < 12; index += 1) {
    scrollPanel.add(
      new BoxRenderable({
        content: `row ${index}`,
      }),
    );
  }

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
  });
  renderer.add(growPanel, fitPanel, scrollPanel);
  const snapshot = renderer.renderToString();

  expect(growPanel.layoutState.bounds.height).toBeGreaterThanOrEqual(7);
  expect(fitPanel.body instanceof ScrollAreaRenderable).toBe(false);
  expect(snapshot).toContain("Service");
  expect(snapshot).not.toContain("Infra");
  expect(snapshot).not.toContain("Docs");
  expect(scrollPanel.body instanceof ScrollAreaRenderable).toBe(true);
  if (scrollPanel.body instanceof ScrollAreaRenderable) {
    expect(scrollPanel.body.verticalScrollbar.styleProps.visible).toBe(true);
    scrollPanel.setScrollY(3);
    renderer.renderToString();
    expect(scrollPanel.body.getScrollPosition().y).toBe(3);
  }
});

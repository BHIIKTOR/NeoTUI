import { expect, test } from "bun:test";
import {
  EmptyRenderable,
  ProgressRenderable,
  SkeletonRenderable,
  SpinnerRenderable,
  ToastRenderable,
} from "@neotui/components";
import { createTestRenderer } from "../src/index.ts";

test("spinner frames advance deterministically and preserve label width", () => {
  const renderer = createTestRenderer(40, 6);
  const spinner = new SpinnerRenderable({
    label: "Loading",
    frameSet: "line",
  });

  renderer.add(spinner);
  const before = renderer.renderToString();
  (spinner as unknown as { advanceFrame: () => void }).advanceFrame();
  const after = renderer.renderToString();

  expect(before).toContain("Loading");
  expect(after).toContain("Loading");
  expect(after).not.toBe(before);
});

test("skeleton animated variant changes placeholder frames without changing size", () => {
  const renderer = createTestRenderer(30, 6);
  const skeleton = new SkeletonRenderable({
    variant: "block",
    width: 8,
    height: 2,
    animated: true,
  });

  renderer.add(skeleton);
  const before = renderer.renderToString();
  (skeleton as unknown as { advanceFrame: () => void }).advanceFrame();
  const after = renderer.renderToString();

  expect(skeleton.layoutState.bounds.width).toBe(8);
  expect(skeleton.layoutState.bounds.height).toBe(2);
  expect(after).not.toBe(before);
});

test("progress clamps values and keeps the bar and percentage in sync", () => {
  const renderer = createTestRenderer(30, 6);
  const progress = new ProgressRenderable({
    label: "Upload",
    value: 140,
    max: 100,
  });

  renderer.add(progress);
  expect(progress.value).toBe(100);
  expect(renderer.renderToString()).toContain("100%");

  progress.setValue(-20);
  expect(progress.value).toBe(0);
  expect(renderer.renderToString()).toContain("0%");
});

test("empty state action buttons are focusable and emit action payloads", () => {
  const renderer = createTestRenderer(60, 16);
  const empty = new EmptyRenderable({
    title: "No results",
    description: "Adjust your filters or create a new item.",
    hint: "Press Enter to create a new item.",
    actions: [
      { id: "create", label: "Create", variant: "primary" },
      { id: "clear", label: "Clear", variant: "ghost" },
    ],
  });
  const actions: string[] = [];

  empty.on("action", (event) => {
    actions.push(String((event as { value: { id: string } }).value.id));
  });

  renderer.add(empty);
  renderer.focus(empty);
  renderer.dispatchInput("\r");

  expect(actions).toEqual(["create"]);
  expect(renderer.focusedNode).toBe(empty.actionButtons[0] ?? null);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("Create");
  expect(snapshot).toContain("Clear");
});

test("toast show hide and auto-dismiss behavior are deterministic", async () => {
  const renderer = createTestRenderer(60, 16);
  const toast = new ToastRenderable({
    title: "Saved",
    message: "Preferences updated.",
    dismissible: true,
    durationMs: 10,
  });

  renderer.add(toast);
  toast.show();
  expect(toast.isVisible()).toBe(true);

  const dismissButton = (toast as unknown as { dismissButton: { press: () => void } | null })
    .dismissButton;
  dismissButton?.press();
  expect(toast.isVisible()).toBe(false);

  toast.show();
  expect(renderer.renderToString()).toContain("Dismiss");
  await Bun.sleep(20);
  expect(toast.isVisible()).toBe(false);
});

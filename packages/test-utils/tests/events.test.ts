import { expect, test } from "bun:test";
import { BoxRenderable, InputRenderable, parseInput, TextRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("kitty input parser covers letters arrows functions and modifiers", () => {
  const letters = parseInput("a");
  const arrows = parseInput("\u001b[1;5A");
  const functions = parseInput("\u001bOP");
  const kittyModified = parseInput("\u001b[97;5u");
  const kittyPlain = parseInput("\u001b[114u");
  const kittyEscape = parseInput("\u001b[27u");
  const kittyShiftText = parseInput("\u001b[97;2;65u");
  const ctrlC = parseInput("\u0003");

  expect(letters[0]).toMatchObject({ type: "key", key: "a", text: "a" });
  expect(arrows[0]).toMatchObject({
    type: "key",
    key: "ArrowUp",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
  });
  expect(functions[0]).toMatchObject({ type: "key", key: "F1" });
  expect(kittyModified[0]).toMatchObject({
    type: "key",
    key: "a",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
  });
  expect(kittyPlain[0]).toMatchObject({ type: "key", key: "r", text: "r" });
  expect(kittyEscape[0]).toMatchObject({ type: "key", key: "Escape" });
  expect(kittyShiftText[0]).toMatchObject({
    type: "key",
    key: "A",
    text: "A",
    modifiers: { ctrl: false, shift: true, alt: false, meta: false },
  });
  expect(ctrlC[0]).toMatchObject({
    type: "key",
    key: "c",
    modifiers: { ctrl: true, shift: false, alt: false, meta: false },
  });
});

test("parser decodes paste payloads drag and wheel events", () => {
  const paste = parseInput("\u001b[200~hello\nworld\u001b[201~");
  const drag = parseInput("\u001b[<32;4;5M");
  const wheel = parseInput("\u001b[<64;4;5M");

  expect(paste[0]).toMatchObject({ type: "paste", text: "hello\nworld" });
  expect(drag[0]).toMatchObject({ type: "mouse", action: "move", x: 3, y: 4 });
  expect(wheel[0]).toMatchObject({ type: "mouse", action: "wheel", wheelDelta: 1 });
});

test("parser decodes raw home and end keys", () => {
  expect(parseInput("\u001b[H")).toMatchObject([{ type: "key", key: "Home" }]);
  expect(parseInput("\u001b[F")).toMatchObject([{ type: "key", key: "End" }]);
});

test("focus traversal is deterministic across nested trees", () => {
  const renderer = createTestRenderer(40, 12);
  const form = new BoxRenderable({
    layout: { gap: 1 },
    style: { border: true, title: "form" },
  });
  const first = new InputRenderable({ value: "one" });
  const second = new InputRenderable({ value: "two" });
  form.add(first, second);
  renderer.add(form);

  renderer.focus(first);
  renderer.dispatchInput("\t");
  expect(renderer.focusedNode).toBe(second);

  renderer.dispatchInput("\u001b[Z");
  expect(renderer.focusedNode).toBe(first);
});

test("bubbling and stopPropagation are deterministic", () => {
  const renderer = createTestRenderer(40, 12);
  const parent = new BoxRenderable({
    layout: { width: 20, height: 6 },
    style: { border: true },
  });
  const child = new InputRenderable({ value: "" });
  const calls: string[] = [];

  parent.on("key", () => {
    calls.push("parent");
  });
  child.on("key", (event) => {
    calls.push("child");
    event.stopPropagation();
  });
  parent.add(child);
  renderer.add(parent);
  renderer.focus(child);
  renderer.dispatchInput("x");

  expect(calls).toEqual(["child"]);
});

test("mouse hover and drag aliases can be observed from the tree", () => {
  const renderer = createTestRenderer(20, 8);
  const box = new TextRenderable({
    content: "hover me",
    layout: { width: 12, height: 3 },
    style: { border: true, focusable: true },
  });
  const calls: string[] = [];

  box.on("mouseenter", () => calls.push("enter"));
  box.on("dragstart", () => calls.push("dragstart"));
  box.on("dragmove", () => calls.push("dragmove"));
  box.on("dragend", () => calls.push("dragend"));

  renderer.add(box);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;2;2M");
  renderer.dispatchInput("\u001b[<32;4;2M");
  renderer.dispatchInput("\u001b[<0;4;2m");

  expect(calls).toContain("enter");
  expect(calls).toContain("dragstart");
  expect(calls).toContain("dragmove");
  expect(calls).toContain("dragend");
});

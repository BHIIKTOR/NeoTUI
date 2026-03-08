import { expect, test } from "bun:test";
import {
  FieldRenderable,
  InputControlRenderable,
  InputFieldRenderable,
  SelectControlRenderable,
  TextareaControlRenderable,
} from "@neotui/components";
import { createTestRenderer } from "../src/index.ts";

test("field label click focuses the underlying control and renders helper text", () => {
  const renderer = createTestRenderer(60, 10);
  const field = new InputFieldRenderable({
    label: "Name",
    description: "Primary workspace label",
    placeholder: "NeoTui",
    fieldLayout: { width: "100%" },
  });

  renderer.add(field);
  const snapshot = renderer.renderToString();
  renderer.dispatchInput("\u001b[<0;2;1M");

  expect(snapshot).toContain("Name");
  expect(snapshot).toContain("Primary workspace label");
  expect(renderer.focusedNode).toBe(field.input);
});

test("input control supports editing, disabled state, and password masking", () => {
  const renderer = createTestRenderer(60, 10);
  const input = new InputControlRenderable({
    placeholder: "Search",
    layout: { width: 18 },
  });
  const password = new InputControlRenderable({
    value: "secret",
    type: "password",
    layout: { width: 18 },
  });

  renderer.add(input, password);
  renderer.focus(input);
  renderer.dispatchInput("neo");

  expect(input.getValue()).toBe("neo");

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("neo");
  expect(snapshot).toContain("••••••");
  expect(snapshot).not.toContain("secret");

  input.setDisabled(true);
  renderer.focus(input);
  renderer.dispatchInput("x");
  expect(input.getValue()).toBe("neo");
});

test("textarea control auto-resizes within configured row bounds", () => {
  const textarea = new TextareaControlRenderable({
    value: "one\ntwo\nthree",
    autoResize: true,
    minRows: 2,
    maxRows: 4,
  });

  expect(textarea.layoutProps.height).toBe(5);

  textarea.setValue("one\ntwo\nthree\nfour\nfive");
  expect(textarea.layoutProps.height).toBe(6);
});

test("textarea control auto-resizes again when the renderer width changes", () => {
  const renderer = createTestRenderer(50, 14);
  const textarea = new TextareaControlRenderable({
    value: "alpha beta gamma delta epsilon zeta eta theta",
    autoResize: true,
    minRows: 2,
    maxRows: 6,
    wrapMode: "word",
    layout: { width: "100%" },
  });

  renderer.add(textarea);
  renderer.renderFrame();
  const wideHeight = Number(textarea.layoutProps.height ?? 0);

  renderer.resize(24, 14);
  renderer.renderFrame();
  const narrowHeight = Number(textarea.layoutProps.height ?? 0);

  renderer.resize(60, 14);
  renderer.renderFrame();
  const widenedHeight = Number(textarea.layoutProps.height ?? 0);

  expect(narrowHeight).toBeGreaterThanOrEqual(wideHeight);
  expect(widenedHeight).toBeLessThanOrEqual(narrowHeight);
  expect(widenedHeight).toBeGreaterThanOrEqual(4);
});

test("textarea control recalculates height when wrap mode flips under long content", () => {
  const renderer = createTestRenderer(44, 14);
  const textarea = new TextareaControlRenderable({
    value: "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu",
    autoResize: true,
    minRows: 2,
    maxRows: 6,
    wrapMode: "word",
    layout: { width: 14 },
  });

  renderer.add(textarea);
  renderer.renderFrame();
  const wrappedHeight = Number(textarea.layoutProps.height ?? 0);

  textarea.setWrapMode("none");
  renderer.renderFrame();
  const nowrapHeight = Number(textarea.layoutProps.height ?? 0);

  textarea.setWrapMode("word");
  renderer.renderFrame();
  const rewrappedHeight = Number(textarea.layoutProps.height ?? 0);

  expect(wrappedHeight).toBeGreaterThan(nowrapHeight);
  expect(rewrappedHeight).toBeGreaterThan(nowrapHeight);
  expect(rewrappedHeight).toBeGreaterThanOrEqual(wrappedHeight);
});

test("textarea control supports readonly navigation and fixed viewport mode", () => {
  const renderer = createTestRenderer(60, 12);
  const textarea = new TextareaControlRenderable({
    value: "alpha\nbeta\ngamma\ndelta",
    readOnly: true,
    wrapMode: "none",
    showScrollbars: true,
    autoResize: false,
    layout: { width: 18, height: 5 },
  });

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput("\u001b[A");
  expect(textarea.getValue()).toBe("alpha\nbeta\ngamma\ndelta");

  renderer.dispatchInput("x");
  expect(textarea.getValue()).toBe("alpha\nbeta\ngamma\ndelta");

  expect(renderer.renderToString()).toContain("┃");
});

test("select control opens from the keyboard and commits the selected value", () => {
  const renderer = createTestRenderer(60, 12);
  const select = new SelectControlRenderable({
    placeholder: "Choose status",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In review" },
      { value: "done", label: "Done" },
    ],
  });

  renderer.add(select);
  renderer.renderToString();
  renderer.focus(select);
  renderer.dispatchInput("\u001b[B");
  expect(select.isOpen()).toBe(true);

  renderer.dispatchInput("\r");
  expect(select.getValue()).toBe("draft");
  expect(renderer.renderToString()).toContain("Draft");
});

test("field wrapper can host a prebuilt control and propagate disabled state", () => {
  const field = new FieldRenderable({
    label: "Standalone",
    disabled: true,
  });
  const control = new InputControlRenderable({
    value: "readonly",
  });

  field.setControl(control);

  expect(control.disabled).toBe(true);
});

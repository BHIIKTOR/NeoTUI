import { expect, test } from "bun:test";
import {
  CheckboxRenderable,
  FieldRenderable,
  KbdRenderable,
  RadioGroupRenderable,
  SliderRenderable,
  SwitchRenderable,
  ToggleGroupRenderable,
  ToggleRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import { createSyntheticEvent } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

function mouseDown(x: number, y: number): string {
  return `\u001b[<0;${x + 1};${y + 1}M`;
}

function mouseUp(x: number, y: number): string {
  return `\u001b[<0;${x + 1};${y + 1}m`;
}

test("kbd tokens render compact inline hints", () => {
  const renderer = createTestRenderer(40, 6);
  const toolbar = new ToolbarRenderable({ layout: { height: 1 } });
  toolbar.add(new KbdRenderable({ label: "Ctrl-K", compact: true }));

  renderer.add(toolbar);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("[Ctrl-K]");
});

test("checkbox supports keyboard and mouse toggling and clears indeterminate predictably", () => {
  const renderer = createTestRenderer(50, 8);
  const checkbox = new CheckboxRenderable({
    label: "Enable logs",
    indeterminate: true,
  });

  renderer.add(checkbox);
  renderer.renderToString();
  renderer.focus(checkbox);
  renderer.dispatchInput(" ");

  expect(checkbox.isChecked()).toBe(true);
  expect(checkbox.indeterminate).toBe(false);

  const clickX = checkbox.layoutState.bounds.x + 1;
  const clickY = checkbox.layoutState.bounds.y;
  renderer.dispatchInput(mouseDown(clickX, clickY));
  renderer.dispatchInput(mouseUp(clickX, clickY));

  expect(checkbox.isChecked()).toBe(false);
});

test("switch toggles from the keyboard and remains inert when disabled", () => {
  const renderer = createTestRenderer(40, 8);
  const control = new SwitchRenderable({
    label: "Preview",
  });

  renderer.add(control);
  renderer.focus(control);
  renderer.dispatchInput("\r");
  expect(control.isChecked()).toBe(true);

  control.setDisabled(true);
  renderer.dispatchInput("\r");
  expect(control.isChecked()).toBe(true);
});

test("radio group arrow navigation selects the next enabled option", () => {
  const renderer = createTestRenderer(60, 10);
  const radio = new RadioGroupRenderable({
    orientation: "horizontal",
    value: "draft",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "Review", disabled: true },
      { value: "done", label: "Done" },
    ],
  });

  renderer.add(radio);
  renderer.focus(radio);
  renderer.dispatchInput("\u001b[C");

  expect(radio.getValue()).toBe("done");
});

test("toggle and toggle group manage pressed state for single and multiple selection", () => {
  const renderer = createTestRenderer(80, 12);
  const toggle = new ToggleRenderable({ label: "Pinned" });
  const single = new ToggleGroupRenderable({
    items: [
      { id: "list", label: "List" },
      { id: "split", label: "Split" },
      { id: "grid", label: "Grid" },
    ],
    type: "single",
    value: "list",
  });
  const multi = new ToggleGroupRenderable({
    items: [
      { id: "line", label: "Line #" },
      { id: "wrap", label: "Wrap" },
    ],
    type: "multiple",
    value: ["line"],
  });

  renderer.add(toggle, single, multi);

  renderer.focus(toggle);
  renderer.dispatchInput("\r");
  expect(toggle.isPressed()).toBe(true);

  renderer.focus(single);
  expect(renderer.focusedNode).toBe(single.toggles[0] ?? null);
  renderer.dispatchInput("\u001b[C");
  expect(renderer.focusedNode).toBe(single.toggles[1] ?? null);
  renderer.dispatchInput("\r");
  expect(single.getValue()).toBe("split");

  renderer.focus(multi);
  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\r");
  expect(multi.getValue()).toEqual(["line", "wrap"]);
});

test("slider clamps keyboard and mouse updates to the configured range and can compose in a field", () => {
  const renderer = createTestRenderer(60, 12);
  const slider = new SliderRenderable({
    min: 0,
    max: 100,
    step: 10,
    value: 20,
    showValue: false,
    layout: { width: 11 },
  });
  const field = new FieldRenderable({
    label: "Volume",
  });
  field.setControl(slider);

  renderer.add(field);
  renderer.renderToString();
  renderer.focus(slider);
  renderer.dispatchInput("\u001b[C");
  expect(slider.getValue()).toBe(30);

  renderer.dispatchEvent(
    slider,
    createSyntheticEvent({
      type: "key",
      key: "End",
      modifiers: { shift: false, alt: false, ctrl: false, meta: false },
      repeat: false,
    }),
  );
  expect(slider.getValue()).toBe(100);

  const scrubX = slider.layoutState.bounds.x;
  const scrubY = slider.layoutState.bounds.y;
  renderer.dispatchInput(mouseDown(scrubX, scrubY));
  expect(slider.getValue()).toBe(0);

  expect(renderer.renderToString()).toContain("Volume");
});

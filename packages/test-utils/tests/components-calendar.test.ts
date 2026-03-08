import { expect, test } from "bun:test";
import { CalendarRenderable, DatePickerRenderable } from "@neotui/components";
import { createTestRenderer } from "../src/index.ts";

test("calendar supports keyboard navigation and respects disabled dates", () => {
  const renderer = createTestRenderer(40, 16);
  const calendar = new CalendarRenderable({
    value: "2026-03-12",
    visibleMonth: "2026-03-01",
    disabledDates: ["2026-03-13"],
  });

  renderer.add(calendar);
  renderer.renderToString();
  renderer.focus(calendar);
  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\r");
  expect(calendar.getValue()).toBe("2026-03-12");

  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\r");
  expect(calendar.getValue()).toBe("2026-03-14");

  renderer.dispatchEvent(calendar, {
    type: "key",
    key: "PageDown",
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    repeat: false,
    timestamp: Date.now(),
    raw: "",
    target: calendar,
    currentTarget: calendar,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
  });
  expect(calendar.visibleMonth.getUTCMonth()).toBe(3);
});

test("date picker opens, selects a date, closes, and restores focus", () => {
  const renderer = createTestRenderer(80, 20);
  const picker = new DatePickerRenderable({
    value: "2026-03-12",
    presentation: "popover",
  });

  renderer.add(picker);
  renderer.renderToString();
  renderer.focus(picker.trigger);
  picker.open();

  expect(picker.isOpen()).toBe(true);
  expect(renderer.focusedNode).toBe(picker.calendar);

  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\r");

  expect(picker.getValue()).toBe("2026-03-13");
  expect(picker.isOpen()).toBe(false);
  expect(renderer.focusedNode).toBe(picker.trigger);
});

test("date picker popover fully contains the calendar surface", () => {
  const renderer = createTestRenderer(80, 24);
  const picker = new DatePickerRenderable({
    value: "2026-03-12",
    presentation: "popover",
  });

  renderer.add(picker);
  renderer.renderToString();
  picker.open();
  renderer.renderToString();

  const popoverInner = picker.popover.layoutState.innerBounds;
  const calendarBounds = picker.calendar.layoutState.bounds;

  expect(calendarBounds.x).toBeGreaterThanOrEqual(popoverInner.x);
  expect(calendarBounds.y).toBeGreaterThanOrEqual(popoverInner.y);
  expect(calendarBounds.x + calendarBounds.width).toBeLessThanOrEqual(
    popoverInner.x + popoverInner.width,
  );
  expect(calendarBounds.y + calendarBounds.height).toBeLessThanOrEqual(
    popoverInner.y + popoverInner.height,
  );
});

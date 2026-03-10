import { expect, test } from "bun:test";
import {
  ButtonRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  ScrollbarRenderable,
} from "@neotui/components";
import { BoxRenderable, TextRenderable } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

test("standalone scrollbar supports vertical and horizontal metrics", () => {
  const renderer = createTestRenderer(20, 6);
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

  renderer.add(vertical, horizontal);
  const snapshot = renderer.renderToString();

  expect(snapshot).toContain("█");
  expect(snapshot).toContain("─");
});

test("scroll area supports both-axis scrolling and border-mounted indicators", () => {
  const renderer = createTestRenderer(32, 10);
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

  renderer.add(scrollArea);
  renderer.focus(scrollArea);
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\u001b[C");

  expect(scrollArea.getScrollPosition()).toEqual({ x: 1, y: 1 });
  expect(scrollArea.verticalScrollbar.isVisibleForLayout()).toBe(true);
  expect(scrollArea.horizontalScrollbar.isVisibleForLayout()).toBe(true);

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("█");
});

test("scroll area translates nested subtree content instead of only moving container shells", () => {
  const renderer = createTestRenderer(40, 12);
  const scrollArea = new ScrollAreaRenderable({
    direction: "vertical",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 8 },
  });
  const panel = new PanelRenderable({
    title: "nested panel",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 16,
    },
  });
  const nested = new TextRenderable({
    content: "deep child marker",
    layout: { height: 1 },
  });

  panel.add(
    new TextRenderable({
      content: "line 1",
      layout: { height: 1 },
    }),
    new TextRenderable({
      content: "line 2",
      layout: { height: 1 },
    }),
    new TextRenderable({
      content: "line 3",
      layout: { height: 1 },
    }),
    new TextRenderable({
      content: "line 4",
      layout: { height: 1 },
    }),
    nested,
    new TextRenderable({
      content: "line 5",
      layout: { height: 1 },
    }),
    new TextRenderable({
      content: "line 6",
      layout: { height: 1 },
    }),
  );
  scrollArea.add(panel);

  renderer.add(scrollArea);
  renderer.focus(scrollArea);
  const before = renderer.renderToString();

  renderer.dispatchInput("\u001b[6~");
  const after = renderer.renderToString();

  expect(before).not.toContain("deep child marker");
  expect(after).toContain("deep child marker");
  expect(scrollArea.getScrollPosition().y).toBeGreaterThan(0);
});

test("scroll area responds to mouse wheel scrolling", () => {
  const renderer = createTestRenderer(32, 10);
  const scrollArea = new ScrollAreaRenderable({
    direction: "vertical",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 6 },
  });

  for (let index = 0; index < 12; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `line-${index}`,
        layout: { height: 1 },
      }),
    );
  }

  renderer.add(scrollArea);
  renderer.renderFrame();

  const wheelEvent = {
    type: "mouse",
    action: "wheel",
    button: "middle",
    x: 2,
    y: 2,
    wheelDelta: -1,
    modifiers: { shift: false, alt: false, ctrl: false, meta: false },
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      wheelEvent.defaultPrevented = true;
    },
    stopPropagation() {
      wheelEvent.propagationStopped = true;
    },
  };

  renderer.dispatchEvent(scrollArea, wheelEvent as never);

  expect(scrollArea.getScrollPosition().y).toBeGreaterThan(0);
  expect(wheelEvent.defaultPrevented).toBe(true);
});

test("scrolled nested controls remain clickable at their visible coordinates", () => {
  const renderer = createTestRenderer(40, 12);
  const scrollArea = new ScrollAreaRenderable({
    direction: "vertical",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 8 },
  });
  const panel = new PanelRenderable({
    title: "actions",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 16,
    },
  });
  const button = new ButtonRenderable({ label: "Deep action" });
  let presses = 0;

  button.on("press", () => {
    presses += 1;
  });

  panel.add(
    new TextRenderable({ content: "line 1", layout: { height: 1 } }),
    new TextRenderable({ content: "line 2", layout: { height: 1 } }),
    new TextRenderable({ content: "line 3", layout: { height: 1 } }),
    button,
  );
  scrollArea.add(panel);

  renderer.add(scrollArea);
  renderer.focus(scrollArea);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[6~");

  const scrollY = scrollArea.getScrollPosition().y;
  const clickX = button.layoutState.innerBounds.x + 1;
  const clickY = button.layoutState.innerBounds.y - scrollY + 1;

  renderer.dispatchInput(`\u001b[<0;${clickX};${clickY}M`);
  renderer.dispatchInput(`\u001b[<0;${clickX};${clickY}m`);

  expect(presses).toBe(1);
});

test("scrolled bordered controls stay clipped inside their scroll viewport", () => {
  const renderer = createTestRenderer(40, 12);
  renderer.root.updateLayout({ flexDirection: "column" });

  const header = new TextRenderable({
    content: "header sentinel",
    layout: { height: 1 },
  });
  const scrollArea = new ScrollAreaRenderable({
    direction: "vertical",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 8 },
  });
  scrollArea.add(
    new ButtonRenderable({ label: "Top action" }),
    new TextRenderable({ content: "line 1", layout: { height: 1 } }),
    new TextRenderable({ content: "line 2", layout: { height: 1 } }),
    new TextRenderable({ content: "line 3", layout: { height: 1 } }),
    new TextRenderable({ content: "line 4", layout: { height: 1 } }),
    new TextRenderable({ content: "line 5", layout: { height: 1 } }),
    new TextRenderable({ content: "line 6", layout: { height: 1 } }),
  );
  renderer.add(header, scrollArea);

  scrollArea.setScrollY(999);
  renderer.renderFrame();

  const snapshot = renderer.renderToString();
  expect(snapshot).toContain("header sentinel");
  expect(snapshot).not.toContain("Top action");
});

test("scrolled box background and border stay clipped inside their scroll viewport", () => {
  const renderer = createTestRenderer(30, 10);
  renderer.root.updateLayout({ flexDirection: "column" });

  const header = new TextRenderable({
    content: "header sentinel",
    layout: { height: 1 },
  });
  const scrollArea = new ScrollAreaRenderable({
    direction: "vertical",
    scrollbarVisibility: "always",
    layout: { width: "100%", height: 7 },
  });
  const card = new BoxRenderable({
    content: "top content",
    layout: { width: "100%", height: 10 },
    style: {
      border: true,
      title: "card",
      bg: "#4a2a16",
      borderFg: "#66d9ef",
    },
  });

  scrollArea.add(card);
  renderer.add(header, scrollArea);

  scrollArea.setScrollY(3);
  const frame = renderer.renderToBuffer();

  const headerCell = frame.getCell(0, 0);
  const topViewportCell = frame.getCell(2, 2);

  expect(headerCell?.char).toBe("h");
  expect(headerCell?.bg).toBeUndefined();
  expect(topViewportCell?.bg).toBe("#4a2a16");
});

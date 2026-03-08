import { expect, test } from "bun:test";
import { NavigationMenuRenderable } from "@neotui/components";
import { createTestRenderer } from "../src/index.ts";

test("navigation menu roves focus and opens grouped items from the keyboard", () => {
  const renderer = createTestRenderer(70, 10);
  const nav = new NavigationMenuRenderable({
    items: [
      { id: "overview", label: "Overview" },
      {
        id: "docs",
        label: "Docs",
        items: [
          { id: "getting-started", label: "Getting Started" },
          { id: "api", label: "API" },
        ],
      },
      { id: "settings", label: "Settings" },
    ],
    activeItemId: "overview",
  });
  let selectedId = "";
  nav.on("select", (event) => {
    selectedId = String((event as { value: { id: string } }).value.id);
  });

  renderer.add(nav);
  renderer.renderToString();
  renderer.focus(nav);
  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\u001b[B");
  expect(nav.controls[1]?.dropdown?.isOpen()).toBe(true);

  renderer.dispatchInput("\r");
  expect(selectedId).toBe("getting-started");
  expect(nav.getActiveItemId()).toBe("getting-started");
});

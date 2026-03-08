import { expect, test } from "bun:test";
import { createKittyRenderer, createM1SmokeScene } from "@neotui/core";

test("core bootstrap exposes the renderer runtime contract", () => {
  const renderer = createKittyRenderer({ appName: "smoke-test" });

  expect(renderer.milestone).toBe("M10");
  expect(renderer.runtime).toBe("bun");
  expect(renderer.terminalTarget).toBe("kitty");
  expect(createM1SmokeScene().length).toBeGreaterThan(0);
  expect(typeof renderer.renderToString).toBe("function");
});

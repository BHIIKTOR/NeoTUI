import { CalendarRenderable, DatePickerRenderable, PanelRenderable } from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";

function createCalendarRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-calendar",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 28,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });
  renderer.root.updateStyle({
    bg: "#14110f",
    fg: "#f2e7d5",
  });

  const hero = new PanelRenderable({
    title: "components:calendar",
    content:
      "Standalone calendar and date picker now share one deterministic UTC-backed date model.",
    tone: "accent",
    layout: { height: 5 },
  });

  const body = new PanelRenderable({
    title: "temporal surfaces",
    tone: "info",
    layout: {
      flexDirection: "row",
      gap: 2,
      flexGrow: 1,
    },
  });

  const calendar = new CalendarRenderable({
    value: "2026-03-12",
    visibleMonth: "2026-03-01",
    disabledDates: ["2026-03-13", "2026-03-20"],
  });
  const picker = new DatePickerRenderable({
    value: "2026-03-12",
    presentation: "popover",
  });

  body.add(calendar, picker);
  renderer.add(hero, body);
  return { renderer, picker, calendar };
}

function buildSnapshot(): string {
  const { renderer } = createCalendarRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, calendar } = createCalendarRenderer();
  try {
    renderer.start();
    renderer.focus(calendar);
    renderer.renderFrame();
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--print") || !isKittyInteractiveRuntime()) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}

function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}

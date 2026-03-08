import { fileURLToPath } from "node:url";
import { BoxRenderable, createKittyRenderer, ImageRenderable, TextRenderable } from "@neotui/core";

const holdMs =
  parseNumberFlag("--hold-ms") ?? Number.parseInt(process.env.NEOTUI_KITTY_HOLD_MS ?? "4000", 10);
const clipboardText =
  process.env.NEOTUI_KITTY_CLIPBOARD_TEXT ?? `NeoTui kitty validation ${new Date().toISOString()}`;
const kittyImageSource = fileURLToPath(new URL("../examples/kitty.png", import.meta.url));

function createSurfaceRenderer() {
  const renderer = createKittyRenderer({
    appName: "kitty-manual-validation",
    width: 80,
    height: 20,
    exitOnCtrlC: false,
  });

  renderer.root.updateLayout({
    padding: 1,
    gap: 1,
  });

  const hero = new BoxRenderable({
    content: [
      "NeoTui kitty validation",
      "",
      "Manual surface for hyperlink, clipboard, cursor, and image checks.",
      `Clipboard token: ${clipboardText}`,
    ].join("\n"),
    layout: { height: 4 },
    style: {
      border: true,
      title: "kitty-manual",
      borderFg: "#c89c5d",
      bg: "#16110d",
      fg: "#f2e7d5",
    },
  });
  const hyperlink = new TextRenderable({
    content: [
      { text: "OpenTUI docs", href: "https://opentui.com/docs/getting-started/" },
      { text: "  click or inspect this link in kitty" },
    ],
    layout: { height: 1 },
    style: {
      fg: "#d9c06a",
      bg: "#0f0a08",
    },
  });
  const imageLabel = new BoxRenderable({
    content: "Kitty image placement should appear below this label.",
    layout: { height: 1 },
    style: {
      fg: "#8bd4c7",
      bg: "#0f0a08",
    },
  });
  const image = new ImageRenderable({
    source: kittyImageSource,
    alt: "kitty validation image",
    layout: { width: 24, height: 6 },
  });
  const notes = new BoxRenderable({
    content: [
      "Expected checks:",
      "- OSC 52 clipboard token updates the system clipboard",
      "- OSC 8 hyperlink renders in the live surface",
      "- kitty graphics payload paints the kitten image in the box above",
    ].join("\n"),
    layout: { height: 4 },
    style: {
      border: true,
      title: "notes",
      borderFg: "#7fb8ff",
      bg: "#16110d",
      fg: "#f2e7d5",
    },
  });

  renderer.setCursorState({
    x: 4,
    y: 5,
    shape: "beam",
    color: "#00ffaa",
    blink: false,
    visible: true,
  });
  renderer.writeClipboard(clipboardText);
  renderer.add(hero, hyperlink, imageLabel, image, notes);

  return renderer;
}

async function runLive(): Promise<void> {
  const renderer = createSurfaceRenderer();
  try {
    renderer.start();
    renderer.renderFrame();
    await Bun.sleep(Math.max(500, holdMs));
  } finally {
    await renderer.destroy();
  }
}

function buildSnapshot(): string {
  const renderer = createSurfaceRenderer();
  renderer.renderFrame();
  return `${renderer.renderToString()}\n${renderer.session.getTranscript()}`;
}

if (import.meta.main) {
  if (process.argv.includes("--print")) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}

function parseNumberFlag(flag: string): number | null {
  const match = process.argv.find((value) => value.startsWith(`${flag}=`));
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match.slice(flag.length + 1), 10);
  return Number.isFinite(value) ? value : null;
}

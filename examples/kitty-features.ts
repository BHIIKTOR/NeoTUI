import { fileURLToPath } from "node:url";
import { createKittyRenderer, ImageRenderable, TextRenderable } from "@neotui/core";

const kittyImageSource = fileURLToPath(new URL("./kitty.png", import.meta.url));

const renderer = createKittyRenderer({ appName: "kitty-features", width: 72, height: 14 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

renderer.setCursorState({
  x: 4,
  y: 4,
  shape: "beam",
  color: "#00ffaa",
  blink: false,
  visible: true,
});
renderer.writeClipboard("NeoTui clipboard demo");

renderer.add(
  new TextRenderable({
    content: [{ text: "OpenTUI docs", href: "https://opentui.com/docs/getting-started/" }],
    layout: { height: 1 },
  }),
  new ImageRenderable({
    source: kittyImageSource,
    alt: "kitty graphics demo",
    layout: { width: 24, height: 6 },
  }),
);

console.log(renderer.renderToString());
console.log(renderer.session.getTranscript());

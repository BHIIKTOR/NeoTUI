import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

const renderer = createKittyRenderer({ appName: "core-basic", width: 60, height: 16 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

renderer.add(
  new BoxRenderable({
    content: "NeoTui core",
    layout: { width: 24, height: 5 },
    style: { border: true, title: "hero" },
  }),
  new TextRenderable({
    content: "kitty-only\nbun-first\ntypescript-first",
  }),
);

console.log(renderer.renderToString());

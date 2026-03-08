import { BoxRenderable, createKittyRenderer, TextRenderable } from "@neotui/core";

const renderer = createKittyRenderer({ appName: "layout-dashboard", width: 72, height: 20 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

const row = new BoxRenderable({
  layout: { flexDirection: "row", flexGrow: 1, gap: 1 },
});
const left = new BoxRenderable({
  content: "left pane",
  layout: { width: "30%" },
  style: { border: true, title: "left" },
});
const right = new BoxRenderable({
  layout: { flexGrow: 1, gap: 1 },
  style: { border: true, title: "right" },
});
const overlay = new BoxRenderable({
  content: "overlay",
  layout: { position: "absolute", top: 1, left: 20, width: 12, height: 4, zIndex: 2 },
  style: { border: true, title: "tag" },
});

right.add(
  new TextRenderable({ content: "top panel" }),
  new TextRenderable({ content: "bottom panel" }),
  overlay,
);
row.add(left, right);
renderer.add(row);

console.log(renderer.renderToString());

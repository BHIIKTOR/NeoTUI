import {
  createKittyRenderer,
  InputRenderable,
  SelectRenderable,
  TabSelectRenderable,
  TextareaRenderable,
} from "@neotui/core";

const renderer = createKittyRenderer({ appName: "widgets-form", width: 72, height: 22 });
renderer.root.updateLayout({ padding: 1, gap: 1 });

renderer.add(
  new InputRenderable({
    value: "neo",
    placeholder: "username",
    layout: { height: 3 },
  }),
  new TextareaRenderable({
    value: "notes\nline 2",
    layout: { height: 7 },
  }),
  new SelectRenderable({
    options: ["alpha", "beta", "gamma"],
    layout: { height: 5 },
    title: "select",
  }),
  new TabSelectRenderable({
    options: ["overview", "code", "docs"],
    descriptions: ["summary", "implementation", "reference"],
    layout: { height: 2 },
  }),
);

renderer.focus(renderer.root.children[0] ?? null);
console.log(renderer.renderToString());

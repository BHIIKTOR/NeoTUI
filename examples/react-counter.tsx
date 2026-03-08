import { createKittyRenderer } from "@neotui/core";
import { Badge, Button, createReactRoot, Panel, Toolbar } from "@neotui/react";

const renderer = createKittyRenderer({ appName: "react-counter", width: 48, height: 12 });
const root = createReactRoot(renderer);

root.render(
  <Panel title="react" tone="accent" layout={{ width: 30, height: 8, padding: 1, gap: 1 }}>
    <Toolbar>
      <Badge label="wrappers" tone="info" />
      <Button label="count 1" variant="secondary" />
    </Toolbar>
    <Button label="rendered by @neotui/react" variant="ghost" />
  </Panel>,
);

console.log(renderer.renderToString());

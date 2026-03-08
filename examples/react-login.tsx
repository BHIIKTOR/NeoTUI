import { createKittyRenderer } from "@neotui/core";
import { Button, createReactRoot, InputField, Panel, Toolbar } from "@neotui/react";

const renderer = createKittyRenderer({ appName: "react-login", width: 48, height: 14 });
const root = createReactRoot(renderer);

root.render(
  <Panel title="login" tone="accent" layout={{ gap: 1, padding: 1, width: 34, height: 13 }}>
    <InputField
      label="username"
      value="neo"
      placeholder="username"
      width="fill"
      fieldLayout={{ width: "100%" }}
    />
    <InputField
      label="password"
      value="kitty"
      placeholder="password"
      type="password"
      width="fill"
      fieldLayout={{ width: "100%" }}
    />
    <Toolbar>
      <Button label="submit" variant="primary" />
      <Button label="cancel" variant="ghost" />
    </Toolbar>
  </Panel>,
);

console.log(renderer.renderToString());

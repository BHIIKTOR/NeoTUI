import { createKittyRenderer, withTerminalSession } from "@neotui/core";

const renderer = createKittyRenderer({
  appName: "examples/terminal-session",
});

await withTerminalSession(renderer.session, async () => {
  renderer.session.protocol.clearScreen();
  process.stdout.write("NeoTui terminal session demo\n");
  process.stdout.write(`kitty: ${renderer.session.capabilities.isKitty}\n`);
  process.stdout.write(`milestone: ${renderer.milestone}\n`);
  await Bun.sleep(75);
});

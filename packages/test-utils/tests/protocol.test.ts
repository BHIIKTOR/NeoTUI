import { expect, test } from "bun:test";
import { CONTROL_SEQUENCES, ProtocolWriter, TerminalSession } from "@neotui/core";
import {
  createMemorySignalTarget,
  createMemoryTerminalInput,
  createMemoryTerminalOutput,
  createProtocolTranscript,
} from "../src/index.ts";

test("protocol transcript helper preserves escape ordering", () => {
  const transcript = createProtocolTranscript(["\u001b[?1049h", "\u001b[2J", "\u001b[H"]);

  expect(transcript).toBe("\u001b[?1049h\u001b[2J\u001b[H");
});

test("protocol writer records exact toggle sequences", () => {
  const output = createMemoryTerminalOutput();
  const writer = new ProtocolWriter({ sink: output });

  writer.enterAlternateScreen();
  writer.enableKittyKeyboard();
  writer.hideCursor();
  writer.enableBracketedPaste();
  writer.enableMouseTracking();
  writer.disableMouseTracking();
  writer.disableBracketedPaste();
  writer.disableKittyKeyboard();
  writer.showCursor();
  writer.exitAlternateScreen();

  expect(output.transcript()).toBe(
    [
      CONTROL_SEQUENCES.enterAlternateScreen,
      CONTROL_SEQUENCES.enableKittyKeyboard,
      CONTROL_SEQUENCES.hideCursor,
      CONTROL_SEQUENCES.enableBracketedPaste,
      CONTROL_SEQUENCES.enableMouseTracking,
      CONTROL_SEQUENCES.disableMouseTracking,
      CONTROL_SEQUENCES.disableBracketedPaste,
      CONTROL_SEQUENCES.disableKittyKeyboard,
      CONTROL_SEQUENCES.showCursor,
      CONTROL_SEQUENCES.exitAlternateScreen,
    ].join(""),
  );
});

test("protocol writer records kitty-native features deterministically", () => {
  const output = createMemoryTerminalOutput();
  const writer = new ProtocolWriter({ sink: output });

  writer.withSynchronizedUpdate(() => {
    writer.openHyperlink("https://opentui.com");
    writer.write("docs");
    writer.closeHyperlink();
  });
  writer.writeClipboard("copied text");
  writer.setCursorStyle({ shape: "beam", blink: false, color: "#00ffaa", visible: true });
  writer.writeKittyImage({
    imageId: 1,
    placementId: 7,
    source: "/tmp/demo.png",
    width: 10,
    height: 4,
    x: 2,
    y: 3,
  });
  writer.deleteVisibleImages();

  expect(output.transcript()).toContain(CONTROL_SEQUENCES.beginSynchronizedUpdate);
  expect(output.transcript()).toContain(CONTROL_SEQUENCES.endSynchronizedUpdate);
  expect(output.transcript()).toContain("https://opentui.com");
  expect(output.transcript()).toContain("]52;c;");
  expect(output.transcript()).toContain("]12;#00ffaa");
  expect(output.transcript()).toContain("\u001b[4;3H");
  expect(output.transcript()).toContain("\u001b_Ga=T,t=f,f=100,C=1,i=1,p=7,c=10,r=4;");
  expect(output.transcript()).toContain("\u001b_Ga=d\u001b\\");
});

test("protocol writer rejects unsafe hyperlink and image payload input", () => {
  const writer = new ProtocolWriter();

  writer.openHyperlink("javascript:alert(1)");
  writer.openHyperlink("https://opentui.com/\u001b[31m");
  writer.openHyperlink("/home/bhiktor/DEV/heretic/heretic-cli/docs/neotui-port-plan.md");

  expect(writer.getTranscript()).toBe("");
  expect(() =>
    writer.writeKittyImage({
      imageId: -1,
      source: "/tmp/demo.png",
      width: 10,
      height: 4,
      x: 2,
      y: 3,
    }),
  ).toThrow("Invalid imageId: -1");
  expect(() =>
    writer.writeKittyImage({
      imageId: 1,
      source: "/tmp/demo.png\u0007",
      width: 10,
      height: 4,
      x: 2,
      y: 3,
    }),
  ).toThrow("Invalid image source: control characters are not allowed");
});

test("protocol writer preserves valid hyperlinks while degrading malformed ones to plain text", () => {
  const output = createMemoryTerminalOutput();
  const writer = new ProtocolWriter({ sink: output });

  writer.openHyperlink("https://opentui.com/docs");
  writer.write("docs");
  writer.closeHyperlink();
  writer.openHyperlink("/tmp/local-file.md");
  writer.write(" local ref ");
  writer.closeHyperlink();

  const transcript = output.transcript();
  expect(transcript).toContain("https://opentui.com/docs");
  expect(transcript).toContain("docs");
  expect(transcript).not.toContain("/tmp/local-file.md");
});

test("terminal session activation and destroy preserve protocol boundaries", async () => {
  const input = createMemoryTerminalInput();
  const output = createMemoryTerminalOutput();
  const signals = createMemorySignalTarget();
  const session = new TerminalSession({
    appName: "protocol-test",
    env: { TERM: "xterm-kitty", KITTY_WINDOW_ID: "1" },
    input,
    output,
    signalTarget: signals,
  });

  session.activate();
  await session.destroy();

  expect(input.rawModeCalls).toEqual([true, false]);
  expect(output.transcript()).toBe(
    [
      CONTROL_SEQUENCES.enterAlternateScreen,
      CONTROL_SEQUENCES.enableKittyKeyboard,
      CONTROL_SEQUENCES.hideCursor,
      CONTROL_SEQUENCES.enableBracketedPaste,
      CONTROL_SEQUENCES.enableMouseTracking,
      CONTROL_SEQUENCES.disableMouseTracking,
      CONTROL_SEQUENCES.disableBracketedPaste,
      CONTROL_SEQUENCES.disableKittyKeyboard,
      CONTROL_SEQUENCES.showCursor,
      CONTROL_SEQUENCES.exitAlternateScreen,
    ].join(""),
  );
});

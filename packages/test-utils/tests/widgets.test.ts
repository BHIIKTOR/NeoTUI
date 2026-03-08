import { expect, test } from "bun:test";
import {
  type ClipboardAccess,
  createKittyRenderer,
  InputRenderable,
  SelectRenderable,
  type SubmitEvent,
  TabSelectRenderable,
  TextareaRenderable,
} from "@neotui/core";
import { createMemoryTerminalOutput, createTestRenderer } from "../src/index.ts";

test("input supports typing placeholder and submit flow", () => {
  const renderer = createTestRenderer(40, 12);
  const input = new InputRenderable({ placeholder: "type", value: "" });
  const submitted: string[] = [];

  input.on("submit", (event) => {
    const submit = event as SubmitEvent<string>;
    submitted.push(String(submit.value));
  });

  renderer.add(input);
  expect(renderer.renderToString()).toContain("type");

  renderer.focus(input);
  renderer.dispatchInput("neo");
  renderer.dispatchInput("\r");

  expect(input.getValue()).toBe("neo");
  expect(submitted).toEqual(["neo"]);
});

test("textarea supports editing and paste insertion", () => {
  const renderer = createTestRenderer(40, 12);
  const textarea = new TextareaRenderable({ value: "alpha" });

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput("\u001b[200~\nbeta\u001b[201~");

  expect(textarea.getValue()).toBe("alpha\nbeta");
});

test("textarea supports multiline keyboard movement select-all and undo-redo", () => {
  const renderer = createTestRenderer(40, 12);
  const textarea = new TextareaRenderable({
    value: "alpha\nbe\ncharlie",
    layout: { width: 18, height: 6 },
  });

  renderer.add(textarea);
  renderer.renderFrame();
  renderer.focus(textarea);
  renderer.dispatchInput("\u001b[A");
  expect(textarea.getCursorLocation()).toEqual({ line: 1, column: 2 });

  renderer.dispatchInput("\u001b[A");
  expect(textarea.getCursorLocation()).toEqual({ line: 0, column: 5 });

  renderer.dispatchInput("\u0001");
  expect(textarea.getSelection()).not.toBeNull();

  renderer.dispatchInput("rewritten");
  expect(textarea.getValue()).toBe("rewritten");

  renderer.dispatchInput("\u001a");
  expect(textarea.getValue()).toBe("alpha\nbe\ncharlie");

  renderer.dispatchInput("\u0019");
  expect(textarea.getValue()).toBe("rewritten");
});

test("textarea supports wrapped paging and horizontal scrolling", () => {
  const renderer = createTestRenderer(30, 10);
  const wrapped = new TextareaRenderable({
    value: "alpha beta gamma delta epsilon zeta eta theta",
    layout: { width: 12, height: 5 },
    wrapMode: "word",
  });
  const unwrapped = new TextareaRenderable({
    value: "abcdefghijklmnopqrstuvwxyz",
    layout: { width: 12, height: 5 },
    wrapMode: "none",
  });

  renderer.add(wrapped, unwrapped);
  renderer.focus(wrapped);
  renderer.dispatchInput("\u001b[6~");
  expect(wrapped.getScrollPosition().y).toBeGreaterThanOrEqual(0);

  renderer.focus(unwrapped);
  for (let index = 0; index < 20; index += 1) {
    renderer.dispatchInput("\u001b[C");
  }

  expect(unwrapped.getScrollPosition().x).toBeGreaterThan(0);
  expect(renderer.renderToString()).toContain("━");
});

test("textarea keeps long wrapped content navigable across repeated page moves", () => {
  const renderer = createTestRenderer(34, 10);
  const textarea = new TextareaRenderable({
    value: Array.from({ length: 18 }, (_, index) => `release note ${index} alpha beta gamma`).join(
      "\n",
    ),
    layout: { width: 18, height: 5 },
    wrapMode: "word",
  });

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[6~");
  renderer.dispatchInput("\u001b[6~");
  renderer.dispatchInput("\u001b[5~");

  expect(textarea.getCursorLocation().line).toBeGreaterThan(0);
  expect(textarea.getScrollPosition().y).toBeGreaterThan(0);
});

test("textarea supports mouse placement and drag selection", () => {
  const renderer = createTestRenderer(30, 10);
  const textarea = new TextareaRenderable({
    value: "alpha beta",
    layout: { width: 18, height: 5 },
  });

  renderer.add(textarea);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;3;2M");
  renderer.dispatchInput("\u001b[<32;7;2M");
  renderer.dispatchInput("\u001b[<0;7;2m");

  const selection = textarea.getSelection();
  expect(selection).not.toBeNull();
  expect(textarea.getSelectedText().length).toBeGreaterThan(0);
});

test("textarea can summarize large pasted content while keeping the full buffer", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 32, height: 5 },
    summarizePastedText: true,
    pasteSummaryThreshold: 20,
  });
  const payload = "release-notes:".repeat(12);

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);

  expect(textarea.getValue()).toBe(payload);
  expect(renderer.renderToString()).toContain(`[Pasted Content ${payload.length} chars]`);
  expect(renderer.renderToString()).not.toContain(payload.slice(0, 20));

  renderer.dispatchInput("\u001b[D");
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain(`[Pasted Content ${payload.length} chars]`);
  expect(snapshot).not.toContain("release-notes:");
});

test("textarea summarizes multi-line pastes by default line threshold", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 32, height: 5 },
    summarizePastedText: true,
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);

  expect(textarea.getValue()).toBe(payload);
  expect(renderer.renderToString()).toContain(`[Pasted Content ${payload.length} chars]`);
});

test("textarea paste summary stays collapsed on mouse click", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 32, height: 5 },
    summarizePastedText: true,
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);
  renderer.dispatchInput("\u001b[<0;3;2M");

  expect(textarea.getValue()).toBe(payload);
  expect(renderer.renderToString()).toContain(`[Pasted Content ${payload.length} chars]`);
});

test("textarea paste summary stays collapsed while typing after the token", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 40, height: 5 },
    summarizePastedText: true,
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);
  renderer.dispatchInput("!");

  expect(textarea.getValue()).toBe(`${payload}!`);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain(`[Pasted Content ${payload.length} chars]!`);
  expect(snapshot).not.toContain("one");
});

test("textarea keeps multiple summarized pastes collapsed as separate atomic tokens", () => {
  const renderer = createTestRenderer(80, 12);
  const textarea = new TextareaRenderable({
    layout: { width: 60, height: 6 },
    summarizePastedText: true,
  });
  const payloadA = ["one", "two", "three", "four", "five", "six"].join("\n");
  const payloadB = [
    "release-notes",
    "staging",
    "production",
    "migration",
    "rollback",
    "verification",
  ].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payloadA}\u001b[201~`);
  renderer.dispatchInput("a");
  renderer.dispatchInput(`\u001b[200~${payloadB}\u001b[201~`);

  expect(textarea.getValue()).toBe(`${payloadA}a${payloadB}`);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain(
    `[Pasted Content ${payloadA.length} chars]a[Pasted Content ${payloadB.length} chars]`,
  );
  expect(snapshot).not.toContain("one");
  expect(snapshot).not.toContain("release-notes");
});

test("textarea paste summary behaves like a single deletable token", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 40, height: 5 },
    summarizePastedText: true,
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);
  renderer.dispatchInput("\u001b[D");
  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\u007f");

  expect(textarea.getValue()).toBe("");
  expect(renderer.renderToString()).not.toContain("[Pasted Content");
});

test("textarea home and end keys do not inject escape sequences into summary tokens", () => {
  const renderer = createTestRenderer(80, 12);
  const textarea = new TextareaRenderable({
    layout: { width: 40, height: 6 },
    summarizePastedText: true,
    wrapMode: "word",
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);
  renderer.dispatchInput("\u001b[F");

  expect(textarea.getValue()).toBe(payload);
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain(`[Pasted Content ${payload.length} chars]`);
  expect(snapshot).not.toContain("\u001b");
  expect(snapshot).not.toContain("[F");
});

test("textarea direct api calls clear paste summary without losing buffer content", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 32, height: 5 },
    summarizePastedText: true,
    pasteSummaryThreshold: 20,
  });
  const payload = "release-notes:".repeat(12);

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);

  textarea.selectAll();
  const snapshot = renderer.renderToString();
  expect(snapshot).toContain(`[Pasted Content ${payload.length} chars]`);
  expect(textarea.getValue()).toBe(payload);
});

test("textarea undo and redo preserve summarized paste display", () => {
  const renderer = createTestRenderer(60, 10);
  const textarea = new TextareaRenderable({
    layout: { width: 40, height: 5 },
    summarizePastedText: true,
  });
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");
  const summaryLabel = `[Pasted Content ${payload.length} chars]`;

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput(`\u001b[200~${payload}\u001b[201~`);
  expect(renderer.renderToString()).toContain(summaryLabel);

  renderer.dispatchInput("\u001a");
  expect(textarea.getValue()).toBe("");
  expect(renderer.renderToString()).not.toContain(summaryLabel);

  renderer.dispatchInput("\u0019");
  expect(textarea.getValue()).toBe(payload);
  expect(renderer.renderToString()).toContain(summaryLabel);
});

test("textarea copies and cuts the selected text through the renderer clipboard", () => {
  const clipboardWrites: string[] = [];
  let clipboardText = "clipboard seed";
  const clipboard: ClipboardAccess = {
    capabilities: {
      backend: "mock",
      bindings: {
        copy: "ctrl",
        cut: "ctrl",
        paste: "ctrl",
      },
      supportsRead: true,
      supportsWrite: true,
    },
    readText() {
      return clipboardText;
    },
    writeText(text) {
      clipboardWrites.push(text);
      clipboardText = text;
      return true;
    },
  };
  const renderer = createKittyRenderer({
    appName: "test-renderer",
    width: 60,
    height: 10,
    exitOnCtrlC: true,
    output: createMemoryTerminalOutput(60, 10),
    clipboard,
  });
  const textarea = new TextareaRenderable({
    value: "alpha\nbeta",
    layout: { width: 32, height: 5 },
  });

  renderer.add(textarea);
  renderer.focus(textarea);
  renderer.dispatchInput("\u0001");
  renderer.session.protocol.resetTranscript();
  renderer.dispatchInput("\u0003");

  const copied = renderer.session.protocol.getTranscript();
  expect(renderer.session.isDestroyed()).toBe(false);
  expect(clipboardWrites).toEqual(["alpha\nbeta"]);
  expect(copied).toContain("\u001b]52;c;");
  expect(copied).toContain(Buffer.from("alpha\nbeta", "utf8").toString("base64"));
  expect(textarea.getValue()).toBe("alpha\nbeta");

  renderer.session.protocol.resetTranscript();
  renderer.dispatchInput("\u0018");

  const cut = renderer.session.protocol.getTranscript();
  expect(clipboardWrites).toEqual(["alpha\nbeta", "alpha\nbeta"]);
  expect(cut).toContain("\u001b]52;c;");
  expect(cut).toContain(Buffer.from("alpha\nbeta", "utf8").toString("base64"));
  expect(textarea.getValue()).toBe("");

  clipboardText = "pasted from clipboard";
  renderer.dispatchInput("\u0016");
  expect(textarea.getValue()).toBe("pasted from clipboard");
});

test("select supports keyboard navigation and submit", () => {
  const renderer = createTestRenderer(40, 12);
  const select = new SelectRenderable({
    options: ["one", "two", "three"],
  });
  const submitted: string[] = [];

  select.on("submit", (event) => {
    const submit = event as SubmitEvent<{ option: string }>;
    submitted.push(String(submit.value.option));
  });

  renderer.add(select);
  renderer.focus(select);
  renderer.dispatchInput("\u001b[B");
  renderer.dispatchInput("\r");

  expect(select.getValue()).toBe("two");
  expect(submitted).toEqual(["two"]);
});

test("select supports mouse selection", () => {
  const renderer = createTestRenderer(40, 12);
  const select = new SelectRenderable({
    options: ["one", "two", "three"],
    layout: { height: 6 },
  });

  renderer.add(select);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;3;3M");

  expect(select.getValue()).toBe("two");
});

test("tab select supports horizontal navigation", () => {
  const renderer = createTestRenderer(40, 12);
  const tabs = new TabSelectRenderable({
    options: ["Overview", "Code", "Docs"],
    descriptions: ["overview", "code", "docs"],
  });

  renderer.add(tabs);
  renderer.focus(tabs);
  renderer.dispatchInput("\u001b[C");
  renderer.dispatchInput("\u001b[C");

  expect(tabs.getValue()).toBe("Docs");
  expect(renderer.renderToString()).toContain("[Docs]");
});

test("tab select supports mouse selection", () => {
  const renderer = createTestRenderer(40, 12);
  const tabs = new TabSelectRenderable({
    options: ["Overview", "Code", "Docs"],
    descriptions: ["overview", "code", "docs"],
  });

  renderer.add(tabs);
  renderer.renderFrame();
  renderer.dispatchInput("\u001b[<0;14;1M");

  expect(tabs.getValue()).toBe("Code");
});

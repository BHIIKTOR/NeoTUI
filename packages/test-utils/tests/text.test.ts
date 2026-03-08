import { expect, test } from "bun:test";
import {
  createSelection,
  EditingBuffer,
  graphemeCount,
  MultilineEditorBuffer,
  measureTextWidth,
  serializeSelection,
  splitGraphemes,
  TextareaControllerModel,
  TextareaDocumentModel,
  TextareaViewportModel,
  wrapText,
} from "@neotui/core";

test("unicode utilities cover emoji cjk combining marks and zwj clusters", () => {
  expect(splitGraphemes("Ame\u0301lie")).toEqual(["A", "m", "é", "l", "i", "e"]);
  expect(graphemeCount("👩‍💻")).toBe(1);
  expect(measureTextWidth("界")).toBe(2);
  expect(measureTextWidth("👩‍💻")).toBe(2);
});

test("wrap modes none char and word are deterministic", () => {
  const none = wrapText("alpha beta gamma", 7, "none");
  const char = wrapText("alpha beta", 5, "char");
  const word = wrapText("alpha beta gamma", 6, "word");
  const punctuation = wrapText("move the window.", 10, "word");

  expect(none.map((line) => line.plainText)).toEqual(["alpha b"]);
  expect(char.map((line) => line.plainText)).toEqual(["alpha", " beta"]);
  expect(word.map((line) => line.plainText)).toEqual(["alpha", "beta", "gamma"]);
  expect(punctuation.map((line) => line.plainText)).toEqual(["move the", "window."]);
});

test("editing buffer supports insert delete backspace home end and word jumps", () => {
  const buffer = new EditingBuffer("alpha beta");

  buffer.moveWordLeft();
  expect(buffer.getCursorIndex()).toBe(6);

  buffer.moveEnd();
  expect(buffer.getCursorIndex()).toBe(10);

  buffer.insert("!");
  expect(buffer.getText()).toBe("alpha beta!");

  buffer.backspace();
  expect(buffer.getText()).toBe("alpha beta");

  buffer.moveHome();
  expect(buffer.getCursorIndex()).toBe(0);

  buffer.deleteForward();
  expect(buffer.getText()).toBe("lpha beta");
});

test("selection serialization is deterministic", () => {
  const value = "hello world";
  const selection = createSelection(0, 5);

  expect(serializeSelection(value, selection)).toBe("hello");
});

test("multiline editor buffer supports vertical movement and preferred column retention", () => {
  const buffer = new MultilineEditorBuffer("alpha\nbe\ncharlie");

  buffer.moveDocumentStart();
  buffer.moveRight();
  buffer.moveRight();
  buffer.moveRight();
  buffer.moveRight();

  expect(buffer.getCursorLocation()).toEqual({ line: 0, column: 4 });

  buffer.moveDown();
  expect(buffer.getCursorLocation()).toEqual({ line: 1, column: 2 });

  buffer.moveDown();
  expect(buffer.getCursorLocation()).toEqual({ line: 2, column: 4 });

  buffer.moveUp();
  expect(buffer.getCursorLocation()).toEqual({ line: 1, column: 2 });
});

test("multiline editor buffer supports selection replace undo and redo", () => {
  const buffer = new MultilineEditorBuffer("alpha\nbeta");

  buffer.moveDocumentStart();
  buffer.moveRight(true);
  buffer.moveRight(true);
  expect(buffer.getSelectedText()).toBe("al");

  buffer.insert("AL");
  expect(buffer.getText()).toBe("ALpha\nbeta");

  expect(buffer.undo()).toBe(true);
  expect(buffer.getText()).toBe("alpha\nbeta");

  expect(buffer.redo()).toBe(true);
  expect(buffer.getText()).toBe("ALpha\nbeta");
});

test("multiline editor buffer groups adjacent inserts into one undo step", () => {
  const buffer = new MultilineEditorBuffer("");

  buffer.insert("a");
  buffer.insert("b");
  buffer.insert("c");

  expect(buffer.getText()).toBe("abc");
  expect(buffer.undo()).toBe(true);
  expect(buffer.getText()).toBe("");
});

test("textarea viewport model supports wrapped and horizontal layouts", () => {
  const wrapped = new TextareaViewportModel("alpha beta gamma", 6, "word");
  const unwrapped = new TextareaViewportModel("abcdefghijklmnopqrstuvwxyz", 8, "none");

  expect(wrapped.contentHeight).toBeGreaterThan(1);
  expect(wrapped.locateIndex(6).row).toBeGreaterThan(0);

  expect(unwrapped.getMaxScrollX(8)).toBeGreaterThan(0);
  expect(unwrapped.indexFromPoint(3, 0, 5, 0)).toBeGreaterThan(5);
});

test("textarea document model preserves summarized paste display across undo and redo", () => {
  const document = new TextareaDocumentModel("");
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");
  const summaryLabel = `[Pasted Content ${payload.length} chars]`;

  expect(
    document.insert(payload, {
      source: "paste",
      summarizePastedText: true,
      pasteSummaryLineThreshold: 5,
    }),
  ).toBe(true);
  expect(document.getText()).toBe(payload);
  expect(document.getDisplayState().value).toContain(summaryLabel);

  expect(document.undo()).toBe(true);
  expect(document.getText()).toBe("");
  expect(document.getDisplayState().value).toBe("");

  expect(document.redo()).toBe(true);
  expect(document.getText()).toBe(payload);
  expect(document.getDisplayState().value).toContain(summaryLabel);
});

test("textarea document model keeps paste and typed edits in separate undo groups", () => {
  const document = new TextareaDocumentModel("");
  const payload = ["one", "two", "three", "four", "five", "six"].join("\n");
  const summaryLabel = `[Pasted Content ${payload.length} chars]`;

  document.insert(payload, {
    source: "paste",
    summarizePastedText: true,
    pasteSummaryLineThreshold: 5,
  });
  document.insert("!", {
    source: "type",
  });

  expect(document.getText()).toBe(`${payload}!`);

  expect(document.undo()).toBe(true);
  expect(document.getText()).toBe(payload);
  expect(document.getDisplayState().value).toContain(summaryLabel);

  expect(document.undo()).toBe(true);
  expect(document.getText()).toBe("");
});

test("textarea controller model owns viewport scroll and pointer selection state", () => {
  const controller = new TextareaControllerModel(
    [
      "alpha beta gamma delta",
      "epsilon zeta eta theta",
      "iota kappa lambda mu",
      "nu xi omicron pi",
      "rho sigma tau upsilon",
      "phi chi psi omega",
    ].join("\n"),
    "word",
  );

  controller.movePage(1, false, 10, 3);
  expect(controller.getCursorLocation().line).toBeGreaterThan(0);
  expect(controller.getScrollPosition().y).toBeGreaterThan(0);

  controller.beginPointerSelection(0, 0, false, 10, 3);
  controller.updatePointerSelection(5, 1, 10, 3);
  controller.endPointerSelection();
  expect(controller.getSelection()).not.toBeNull();
  expect(controller.getSelectedText().length).toBeGreaterThan(0);

  const horizontal = new TextareaControllerModel("abcdefghijklmnopqrstuvwxyz", "none");
  horizontal.moveDocumentEnd();
  horizontal.ensureCursorVisible(8, 3);
  expect(horizontal.getScrollPosition().x).toBeGreaterThan(0);
});

test("textarea controller owns keyboard shortcut, clipboard, and submit policy", () => {
  const controller = new TextareaControllerModel("alpha\nbeta", "word");
  const options = {
    clipboardBindings: {
      copy: "ctrl",
      cut: "ctrl",
      paste: "ctrl",
    },
    submitOnCtrlEnter: true,
    summarizePastedText: true,
    tabString: "  ",
    visibleHeight: 4,
    visibleWidth: 12,
  } as const;

  const selectAll = controller.handleKeyInput(
    {
      key: "a",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    },
    options,
  );
  expect(selectAll.handled).toBe(true);
  expect(selectAll.preventDefault).toBe(true);
  expect(controller.getSelectedText()).toBe("alpha\nbeta");

  const copy = controller.handleKeyInput(
    {
      key: "c",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    },
    options,
  );
  expect(copy.clipboardWriteText).toBe("alpha\nbeta");

  const cut = controller.handleKeyInput(
    {
      key: "x",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    },
    options,
  );
  expect(cut.valueChanged).toBe(true);
  expect(cut.clipboardWriteText).toBe("alpha\nbeta");
  expect(controller.document.getText()).toBe("");

  const pasteShortcut = controller.handleKeyInput(
    {
      key: "v",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    },
    options,
  );
  expect(pasteShortcut.requestClipboardRead).toBe(true);

  const paste = controller.handlePasteText("release notes", options);
  expect(paste.valueChanged).toBe(true);
  expect(controller.document.getText()).toBe("release notes");

  const submit = controller.handleKeyInput(
    {
      key: "Enter",
      modifiers: { shift: false, alt: false, ctrl: true, meta: false },
    },
    options,
  );
  expect(submit.submitValue).toBe("release notes");
});

test("textarea controller render state owns placeholder, cursor, selection, and scrollbars", () => {
  const empty = new TextareaControllerModel("", "word");
  const placeholder = empty.getRenderState({
    focused: false,
    placeholder: "placeholder copy for docs",
    showScrollbars: true,
    visibleHeight: 2,
    visibleWidth: 6,
  });

  expect(placeholder.placeholderVisible).toBe(true);
  expect(placeholder.cursor).toBeNull();
  expect(placeholder.selection).toBeNull();
  expect(placeholder.contentViewport.contentHeight).toBeGreaterThan(1);

  const active = new TextareaControllerModel("abcdefghijklmnopqrstuvwxyz", "none");
  active.moveDocumentEnd();
  active.ensureCursorVisible(8, 3);
  active.selectAll(8, 3);

  const render = active.getRenderState({
    focused: true,
    showScrollbars: true,
    visibleHeight: 3,
    visibleWidth: 8,
  });

  expect(render.placeholderVisible).toBe(false);
  expect(render.cursor).not.toBeNull();
  expect(render.selection).not.toBeNull();
  expect(render.horizontalScrollbar).not.toBeNull();
});

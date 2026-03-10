import type { ClipboardShortcutProfile } from "./clipboard";
import type { EventModifiers } from "./events";
import type { FrameBuffer } from "./frame-buffer";
import type { Rect, TextSpan, WrapMode } from "./types";

const graphemeSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

const wordSegmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "word" })
    : null;

const emojiPattern = /\p{Extended_Pictographic}/u;
const combiningPattern = /\p{Mark}/u;
const punctuationOrSymbolPattern = /^[\p{P}\p{S}]+$/u;

export interface StyledGrapheme {
  grapheme: string;
  width: number;
  href?: string;
  fg?: string;
  bg?: string;
}

export interface WrappedLine {
  spans: TextSpan[];
  plainText: string;
  width: number;
}

export interface RenderTextBlockOptions {
  clip?: Rect;
  href?: string;
  wrapMode?: WrapMode;
  fg?: string;
  bg?: string;
}

export interface TextSelection {
  anchor: number;
  focus: number;
  start: number;
  end: number;
}

export interface TextLineMeta {
  index: number;
  start: number;
  end: number;
  length: number;
  text: string;
}

export interface TextareaVisualCell {
  grapheme: string;
  index: number;
  width: number;
  x: number;
}

export interface TextareaVisualRow {
  index: number;
  logicalLine: number;
  start: number;
  end: number;
  width: number;
  cells: TextareaVisualCell[];
}

export interface MultilineEditorSnapshot {
  text: string;
  cursorIndex: number;
  anchorIndex: number | null;
  preferredColumn: number | null;
}

export class EditingBuffer {
  private text: string;
  private cursorIndex: number;
  private anchorIndex: number | null;

  constructor(initialValue = "") {
    this.text = initialValue;
    this.cursorIndex = graphemeCount(initialValue);
    this.anchorIndex = null;
  }

  getText(): string {
    return this.text;
  }

  setText(value: string): this {
    this.text = value;
    this.cursorIndex = Math.min(this.cursorIndex, graphemeCount(this.text));
    this.anchorIndex = null;
    return this;
  }

  getCursorIndex(): number {
    return this.cursorIndex;
  }

  setCursor(index: number, extendSelection = false): this {
    const nextIndex = clampIndex(index, graphemeCount(this.text));

    if (extendSelection) {
      this.anchorIndex ??= this.cursorIndex;
    } else {
      this.anchorIndex = null;
    }

    this.cursorIndex = nextIndex;
    return this;
  }

  getSelection(): TextSelection | null {
    if (this.anchorIndex === null || this.anchorIndex === this.cursorIndex) {
      return null;
    }

    return createSelection(this.anchorIndex, this.cursorIndex);
  }

  selectedText(): string {
    const selection = this.getSelection();

    if (!selection) {
      return "";
    }

    return sliceByGrapheme(this.text, selection.start, selection.end);
  }

  selectAll(): this {
    this.anchorIndex = 0;
    this.cursorIndex = graphemeCount(this.text);
    return this;
  }

  clearSelection(): this {
    this.anchorIndex = null;
    return this;
  }

  moveLeft(extendSelection = false): this {
    return this.setCursor(this.cursorIndex - 1, extendSelection);
  }

  moveRight(extendSelection = false): this {
    return this.setCursor(this.cursorIndex + 1, extendSelection);
  }

  moveHome(extendSelection = false): this {
    const { column } = this.getCursorLocation();
    return this.setCursor(this.cursorIndex - column, extendSelection);
  }

  moveEnd(extendSelection = false): this {
    const line = currentLineMeta(this.text, this.cursorIndex);
    return this.setCursor(line.end, extendSelection);
  }

  moveWordLeft(extendSelection = false): this {
    return this.setCursor(findPreviousWordBoundary(this.text, this.cursorIndex), extendSelection);
  }

  moveWordRight(extendSelection = false): this {
    return this.setCursor(findNextWordBoundary(this.text, this.cursorIndex), extendSelection);
  }

  insert(value: string): this {
    this.replaceSelection(value);
    return this;
  }

  replaceSelection(value: string): this {
    const selection = this.getSelection();
    const insertAt = selection?.start ?? this.cursorIndex;
    const replaceEnd = selection?.end ?? this.cursorIndex;
    const prefix = sliceByGrapheme(this.text, 0, insertAt);
    const suffix = sliceByGrapheme(this.text, replaceEnd, graphemeCount(this.text));

    this.text = `${prefix}${value}${suffix}`;
    this.anchorIndex = null;
    this.cursorIndex = insertAt + graphemeCount(value);
    return this;
  }

  backspace(): this {
    if (this.getSelection()) {
      return this.replaceSelection("");
    }

    if (this.cursorIndex === 0) {
      return this;
    }

    const before = sliceByGrapheme(this.text, 0, this.cursorIndex - 1);
    const after = sliceByGrapheme(this.text, this.cursorIndex, graphemeCount(this.text));

    this.text = `${before}${after}`;
    this.cursorIndex -= 1;
    return this;
  }

  deleteForward(): this {
    if (this.getSelection()) {
      return this.replaceSelection("");
    }

    if (this.cursorIndex >= graphemeCount(this.text)) {
      return this;
    }

    const before = sliceByGrapheme(this.text, 0, this.cursorIndex);
    const after = sliceByGrapheme(this.text, this.cursorIndex + 1, graphemeCount(this.text));

    this.text = `${before}${after}`;
    return this;
  }

  getCursorLocation(): { line: number; column: number } {
    const prefix = sliceByGrapheme(this.text, 0, this.cursorIndex);
    const lines = prefix.split("\n");
    return {
      line: Math.max(0, lines.length - 1),
      column: graphemeCount(lines.at(-1) ?? ""),
    };
  }

  getLines(): string[] {
    return this.text.split("\n");
  }
}

export class MultilineEditorBuffer {
  private text: string;
  private cursorIndex: number;
  private anchorIndex: number | null;
  private preferredColumn: number | null;
  private undoStack: MultilineEditorSnapshot[];
  private redoStack: MultilineEditorSnapshot[];
  private lastMutationKind: string | null;
  private lastMutationAt: number;

  constructor(initialValue = "") {
    this.text = initialValue;
    this.cursorIndex = graphemeCount(initialValue);
    this.anchorIndex = null;
    this.preferredColumn = null;
    this.undoStack = [];
    this.redoStack = [];
    this.lastMutationKind = null;
    this.lastMutationAt = 0;
  }

  getText(): string {
    return this.text;
  }

  setText(value: string): this {
    this.text = value;
    this.cursorIndex = Math.min(this.cursorIndex, graphemeCount(this.text));
    this.anchorIndex = null;
    this.preferredColumn = null;
    this.undoStack = [];
    this.redoStack = [];
    this.lastMutationKind = null;
    this.lastMutationAt = 0;
    return this;
  }

  getCursorIndex(): number {
    return this.cursorIndex;
  }

  getPreferredColumn(): number | null {
    return this.preferredColumn;
  }

  setPreferredColumn(value: number | null): this {
    this.preferredColumn = value;
    return this;
  }

  setCursor(index: number, extendSelection = false): this {
    const nextIndex = clampIndex(index, graphemeCount(this.text));

    if (extendSelection) {
      this.anchorIndex ??= this.cursorIndex;
    } else {
      this.anchorIndex = null;
    }

    this.cursorIndex = nextIndex;
    return this;
  }

  getSelection(): TextSelection | null {
    if (this.anchorIndex === null || this.anchorIndex === this.cursorIndex) {
      return null;
    }

    return createSelection(this.anchorIndex, this.cursorIndex);
  }

  hasSelection(): boolean {
    return this.getSelection() !== null;
  }

  getSelectedText(): string {
    const selection = this.getSelection();

    if (!selection) {
      return "";
    }

    return sliceByGrapheme(this.text, selection.start, selection.end);
  }

  clearSelection(): this {
    this.anchorIndex = null;
    return this;
  }

  selectAll(): this {
    this.anchorIndex = 0;
    this.cursorIndex = graphemeCount(this.text);
    this.preferredColumn = null;
    return this;
  }

  moveLeft(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(this.cursorIndex - 1, extendSelection);
  }

  moveRight(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(this.cursorIndex + 1, extendSelection);
  }

  moveHome(extendSelection = false): this {
    this.preferredColumn = null;
    const { line } = this.getCursorLocation();
    return this.setCursor(this.getLinesMeta()[line]?.start ?? 0, extendSelection);
  }

  moveEnd(extendSelection = false): this {
    this.preferredColumn = null;
    const { line } = this.getCursorLocation();
    return this.setCursor(
      this.getLinesMeta()[line]?.end ?? graphemeCount(this.text),
      extendSelection,
    );
  }

  moveDocumentStart(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(0, extendSelection);
  }

  moveDocumentEnd(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(graphemeCount(this.text), extendSelection);
  }

  moveWordLeft(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(findPreviousWordBoundary(this.text, this.cursorIndex), extendSelection);
  }

  moveWordRight(extendSelection = false): this {
    this.preferredColumn = null;
    return this.setCursor(findNextWordBoundary(this.text, this.cursorIndex), extendSelection);
  }

  moveUp(extendSelection = false): this {
    return this.moveLogicalLine(-1, extendSelection);
  }

  moveDown(extendSelection = false): this {
    return this.moveLogicalLine(1, extendSelection);
  }

  movePageUp(lines: number, extendSelection = false): this {
    return this.moveLogicalLine(-Math.max(1, lines), extendSelection);
  }

  movePageDown(lines: number, extendSelection = false): this {
    return this.moveLogicalLine(Math.max(1, lines), extendSelection);
  }

  insert(value: string): this {
    this.recordMutation("insert");
    this.replaceSelectionInternal(value);
    this.preferredColumn = null;
    return this;
  }

  insertLineBreak(): this {
    return this.insert("\n");
  }

  replaceSelection(value: string): this {
    this.recordMutation("replace");
    this.replaceSelectionInternal(value);
    this.preferredColumn = null;
    return this;
  }

  backspace(): this {
    if (this.getSelection()) {
      this.recordMutation("delete");
      this.replaceSelectionInternal("");
      this.preferredColumn = null;
      return this;
    }

    if (this.cursorIndex === 0) {
      return this;
    }

    this.recordMutation("delete");
    const before = sliceByGrapheme(this.text, 0, this.cursorIndex - 1);
    const after = sliceByGrapheme(this.text, this.cursorIndex, graphemeCount(this.text));
    this.text = `${before}${after}`;
    this.cursorIndex -= 1;
    this.anchorIndex = null;
    this.preferredColumn = null;
    return this;
  }

  deleteForward(): this {
    if (this.getSelection()) {
      this.recordMutation("delete");
      this.replaceSelectionInternal("");
      this.preferredColumn = null;
      return this;
    }

    if (this.cursorIndex >= graphemeCount(this.text)) {
      return this;
    }

    this.recordMutation("delete");
    const before = sliceByGrapheme(this.text, 0, this.cursorIndex);
    const after = sliceByGrapheme(this.text, this.cursorIndex + 1, graphemeCount(this.text));
    this.text = `${before}${after}`;
    this.anchorIndex = null;
    this.preferredColumn = null;
    return this;
  }

  undo(): boolean {
    const snapshot = this.undoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.redoStack.push(this.exportSnapshot());
    this.restoreSnapshot(snapshot);
    this.lastMutationKind = null;
    return true;
  }

  redo(): boolean {
    const snapshot = this.redoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.undoStack.push(this.exportSnapshot());
    this.restoreSnapshot(snapshot);
    this.lastMutationKind = null;
    return true;
  }

  getCursorLocation(): { line: number; column: number } {
    return locateCursorInText(this.text, this.cursorIndex);
  }

  getLines(): string[] {
    return this.text.split("\n");
  }

  getLinesMeta(): TextLineMeta[] {
    return getTextLineMetas(this.text);
  }

  getLineCount(): number {
    return this.getLinesMeta().length;
  }

  private moveLogicalLine(delta: number, extendSelection: boolean): this {
    const lines = this.getLinesMeta();
    const location = this.getCursorLocation();
    const currentLine = lines[location.line] ?? lines[0] ?? { start: 0, length: 0 };
    const preferredColumn = this.preferredColumn ?? location.column;
    const targetLineIndex = clampIndex(location.line + delta, Math.max(0, lines.length - 1));
    const targetLine = lines[targetLineIndex] ?? currentLine;
    const nextIndex = targetLine.start + Math.min(preferredColumn, targetLine.length);

    this.setCursor(nextIndex, extendSelection);
    this.preferredColumn = preferredColumn;
    return this;
  }

  private replaceSelectionInternal(value: string): void {
    const selection = this.getSelection();
    const insertAt = selection?.start ?? this.cursorIndex;
    const replaceEnd = selection?.end ?? this.cursorIndex;
    const prefix = sliceByGrapheme(this.text, 0, insertAt);
    const suffix = sliceByGrapheme(this.text, replaceEnd, graphemeCount(this.text));

    this.text = `${prefix}${value}${suffix}`;
    this.anchorIndex = null;
    this.cursorIndex = insertAt + graphemeCount(value);
  }

  exportSnapshot(): MultilineEditorSnapshot {
    return {
      text: this.text,
      cursorIndex: this.cursorIndex,
      anchorIndex: this.anchorIndex,
      preferredColumn: this.preferredColumn,
    };
  }

  restoreSnapshot(snapshot: MultilineEditorSnapshot): this {
    this.text = snapshot.text;
    this.cursorIndex = snapshot.cursorIndex;
    this.anchorIndex = snapshot.anchorIndex;
    this.preferredColumn = snapshot.preferredColumn;
    return this;
  }

  private recordMutation(kind: "delete" | "insert" | "replace"): void {
    const now = Date.now();
    const canMerge =
      this.undoStack.length > 0 &&
      this.lastMutationKind === kind &&
      now - this.lastMutationAt < 750 &&
      kind !== "replace";

    if (!canMerge) {
      this.undoStack.push(this.exportSnapshot());
    }

    this.redoStack = [];
    this.lastMutationKind = kind;
    this.lastMutationAt = now;
  }
}

export interface TextareaPasteSummaryState {
  charCount: number;
  label: string;
  startIndex: number;
  endIndex: number;
}

interface ResolvedTextareaPasteSummaryState extends TextareaPasteSummaryState {
  displayStart: number;
  displayEnd: number;
  labelLength: number;
}

export interface TextareaDisplayState {
  value: string;
  actualToDisplay(index: number): number;
  displayToActual(index: number): number;
  selectionToDisplay(selection: TextSelection | null): TextSelection | null;
}

export interface TextareaDocumentInsertOptions {
  source?: "paste" | "type";
  summarizePastedText?: boolean;
  pasteSummaryThreshold?: number;
  pasteSummaryLineThreshold?: number;
  transactionGroup?: string;
  allowUndoMerge?: boolean;
}

interface TextareaDocumentSnapshot {
  editor: MultilineEditorSnapshot;
  pasteSummaries: TextareaPasteSummaryState[];
}

interface TextareaMutationOptions {
  allowMerge?: boolean;
  group?: string;
  kind: "delete" | "insert" | "replace";
}

export class TextareaDocumentModel {
  readonly buffer: MultilineEditorBuffer;

  private pasteSummaries: TextareaPasteSummaryState[] = [];
  private undoStack: TextareaDocumentSnapshot[] = [];
  private redoStack: TextareaDocumentSnapshot[] = [];
  private lastMutationKind: "delete" | "insert" | "replace" | null = null;
  private lastMutationGroup: string | null = null;
  private lastMutationAt = 0;

  constructor(initialValue = "") {
    this.buffer = new MultilineEditorBuffer(initialValue);
  }

  getText(): string {
    return this.buffer.getText();
  }

  setText(value: string): this {
    this.buffer.setText(value);
    this.pasteSummaries = [];
    this.undoStack = [];
    this.redoStack = [];
    this.lastMutationKind = null;
    this.lastMutationGroup = null;
    this.lastMutationAt = 0;
    return this;
  }

  getCursorIndex(): number {
    return this.buffer.getCursorIndex();
  }

  getCursorLocation(): { line: number; column: number } {
    return this.buffer.getCursorLocation();
  }

  getSelection(): TextSelection | null {
    return this.buffer.getSelection();
  }

  getSelectedText(): string {
    return this.buffer.getSelectedText();
  }

  selectAll(): this {
    this.buffer.selectAll();
    return this;
  }

  clearSelection(): this {
    this.buffer.clearSelection();
    return this;
  }

  setCursor(index: number, extendSelection = false): this {
    this.buffer.setCursor(index, extendSelection);
    return this;
  }

  moveLeft(extendSelection = false): this {
    const summary = this.getPasteSummaryForLeftMove(this.buffer.getCursorIndex());
    const cursor = this.buffer.getCursorIndex();

    if (summary && cursor > summary.startIndex && cursor <= summary.endIndex) {
      this.buffer.setCursor(summary.startIndex, extendSelection);
      return this;
    }

    this.buffer.moveLeft(extendSelection);
    return this;
  }

  moveRight(extendSelection = false): this {
    const summary = this.getPasteSummaryForRightMove(this.buffer.getCursorIndex());
    const cursor = this.buffer.getCursorIndex();

    if (summary && cursor >= summary.startIndex && cursor < summary.endIndex) {
      this.buffer.setCursor(summary.endIndex, extendSelection);
      return this;
    }

    this.buffer.moveRight(extendSelection);
    return this;
  }

  moveWordLeft(extendSelection = false): this {
    this.buffer.moveWordLeft(extendSelection);
    this.snapCursorOutsideSummary("start");
    return this;
  }

  moveWordRight(extendSelection = false): this {
    this.buffer.moveWordRight(extendSelection);
    this.snapCursorOutsideSummary("end");
    return this;
  }

  moveHome(extendSelection = false): this {
    this.buffer.moveHome(extendSelection);
    return this;
  }

  moveEnd(extendSelection = false): this {
    this.buffer.moveEnd(extendSelection);
    return this;
  }

  moveDocumentStart(extendSelection = false): this {
    this.buffer.moveDocumentStart(extendSelection);
    return this;
  }

  moveDocumentEnd(extendSelection = false): this {
    this.buffer.moveDocumentEnd(extendSelection);
    return this;
  }

  insert(value: string, options: TextareaDocumentInsertOptions = {}): boolean {
    const previousValue = this.getText();
    this.expandSelectionAcrossSummary();
    this.snapCursorOutsideSummary("end");
    const selection = this.buffer.getSelection();
    const editStart = selection?.start ?? this.buffer.getCursorIndex();
    const editEnd = selection?.end ?? this.buffer.getCursorIndex();
    const insertedLength = splitGraphemes(value).length;
    const source = options.source ?? "type";
    const isSimpleTypedInsert =
      source === "type" && insertedLength === 1 && value !== "\n" && value !== "\t";

    this.recordMutation({
      kind: "insert",
      allowMerge: options.allowUndoMerge ?? isSimpleTypedInsert,
      group: options.transactionGroup ?? (source === "paste" ? "paste" : "typing"),
    });
    this.buffer.insert(value);

    if (this.shouldSummarizePaste(value, options)) {
      const charCount = splitGraphemes(value).length;
      this.transformPasteSummaries(editStart, editEnd, insertedLength);
      this.pasteSummaries.push({
        charCount,
        label: formatPasteSummaryLabel(charCount),
        startIndex: editStart,
        endIndex: editStart + insertedLength,
      });
      this.sortPasteSummaries();
    } else {
      this.transformPasteSummaries(editStart, editEnd, insertedLength);
    }

    return previousValue !== this.getText();
  }

  deleteSelection(): boolean {
    const selection = this.buffer.getSelection();

    if (!selection) {
      return false;
    }

    const previousValue = this.getText();
    this.expandSelectionAcrossSummary();
    const expanded = this.buffer.getSelection();

    if (!expanded) {
      return false;
    }

    this.recordMutation({
      kind: "delete",
      group: "selection-delete",
    });
    this.buffer.replaceSelection("");
    this.transformPasteSummaries(expanded.start, expanded.end, 0);
    return previousValue !== this.getText();
  }

  backspace(): boolean {
    this.expandSelectionAcrossSummary();
    const previousValue = this.getText();
    const selection = this.buffer.getSelection();

    if (selection) {
      this.recordMutation({
        kind: "delete",
        group: "selection-delete",
      });
      this.buffer.backspace();
      this.transformPasteSummaries(selection.start, selection.end, 0);
      return previousValue !== this.getText();
    }

    const cursor = this.buffer.getCursorIndex();
    const summary = this.getPasteSummaryForBackspace(cursor);

    if (!summary) {
      if (cursor === 0) {
        return false;
      }

      this.recordMutation({
        kind: "delete",
        allowMerge: true,
        group: "backspace",
      });
      this.buffer.backspace();
      if (previousValue !== this.getText()) {
        this.transformPasteSummaries(cursor - 1, cursor, 0);
      }
      return previousValue !== this.getText();
    }

    if (cursor > summary.startIndex && cursor <= summary.endIndex) {
      this.recordMutation({
        kind: "delete",
        allowMerge: true,
        group: "backspace",
      });
      this.buffer.setCursor(summary.startIndex, false);
      this.buffer.setCursor(summary.endIndex, true);
      this.buffer.backspace();
      this.transformPasteSummaries(summary.startIndex, summary.endIndex, 0);
    }

    return previousValue !== this.getText();
  }

  deleteForward(): boolean {
    this.expandSelectionAcrossSummary();
    const previousValue = this.getText();
    const selection = this.buffer.getSelection();

    if (selection) {
      this.recordMutation({
        kind: "delete",
        group: "selection-delete",
      });
      this.buffer.deleteForward();
      this.transformPasteSummaries(selection.start, selection.end, 0);
      return previousValue !== this.getText();
    }

    const cursor = this.buffer.getCursorIndex();
    const summary = this.getPasteSummaryForDelete(cursor);

    if (!summary) {
      if (cursor >= graphemeCount(previousValue)) {
        return false;
      }

      this.recordMutation({
        kind: "delete",
        allowMerge: true,
        group: "delete-forward",
      });
      this.buffer.deleteForward();
      if (previousValue !== this.getText()) {
        this.transformPasteSummaries(cursor, cursor + 1, 0);
      }
      return previousValue !== this.getText();
    }

    if (cursor >= summary.startIndex && cursor < summary.endIndex) {
      this.recordMutation({
        kind: "delete",
        allowMerge: true,
        group: "delete-forward",
      });
      this.buffer.setCursor(summary.startIndex, false);
      this.buffer.setCursor(summary.endIndex, true);
      this.buffer.deleteForward();
      this.transformPasteSummaries(summary.startIndex, summary.endIndex, 0);
    }

    return previousValue !== this.getText();
  }

  undo(): boolean {
    const snapshot = this.undoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.redoStack.push(this.snapshot());
    this.restoreSnapshot(snapshot);
    this.lastMutationKind = null;
    this.lastMutationGroup = null;
    return true;
  }

  redo(): boolean {
    const snapshot = this.redoStack.pop();

    if (!snapshot) {
      return false;
    }

    this.undoStack.push(this.snapshot());
    this.restoreSnapshot(snapshot);
    this.lastMutationKind = null;
    this.lastMutationGroup = null;
    return true;
  }

  clearPasteSummary(): boolean {
    if (this.pasteSummaries.length === 0) {
      return false;
    }

    this.pasteSummaries = [];
    return true;
  }

  snapCursorOutsideSummary(prefer: "start" | "end"): this {
    const summary = this.getPasteSummaryContaining(this.buffer.getCursorIndex());

    if (!summary) {
      return this;
    }

    const cursor = this.buffer.getCursorIndex();

    if (cursor <= summary.startIndex || cursor >= summary.endIndex) {
      return this;
    }

    this.buffer.setCursor(prefer === "start" ? summary.startIndex : summary.endIndex, false);
    return this;
  }

  getDisplayState(): TextareaDisplayState {
    if (this.pasteSummaries.length === 0) {
      return identityTextareaDisplayState(this.getText());
    }

    const fullValue = this.getText();
    const resolvedSummaries: ResolvedTextareaPasteSummaryState[] = [];
    const parts: string[] = [];
    let actualCursor = 0;
    let displayCursor = 0;

    for (const summary of this.pasteSummaries) {
      const prefix = sliceByGrapheme(fullValue, actualCursor, summary.startIndex);
      parts.push(prefix);
      displayCursor += graphemeCount(prefix);
      const labelLength = splitGraphemes(summary.label).length;
      resolvedSummaries.push({
        ...summary,
        displayStart: displayCursor,
        displayEnd: displayCursor + labelLength,
        labelLength,
      });
      parts.push(summary.label);
      displayCursor += labelLength;
      actualCursor = summary.endIndex;
    }

    parts.push(sliceByGrapheme(fullValue, actualCursor, graphemeCount(fullValue)));
    const displayValue = parts.join("");

    return {
      value: displayValue,
      actualToDisplay(index: number) {
        let delta = 0;

        for (const summary of resolvedSummaries) {
          if (index <= summary.startIndex) {
            return index + delta;
          }

          if (index < summary.endIndex) {
            return summary.displayEnd;
          }

          delta += summary.labelLength - (summary.endIndex - summary.startIndex);
        }

        return index + delta;
      },
      displayToActual(index: number) {
        let delta = 0;

        for (const summary of resolvedSummaries) {
          if (index <= summary.displayStart) {
            return index + delta;
          }

          if (index < summary.displayEnd) {
            const midpoint = summary.displayStart + Math.floor(summary.labelLength / 2);
            return index <= midpoint ? summary.startIndex : summary.endIndex;
          }

          delta += summary.endIndex - summary.startIndex - summary.labelLength;
        }

        return index + delta;
      },
      selectionToDisplay(selection: TextSelection | null) {
        if (!selection) {
          return null;
        }

        let displayStart = this.actualToDisplay(selection.start);
        let displayEnd = this.actualToDisplay(selection.end);

        for (const summary of resolvedSummaries) {
          const overlapsSummary =
            selection.end > summary.startIndex && selection.start < summary.endIndex;

          if (!overlapsSummary) {
            continue;
          }

          displayStart = Math.min(displayStart, summary.displayStart);
          displayEnd = Math.max(displayEnd, summary.displayEnd);
        }

        return createSelection(displayStart, displayEnd);
      },
    };
  }

  expandSelectionAcrossSummary(): this {
    const selection = this.buffer.getSelection();

    if (!selection) {
      return this;
    }

    const overlapping = this.getOverlappingPasteSummaries(selection.start, selection.end);

    if (overlapping.length === 0) {
      return this;
    }

    const start = Math.min(selection.start, overlapping[0]?.startIndex ?? selection.start);
    const end = Math.max(selection.end, overlapping.at(-1)?.endIndex ?? selection.end);
    this.buffer.setCursor(start, false);
    this.buffer.setCursor(end, true);
    return this;
  }

  private shouldSummarizePaste(value: string, options: TextareaDocumentInsertOptions): boolean {
    if (options.source !== "paste" || options.summarizePastedText !== true) {
      return false;
    }

    const charCount = splitGraphemes(value).length;
    const lineCount = value.length === 0 ? 0 : value.split("\n").length;
    const charThreshold = Math.max(1, options.pasteSummaryThreshold ?? 1024);
    const lineThreshold = Math.max(2, options.pasteSummaryLineThreshold ?? 5);

    return charCount >= charThreshold || lineCount >= lineThreshold;
  }

  private sortPasteSummaries(): void {
    this.pasteSummaries.sort((left, right) => left.startIndex - right.startIndex);
  }

  private transformPasteSummaries(
    editStart: number,
    editEnd: number,
    insertedLength: number,
  ): void {
    if (this.pasteSummaries.length === 0) {
      return;
    }

    const delta = insertedLength - (editEnd - editStart);

    this.pasteSummaries = this.pasteSummaries.flatMap((summary) => {
      if (editEnd <= summary.startIndex) {
        return [
          {
            ...summary,
            startIndex: summary.startIndex + delta,
            endIndex: summary.endIndex + delta,
          },
        ];
      }

      if (editStart >= summary.endIndex) {
        return [summary];
      }

      return [];
    });
  }

  private getOverlappingPasteSummaries(
    startIndex: number,
    endIndex: number,
  ): TextareaPasteSummaryState[] {
    return this.pasteSummaries.filter(
      (summary) => endIndex > summary.startIndex && startIndex < summary.endIndex,
    );
  }

  private getPasteSummaryContaining(index: number): TextareaPasteSummaryState | null {
    return (
      this.pasteSummaries.find(
        (summary) => index > summary.startIndex && index < summary.endIndex,
      ) ?? null
    );
  }

  private getPasteSummaryForLeftMove(index: number): TextareaPasteSummaryState | null {
    return (
      this.pasteSummaries.find(
        (summary) => index > summary.startIndex && index <= summary.endIndex,
      ) ?? null
    );
  }

  private getPasteSummaryForRightMove(index: number): TextareaPasteSummaryState | null {
    return (
      this.pasteSummaries.find(
        (summary) => index >= summary.startIndex && index < summary.endIndex,
      ) ?? null
    );
  }

  private getPasteSummaryForBackspace(index: number): TextareaPasteSummaryState | null {
    return this.getPasteSummaryForLeftMove(index);
  }

  private getPasteSummaryForDelete(index: number): TextareaPasteSummaryState | null {
    return this.getPasteSummaryForRightMove(index);
  }

  private snapshot(): TextareaDocumentSnapshot {
    return {
      editor: this.buffer.exportSnapshot(),
      pasteSummaries: this.pasteSummaries.map((summary) => ({ ...summary })),
    };
  }

  private restoreSnapshot(snapshot: TextareaDocumentSnapshot): void {
    this.buffer.restoreSnapshot(snapshot.editor);
    this.pasteSummaries = snapshot.pasteSummaries.map((summary) => ({ ...summary }));
  }

  private recordMutation(options: TextareaMutationOptions): void {
    const now = Date.now();
    const group = options.group ?? options.kind;
    const canMerge =
      options.allowMerge === true &&
      this.undoStack.length > 0 &&
      this.lastMutationKind === options.kind &&
      this.lastMutationGroup === group &&
      now - this.lastMutationAt < 750 &&
      options.kind !== "replace";

    if (!canMerge) {
      this.undoStack.push(this.snapshot());
    }

    this.redoStack = [];
    this.lastMutationKind = options.kind;
    this.lastMutationGroup = group;
    this.lastMutationAt = now;
  }
}

export class TextareaViewportModel {
  readonly width: number;
  readonly wrapMode: WrapMode;
  readonly rows: TextareaVisualRow[];
  readonly contentWidth: number;

  constructor(text: string, width: number, wrapMode: WrapMode = "word") {
    this.width = Math.max(1, width);
    this.wrapMode = wrapMode;
    this.rows = layoutTextareaRows(text, this.width, this.wrapMode);
    this.contentWidth = this.rows.reduce((max, row) => Math.max(max, row.width), 0);
  }

  get contentHeight(): number {
    return this.rows.length;
  }

  getMaxScrollY(viewportHeight: number): number {
    return Math.max(0, this.contentHeight - Math.max(1, viewportHeight));
  }

  getMaxScrollX(viewportWidth: number): number {
    if (this.wrapMode !== "none") {
      return 0;
    }

    return Math.max(0, this.contentWidth - Math.max(1, viewportWidth));
  }

  locateIndex(index: number): { row: number; x: number } {
    const safeIndex = Math.max(0, index);

    for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex += 1) {
      const row = this.rows[rowIndex];
      const next = this.rows[rowIndex + 1];

      if (!row) {
        continue;
      }

      if (
        safeIndex < row.end ||
        (safeIndex === row.end &&
          (!next ||
            next.logicalLine !== row.logicalLine ||
            next.start !== row.end ||
            row.start === row.end))
      ) {
        return {
          row: rowIndex,
          x: cursorColumnForRow(row, safeIndex),
        };
      }
    }

    const last = this.rows.at(-1) ?? {
      width: 0,
    };

    return {
      row: Math.max(0, this.rows.length - 1),
      x: last.width,
    };
  }

  moveIndexVertically(
    index: number,
    preferredX: number | null | undefined,
    delta: number,
  ): { index: number; preferredX: number } {
    const current = this.locateIndex(index);
    const targetRowIndex = clampIndex(current.row + delta, Math.max(0, this.rows.length - 1));
    const targetRow = this.rows[targetRowIndex] ??
      this.rows[current.row] ?? {
        index: 0,
        logicalLine: 0,
        start: 0,
        end: 0,
        width: 0,
        cells: [],
      };
    const targetX = preferredX ?? current.x;

    return {
      index: indexForColumnInRow(targetRow, targetX),
      preferredX: targetX,
    };
  }

  indexFromPoint(x: number, y: number, scrollX: number, scrollY: number): number {
    const rowIndex = clampIndex(scrollY + y, Math.max(0, this.rows.length - 1));
    const row = this.rows[rowIndex];

    if (!row) {
      return 0;
    }

    return indexForColumnInRow(row, x + (this.wrapMode === "none" ? scrollX : 0));
  }
}

export interface TextareaPresentationState {
  displayState: TextareaDisplayState;
  viewport: TextareaViewportModel;
}

export interface TextareaScrollbarRenderState {
  thumbLength: number;
  thumbStart: number;
}

export interface TextareaCursorRenderState {
  row: number;
  x: number;
}

export interface TextareaRenderOptions {
  focused: boolean;
  placeholder?: string;
  showScrollbars?: boolean;
  visibleHeight: number;
  visibleWidth: number;
}

export interface TextareaRenderState {
  contentViewport: TextareaViewportModel;
  cursor: TextareaCursorRenderState | null;
  displayState: TextareaDisplayState;
  horizontalScrollbar: TextareaScrollbarRenderState | null;
  placeholderVisible: boolean;
  selection: TextSelection | null;
  verticalScrollbar: TextareaScrollbarRenderState | null;
  viewport: TextareaViewportModel;
}

export interface TextareaKeyInput {
  key: string;
  modifiers: EventModifiers;
  text?: string;
}

export type TextareaSubmitMode =
  | "none"
  | "enter"
  | "mod-enter"
  | "ctrl-enter"
  | "meta-enter"
  | "shift-enter";

export interface TextareaPointerInput {
  extendSelection: boolean;
  localX: number;
  localY: number;
  phase: "end" | "move" | "start";
  visibleHeight: number;
  visibleWidth: number;
}

export interface TextareaInteractionOptions extends TextareaDocumentInsertOptions {
  clipboardBindings?: ClipboardShortcutProfile;
  submitMode?: TextareaSubmitMode;
  submitOnCtrlEnter?: boolean;
  tabString?: string;
  visibleHeight: number;
  visibleWidth: number;
}

export interface TextareaInteractionResult {
  handled: boolean;
  preventDefault: boolean;
  valueChanged: boolean;
  clipboardWriteText?: string;
  invalidateReason?: string;
  requestClipboardRead?: boolean;
  submitValue?: string;
}

export class TextareaViewportState {
  scrollY = 0;
  scrollX = 0;
  preferredCursorX: number | null = null;

  getScrollPosition(): { x: number; y: number } {
    return {
      x: this.scrollX,
      y: this.scrollY,
    };
  }

  reset(): this {
    this.scrollX = 0;
    this.scrollY = 0;
    this.preferredCursorX = null;
    return this;
  }

  clearPreferredCursorX(): this {
    this.preferredCursorX = null;
    return this;
  }

  setPreferredCursorX(value: number | null): this {
    this.preferredCursorX = value;
    return this;
  }

  setScrollY(value: number, viewport: TextareaViewportModel, visibleHeight: number): this {
    this.scrollY = clampIndex(value, viewport.getMaxScrollY(Math.max(1, visibleHeight)));
    return this;
  }

  setScrollX(value: number, viewport: TextareaViewportModel, visibleWidth: number): this {
    if (viewport.wrapMode !== "none") {
      this.scrollX = 0;
      return this;
    }

    this.scrollX = clampIndex(value, viewport.getMaxScrollX(Math.max(1, visibleWidth)));
    return this;
  }

  clamp(viewport: TextareaViewportModel, visibleWidth: number, visibleHeight: number): this {
    this.setScrollY(this.scrollY, viewport, visibleHeight);
    this.setScrollX(this.scrollX, viewport, visibleWidth);
    return this;
  }

  ensureCursorVisible(
    cursor: { row: number; x: number },
    viewport: TextareaViewportModel,
    visibleWidth: number,
    visibleHeight: number,
  ): this {
    const safeVisibleHeight = Math.max(1, visibleHeight);

    if (cursor.row < this.scrollY) {
      this.scrollY = cursor.row;
    } else if (cursor.row >= this.scrollY + safeVisibleHeight) {
      this.scrollY = cursor.row - safeVisibleHeight + 1;
    }

    if (viewport.wrapMode === "none") {
      const safeVisibleWidth = Math.max(1, visibleWidth);

      if (cursor.x < this.scrollX) {
        this.scrollX = cursor.x;
      } else if (cursor.x >= this.scrollX + safeVisibleWidth) {
        this.scrollX = cursor.x - safeVisibleWidth + 1;
      }
    } else {
      this.scrollX = 0;
    }

    return this.clamp(viewport, visibleWidth, visibleHeight);
  }
}

export class TextareaControllerModel {
  readonly document: TextareaDocumentModel;
  readonly viewportState: TextareaViewportState;

  wrapMode: WrapMode;

  private dragSelecting = false;

  constructor(initialValue = "", wrapMode: WrapMode = "word") {
    this.document = new TextareaDocumentModel(initialValue);
    this.viewportState = new TextareaViewportState();
    this.wrapMode = wrapMode;
  }

  get scrollY(): number {
    return this.viewportState.scrollY;
  }

  get scrollX(): number {
    return this.viewportState.scrollX;
  }

  getCursorLocation(): { line: number; column: number } {
    return this.document.getCursorLocation();
  }

  getScrollPosition(): { x: number; y: number } {
    return this.viewportState.getScrollPosition();
  }

  getSelection(): TextSelection | null {
    return this.document.getSelection();
  }

  getSelectedText(): string {
    return this.document.getSelectedText();
  }

  getPresentationState(visibleWidth: number): TextareaPresentationState {
    const displayState = this.document.getDisplayState();

    return {
      displayState,
      viewport: new TextareaViewportModel(
        displayState.value,
        Math.max(1, visibleWidth),
        this.wrapMode,
      ),
    };
  }

  getRenderState(options: TextareaRenderOptions): TextareaRenderState {
    const state = this.getPresentationState(options.visibleWidth);
    const placeholder = options.placeholder ?? "";
    const placeholderVisible = this.shouldRenderPlaceholder(options.focused, placeholder);
    const contentViewport = placeholderVisible
      ? new TextareaViewportModel(placeholder, Math.max(1, options.visibleWidth), this.wrapMode)
      : state.viewport;
    const selection =
      options.focused && !placeholderVisible
        ? state.displayState.selectionToDisplay(this.document.getSelection())
        : null;
    const cursor =
      options.focused && !placeholderVisible
        ? state.viewport.locateIndex(
            state.displayState.actualToDisplay(this.document.getCursorIndex()),
          )
        : null;

    return {
      contentViewport,
      cursor,
      displayState: state.displayState,
      horizontalScrollbar: this.getHorizontalScrollbarState(
        contentViewport,
        options.visibleWidth,
        options.showScrollbars ?? true,
      ),
      placeholderVisible,
      selection,
      verticalScrollbar: this.getVerticalScrollbarState(
        contentViewport,
        options.visibleHeight,
        options.showScrollbars ?? true,
      ),
      viewport: state.viewport,
    };
  }

  getCursorDisplayLocation(visibleWidth: number): { row: number; x: number } {
    const state = this.getPresentationState(visibleWidth);
    return state.viewport.locateIndex(
      state.displayState.actualToDisplay(this.document.getCursorIndex()),
    );
  }

  resetViewport(): this {
    this.dragSelecting = false;
    this.viewportState.reset();
    return this;
  }

  cancelPointerSelection(): this {
    this.dragSelecting = false;
    return this;
  }

  setWrapMode(mode: WrapMode, visibleWidth?: number, visibleHeight?: number): this {
    this.wrapMode = mode;
    this.dragSelecting = false;
    this.viewportState.clearPreferredCursorX();

    if (mode !== "none") {
      this.viewportState.scrollX = 0;
    }

    if (typeof visibleWidth === "number") {
      this.clampToViewport(visibleWidth, visibleHeight ?? 1);
    }

    return this;
  }

  setScrollY(value: number, visibleWidth: number, visibleHeight: number): this {
    const state = this.getPresentationState(visibleWidth);
    this.viewportState.setScrollY(value, state.viewport, visibleHeight);
    return this;
  }

  setScrollX(value: number, visibleWidth: number): this {
    const state = this.getPresentationState(visibleWidth);
    this.viewportState.setScrollX(value, state.viewport, visibleWidth);
    return this;
  }

  clampToViewport(visibleWidth: number, visibleHeight: number): this {
    const state = this.getPresentationState(visibleWidth);
    this.viewportState.clamp(state.viewport, visibleWidth, visibleHeight);
    return this;
  }

  ensureCursorVisible(visibleWidth: number, visibleHeight: number): this {
    const state = this.getPresentationState(visibleWidth);
    const cursor = state.viewport.locateIndex(
      state.displayState.actualToDisplay(this.document.getCursorIndex()),
    );
    this.viewportState.ensureCursorVisible(cursor, state.viewport, visibleWidth, visibleHeight);
    return this;
  }

  selectAll(visibleWidth: number, visibleHeight: number): TextareaInteractionResult {
    this.document.selectAll();
    this.viewportState.clearPreferredCursorX();
    this.ensureCursorVisible(visibleWidth, visibleHeight);
    return this.createInteractionResult({
      handled: true,
      invalidateReason: "textarea:select-all",
    });
  }

  clearSelection(): TextareaInteractionResult {
    this.document.clearSelection();
    this.viewportState.clearPreferredCursorX();
    return this.createInteractionResult({
      handled: true,
      invalidateReason: "textarea:clear-selection",
    });
  }

  undo(visibleWidth: number, visibleHeight: number): TextareaInteractionResult {
    const changed = this.document.undo();

    if (changed) {
      this.ensureCursorVisible(visibleWidth, visibleHeight);
    }

    return this.createInteractionResult({
      handled: true,
      invalidateReason: changed ? "textarea:undo" : undefined,
      valueChanged: changed,
    });
  }

  redo(visibleWidth: number, visibleHeight: number): TextareaInteractionResult {
    const changed = this.document.redo();

    if (changed) {
      this.ensureCursorVisible(visibleWidth, visibleHeight);
    }

    return this.createInteractionResult({
      handled: true,
      invalidateReason: changed ? "textarea:redo" : undefined,
      valueChanged: changed,
    });
  }

  copySelection(): TextareaInteractionResult {
    this.document.expandSelectionAcrossSummary();
    const selectedText = this.document.getSelectedText();
    return this.createInteractionResult({
      clipboardWriteText: selectedText.length > 0 ? selectedText : undefined,
      handled: true,
      invalidateReason: selectedText.length > 0 ? "textarea:copy-selection" : undefined,
    });
  }

  cutSelection(visibleWidth: number, visibleHeight: number): TextareaInteractionResult {
    this.document.expandSelectionAcrossSummary();
    const selectedText = this.document.getSelectedText();

    if (selectedText.length === 0) {
      return this.createInteractionResult({
        handled: true,
      });
    }

    const changed = this.document.deleteSelection();

    if (changed) {
      this.ensureCursorVisible(visibleWidth, visibleHeight);
    }

    return this.createInteractionResult({
      clipboardWriteText: selectedText,
      handled: true,
      invalidateReason: changed ? "textarea:cut-selection" : undefined,
      valueChanged: changed,
    });
  }

  moveLeft(extendSelection = false): this {
    this.document.moveLeft(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveRight(extendSelection = false): this {
    this.document.moveRight(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveWordLeft(extendSelection = false): this {
    this.document.moveWordLeft(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveWordRight(extendSelection = false): this {
    this.document.moveWordRight(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveHome(extendSelection = false): this {
    this.document.moveHome(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveEnd(extendSelection = false): this {
    this.document.moveEnd(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveDocumentStart(extendSelection = false): this {
    this.document.moveDocumentStart(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveDocumentEnd(extendSelection = false): this {
    this.document.moveDocumentEnd(extendSelection);
    this.viewportState.clearPreferredCursorX();
    return this;
  }

  moveVertical(
    delta: number,
    extendSelection: boolean,
    visibleWidth: number,
    visibleHeight: number,
  ): this {
    this.document.snapCursorOutsideSummary(delta < 0 ? "start" : "end");
    const state = this.getPresentationState(visibleWidth);
    const next = state.viewport.moveIndexVertically(
      state.displayState.actualToDisplay(this.document.getCursorIndex()),
      this.viewportState.preferredCursorX,
      delta,
    );

    this.document.setCursor(state.displayState.displayToActual(next.index), extendSelection);
    this.viewportState.setPreferredCursorX(next.preferredX);
    this.viewportState.ensureCursorVisible(
      state.viewport.locateIndex(next.index),
      state.viewport,
      visibleWidth,
      visibleHeight,
    );
    return this;
  }

  movePage(
    delta: -1 | 1,
    extendSelection: boolean,
    visibleWidth: number,
    visibleHeight: number,
  ): this {
    return this.moveVertical(
      delta * Math.max(1, visibleHeight - 1),
      extendSelection,
      visibleWidth,
      visibleHeight,
    );
  }

  backspace(): boolean {
    const changed = this.document.backspace();
    this.viewportState.clearPreferredCursorX();
    return changed;
  }

  deleteForward(): boolean {
    const changed = this.document.deleteForward();
    this.viewportState.clearPreferredCursorX();
    return changed;
  }

  insert(value: string, options: TextareaDocumentInsertOptions = {}): boolean {
    const changed = this.document.insert(value, options);
    this.viewportState.clearPreferredCursorX();
    return changed;
  }

  handlePasteText(text: string, options: TextareaInteractionOptions): TextareaInteractionResult {
    if (text.length === 0) {
      return this.createInteractionResult({
        handled: true,
        preventDefault: true,
      });
    }

    const changed = this.insert(text, {
      allowUndoMerge: options.allowUndoMerge,
      pasteSummaryLineThreshold: options.pasteSummaryLineThreshold,
      pasteSummaryThreshold: options.pasteSummaryThreshold,
      source: "paste",
      summarizePastedText: options.summarizePastedText,
      transactionGroup: options.transactionGroup,
    });
    this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);

    return this.createInteractionResult({
      handled: true,
      invalidateReason: changed ? "textarea:insert" : undefined,
      preventDefault: true,
      valueChanged: changed,
    });
  }

  handleKeyInput(
    input: TextareaKeyInput,
    options: TextareaInteractionOptions,
  ): TextareaInteractionResult {
    const commandKey = input.key.length === 1 ? input.key.toLowerCase() : input.key;

    switch (commandKey) {
      case "ArrowLeft":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          this.moveWordLeft(input.modifiers.shift);
        } else {
          this.moveLeft(input.modifiers.shift);
        }
        this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:key",
          preventDefault: true,
        });
      case "ArrowRight":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          this.moveWordRight(input.modifiers.shift);
        } else {
          this.moveRight(input.modifiers.shift);
        }
        this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:key",
          preventDefault: true,
        });
      case "ArrowUp":
        this.moveVertical(-1, input.modifiers.shift, options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:vertical-move",
          preventDefault: true,
        });
      case "ArrowDown":
        this.moveVertical(1, input.modifiers.shift, options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:vertical-move",
          preventDefault: true,
        });
      case "PageUp":
        this.movePage(-1, input.modifiers.shift, options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:page-move",
          preventDefault: true,
        });
      case "PageDown":
        this.movePage(1, input.modifiers.shift, options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:page-move",
          preventDefault: true,
        });
      case "Home":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          this.moveDocumentStart(input.modifiers.shift);
        } else {
          this.moveHome(input.modifiers.shift);
        }
        this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:key",
          preventDefault: true,
        });
      case "End":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          this.moveDocumentEnd(input.modifiers.shift);
        } else {
          this.moveEnd(input.modifiers.shift);
        }
        this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:key",
          preventDefault: true,
        });
      case "Backspace": {
        const changed = this.backspace();

        if (changed) {
          this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        }

        return this.createInteractionResult({
          handled: true,
          invalidateReason: changed ? "textarea:key" : undefined,
          preventDefault: true,
          valueChanged: changed,
        });
      }
      case "Delete": {
        const changed = this.deleteForward();

        if (changed) {
          this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);
        }

        return this.createInteractionResult({
          handled: true,
          invalidateReason: changed ? "textarea:key" : undefined,
          preventDefault: true,
          valueChanged: changed,
        });
      }
      case "a":
        if (this.matchesShortcut(input.modifiers, "copy", options.clipboardBindings)) {
          return {
            ...this.selectAll(options.visibleWidth, options.visibleHeight),
            preventDefault: true,
          };
        }
        break;
      case "c":
        if (this.matchesShortcut(input.modifiers, "copy", options.clipboardBindings)) {
          return {
            ...this.copySelection(),
            preventDefault: true,
          };
        }
        break;
      case "x":
        if (this.matchesShortcut(input.modifiers, "cut", options.clipboardBindings)) {
          return {
            ...this.cutSelection(options.visibleWidth, options.visibleHeight),
            preventDefault: true,
          };
        }
        break;
      case "z":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          return {
            ...(input.modifiers.shift
              ? this.redo(options.visibleWidth, options.visibleHeight)
              : this.undo(options.visibleWidth, options.visibleHeight)),
            preventDefault: true,
          };
        }
        break;
      case "v":
        if (this.matchesShortcut(input.modifiers, "paste", options.clipboardBindings)) {
          return this.createInteractionResult({
            handled: true,
            preventDefault: true,
            requestClipboardRead: true,
          });
        }
        break;
      case "y":
        if (input.modifiers.ctrl || input.modifiers.meta) {
          return {
            ...this.redo(options.visibleWidth, options.visibleHeight),
            preventDefault: true,
          };
        }
        break;
      case "Enter":
        if (this.matchesSubmitShortcut(input.modifiers, options)) {
          return this.createInteractionResult({
            handled: true,
            preventDefault: true,
            submitValue: this.document.getText(),
          });
        }

        return this.insertText("\n", options);
      case "Tab":
        return this.insertText(options.tabString ?? "  ", options);
      default:
        break;
    }

    if (input.text && this.shouldInsertPrintableText(input.modifiers)) {
      return this.insertText(input.text, options);
    }

    return this.createInteractionResult({
      handled: false,
    });
  }

  beginPointerSelection(
    localX: number,
    localY: number,
    extendSelection: boolean,
    visibleWidth: number,
    visibleHeight: number,
  ): number {
    const index = this.resolveDisplayPointToActualIndex(localX, localY, visibleWidth);
    this.dragSelecting = true;
    this.document.setCursor(index, extendSelection);
    this.viewportState.clearPreferredCursorX();
    this.ensureCursorVisible(visibleWidth, visibleHeight);
    return index;
  }

  updatePointerSelection(
    localX: number,
    localY: number,
    visibleWidth: number,
    visibleHeight: number,
  ): number | null {
    if (!this.dragSelecting) {
      return null;
    }

    const index = this.resolveDisplayPointToActualIndex(localX, localY, visibleWidth);
    this.document.setCursor(index, true);
    this.ensureCursorVisible(visibleWidth, visibleHeight);
    return index;
  }

  endPointerSelection(): boolean {
    const wasDragging = this.dragSelecting;
    this.dragSelecting = false;
    return wasDragging;
  }

  handlePointerInput(input: TextareaPointerInput): TextareaInteractionResult {
    switch (input.phase) {
      case "start":
        this.beginPointerSelection(
          input.localX,
          input.localY,
          input.extendSelection,
          input.visibleWidth,
          input.visibleHeight,
        );
        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:mouse-down",
          preventDefault: true,
        });
      case "move": {
        const changed = this.updatePointerSelection(
          input.localX,
          input.localY,
          input.visibleWidth,
          input.visibleHeight,
        );

        if (changed === null) {
          return this.createInteractionResult({
            handled: false,
          });
        }

        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:drag-select",
          preventDefault: true,
        });
      }
      case "end":
        if (!this.endPointerSelection()) {
          return this.createInteractionResult({
            handled: false,
          });
        }

        return this.createInteractionResult({
          handled: true,
          invalidateReason: "textarea:drag-end",
          preventDefault: true,
        });
    }
  }

  private resolveDisplayPointToActualIndex(
    localX: number,
    localY: number,
    visibleWidth: number,
  ): number {
    const state = this.getPresentationState(visibleWidth);
    const displayIndex = state.viewport.indexFromPoint(
      localX,
      localY,
      this.viewportState.scrollX,
      this.viewportState.scrollY,
    );
    return state.displayState.displayToActual(displayIndex);
  }

  private insertText(
    value: string,
    options: TextareaInteractionOptions,
  ): TextareaInteractionResult {
    const changed = this.insert(value, {
      allowUndoMerge: options.allowUndoMerge,
      pasteSummaryLineThreshold: options.pasteSummaryLineThreshold,
      pasteSummaryThreshold: options.pasteSummaryThreshold,
      source: "type",
      summarizePastedText: options.summarizePastedText,
      transactionGroup: options.transactionGroup,
    });
    this.ensureCursorVisible(options.visibleWidth, options.visibleHeight);

    return this.createInteractionResult({
      handled: true,
      invalidateReason: changed ? "textarea:insert" : undefined,
      preventDefault: true,
      valueChanged: changed,
    });
  }

  private createInteractionResult(
    result: Partial<TextareaInteractionResult> & Pick<TextareaInteractionResult, "handled">,
  ): TextareaInteractionResult {
    return {
      handled: result.handled,
      preventDefault: result.preventDefault ?? false,
      valueChanged: result.valueChanged ?? false,
      clipboardWriteText: result.clipboardWriteText,
      invalidateReason: result.invalidateReason,
      requestClipboardRead: result.requestClipboardRead,
      submitValue: result.submitValue,
    };
  }

  private shouldRenderPlaceholder(focused: boolean, placeholder: string): boolean {
    return !focused && this.document.getText().length === 0 && placeholder.length > 0;
  }

  private shouldInsertPrintableText(modifiers: EventModifiers): boolean {
    if (modifiers.meta) {
      return false;
    }

    if (modifiers.alt && !modifiers.ctrl) {
      return false;
    }

    return !(modifiers.ctrl && !modifiers.alt);
  }

  private resolveSubmitMode(options: TextareaInteractionOptions): TextareaSubmitMode {
    if (options.submitMode) {
      return options.submitMode;
    }

    return options.submitOnCtrlEnter ? "mod-enter" : "none";
  }

  private matchesSubmitShortcut(
    modifiers: EventModifiers,
    options: TextareaInteractionOptions,
  ): boolean {
    switch (this.resolveSubmitMode(options)) {
      case "enter":
        return !modifiers.ctrl && !modifiers.meta && !modifiers.alt && !modifiers.shift;
      case "ctrl-enter":
        return modifiers.ctrl;
      case "meta-enter":
        return modifiers.meta;
      case "mod-enter":
        return modifiers.ctrl || modifiers.meta;
      case "shift-enter":
        return modifiers.shift;
      default:
        return false;
    }
  }

  private matchesShortcut(
    modifiers: EventModifiers,
    action: keyof ClipboardShortcutProfile,
    bindings?: ClipboardShortcutProfile,
  ): boolean {
    const modifier = bindings?.[action];

    if (modifier === "meta") {
      return modifiers.meta;
    }

    if (modifier === "ctrl") {
      return modifiers.ctrl;
    }

    return modifiers.ctrl || modifiers.meta;
  }

  private getVerticalScrollbarState(
    viewport: TextareaViewportModel,
    visibleHeight: number,
    showScrollbars: boolean,
  ): TextareaScrollbarRenderState | null {
    if (!showScrollbars) {
      return null;
    }

    const maxScrollY = viewport.getMaxScrollY(visibleHeight);

    if (maxScrollY <= 0) {
      return null;
    }

    const trackHeight = Math.max(1, visibleHeight);
    const thumbLength = Math.max(
      1,
      Math.floor((visibleHeight / Math.max(1, viewport.contentHeight)) * trackHeight),
    );
    const thumbStart = Math.min(
      Math.max(0, trackHeight - thumbLength),
      Math.floor((this.scrollY / Math.max(1, maxScrollY)) * Math.max(0, trackHeight - thumbLength)),
    );

    return {
      thumbLength,
      thumbStart,
    };
  }

  private getHorizontalScrollbarState(
    viewport: TextareaViewportModel,
    visibleWidth: number,
    showScrollbars: boolean,
  ): TextareaScrollbarRenderState | null {
    if (!showScrollbars) {
      return null;
    }

    const maxScrollX = viewport.getMaxScrollX(visibleWidth);

    if (maxScrollX <= 0) {
      return null;
    }

    const trackWidth = Math.max(1, visibleWidth);
    const thumbLength = Math.max(
      1,
      Math.floor((visibleWidth / Math.max(1, viewport.contentWidth)) * trackWidth),
    );
    const thumbStart = Math.min(
      Math.max(0, trackWidth - thumbLength),
      Math.floor((this.scrollX / Math.max(1, maxScrollX)) * Math.max(0, trackWidth - thumbLength)),
    );

    return {
      thumbLength,
      thumbStart,
    };
  }
}

export function splitGraphemes(value: string): string[] {
  if (value.length === 0) {
    return [];
  }

  if (!graphemeSegmenter) {
    return Array.from(value);
  }

  return [...graphemeSegmenter.segment(value)].map((segment) => segment.segment);
}

export function graphemeCount(value: string): number {
  return splitGraphemes(value).length;
}

export function measureTextWidth(value: string): number {
  return splitGraphemes(value).reduce(
    (total, grapheme) => total + measureGraphemeWidth(grapheme),
    0,
  );
}

export function measureGraphemeWidth(grapheme: string): number {
  if (grapheme === "" || grapheme === "\n") {
    return 0;
  }

  if (grapheme === "\t") {
    return 2;
  }

  if (grapheme.includes("\u200d") || emojiPattern.test(grapheme)) {
    return 2;
  }

  const codePoints = [...grapheme];

  for (const codePoint of codePoints) {
    if (combiningPattern.test(codePoint) || codePoint === "\ufe0f") {
      continue;
    }

    const value = codePoint.codePointAt(0) ?? 0;

    if (isWideCodePoint(value)) {
      return 2;
    }
  }

  return 1;
}

export function wrapText(
  content: string | TextSpan[],
  maxWidth: number,
  mode: WrapMode = "none",
): WrappedLine[] {
  const spans = normalizeTextSpans(content);
  const lines: WrappedLine[] = [];

  if (maxWidth <= 0) {
    return [{ spans: [], plainText: "", width: 0 }];
  }

  for (const sourceLine of splitSpanLines(spans)) {
    if (mode === "none") {
      const clipped = clipSegmentsToWidth(sourceLine, maxWidth);
      lines.push(materializeWrappedLine(clipped));
      continue;
    }

    const words =
      mode === "word" ? segmentByWord(sourceLine) : sourceLine.map((segment) => [segment]);
    let row: StyledGrapheme[] = [];
    let rowWidth = 0;
    let wrappedContinuation = false;

    for (const originalToken of words) {
      let token =
        mode === "word" && wrappedContinuation
          ? trimLeadingWhitespaceSegments(originalToken)
          : originalToken;

      if (token.length === 0) {
        continue;
      }

      let tokenWidth = measureSegmentsWidth(token);

      if (tokenWidth > maxWidth && mode === "word") {
        const broken = rewrapSegments(token, maxWidth);

        for (const originalPiece of broken) {
          let piece = wrappedContinuation
            ? trimLeadingWhitespaceSegments(originalPiece)
            : originalPiece;

          if (piece.length === 0) {
            continue;
          }

          let pieceWidth = measureSegmentsWidth(piece);

          if (row.length > 0 && rowWidth + pieceWidth > maxWidth) {
            lines.push(materializeWrappedLine(trimTrailingWhitespaceSegments(row)));
            row = [];
            rowWidth = 0;
            wrappedContinuation = true;
            piece = trimLeadingWhitespaceSegments(piece);
            if (piece.length === 0) {
              continue;
            }
            pieceWidth = measureSegmentsWidth(piece);
          }

          row.push(...piece);
          rowWidth += pieceWidth;
          wrappedContinuation = false;

          if (rowWidth >= maxWidth) {
            lines.push(materializeWrappedLine(trimTrailingWhitespaceSegments(row)));
            row = [];
            rowWidth = 0;
            wrappedContinuation = true;
          }
        }

        continue;
      }

      if (row.length > 0 && rowWidth + tokenWidth > maxWidth) {
        lines.push(materializeWrappedLine(trimTrailingWhitespaceSegments(row)));
        row = [];
        rowWidth = 0;
        wrappedContinuation = true;
        if (mode === "word") {
          token = trimLeadingWhitespaceSegments(token);
          if (token.length === 0) {
            continue;
          }
          tokenWidth = measureSegmentsWidth(token);
        }
      }

      row.push(...token);
      rowWidth += tokenWidth;
      wrappedContinuation = false;
    }

    lines.push(materializeWrappedLine(trimTrailingWhitespaceSegments(row)));
  }

  return lines.length > 0 ? lines : [{ spans: [], plainText: "", width: 0 }];
}

export function renderTextBlock(
  buffer: FrameBuffer,
  bounds: Rect,
  content: string | TextSpan[],
  options: RenderTextBlockOptions = {},
): void {
  const wrapped = wrapText(content, bounds.width, options.wrapMode ?? "none");

  for (let row = 0; row < Math.min(bounds.height, wrapped.length); row += 1) {
    let column = 0;

    for (const span of wrapped[row]?.spans ?? []) {
      const href = span.href ?? options.href;
      const fg = span.fg ?? options.fg;
      const bg = span.bg ?? options.bg;
      const graphemes = splitGraphemes(span.text);

      for (const grapheme of graphemes) {
        if (column >= bounds.width) {
          break;
        }

        buffer.drawText(bounds.x + column, bounds.y + row, grapheme, 1, {
          clip: options.clip,
          href,
          fg,
          bg,
        });
        column += measureGraphemeWidth(grapheme);
      }
    }
  }
}

export function normalizeTextSpans(content: string | TextSpan[], href?: string): TextSpan[] {
  if (typeof content === "string") {
    return [{ text: sanitizeRenderableText(content), href }];
  }

  return content.map((span) => ({
    text: sanitizeRenderableText(span.text),
    href: span.href ?? href,
    fg: span.fg,
    bg: span.bg,
  }));
}

export function createSelection(anchor: number, focus: number): TextSelection {
  return {
    anchor,
    focus,
    start: Math.min(anchor, focus),
    end: Math.max(anchor, focus),
  };
}

export function serializeSelection(value: string, selection: TextSelection | null): string {
  if (!selection) {
    return "";
  }

  return sliceByGrapheme(value, selection.start, selection.end);
}

export function sliceByGrapheme(value: string, start: number, end: number): string {
  const graphemes = splitGraphemes(value);
  return graphemes.slice(start, end).join("");
}

export function getTextLineMetas(value: string): TextLineMeta[] {
  const lines = value.split("\n");
  const meta: TextLineMeta[] = [];
  let offset = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const text = lines[index] ?? "";
    const length = graphemeCount(text);
    meta.push({
      index,
      start: offset,
      end: offset + length,
      length,
      text,
    });
    offset += length + 1;
  }

  if (meta.length === 0) {
    meta.push({
      index: 0,
      start: 0,
      end: 0,
      length: 0,
      text: "",
    });
  }

  return meta;
}

export function locateCursorInText(value: string, index: number): { line: number; column: number } {
  const clampedIndex = clampIndex(index, graphemeCount(value));
  const lines = getTextLineMetas(value);

  for (const line of lines) {
    if (clampedIndex <= line.end) {
      return {
        line: line.index,
        column: clampedIndex - line.start,
      };
    }
  }

  const last = lines.at(-1) ?? { index: 0, end: 0, start: 0 };
  return {
    line: last.index,
    column: last.end - last.start,
  };
}

function materializeWrappedLine(segments: StyledGrapheme[]): WrappedLine {
  const spans: TextSpan[] = [];

  for (const segment of segments) {
    const previous = spans.at(-1);

    if (
      previous &&
      previous.href === segment.href &&
      previous.fg === segment.fg &&
      previous.bg === segment.bg
    ) {
      previous.text += segment.grapheme;
    } else {
      spans.push({
        text: segment.grapheme,
        href: segment.href,
        fg: segment.fg,
        bg: segment.bg,
      });
    }
  }

  return {
    spans,
    plainText: spans.map((span) => span.text).join(""),
    width: segments.reduce((total, segment) => total + segment.width, 0),
  };
}

function sanitizeRenderableText(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return stripAnsiSequences(value)
    .replace(/\r/g, "")
    .replace(/\t/g, "  ")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/g, "");
}

function stripAnsiSequences(value: string): string {
  return value
    .replace(/\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001bP[\s\S]*?\u001b\\/g, "")
    .replace(/\u001b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

function layoutTextareaRows(
  value: string,
  maxWidth: number,
  wrapMode: WrapMode,
): TextareaVisualRow[] {
  const rows: TextareaVisualRow[] = [];
  let rowIndex = 0;

  for (const line of getTextLineMetas(value)) {
    const cells = createTextareaCells(line.text, line.start);

    if (wrapMode === "none") {
      rows.push(materializeTextareaRow(rowIndex++, line.index, cells, line.start));
      continue;
    }

    const wrapped =
      wrapMode === "word"
        ? wrapTextareaCellsByWord(cells, Math.max(1, maxWidth))
        : wrapTextareaCellsByCharacter(cells, Math.max(1, maxWidth));

    if (wrapped.length === 0) {
      rows.push(materializeTextareaRow(rowIndex++, line.index, [], line.start));
      continue;
    }

    for (const wrappedRow of wrapped) {
      rows.push(materializeTextareaRow(rowIndex++, line.index, wrappedRow, line.start));
    }
  }

  if (rows.length === 0) {
    rows.push(materializeTextareaRow(0, 0, [], 0));
  }

  return rows;
}

function materializeTextareaRow(
  index: number,
  logicalLine: number,
  sourceCells: TextareaVisualCell[],
  fallbackIndex = 0,
): TextareaVisualRow {
  let x = 0;
  const cells = sourceCells.map((cell) => {
    const next = { ...cell, x };
    x += cell.width;
    return next;
  });

  const start = cells[0]?.index ?? fallbackIndex;
  const last = cells.at(-1);
  const end = last ? last.index + 1 : start;

  return {
    index,
    logicalLine,
    start,
    end,
    width: x,
    cells,
  };
}

function createTextareaCells(value: string, startIndex: number): TextareaVisualCell[] {
  return splitGraphemes(value).map((grapheme, offset) => ({
    grapheme,
    index: startIndex + offset,
    width: measureGraphemeWidth(grapheme),
    x: 0,
  }));
}

function wrapTextareaCellsByCharacter(
  cells: TextareaVisualCell[],
  maxWidth: number,
): TextareaVisualCell[][] {
  if (cells.length === 0) {
    return [[]];
  }

  const rows: TextareaVisualCell[][] = [];
  let current: TextareaVisualCell[] = [];
  let width = 0;

  for (const cell of cells) {
    if (current.length > 0 && width + cell.width > maxWidth) {
      rows.push(current);
      current = [];
      width = 0;
    }

    current.push(cell);
    width += cell.width;
  }

  if (current.length > 0) {
    rows.push(current);
  }

  return rows;
}

function wrapTextareaCellsByWord(
  cells: TextareaVisualCell[],
  maxWidth: number,
): TextareaVisualCell[][] {
  if (cells.length === 0) {
    return [[]];
  }

  const rows: TextareaVisualCell[][] = [];
  let current: TextareaVisualCell[] = [];
  let currentWidth = 0;

  for (const token of segmentTextareaCellsByWord(cells)) {
    const tokenWidth = token.reduce((total, cell) => total + cell.width, 0);

    if (current.length > 0 && currentWidth + tokenWidth > maxWidth) {
      rows.push(current);
      current = [];
      currentWidth = 0;
    }

    if (tokenWidth > maxWidth) {
      const broken = wrapTextareaCellsByCharacter(token, maxWidth);
      for (const piece of broken) {
        const pieceWidth = piece.reduce((total, cell) => total + cell.width, 0);

        if (current.length > 0 && currentWidth + pieceWidth > maxWidth) {
          rows.push(current);
          current = [];
          currentWidth = 0;
        }

        if (current.length > 0) {
          rows.push(current);
          current = [];
          currentWidth = 0;
        }

        current = [...piece];
        currentWidth = pieceWidth;
      }

      continue;
    }

    current.push(...token);
    currentWidth += tokenWidth;
  }

  if (current.length > 0) {
    rows.push(current);
  }

  return rows;
}

function segmentTextareaCellsByWord(cells: TextareaVisualCell[]): TextareaVisualCell[][] {
  const source = cells.map((cell) => cell.grapheme).join("");

  if (!wordSegmenter) {
    return segmentTextareaCellsNaively(cells);
  }

  const tokens: TextareaVisualCell[][] = [];
  let offset = 0;

  for (const token of wordSegmenter.segment(source)) {
    const length = graphemeCount(token.segment);
    tokens.push(cells.slice(offset, offset + length));
    offset += length;
  }

  return tokens.filter((token) => token.length > 0);
}

function segmentTextareaCellsNaively(cells: TextareaVisualCell[]): TextareaVisualCell[][] {
  const rows: TextareaVisualCell[][] = [];
  let current: TextareaVisualCell[] = [];

  for (const cell of cells) {
    current.push(cell);

    if (/\s/u.test(cell.grapheme)) {
      rows.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    rows.push(current);
  }

  return rows;
}

function cursorColumnForRow(row: TextareaVisualRow, index: number): number {
  if (index <= row.start) {
    return 0;
  }

  let column = 0;

  for (const cell of row.cells) {
    if (index <= cell.index) {
      return column;
    }

    column = cell.x + cell.width;

    if (index === cell.index + 1) {
      return column;
    }
  }

  return row.width;
}

function indexForColumnInRow(row: TextareaVisualRow, column: number): number {
  const target = Math.max(0, column);

  if (row.cells.length === 0 || target <= 0) {
    return row.start;
  }

  for (const cell of row.cells) {
    const midpoint = cell.x + Math.floor(cell.width / 2);

    if (target <= midpoint) {
      return cell.index;
    }

    if (target < cell.x + cell.width) {
      return cell.index + 1;
    }
  }

  return row.end;
}

function splitSpanLines(spans: TextSpan[]): StyledGrapheme[][] {
  const lines: StyledGrapheme[][] = [[]];

  for (const span of spans) {
    for (const grapheme of splitGraphemes(span.text)) {
      if (grapheme === "\n") {
        lines.push([]);
        continue;
      }

      lines[lines.length - 1]?.push({
        grapheme,
        width: measureGraphemeWidth(grapheme),
        href: span.href,
        fg: span.fg,
        bg: span.bg,
      });
    }
  }

  return lines;
}

function clipSegmentsToWidth(segments: StyledGrapheme[], maxWidth: number): StyledGrapheme[] {
  const next: StyledGrapheme[] = [];
  let width = 0;

  for (const segment of segments) {
    if (width + segment.width > maxWidth) {
      break;
    }

    next.push(segment);
    width += segment.width;
  }

  return next;
}

function rewrapSegments(segments: StyledGrapheme[], maxWidth: number): StyledGrapheme[][] {
  const rows: StyledGrapheme[][] = [];
  let current: StyledGrapheme[] = [];
  let width = 0;

  for (const segment of segments) {
    if (current.length > 0 && width + segment.width > maxWidth) {
      rows.push(current);
      current = [];
      width = 0;
    }

    current.push(segment);
    width += segment.width;
  }

  if (current.length > 0) {
    rows.push(current);
  }

  return rows;
}

function segmentByWord(segments: StyledGrapheme[]): StyledGrapheme[][] {
  const source = segments.map((segment) => segment.grapheme).join("");

  if (!wordSegmenter) {
    return naiveWordSegments(segments);
  }

  const tokens: StyledGrapheme[][] = [];
  let offset = 0;

  for (const word of wordSegmenter.segment(source)) {
    const graphemeLength = graphemeCount(word.segment);
    tokens.push(segments.slice(offset, offset + graphemeLength));
    offset += graphemeLength;
  }

  return mergeAdjacentWordTokens(tokens.filter((token) => token.length > 0));
}

function naiveWordSegments(segments: StyledGrapheme[]): StyledGrapheme[][] {
  const words: StyledGrapheme[][] = [];
  let current: StyledGrapheme[] = [];

  for (const segment of segments) {
    current.push(segment);

    if (segment.grapheme === " ") {
      words.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    words.push(current);
  }

  return mergeAdjacentWordTokens(words);
}

function mergeAdjacentWordTokens(tokens: StyledGrapheme[][]): StyledGrapheme[][] {
  const merged: StyledGrapheme[][] = [];

  for (const token of tokens) {
    const previous = merged.at(-1);
    if (previous && shouldAttachTokenToPrevious(token)) {
      previous.push(...token);
      continue;
    }

    merged.push([...token]);
  }

  return merged;
}

function shouldAttachTokenToPrevious(token: StyledGrapheme[]): boolean {
  const value = token.map((segment) => segment.grapheme).join("");
  return value.length > 0 && punctuationOrSymbolPattern.test(value);
}

function trimLeadingWhitespaceSegments(segments: StyledGrapheme[]): StyledGrapheme[] {
  let start = 0;

  while (start < segments.length) {
    const segment = segments[start];
    if (!segment || !isWhitespaceSegment(segment)) {
      break;
    }
    start += 1;
  }

  return segments.slice(start);
}

function trimTrailingWhitespaceSegments(segments: StyledGrapheme[]): StyledGrapheme[] {
  let end = segments.length;

  while (end > 0) {
    const segment = segments[end - 1];
    if (!segment || !isWhitespaceSegment(segment)) {
      break;
    }
    end -= 1;
  }

  return segments.slice(0, end);
}

function measureSegmentsWidth(segments: StyledGrapheme[]): number {
  return segments.reduce((total, segment) => total + segment.width, 0);
}

function isWhitespaceSegment(segment: StyledGrapheme): boolean {
  return /\s/u.test(segment.grapheme);
}

function currentLineMeta(value: string, cursorIndex: number): { start: number; end: number } {
  const lines = value.split("\n");
  let offset = 0;

  for (const line of lines) {
    const length = graphemeCount(line);
    const end = offset + length;

    if (cursorIndex <= end) {
      return { start: offset, end };
    }

    offset = end + 1;
  }

  return { start: 0, end: graphemeCount(value) };
}

function findPreviousWordBoundary(value: string, cursorIndex: number): number {
  const prefix = sliceByGrapheme(value, 0, cursorIndex).trimEnd();
  const graphemes = splitGraphemes(prefix);

  let index = graphemes.length;

  while (index > 0 && graphemes[index - 1] !== " " && graphemes[index - 1] !== "\n") {
    index -= 1;
  }

  return index;
}

function findNextWordBoundary(value: string, cursorIndex: number): number {
  const suffix = sliceByGrapheme(value, cursorIndex, graphemeCount(value));
  const graphemes = splitGraphemes(suffix);
  let index = 0;

  while (index < graphemes.length && graphemes[index] !== " " && graphemes[index] !== "\n") {
    index += 1;
  }

  while (index < graphemes.length && (graphemes[index] === " " || graphemes[index] === "\n")) {
    index += 1;
  }

  return cursorIndex + index;
}

function formatPasteSummaryLabel(charCount: number): string {
  return `[Pasted Content ${charCount} ${charCount === 1 ? "char" : "chars"}]`;
}

function identityTextareaDisplayState(value: string): TextareaDisplayState {
  return {
    value,
    actualToDisplay(index: number) {
      return index;
    },
    displayToActual(index: number) {
      return index;
    },
    selectionToDisplay(selection: TextSelection | null) {
      return selection;
    },
  };
}

function clampIndex(index: number, max: number): number {
  return Math.max(0, Math.min(max, index));
}

function isWideCodePoint(codePoint: number): boolean {
  return (
    codePoint >= 0x1100 &&
    (codePoint <= 0x115f ||
      codePoint === 0x2329 ||
      codePoint === 0x232a ||
      (codePoint >= 0x2e80 && codePoint <= 0xa4cf && codePoint !== 0x303f) ||
      (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
      (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
      (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
      (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
      (codePoint >= 0xff00 && codePoint <= 0xff60) ||
      (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
      (codePoint >= 0x1f300 && codePoint <= 0x1f64f) ||
      (codePoint >= 0x1f900 && codePoint <= 0x1f9ff) ||
      (codePoint >= 0x20000 && codePoint <= 0x3fffd))
  );
}

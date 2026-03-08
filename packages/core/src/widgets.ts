import type { RenderEvent } from "./events";
import { createSyntheticEvent } from "./events";
import {
  BoxRenderable,
  type BoxRenderableOptions,
  Renderable,
  type RenderContext,
  TextRenderable,
} from "./renderable";
import {
  EditingBuffer,
  type MultilineEditorBuffer,
  measureTextWidth,
  renderTextBlock,
  splitGraphemes,
  TextareaControllerModel,
  type TextareaDocumentModel,
  type TextSelection,
} from "./text";
import type { BaseLayoutProps, BaseStyleProps, Rect, Size, WrapMode } from "./types";

export interface InputRenderableOptions {
  value?: string;
  placeholder?: string;
  maxLength?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class InputRenderable extends BoxRenderable {
  readonly buffer: EditingBuffer;

  placeholder: string;
  maxLength?: number;
  focused = false;

  constructor(options: InputRenderableOptions = {}) {
    super({
      layout: options.layout,
      style: {
        border: true,
        focusable: true,
        ...options.style,
      },
    });
    this.placeholder = options.placeholder ?? "";
    this.maxLength = options.maxLength;
    this.buffer = new EditingBuffer(options.value ?? "");
  }

  getValue(): string {
    return this.buffer.getText();
  }

  setValue(value: string): this {
    const previousValue = this.getValue();
    this.buffer.setText(this.limitValue(value));
    this.emitChange(previousValue);
    this.invalidate("input:value");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("input:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("input:blur");
      return;
    }

    if (event.type === "paste") {
      this.insertValue(event.text);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const previousValue = this.getValue();

    switch (event.key) {
      case "ArrowLeft":
        this.buffer.moveLeft(event.modifiers.shift);
        break;
      case "ArrowRight":
        this.buffer.moveRight(event.modifiers.shift);
        break;
      case "Home":
        this.buffer.moveHome(event.modifiers.shift);
        break;
      case "End":
        this.buffer.moveEnd(event.modifiers.shift);
        break;
      case "Backspace":
        this.buffer.backspace();
        break;
      case "Delete":
        this.buffer.deleteForward();
        break;
      case "a":
        if (event.modifiers.ctrl || event.modifiers.meta) {
          this.buffer.selectAll();
          event.preventDefault();
          this.invalidate("input:select-all");
          return;
        }
        this.insertValue(event.text ?? event.key);
        event.preventDefault();
        return;
      case "Enter":
        this.emitSubmit(this.getValue());
        event.preventDefault();
        return;
      case "Tab":
        return;
      default:
        if (event.text && !event.modifiers.ctrl && !event.modifiers.meta) {
          this.insertValue(event.text);
          event.preventDefault();
          return;
        }
        return;
    }

    if (previousValue !== this.getValue()) {
      this.emitChange(previousValue);
    }

    this.invalidate("input:key");
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;
    const displayValue = this.renderDisplayValue();

    renderTextBlock(buffer, innerBounds, displayValue, {
      clip: clipRect,
      fg: this.focused
        ? (this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg)
        : this.styleProps.fg,
      bg: this.styleProps.bg,
      wrapMode: "none",
    });
  }

  private insertValue(value: string): void {
    const previousValue = this.getValue();
    this.buffer.insert(this.limitValue(value));

    if (previousValue !== this.getValue()) {
      this.emitChange(previousValue);
      this.invalidate("input:insert");
    }
  }

  private renderDisplayValue(): string {
    const value = this.getValue();

    if (!this.focused && value.length === 0) {
      return this.placeholder;
    }

    const graphemes = splitGraphemes(value);

    if (this.focused) {
      graphemes.splice(this.buffer.getCursorIndex(), 0, "|");
    }

    return graphemes.join("");
  }

  private emitChange(previousValue: string): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.getValue(),
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(value: string): void {
    const event = createSyntheticEvent({
      type: "submit",
      value,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }

  private limitValue(value: string): string {
    if (typeof this.maxLength !== "number") {
      return value;
    }

    return splitGraphemes(value).slice(0, this.maxLength).join("");
  }
}

export interface TextareaRenderableOptions extends InputRenderableOptions {
  wrapMode?: WrapMode;
  submitOnCtrlEnter?: boolean;
  showScrollbars?: boolean;
  tabString?: string;
  summarizePastedText?: boolean;
  pasteSummaryThreshold?: number;
  pasteSummaryLineThreshold?: number;
}

export class TextareaRenderable extends BoxRenderable {
  readonly controller: TextareaControllerModel;
  readonly document: TextareaDocumentModel;
  readonly buffer: MultilineEditorBuffer;

  placeholder: string;
  focused = false;
  submitOnCtrlEnter: boolean;
  showScrollbars: boolean;
  tabString: string;
  summarizePastedText: boolean;
  pasteSummaryThreshold: number;
  pasteSummaryLineThreshold: number;

  constructor(options: TextareaRenderableOptions = {}) {
    super({
      layout: options.layout,
      style: {
        border: true,
        focusable: true,
        ...options.style,
      },
    });
    this.placeholder = options.placeholder ?? "";
    this.submitOnCtrlEnter = options.submitOnCtrlEnter ?? true;
    this.showScrollbars = options.showScrollbars ?? true;
    this.tabString = options.tabString ?? "  ";
    this.summarizePastedText = options.summarizePastedText ?? false;
    this.pasteSummaryThreshold = Math.max(1, options.pasteSummaryThreshold ?? 1024);
    this.pasteSummaryLineThreshold = Math.max(2, options.pasteSummaryLineThreshold ?? 5);
    this.controller = new TextareaControllerModel(options.value ?? "", options.wrapMode ?? "word");
    this.document = this.controller.document;
    this.buffer = this.document.buffer;
  }

  get wrapMode(): WrapMode {
    return this.controller.wrapMode;
  }

  get scrollY(): number {
    return this.controller.scrollY;
  }

  get scrollX(): number {
    return this.controller.scrollX;
  }

  getValue(): string {
    return this.document.getText();
  }

  setValue(value: string): this {
    const previousValue = this.getValue();
    this.document.setText(value);
    this.controller.resetViewport();
    this.emitChange(previousValue);
    this.invalidate("textarea:value");
    return this;
  }

  getSelection(): TextSelection | null {
    return this.document.getSelection();
  }

  getSelectedText(): string {
    return this.document.getSelectedText();
  }

  getCursorLocation(): { line: number; column: number } {
    return this.controller.getCursorLocation();
  }

  getScrollPosition(): { x: number; y: number } {
    return this.controller.getScrollPosition();
  }

  selectAll(): this {
    this.applyInteractionResult(
      this.getValue(),
      this.controller.selectAll(this.viewportWidth(), this.viewportHeight()),
    );
    return this;
  }

  clearSelection(): this {
    this.applyInteractionResult(this.getValue(), this.controller.clearSelection());
    return this;
  }

  undo(): this {
    const previousValue = this.getValue();
    this.applyInteractionResult(
      previousValue,
      this.controller.undo(this.viewportWidth(), this.viewportHeight()),
    );
    return this;
  }

  redo(): this {
    const previousValue = this.getValue();
    this.applyInteractionResult(
      previousValue,
      this.controller.redo(this.viewportWidth(), this.viewportHeight()),
    );
    return this;
  }

  copySelection(): this {
    this.applyInteractionResult(this.getValue(), this.controller.copySelection());
    return this;
  }

  cutSelection(): this {
    const previousValue = this.getValue();
    this.applyInteractionResult(
      previousValue,
      this.controller.cutSelection(this.viewportWidth(), this.viewportHeight()),
    );
    return this;
  }

  setWrapMode(mode: WrapMode): this {
    this.controller.setWrapMode(mode, this.viewportWidth(), this.viewportHeight());
    this.controller.ensureCursorVisible(this.viewportWidth(), this.viewportHeight());
    this.invalidate("textarea:wrap-mode");
    return this;
  }

  setScrollY(value: number): this {
    this.controller.setScrollY(value, this.viewportWidth(), this.viewportHeight());
    this.invalidate("textarea:scroll-y");
    return this;
  }

  setScrollX(value: number): this {
    this.controller.setScrollX(value, this.viewportWidth());
    this.invalidate("textarea:scroll-x");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("textarea:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.controller.cancelPointerSelection();
      this.invalidate("textarea:blur");
      return;
    }

    if (event.type === "paste") {
      const previousValue = this.getValue();
      const result = this.controller.handlePasteText(event.text, this.interactionOptions());
      this.applyInteractionResult(previousValue, result);
      if (result.preventDefault) {
        event.preventDefault();
      }
      return;
    }

    if (event.type === "mouse") {
      this.handleMouseEvent(event);
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const previousValue = this.getValue();
    const result = this.controller.handleKeyInput(
      {
        key: event.key,
        modifiers: event.modifiers,
        text: event.text,
      },
      this.interactionOptions(),
    );
    this.applyInteractionResult(previousValue, result);
    if (result.preventDefault) {
      event.preventDefault();
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, innerBounds, clipRect } = this.layoutState;
    const fillChar = this.styleProps.backgroundChar ?? " ";
    const state = this.controller.getRenderState({
      focused: this.focused,
      placeholder: this.placeholder,
      showScrollbars: this.showScrollbars && this.hasBorder(),
      visibleHeight: this.viewportHeight(),
      visibleWidth: this.viewportWidth(),
    });
    const viewport = state.contentViewport;

    buffer.fill(
      {
        char: fillChar,
        fg: this.styleProps.fg,
        bg: this.styleProps.bg,
      },
      bounds,
      clipRect,
    );

    if (this.hasBorder()) {
      buffer.drawBorder(
        bounds,
        this.styleProps.title,
        {
          fg: this.styleProps.borderFg ?? this.styleProps.fg,
          bg: this.styleProps.bg,
          titleFg: this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg,
        },
        clipRect,
      );
    }

    for (let rowOffset = 0; rowOffset < this.viewportHeight(); rowOffset += 1) {
      const row = viewport.rows[this.scrollY + rowOffset];

      if (!row) {
        continue;
      }

      for (const cell of row.cells) {
        const localX = cell.x - (this.wrapMode === "none" ? this.scrollX : 0);

        if (localX < 0 || localX >= innerBounds.width) {
          continue;
        }

        const cellX = innerBounds.x + localX;
        const cellY = innerBounds.y + rowOffset;

        if (!containsPoint(clipRect, cellX, cellY)) {
          continue;
        }

        buffer.setCell(cellX, cellY, {
          char: cell.grapheme,
          fg: this.resolveCellFg(state.selection, cell.index, state.placeholderVisible),
          bg: this.resolveCellBg(state.selection, cell.index),
        });
      }
    }

    if (state.cursor) {
      const localX = state.cursor.x - (viewport.wrapMode === "none" ? this.scrollX : 0);
      const localY = state.cursor.row - this.scrollY;

      if (localY >= 0 && localY < innerBounds.height && localX >= 0 && localX < innerBounds.width) {
        const cursorX = innerBounds.x + localX;
        const cursorY = innerBounds.y + localY;

        if (!containsPoint(clipRect, cursorX, cursorY)) {
          return;
        }

        const existing = buffer.getCell(cursorX, cursorY);

        buffer.setCell(cursorX, cursorY, {
          char: existing?.char === " " || !existing?.char ? "|" : existing.char,
          fg: this.styleProps.titleFg ?? this.styleProps.borderFg ?? this.styleProps.fg,
          bg: "#2a1f18",
        });
      }
    }

    this.paintScrollbars(buffer, state, clipRect);
  }

  private handleMouseEvent(event: Extract<RenderEvent, { type: "mouse" }>): void {
    const alias = (event as RenderEvent & { alias?: string }).alias;

    if (event.action === "wheel") {
      return;
    }

    if (
      (event.action === "down" && event.button === "left") ||
      alias === "dragmove" ||
      alias === "dragend"
    ) {
      const { innerBounds } = this.layoutState;
      const localX = clampIndex(event.x - innerBounds.x, Math.max(0, innerBounds.width - 1));
      const localY = clampIndex(event.y - innerBounds.y, Math.max(0, innerBounds.height - 1));
      const phase =
        event.action === "down" && event.button === "left"
          ? "start"
          : alias === "dragmove"
            ? "move"
            : alias === "dragend"
              ? "end"
              : null;

      if (!phase) {
        return;
      }

      const result = this.controller.handlePointerInput({
        extendSelection: event.modifiers.shift,
        localX,
        localY,
        phase,
        visibleHeight: this.viewportHeight(),
        visibleWidth: this.viewportWidth(),
      });
      this.applyInteractionResult(this.getValue(), result);
      if (result.preventDefault) {
        event.preventDefault();
      }
    }
  }

  private viewportWidth(): number {
    const fallback =
      typeof this.layoutProps.width === "number"
        ? this.layoutProps.width - (this.hasBorder() ? 2 : 0)
        : 32;
    return Math.max(1, this.layoutState.innerBounds.width || fallback);
  }

  private viewportHeight(): number {
    const fallback =
      typeof this.layoutProps.height === "number"
        ? this.layoutProps.height - (this.hasBorder() ? 2 : 0)
        : 8;
    return Math.max(1, this.layoutState.innerBounds.height || fallback);
  }

  private resolveCellFg(
    selection: TextSelection | null,
    index: number,
    placeholderVisible: boolean,
  ): string | undefined {
    if (selection && index >= selection.start && index < selection.end) {
      return "#0f0b09";
    }

    if (placeholderVisible) {
      return this.styleProps.borderFg ?? this.styleProps.fg;
    }

    return this.styleProps.fg;
  }

  private resolveCellBg(selection: TextSelection | null, index: number): string | undefined {
    if (selection && index >= selection.start && index < selection.end) {
      return "#f0d27a";
    }

    return this.styleProps.bg;
  }

  private paintScrollbars(
    buffer: RenderContext["buffer"],
    state: ReturnType<TextareaControllerModel["getRenderState"]>,
    clipRect: Rect,
  ): void {
    if (!this.showScrollbars || !this.hasBorder()) {
      return;
    }

    const { bounds } = this.layoutState;
    const color = this.styleProps.borderFg ?? this.styleProps.titleFg ?? this.styleProps.fg;

    if (state.verticalScrollbar && bounds.height > 2) {
      for (let offset = 0; offset < state.verticalScrollbar.thumbLength; offset += 1) {
        const x = bounds.x + bounds.width - 1;
        const y = bounds.y + 1 + state.verticalScrollbar.thumbStart + offset;

        if (!containsPoint(clipRect, x, y)) {
          continue;
        }

        buffer.setCell(x, y, {
          char: "┃",
          fg: color,
          bg: this.styleProps.bg,
        });
      }
    }

    if (state.horizontalScrollbar && bounds.width > 2) {
      for (let offset = 0; offset < state.horizontalScrollbar.thumbLength; offset += 1) {
        const x = bounds.x + 1 + state.horizontalScrollbar.thumbStart + offset;
        const y = bounds.y + bounds.height - 1;

        if (!containsPoint(clipRect, x, y)) {
          continue;
        }

        buffer.setCell(x, y, {
          char: "━",
          fg: color,
          bg: this.styleProps.bg,
        });
      }
    }
  }

  private interactionOptions() {
    return {
      clipboardBindings: this.renderer?.getClipboardBindings(),
      pasteSummaryLineThreshold: this.pasteSummaryLineThreshold,
      pasteSummaryThreshold: this.pasteSummaryThreshold,
      submitOnCtrlEnter: this.submitOnCtrlEnter,
      summarizePastedText: this.summarizePastedText,
      tabString: this.tabString,
      visibleHeight: this.viewportHeight(),
      visibleWidth: this.viewportWidth(),
    } as const;
  }

  private applyInteractionResult(
    previousValue: string,
    result: ReturnType<TextareaControllerModel["handleKeyInput"]>,
  ): void {
    if (!result.handled) {
      return;
    }

    if (result.requestClipboardRead) {
      const text = this.renderer?.readClipboard();

      if (typeof text === "string" && text.length > 0) {
        this.applyInteractionResult(
          previousValue,
          this.controller.handlePasteText(text, this.interactionOptions()),
        );
      }
    }

    if (result.clipboardWriteText) {
      this.renderer?.writeClipboard(result.clipboardWriteText);
    }

    if (result.valueChanged && previousValue !== this.getValue()) {
      this.emitChange(previousValue);
    }

    if (typeof result.submitValue === "string") {
      this.emitSubmit(result.submitValue);
    }

    if (result.invalidateReason) {
      this.invalidate(result.invalidateReason);
    }
  }

  private emitChange(previousValue: string): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.getValue(),
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(value: string): void {
    const event = createSyntheticEvent({
      type: "submit",
      value,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}

export interface SelectRenderableOptions {
  options: string[];
  selectedIndex?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
  title?: string;
}

export class SelectRenderable extends BoxRenderable {
  options: string[];
  selectedIndex: number;
  focused = false;
  scrollY = 0;

  constructor(options: SelectRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        border: true,
        focusable: true,
        title: options.title,
        ...options.style,
      },
    });
    this.options = options.options;
    this.selectedIndex = clampIndex(
      options.selectedIndex ?? 0,
      Math.max(0, this.options.length - 1),
    );
  }

  getValue(): string | undefined {
    return this.options[this.selectedIndex];
  }

  setSelectedIndex(index: number, emitChange = true): this {
    const previousIndex = this.selectedIndex;
    const nextIndex = clampIndex(index, Math.max(0, this.options.length - 1));

    this.selectedIndex = nextIndex;
    this.ensureVisible();
    this.invalidate("select:index");

    if (emitChange && previousIndex !== this.selectedIndex) {
      this.emitChange(previousIndex);
    }

    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("select:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("select:blur");
      return;
    }

    if (event.type === "mouse") {
      if (event.action !== "down") {
        return;
      }

      const index = this.optionIndexAt(event.x, event.y);

      if (index === null) {
        return;
      }

      this.setSelectedIndex(index);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const previousIndex = this.selectedIndex;

    switch (event.key) {
      case "ArrowUp":
        this.selectedIndex = clampIndex(
          this.selectedIndex - 1,
          Math.max(0, this.options.length - 1),
        );
        break;
      case "ArrowDown":
        this.selectedIndex = clampIndex(
          this.selectedIndex + 1,
          Math.max(0, this.options.length - 1),
        );
        break;
      case "Home":
        this.selectedIndex = 0;
        break;
      case "End":
        this.selectedIndex = Math.max(0, this.options.length - 1);
        break;
      case "PageUp":
        this.selectedIndex = clampIndex(
          this.selectedIndex - 5,
          Math.max(0, this.options.length - 1),
        );
        break;
      case "PageDown":
        this.selectedIndex = clampIndex(
          this.selectedIndex + 5,
          Math.max(0, this.options.length - 1),
        );
        break;
      case "Enter":
        this.emitSubmit();
        event.preventDefault();
        return;
      default:
        return;
    }

    this.ensureVisible();
    this.invalidate("select:key");

    if (previousIndex !== this.selectedIndex) {
      this.emitChange(previousIndex);
    }
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;
    const visible = this.options.slice(this.scrollY, this.scrollY + innerBounds.height);

    for (let row = 0; row < visible.length; row += 1) {
      const optionIndex = row + this.scrollY;
      const prefix = optionIndex === this.selectedIndex ? (this.focused ? ">" : "*") : " ";
      const selected = optionIndex === this.selectedIndex;
      const line = selected
        ? [
            {
              text: `${prefix} ${visible[row] ?? ""}`,
              fg: this.focused ? "#0f1419" : this.styleProps.fg,
              bg: this.styleProps.titleFg ?? this.styleProps.borderFg ?? "#f0c674",
            },
          ]
        : [
            {
              text: `${prefix} ${visible[row] ?? ""}`,
              fg: this.styleProps.fg,
              bg: this.styleProps.bg,
            },
          ];

      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: innerBounds.y + row, width: innerBounds.width, height: 1 },
        line,
        { clip: clipRect, bg: this.styleProps.bg },
      );
    }
  }

  private ensureVisible(): void {
    if (this.selectedIndex < this.scrollY) {
      this.scrollY = this.selectedIndex;
    } else {
      const visibleHeight = Math.max(1, this.layoutState.innerBounds.height);

      if (this.selectedIndex >= this.scrollY + visibleHeight) {
        this.scrollY = this.selectedIndex - visibleHeight + 1;
      }
    }
  }

  private emitChange(previousIndex: number): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        index: this.selectedIndex,
        option: this.getValue(),
      },
      previousValue: {
        index: previousIndex,
        option: this.options[previousIndex],
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: {
        index: this.selectedIndex,
        option: this.getValue(),
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }

  private optionIndexAt(x: number, y: number): number | null {
    const { innerBounds } = this.layoutState;

    if (
      x < innerBounds.x ||
      y < innerBounds.y ||
      x >= innerBounds.x + innerBounds.width ||
      y >= innerBounds.y + innerBounds.height
    ) {
      return null;
    }

    const index = this.scrollY + (y - innerBounds.y);

    return index >= 0 && index < this.options.length ? index : null;
  }
}

export interface TabSelectRenderableOptions extends SelectRenderableOptions {
  descriptions?: string[];
}

export class TabSelectRenderable extends Renderable {
  tabs: string[];
  descriptions: string[];
  selectedIndex: number;
  focused = false;

  constructor(options: TabSelectRenderableOptions) {
    super("tab-select", options.layout, {
      focusable: true,
      ...options.style,
    });
    this.tabs = options.options;
    this.descriptions = options.descriptions ?? [];
    this.selectedIndex = clampIndex(options.selectedIndex ?? 0, Math.max(0, this.tabs.length - 1));
  }

  getValue(): string | undefined {
    return this.tabs[this.selectedIndex];
  }

  setSelectedIndex(index: number, emitChange = true): this {
    const previousIndex = this.selectedIndex;

    this.selectedIndex = clampIndex(index, Math.max(0, this.tabs.length - 1));
    this.invalidate("tab-select:index");

    if (emitChange && previousIndex !== this.selectedIndex) {
      this.emitChange(previousIndex);
    }

    return this;
  }

  override measurePreferredSize(parentBounds: Rect): Size {
    const measured = super.measurePreferredSize(parentBounds);
    const headline = this.tabs.map((tab) => `[${tab}]`).join(" ");
    const description = this.descriptions[this.selectedIndex] ?? "";

    return {
      width: Math.max(measured.width, measureTextWidth(headline)),
      height: Math.max(measured.height, description ? 2 : 1),
    };
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("tab-select:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.invalidate("tab-select:blur");
      return;
    }

    if (event.type === "mouse") {
      if (event.action !== "down") {
        return;
      }

      const index = this.tabIndexAt(event.x, event.y);

      if (index === null) {
        return;
      }

      this.setSelectedIndex(index);
      event.preventDefault();
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const previousIndex = this.selectedIndex;

    switch (event.key) {
      case "ArrowLeft":
        this.selectedIndex = clampIndex(this.selectedIndex - 1, Math.max(0, this.tabs.length - 1));
        break;
      case "ArrowRight":
        this.selectedIndex = clampIndex(this.selectedIndex + 1, Math.max(0, this.tabs.length - 1));
        break;
      case "Home":
        this.selectedIndex = 0;
        break;
      case "End":
        this.selectedIndex = Math.max(0, this.tabs.length - 1);
        break;
      case "Enter":
        this.emitSubmit();
        event.preventDefault();
        return;
      default:
        return;
    }

    this.invalidate("tab-select:key");

    if (previousIndex !== this.selectedIndex) {
      this.emitChange(previousIndex);
    }
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    const segments = this.tabs.flatMap((tab, index) => {
      const selected = index === this.selectedIndex;
      return [
        {
          text: `${selected ? "[" : " "}${tab}${selected ? "]" : " "}`,
          fg: selected ? "#0f1419" : this.styleProps.fg,
          bg: selected
            ? (this.styleProps.titleFg ?? this.styleProps.borderFg ?? "#f0c674")
            : this.styleProps.bg,
        },
        {
          text: " ",
          fg: this.styleProps.fg,
          bg: this.styleProps.bg,
        },
      ];
    });

    renderTextBlock(buffer, bounds, segments, {
      clip: clipRect,
      fg: this.styleProps.fg,
      bg: this.styleProps.bg,
    });

    const description = this.descriptions[this.selectedIndex];

    if (description && bounds.height > 1) {
      renderTextBlock(
        buffer,
        { x: bounds.x, y: bounds.y + 1, width: bounds.width, height: bounds.height - 1 },
        description,
        {
          clip: clipRect,
          fg: this.styleProps.fg,
          bg: this.styleProps.bg,
          wrapMode: "word",
        },
      );
    }
  }

  private emitChange(previousIndex: number): void {
    const event = createSyntheticEvent({
      type: "change",
      value: {
        index: this.selectedIndex,
        option: this.getValue(),
      },
      previousValue: {
        index: previousIndex,
        option: this.tabs[previousIndex],
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: {
        index: this.selectedIndex,
        option: this.getValue(),
      },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }

  private tabIndexAt(x: number, y: number): number | null {
    const { bounds } = this.layoutState;

    if (y !== bounds.y || x < bounds.x || x >= bounds.x + bounds.width) {
      return null;
    }

    let cursor = bounds.x;

    for (let index = 0; index < this.tabs.length; index += 1) {
      const width = measureTextWidth(`[${this.tabs[index] ?? ""}]`);

      if (x >= cursor && x < cursor + width) {
        return index;
      }

      cursor += width + 1;
    }

    return null;
  }
}

export interface ImageRenderableOptions extends BoxRenderableOptions {
  source: string;
  alt?: string;
  imageId?: string;
}

export class ImageRenderable extends BoxRenderable {
  source: string;
  alt?: string;
  imageId: string;

  constructor(options: ImageRenderableOptions) {
    super({
      content: options.alt ?? "image",
      layout: options.layout,
      style: {
        border: true,
        title: "image",
        ...options.style,
      },
    });
    this.source = options.source;
    this.alt = options.alt;
    this.imageId = options.imageId ?? `img-${this.id}`;
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    if (!this.source) {
      return;
    }

    context.images.push({
      imageId: this.imageId,
      source: this.source,
      alt: this.alt,
      bounds: this.layoutState.innerBounds,
    });
  }
}

export interface FormRenderableOptions extends BoxRenderableOptions {
  fields?: Array<InputRenderable | TextareaRenderable | SelectRenderable | TabSelectRenderable>;
}

export class FormRenderable extends BoxRenderable {
  constructor(options: FormRenderableOptions = {}) {
    super({
      layout: options.layout,
      style: {
        border: true,
        ...options.style,
      },
    });

    if (options.fields) {
      this.add(...options.fields);
    }
  }
}

export class LabelRenderable extends TextRenderable {}

export function selectionToText(selection: TextSelection | null, fallback = ""): string {
  return selection ? `${selection.start}:${selection.end}` : fallback;
}

function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

function clampIndex(value: number, max: number): number {
  return Math.max(0, Math.min(value, max));
}

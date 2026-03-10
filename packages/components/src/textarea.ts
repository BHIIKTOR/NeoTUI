import {
  type BaseLayoutProps,
  type BaseStyleProps,
  type TextareaSubmitMode as CoreTextareaSubmitMode,
  type Rect,
  type RenderEvent,
  resolveDimension,
  TextareaRenderable,
  TextareaViewportModel,
  type WrapMode,
} from "@neotui/core";
import { defaultComponentTheme } from "./theme";

export type TextareaViewportMode = "auto-resize" | "fixed";
export type TextareaSubmitMode = CoreTextareaSubmitMode;

export interface TextareaControlRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;
  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;
  wrapMode?: WrapMode;
  viewportMode?: TextareaViewportMode;
  submitMode?: TextareaSubmitMode;
  showScrollbars?: boolean;
  summarizePastedText?: boolean;
  pasteSummaryThreshold?: number;
  pasteSummaryLineThreshold?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TextareaControlRenderable extends TextareaRenderable {
  disabled: boolean;
  readOnly: boolean;
  invalid: boolean;
  minRows: number;
  maxRows?: number;
  autoResize: boolean;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: TextareaControlRenderableOptions = {}) {
    super({
      value: options.value,
      placeholder: options.placeholder,
      wrapMode: options.wrapMode,
      showScrollbars: options.showScrollbars,
      summarizePastedText: options.summarizePastedText ?? false,
      pasteSummaryThreshold: options.pasteSummaryThreshold,
      pasteSummaryLineThreshold: options.pasteSummaryLineThreshold,
      submitMode: options.submitMode ?? "mod-enter",
      layout: {
        height: Math.max(4, options.minRows ?? 4),
        ...options.layout,
      },
      style: {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceAltBg,
        borderFg: options.invalid ? defaultComponentTheme.danger : defaultComponentTheme.border,
        titleFg: defaultComponentTheme.borderStrong,
        ...options.style,
      },
    });
    this.disabled = options.disabled ?? false;
    this.readOnly = options.readOnly ?? false;
    this.invalid = options.invalid ?? false;
    this.minRows = options.minRows ?? 4;
    this.maxRows = options.maxRows;
    this.autoResize = options.viewportMode === "auto-resize" ? true : (options.autoResize ?? false);
    this.styleProps.focusable = this.disabled !== true;
    this.syncHeight();
  }

  override setValue(value: string): this {
    if (this.getValue() === value) {
      return this;
    }
    super.setValue(value);
    this.syncHeight();
    return this;
  }

  override setWrapMode(mode: WrapMode): this {
    super.setWrapMode(mode);
    this.syncHeight();
    return this;
  }

  override setSubmitMode(mode: TextareaSubmitMode): this {
    super.setSubmitMode(mode);
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);

    if (!this.autoResize) {
      return measured;
    }

    const resolvedWidth =
      this.layoutState.innerBounds.width ||
      Math.max(
        1,
        (resolveDimension(this.layoutProps.width, parentBounds.width) ?? parentBounds.width) -
          (this.hasBorder() ? 2 : 0),
      );
    const viewport = new TextareaViewportModel(
      this.getValue() || this.placeholder || "",
      resolvedWidth,
      this.wrapMode,
    );
    const nextRows = clampRowCount(viewport.contentHeight || 1, this.minRows, this.maxRows);

    return {
      width: measured.width,
      height: nextRows + (this.hasBorder() ? 2 : 0),
    };
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.styleProps.focusable = disabled !== true;
    this.syncChrome();
    this.invalidate("textarea-control:disabled");
    return this;
  }

  setReadOnly(readOnly: boolean): this {
    this.readOnly = readOnly;
    this.syncChrome();
    this.invalidate("textarea-control:readonly");
    return this;
  }

  setInvalid(invalid: boolean): this {
    this.invalid = invalid;
    this.syncChrome();
    this.invalidate("textarea-control:invalid");
    return this;
  }

  focus(): this {
    this.renderer?.focus(this);
    return this;
  }

  blur(): this {
    if (this.renderer?.focusedNode === this) {
      this.renderer.focus(null);
    }
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus" || event.type === "blur") {
      super.handleEvent(event);
      this.syncChrome();
      return;
    }

    if (this.disabled) {
      return;
    }

    if (this.readOnly) {
      if (event.type === "paste") {
        event.preventDefault();
        return;
      }

      if (
        event.type === "key" &&
        (((event.modifiers.ctrl || event.modifiers.meta) && event.key === "x") ||
          event.key === "Backspace" ||
          event.key === "Delete" ||
          event.key === "Enter" ||
          event.key === "Tab" ||
          (Boolean(event.text) && !event.modifiers.ctrl && !event.modifiers.meta && !event.modifiers.alt))
      ) {
        event.preventDefault();
        return;
      }
    }

    const previousValue = this.getValue();
    super.handleEvent(event);
    if (previousValue !== this.getValue()) {
      this.syncHeight();
    }
  }

  protected override onMount(): void {
    this.syncHeight();
    this.unsubscribeResize =
      this.renderer?.subscribeToResize(() => {
        this.syncHeight();
      }) ?? null;
  }

  protected override onUnmount(): void {
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
  }

  private syncHeight(): void {
    if (!this.autoResize) {
      return;
    }

    const measuredWidth = this.layoutState.innerBounds.width;
    if (
      measuredWidth <= 0 &&
      this.layoutProps.width !== undefined &&
      typeof this.layoutProps.width !== "number"
    ) {
      return;
    }

    const width = Math.max(
      1,
      measuredWidth ||
        (typeof this.layoutProps.width === "number"
          ? this.layoutProps.width - (this.hasBorder() ? 2 : 0)
          : 32),
    );
    const viewport = new TextareaViewportModel(
      this.getValue() || this.placeholder || "",
      width,
      this.wrapMode,
    );
    const nextRows = clampRowCount(viewport.contentHeight || 1, this.minRows, this.maxRows);
    this.updateLayout({
      height: nextRows + (this.hasBorder() ? 2 : 0),
    });
  }

  private syncChrome(): void {
    this.styleProps.borderFg = this.invalid
      ? defaultComponentTheme.danger
      : this.focused
        ? defaultComponentTheme.borderStrong
        : defaultComponentTheme.border;
    this.styleProps.fg = this.disabled ? defaultComponentTheme.muted : defaultComponentTheme.fg;
  }
}

function clampRowCount(value: number, minRows: number, maxRows?: number): number {
  let next = Math.max(minRows, value);
  if (typeof maxRows === "number") {
    next = Math.min(next, maxRows);
  }
  return next;
}

import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Rect,
  type Renderable,
  type RenderEvent,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { CalendarRenderable } from "./calendar";
import { DialogRenderable } from "./dialog";
import { isNodeWithin } from "./internal/focus";
import { PanelRenderable } from "./panel";
import { SheetRenderable } from "./sheet";
import { defaultComponentTheme } from "./theme";

const POPOVER_WIDTH = 36;
const POPOVER_HEIGHT = 18;

export interface DatePickerRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  minDate?: string;
  maxDate?: string;
  open?: boolean;
  presentation?: "popover" | "dialog" | "sheet";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DatePickerRenderable extends BoxRenderable {
  readonly trigger: ButtonRenderable;
  readonly calendar: CalendarRenderable;
  readonly popover: PanelRenderable;
  readonly dialog: DialogRenderable;
  readonly sheet: SheetRenderable;

  value?: string;
  placeholder: string;
  disabled: boolean;
  invalid: boolean;
  presentation: NonNullable<DatePickerRenderableOptions["presentation"]>;

  private openState = false;
  private unsubscribeGlobal: (() => void) | null = null;
  private unsubscribeResize: (() => void) | null = null;

  constructor(options: DatePickerRenderableOptions = {}) {
    super({
      layout: {
        overflow: "visible",
        ...options.layout,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.value = options.value;
    this.placeholder = options.placeholder ?? "Pick a date";
    this.disabled = options.disabled ?? false;
    this.invalid = options.invalid ?? false;
    this.presentation = options.presentation ?? "popover";

    this.trigger = new ButtonRenderable({
      label: this.value ?? this.placeholder,
      variant: "secondary",
      disabled: this.disabled,
    });
    this.calendar = new CalendarRenderable({
      value: options.value,
      minDate: options.minDate,
      maxDate: options.maxDate,
      layout: {
        width: 32,
        height: 14,
      },
    });
    this.popover = new PanelRenderable({
      title: "date picker",
      tone: "accent",
      layout: {
        position: "absolute",
        width: POPOVER_WIDTH,
        height: POPOVER_HEIGHT,
        zIndex: 180,
      },
    });
    this.dialog = new DialogRenderable({
      title: "Pick a date",
      width: 38,
      height: 18,
      restoreFocus: this.trigger,
      initialFocus: this.calendar,
    });
    this.sheet = new SheetRenderable({
      title: "Pick a date",
      side: "bottom",
      height: 18,
      width: "100%",
      showCloseButton: true,
      restoreFocus: true,
    });

    this.add(this.trigger);
    this.applyTriggerChrome();

    this.trigger.on("submit", () => {
      this.toggle();
    });
    this.calendar.on("change", (event) => {
      const nextValue = (event as { value: string }).value;
      this.setValue(nextValue);
      this.close();
    });

    if (options.open) {
      this.openState = false;
    }
  }

  getValue(): string | undefined {
    return this.value;
  }

  setValue(value: string): this {
    const previousValue = this.value;
    this.value = value;
    this.trigger.setLabel(this.value ?? this.placeholder);
    if (this.calendar.getValue() !== value) {
      this.calendar.setValue(value);
    }

    if (previousValue === value) {
      return this;
    }

    const event = createSyntheticEvent({
      type: "change",
      value,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.trigger.setDisabled(disabled);
    if (disabled) {
      this.close();
    }
    return this;
  }

  setInvalid(invalid: boolean): this {
    this.invalid = invalid;
    this.applyTriggerChrome();
    return this;
  }

  isOpen(): boolean {
    return this.openState;
  }

  override measurePreferredSize(parentBounds: Rect) {
    return this.trigger.measurePreferredSize(parentBounds);
  }

  open(): this {
    if (this.openState || this.disabled || !this.renderer) {
      return this;
    }

    this.mountCalendarIntoHost();
    this.openState = true;

    const root = this.renderer.root;
    if (this.presentation === "popover") {
      if (!this.popover.parent) {
        root.add(this.popover);
      }
      this.positionPopover();
    } else if (this.presentation === "dialog") {
      if (!this.dialog.parent) {
        root.add(this.dialog);
      }
      this.dialog.open();
    } else {
      if (!this.sheet.parent) {
        root.add(this.sheet);
      }
      this.sheet.open();
    }

    this.renderer.focus(this.calendar);
    this.installSubscriptions();
    this.emitOpenChange(true);
    this.invalidate("date-picker:open");
    return this;
  }

  close(): this {
    if (!this.openState) {
      return this;
    }

    if (this.presentation === "popover") {
      if (this.popover.parent) {
        this.popover.parent.remove(this.popover);
      }
      this.finishClose();
      return this;
    }

    if (this.presentation === "dialog") {
      this.dialog.close();
      this.finishClose();
      return this;
    }

    this.sheet.close();
    this.finishClose();
    return this;
  }

  toggle(): this {
    return this.openState ? this.close() : this.open();
  }

  override handleEvent(event: RenderEvent): void {
    if (
      event.type === "key" &&
      event.key === "Escape" &&
      this.presentation === "popover" &&
      this.openState
    ) {
      this.close();
      event.preventDefault();
    }
  }

  protected override onMount(): void {
    if (this.openState) {
      this.openState = false;
      this.open();
    }
  }

  protected override onUnmount(): void {
    this.cleanupSubscriptions();
    this.popover.parent?.remove(this.popover);
    this.dialog.parent?.remove(this.dialog);
    this.sheet.parent?.remove(this.sheet);
  }

  private mountCalendarIntoHost(): void {
    const host = this.resolveCalendarHost();
    if (this.calendar.parent !== host) {
      this.calendar.parent?.remove(this.calendar);
      host.add(this.calendar);
    }
  }

  private resolveCalendarHost(): Renderable {
    if (this.presentation === "popover") {
      return this.popover;
    }

    if (this.presentation === "dialog") {
      return this.dialog;
    }

    return this.sheet;
  }

  private positionPopover(): void {
    if (!this.renderer) {
      return;
    }

    const rootBounds = this.renderer.root.layoutState.innerBounds;
    const triggerBounds = this.trigger.layoutState.bounds;
    const width =
      typeof this.popover.layoutProps.width === "number"
        ? this.popover.layoutProps.width
        : POPOVER_WIDTH;
    const height =
      typeof this.popover.layoutProps.height === "number"
        ? this.popover.layoutProps.height
        : POPOVER_HEIGHT;
    const left = Math.max(0, Math.min(rootBounds.width - width, triggerBounds.x - rootBounds.x));
    const top = Math.max(
      0,
      Math.min(rootBounds.height - height, triggerBounds.y - rootBounds.y + triggerBounds.height),
    );

    this.popover.updateLayout({
      left,
      top,
      width,
      height,
    });
  }

  private installSubscriptions(): void {
    this.cleanupSubscriptions();

    if (!this.renderer) {
      return;
    }

    this.unsubscribeGlobal = this.renderer.subscribe((event) => {
      if (!this.openState) {
        return;
      }

      if (
        event.type === "mouse" &&
        event.action === "down" &&
        !isNodeWithin(event.target, this.trigger) &&
        !isNodeWithin(event.target, this.resolveOverlayNode())
      ) {
        this.close();
        event.preventDefault();
        return;
      }

      if (event.type === "key" && event.key === "Escape") {
        this.close();
        event.preventDefault();
        return;
      }

      if (this.presentation === "dialog" && !this.dialog.isOpen()) {
        this.finishClose(false);
        return;
      }

      if (this.presentation === "sheet" && !this.sheet.isOpen()) {
        this.finishClose(false);
      }
    });
    this.unsubscribeResize = this.renderer.subscribeToResize(() => {
      if (this.openState && this.presentation === "popover") {
        this.positionPopover();
      }
    });
  }

  private resolveOverlayNode(): Renderable {
    if (this.presentation === "popover") {
      return this.popover;
    }

    if (this.presentation === "dialog") {
      return this.dialog;
    }

    return this.sheet;
  }

  private finishClose(restoreFocus = true): void {
    this.openState = false;
    this.cleanupSubscriptions();
    this.dialog.parent?.remove(this.dialog);
    this.sheet.parent?.remove(this.sheet);
    this.popover.parent?.remove(this.popover);
    if (restoreFocus) {
      this.renderer?.focus(this.trigger);
    }
    this.emitOpenChange(false);
    this.invalidate("date-picker:close");
  }

  private cleanupSubscriptions(): void {
    this.unsubscribeGlobal?.();
    this.unsubscribeGlobal = null;
    this.unsubscribeResize?.();
    this.unsubscribeResize = null;
  }

  private applyTriggerChrome(): void {
    this.trigger.updateStyle({
      borderFg: this.invalid ? defaultComponentTheme.danger : defaultComponentTheme.border,
      titleFg: this.invalid ? defaultComponentTheme.danger : defaultComponentTheme.title,
    });
    if (!this.value) {
      this.trigger.setLabel(this.placeholder);
    }
  }

  private emitOpenChange(open: boolean): void {
    const event = createSyntheticEvent({
      type: "change",
      value: { open },
      previousValue: { open: !open },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("openChange", event);
  }
}

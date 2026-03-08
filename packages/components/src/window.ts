import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  type Renderable,
  type RenderEvent,
  resolveDimension,
  TextRenderable,
  type WrapMode,
} from "@neotui/core";
import { ScrollAreaRenderable } from "./scroll-area";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export type WindowRole = "document" | "utility";

export interface WindowRenderableOptions {
  title: string;
  subtitle?: string;
  role?: WindowRole;
  x?: number;
  y?: number;
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  active?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  closable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  content?: string;
  contentWrapMode?: WrapMode;
  contentScrollable?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface BoundsSnapshot {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WindowRenderable extends BoxRenderable {
  readonly titleBar: BoxRenderable;
  readonly titleText: BoxRenderable;
  readonly controls: ToolbarRenderable;
  readonly body: BoxRenderable;
  readonly bodyScrollViewport: ScrollAreaRenderable | null;
  readonly bodyContentText: TextRenderable | null;
  readonly footerShell: BoxRenderable;
  readonly footer: ToolbarRenderable;
  readonly resizeHandle: BoxRenderable;
  readonly closeButton: WindowControlRenderable | null;
  readonly minimizeButton: WindowControlRenderable | null;
  readonly maximizeButton: WindowControlRenderable | null;

  title: string;
  subtitle?: string;
  role: WindowRole;
  active: boolean;
  draggable: boolean;
  resizable: boolean;
  closable: boolean;
  minimizable: boolean;
  maximizable: boolean;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  minimized = false;
  maximized = false;
  contentWrapMode: WrapMode;
  contentScrollable: boolean;

  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private resizeOrigin: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null = null;
  private restoreBounds: BoundsSnapshot | null = null;

  constructor(options: WindowRenderableOptions) {
    super({
      layout: {
        position: "absolute",
        left: options.x ?? 0,
        top: options.y ?? 0,
        width: options.width ?? 38,
        height: options.height ?? 14,
        flexDirection: "column",
        gap: 0,
        overflow: "visible",
        ...options.layout,
      },
      style: {
        border: true,
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.title = options.title;
    this.subtitle = options.subtitle;
    this.role = options.role ?? "document";
    this.active = options.active ?? false;
    this.draggable = options.draggable ?? true;
    this.resizable = options.resizable ?? true;
    this.closable = options.closable ?? true;
    this.minimizable = options.minimizable ?? true;
    this.maximizable = options.maximizable ?? true;
    this.minWidth = Math.max(16, options.minWidth ?? 24);
    this.minHeight = Math.max(8, options.minHeight ?? 10);
    this.maxWidth = options.maxWidth;
    this.maxHeight = options.maxHeight;
    this.contentWrapMode = options.contentWrapMode ?? "word";
    this.contentScrollable = options.contentScrollable ?? false;

    this.titleBar = new BoxRenderable({
      layout: {
        height: 1,
        flexDirection: "row",
        alignItems: "center",
        padding: { left: 0, right: 0 },
      },
      style: {
        focusable: true,
      },
    });
    this.titleText = new BoxRenderable({
      content: "",
      layout: {
        flexGrow: 1,
        height: 1,
      },
      style: {},
    });
    this.controls = new ToolbarRenderable({
      layout: {
        height: 1,
        gap: 1,
      },
    });
    this.body = new BoxRenderable({
      layout: {
        flexGrow: 1,
        padding: { left: 1, right: 1, bottom: 0 },
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    });
    this.bodyScrollViewport = this.contentScrollable
      ? new ScrollAreaRenderable({
          direction: "vertical",
          showScrollbars: true,
          scrollbarVisibility: "auto",
          layout: {
            flexGrow: 1,
          },
          style: {
            border: false,
            focusable: false,
            bg: defaultComponentTheme.surfaceBg,
            fg: defaultComponentTheme.fg,
          },
        })
      : null;
    this.bodyContentText =
      typeof options.content === "string"
        ? new TextRenderable({
            content: options.content,
            wrapMode: this.contentWrapMode,
            layout: {
              flexGrow: 1,
            },
            style: {
              fg: defaultComponentTheme.fg,
              bg: defaultComponentTheme.surfaceBg,
            },
          })
        : null;

    if (this.bodyContentText) {
      if (this.bodyScrollViewport) {
        this.bodyScrollViewport.add(this.bodyContentText);
        this.body.add(this.bodyScrollViewport);
      } else {
        this.body.add(this.bodyContentText);
      }
    }

    this.footerShell = new BoxRenderable({
      layout: {
        position: "absolute",
        left: 1,
        bottom: 1,
        height: 0,
        zIndex: 3,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
      },
    });
    this.footer = new ToolbarRenderable({
      layout: {
        height: 3,
        alignItems: "center",
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
      },
    });
    this.footerShell.add(this.footer);
    this.resizeHandle = new BoxRenderable({
      content: "+",
      layout: {
        position: "absolute",
        right: 0,
        bottom: 0,
        width: 1,
        height: 1,
        zIndex: 4,
      },
      style: {
        fg: defaultComponentTheme.muted,
        bg: defaultComponentTheme.surfaceBg,
        visible: this.resizable,
      },
    });

    this.minimizeButton = this.minimizable
      ? createWindowControl("-", "ghost", () => {
          this.minimize();
        })
      : null;
    this.maximizeButton = this.maximizable
      ? createWindowControl("^", "ghost", () => {
          if (this.maximized) {
            this.restore();
          } else {
            this.maximize();
          }
        })
      : null;
    this.closeButton = this.closable
      ? createWindowControl("x", "danger", () => {
          this.close();
        })
      : null;

    for (const button of [this.minimizeButton, this.maximizeButton, this.closeButton]) {
      if (button) {
        this.controls.add(button);
      }
    }

    this.titleBar.add(this.titleText, this.controls);
    super.add(this.titleBar, this.body, this.footerShell, this.resizeHandle);
    this.installInteractions();
    this.syncChrome();
    this.syncFooter();
  }

  override add(...children: Renderable[]): this {
    this.body.add(...children);
    return this;
  }

  override remove(child: Renderable): this {
    if (child.parent === this.body) {
      this.body.remove(child);
      return this;
    }

    if (child.parent === this.footer) {
      this.footer.remove(child);
      this.syncFooter();
      return this;
    }

    return super.remove(child);
  }

  addFooter(...children: Renderable[]): this {
    this.footer.add(...children);
    this.syncFooter();
    return this;
  }

  override setContent(content: string): this {
    this.bodyContentText?.setContent(content);
    return this;
  }

  setContentScrollY(value: number): this {
    this.bodyScrollViewport?.setScrollY(value);
    return this;
  }

  scrollContentBy(delta: number): this {
    if (!this.bodyScrollViewport) {
      return this;
    }

    this.bodyScrollViewport.setScrollY(this.bodyScrollViewport.scrollY + delta);
    return this;
  }

  measureMinimizedWidth(availableWidth: number): number {
    return clamp(
      measureTextWidth(this.title) + 4,
      12,
      Math.min(this.maxWidth ?? availableWidth, availableWidth),
    );
  }

  setActive(active: boolean): this {
    if (this.active === active) {
      return this;
    }

    const previousValue = this.active;
    this.active = active;
    this.syncChrome();
    this.emitWindowChange("activate", {
      windowId: this.id,
      active,
      previousActive: previousValue,
    });
    return this;
  }

  moveTo(x: number, y: number): this {
    const viewport = this.resolveViewport();
    const width = this.currentWidth(viewport.width);
    const height = this.currentHeight(viewport.height);
    const nextX = clamp(x, 0, Math.max(0, viewport.width - width));
    const nextY = clamp(y, 0, Math.max(0, viewport.height - height));
    const previousBounds = this.captureCurrentBounds();

    this.updateLayout({
      left: nextX,
      top: nextY,
    });

    this.emitWindowChange("move", {
      windowId: this.id,
      x: nextX,
      y: nextY,
      previousX: previousBounds.x,
      previousY: previousBounds.y,
    });
    return this;
  }

  resizeTo(width: number, height: number): this {
    const viewport = this.resolveViewport();
    const current = this.captureCurrentBounds();
    const nextWidth = clamp(
      width,
      this.minWidth,
      Math.min(this.maxWidth ?? viewport.width, viewport.width - current.x),
    );
    const nextHeight = clamp(
      height,
      this.minHeight,
      Math.min(this.maxHeight ?? viewport.height, viewport.height - current.y),
    );

    this.updateLayout({
      width: nextWidth,
      height: nextHeight,
    });

    this.emitWindowChange("resize", {
      windowId: this.id,
      width: nextWidth,
      height: nextHeight,
      previousWidth: current.width,
      previousHeight: current.height,
    });
    return this;
  }

  maximize(): this {
    if (this.maximized) {
      return this;
    }

    const viewport = this.resolveViewport();
    if (!this.restoreBounds) {
      this.restoreBounds = this.captureCurrentBounds();
    }

    this.minimized = false;
    this.maximized = true;
    this.setVisible(true);
    this.updateLayout({
      left: 0,
      top: 0,
      width: viewport.width,
      height: viewport.height,
    });
    this.syncChrome();
    this.syncFooter();
    this.emitWindowChange("maximize", {
      windowId: this.id,
      bounds: this.captureCurrentBounds(),
    });
    return this;
  }

  minimize(): this {
    if (this.minimized) {
      return this;
    }

    if (!this.restoreBounds && !this.maximized) {
      this.restoreBounds = this.captureCurrentBounds();
    }

    this.minimized = true;
    this.maximized = false;
    this.setVisible(true);
    this.syncChrome();
    this.syncFooter();
    this.emitWindowChange("minimize", {
      windowId: this.id,
    });
    return this;
  }

  restore(): this {
    if (!this.minimized && !this.maximized && !this.restoreBounds) {
      return this;
    }

    const restoreBounds = this.restoreBounds;
    this.minimized = false;
    this.maximized = false;
    this.setVisible(true);

    if (restoreBounds) {
      this.updateLayout({
        left: restoreBounds.x,
        top: restoreBounds.y,
        width: restoreBounds.width,
        height: restoreBounds.height,
      });
    }

    this.restoreBounds = null;
    this.syncChrome();
    this.syncFooter();
    this.emitWindowChange("restore", {
      windowId: this.id,
      bounds: this.captureCurrentBounds(),
    });
    return this;
  }

  close(): this {
    this.setVisible(false);
    this.emitWindowChange("close", {
      windowId: this.id,
    });
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (this.minimized) {
      if (event.type === "mouse" && event.action === "down" && event.button === "left") {
        this.emitWindowChange("restore-request", {
          windowId: this.id,
        });
        event.preventDefault();
        return;
      }

      if (
        event.type === "key" &&
        (event.key === "Enter" || event.key === " " || event.key === "Space")
      ) {
        this.emitWindowChange("restore-request", {
          windowId: this.id,
        });
        event.preventDefault();
      }
      return;
    }

    if (this.bodyScrollViewport && event.type === "mouse" && event.action === "wheel") {
      this.scrollContentBy(event.wheelDelta);
      event.preventDefault();
      return;
    }

    if (event.type === "focus") {
      this.emitWindowChange("activate", {
        windowId: this.id,
        active: true,
        previousActive: this.active,
      });
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.emitWindowChange("activate", {
        windowId: this.id,
        active: true,
        previousActive: this.active,
      });
      return;
    }

    if (this.bodyScrollViewport && event.type === "key") {
      switch (event.key) {
        case "ArrowDown":
          this.scrollContentBy(1);
          event.preventDefault();
          return;
        case "ArrowUp":
          this.scrollContentBy(-1);
          event.preventDefault();
          return;
        case "PageDown":
          this.scrollContentBy(Math.max(1, this.body.layoutState.innerBounds.height - 1));
          event.preventDefault();
          return;
        case "PageUp":
          this.scrollContentBy(-Math.max(1, this.body.layoutState.innerBounds.height - 1));
          event.preventDefault();
          return;
      }
    }
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const titleSize = this.titleBar.measurePreferredSize(parentBounds);
    const bodySize = this.body.measurePreferredSize(parentBounds);
    const footerSize = this.footerShell.measurePreferredSize(parentBounds);
    const titleWidth =
      measureTextWidth(this.subtitle ? `${this.title} | ${this.subtitle}` : this.title) +
      this.controls.measurePreferredSize(parentBounds).width;
    return {
      width: Math.max(
        measured.width,
        this.minWidth,
        titleWidth,
        titleSize.width,
        bodySize.width,
        footerSize.width,
      ),
      height: Math.max(
        measured.height,
        this.minHeight,
        titleSize.height + bodySize.height + footerSize.height,
      ),
    };
  }

  private installInteractions(): void {
    this.titleBar.on("dragstart", (event) => {
      if (!this.draggable || this.maximized || this.minimized || event.type !== "mouse") {
        return;
      }

      const current = this.captureCurrentBounds();
      this.dragOffsetX = event.x - current.x;
      this.dragOffsetY = event.y - current.y;
      event.preventDefault();
    });
    this.titleBar.on("dragmove", (event) => {
      if (!this.draggable || this.maximized || this.minimized || event.type !== "mouse") {
        return;
      }

      this.moveTo(event.x - this.dragOffsetX, event.y - this.dragOffsetY);
      event.preventDefault();
    });
    this.titleBar.on("dragend", (event) => {
      if (event.type === "mouse") {
        event.preventDefault();
      }
    });

    this.resizeHandle.on("dragstart", (event) => {
      if (!this.resizable || this.minimized || event.type !== "mouse") {
        return;
      }

      this.resizeOrigin = {
        x: event.x,
        y: event.y,
        width: this.currentWidth(this.resolveViewport().width),
        height: this.currentHeight(this.resolveViewport().height),
      };
      event.preventDefault();
    });
    this.resizeHandle.on("dragmove", (event) => {
      if (!this.resizable || !this.resizeOrigin || event.type !== "mouse") {
        return;
      }

      const deltaX = event.x - this.resizeOrigin.x;
      const deltaY = event.y - this.resizeOrigin.y;
      this.resizeTo(this.resizeOrigin.width + deltaX, this.resizeOrigin.height + deltaY);
      event.preventDefault();
    });
    this.resizeHandle.on("dragend", (event) => {
      this.resizeOrigin = null;
      if (event.type === "mouse") {
        event.preventDefault();
      }
    });
  }

  private syncChrome(): void {
    const activeBorder = this.active
      ? defaultComponentTheme.borderStrong
      : defaultComponentTheme.border;
    const titleFg = this.active ? defaultComponentTheme.title : defaultComponentTheme.muted;
    const minimized = this.minimized;
    const windowBg = this.styleProps.bg ?? defaultComponentTheme.surfaceBg;
    const windowTitle = minimized
      ? this.title
      : this.subtitle
        ? `${this.title} | ${this.subtitle}`
        : this.title;

    this.updateStyle({
      borderFg: activeBorder,
      titleFg,
      bg: windowBg,
    });
    this.titleBar.updateStyle({
      bg: windowBg,
      fg: titleFg,
    });
    this.controls.setVisible(!minimized);
    this.titleText.setContent(windowTitle);
    this.titleText.updateStyle({
      bg: windowBg,
      fg: titleFg,
    });
    this.body.setVisible(!minimized);
    this.body.updateStyle({
      bg: windowBg,
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
    });
    this.bodyScrollViewport?.updateStyle({
      bg: windowBg,
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
    });
    this.bodyContentText?.updateStyle({
      bg: windowBg,
      fg: this.styleProps.fg ?? defaultComponentTheme.fg,
    });
    this.footerShell.updateStyle({
      bg: windowBg,
    });
    this.footer.updateStyle({
      bg: windowBg,
    });
    this.resizeHandle.updateStyle({
      fg: this.active ? defaultComponentTheme.borderStrong : defaultComponentTheme.muted,
      bg: windowBg,
      visible: this.resizable && !minimized,
    });

    for (const button of [this.minimizeButton, this.maximizeButton]) {
      button?.syncChrome({
        fg: this.active ? defaultComponentTheme.muted : "#9f8e79",
        bg: windowBg,
      });
    }
    this.closeButton?.syncChrome({
      fg: this.active ? "#d99890" : "#b6857d",
      bg: windowBg,
    });
  }

  private syncFooter(): void {
    const footerVisible = !this.minimized && this.footer.children.length > 0;
    const footerWidth = footerVisible
      ? this.footer.measurePreferredSize(this.resolveViewport()).width
      : 0;
    this.footerShell.updateLayout({
      width: footerWidth,
      height: footerVisible ? 3 : 0,
    });
    this.footerShell.setVisible(footerVisible);
    this.body.updateLayout({
      padding: {
        left: 1,
        right: 1,
        bottom: footerVisible ? 3 : 0,
      },
    });
  }

  private currentWidth(availableWidth: number): number {
    if (this.layoutState.bounds.width > 0) {
      return this.layoutState.bounds.width;
    }

    return clamp(
      resolveDimension(this.layoutProps.width, availableWidth) ?? this.minWidth,
      this.minWidth,
      this.maxWidth ?? availableWidth,
    );
  }

  private currentHeight(availableHeight: number): number {
    if (this.layoutState.bounds.height > 0) {
      return this.layoutState.bounds.height;
    }

    return clamp(
      resolveDimension(this.layoutProps.height, availableHeight) ?? this.minHeight,
      this.minHeight,
      this.maxHeight ?? availableHeight,
    );
  }

  private captureCurrentBounds(): BoundsSnapshot {
    const viewport = this.resolveViewport();
    const currentX =
      typeof this.layoutProps.left === "number"
        ? this.layoutProps.left
        : Math.max(0, this.layoutState.bounds.x - viewport.x);
    const currentY =
      typeof this.layoutProps.top === "number"
        ? this.layoutProps.top
        : Math.max(0, this.layoutState.bounds.y - viewport.y);

    return {
      x: currentX,
      y: currentY,
      width: this.currentWidth(viewport.width),
      height: this.currentHeight(viewport.height),
    };
  }

  private resolveViewport(): Rect {
    if (this.parent) {
      return this.parent.layoutState.innerBounds;
    }

    return {
      x: 0,
      y: 0,
      width: this.renderer?.width ?? this.layoutState.bounds.width,
      height: this.renderer?.height ?? this.layoutState.bounds.height,
    };
  }

  private emitWindowChange(channel: string, value: Record<string, unknown>): void {
    const event = createSyntheticEvent({
      type: "change",
      value,
      previousValue: undefined,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit(channel, event);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function createWindowControl(
  label: string,
  variant: "ghost" | "danger",
  onSubmit: () => void,
): WindowControlRenderable {
  const button = new WindowControlRenderable({
    label,
    variant,
  });
  button.on("submit", (event) => {
    onSubmit();
    event.preventDefault();
  });
  for (const alias of ["dragstart", "dragmove", "dragend"] as const) {
    button.on(alias, (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
  }
  return button;
}

interface WindowControlRenderableOptions {
  label: string;
  variant: "ghost" | "danger";
}

class WindowControlRenderable extends BoxRenderable {
  readonly label: string;
  readonly variant: WindowControlRenderableOptions["variant"];

  private focused = false;
  private hovered = false;
  private pressed = false;

  constructor(options: WindowControlRenderableOptions) {
    super({
      content: options.label,
      layout: {
        width: 1,
        height: 1,
      },
      style: {
        focusable: true,
      },
    });
    this.label = options.label;
    this.variant = options.variant;
    this.syncChrome({
      fg: defaultComponentTheme.muted,
      bg: defaultComponentTheme.surfaceBg,
    });
  }

  press(): this {
    const pressEvent = createSyntheticEvent({
      type: "press",
      label: this.label,
    } as const);
    pressEvent.target = this;
    pressEvent.currentTarget = this;
    this.emit("press", pressEvent as never);

    const submitEvent = createSyntheticEvent({
      type: "submit",
      value: this.label,
    } as const);
    submitEvent.target = this;
    submitEvent.currentTarget = this;
    this.emit("submit", submitEvent);
    return this;
  }

  syncChrome(colors: { fg: string; bg: string }): void {
    const highlight = this.variant === "danger" ? "#f0a29a" : defaultComponentTheme.borderStrong;
    this.updateStyle({
      fg: this.pressed || this.hovered || this.focused ? highlight : colors.fg,
      bg: colors.bg,
    });
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.focused = true;
      this.invalidate("window-control:focus");
      return;
    }

    if (event.type === "blur") {
      this.focused = false;
      this.pressed = false;
      this.invalidate("window-control:blur");
      return;
    }

    if (event.type === "mouse" && event.action === "down" && event.button === "left") {
      this.pressed = true;
      event.preventDefault();
      event.stopPropagation();
      this.invalidate("window-control:down");
      return;
    }

    if (event.type === "mouse" && event.action === "up") {
      const shouldPress = this.pressed && this.containsPoint(event.x, event.y);
      this.pressed = false;
      if (shouldPress) {
        this.press();
      }
      event.preventDefault();
      event.stopPropagation();
      this.invalidate("window-control:up");
      return;
    }

    if (event.type === "mouse" && event.action === "move") {
      const hovering = this.containsPoint(event.x, event.y);
      if (hovering !== this.hovered) {
        this.hovered = hovering;
        this.invalidate("window-control:hover");
      }
      return;
    }

    if (
      event.type === "key" &&
      (event.key === "Enter" || event.key === " " || event.key === "Space")
    ) {
      this.press();
      event.preventDefault();
      event.stopPropagation();
    }
  }
}

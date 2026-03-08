import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  normalizeSpacing,
  type Rect,
  TextRenderable,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { KbdRenderable } from "./kbd";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface EmptyAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}

export interface EmptyRenderableOptions {
  title: string;
  description?: string;
  hint?: string;
  actions?: EmptyAction[];
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class EmptyRenderable extends BoxRenderable {
  readonly titleNode: TextRenderable;
  readonly descriptionNode: TextRenderable;
  readonly hintBar: ToolbarRenderable;
  readonly actionBar: ToolbarRenderable;
  readonly actionButtons: ButtonRenderable[] = [];

  title: string;
  description?: string;
  hint?: string;
  actions: EmptyAction[];

  constructor(options: EmptyRenderableOptions) {
    super({
      layout: {
        flexDirection: "column",
        gap: 1,
        padding: 1,
        ...options.layout,
      },
      style: {
        border: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        borderFg: defaultComponentTheme.border,
        titleFg: defaultComponentTheme.title,
        ...options.style,
      },
    });
    this.title = options.title;
    this.description = options.description;
    this.hint = options.hint;
    this.actions = options.actions ?? [];

    this.titleNode = new TextRenderable({
      content: this.title,
      layout: { width: "100%", height: 1 },
      style: { fg: defaultComponentTheme.title },
    });
    this.descriptionNode = new TextRenderable({
      content: this.description ?? "",
      wrapMode: "word",
      layout: { width: "100%", height: this.description ? 2 : 0 },
      style: { fg: defaultComponentTheme.fg },
    });
    this.hintBar = new ToolbarRenderable({
      layout: { height: this.hint ? 1 : 0, alignItems: "start" },
    });
    this.actionBar = new ToolbarRenderable({
      layout: { height: this.actions.length > 0 ? 3 : 0, alignItems: "start" },
    });

    super.add(this.titleNode, this.descriptionNode, this.hintBar, this.actionBar);
    this.syncHint();
    this.syncActions();
  }

  setActions(actions: EmptyAction[]): this {
    this.actions = actions;
    this.syncActions();
    this.invalidate("empty:actions");
    return this;
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const titleSize = this.titleNode.measurePreferredSize(parentBounds);
    const descriptionSize = this.descriptionNode.measurePreferredSize(parentBounds);
    const hintSize = this.hintBar.measurePreferredSize(parentBounds);
    const actionSize = this.actionBar.measurePreferredSize(parentBounds);
    const visibleSizes = [titleSize, descriptionSize, hintSize, actionSize].filter(
      (size) => size.height > 0,
    );
    const gap = this.layoutProps.gap ?? 0;
    const padding = normalizeSpacing(this.layoutProps.padding);
    const chromeWidth = padding.left + padding.right + (this.hasBorder() ? 2 : 0);
    const chromeHeight = padding.top + padding.bottom + (this.hasBorder() ? 2 : 0);
    const contentWidth = Math.max(
      titleSize.width,
      descriptionSize.width,
      hintSize.width,
      actionSize.width,
    );

    return {
      width: Math.max(measured.width, contentWidth + chromeWidth),
      height: Math.max(
        measured.height,
        titleSize.height +
          descriptionSize.height +
          hintSize.height +
          actionSize.height +
          gap * Math.max(0, visibleSizes.length - 1) +
          Math.max(0, chromeHeight),
      ),
    };
  }

  private syncHint(): void {
    for (const child of [...this.hintBar.children]) {
      this.hintBar.remove(child);
    }

    if (!this.hint) {
      this.hintBar.updateLayout({ height: 0 });
      return;
    }

    this.hintBar.updateLayout({ height: 1 });
    this.hintBar.add(
      new KbdRenderable({ label: "Hint", compact: true }),
      new TextRenderable({
        content: this.hint,
        layout: { height: 1 },
        style: { fg: defaultComponentTheme.muted },
      }),
    );
  }

  private syncActions(): void {
    for (const child of [...this.actionBar.children]) {
      this.actionBar.remove(child);
    }
    this.actionButtons.length = 0;

    if (this.actions.length === 0) {
      this.actionBar.updateLayout({ height: 0 });
      return;
    }

    this.actionBar.updateLayout({ height: 3 });
    for (const action of this.actions) {
      const button = new ButtonRenderable({
        label: action.label,
        variant: action.variant ?? "secondary",
      });
      button.on("submit", () => {
        const event = createSyntheticEvent({
          type: "submit",
          value: action,
        } as const);
        event.target = this;
        event.currentTarget = this;
        this.emit("action", event);
      });
      this.actionButtons.push(button);
      this.actionBar.add(button);
    }
  }
}

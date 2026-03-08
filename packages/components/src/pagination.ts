import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Rect,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { InputControlRenderable } from "./input";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface PaginationRenderableOptions {
  page: number;
  pageCount: number;
  siblingCount?: number;
  showEdges?: boolean;
  showJumpInput?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

type PageToken = number | "ellipsis";

export class PaginationRenderable extends BoxRenderable {
  readonly previousButton: ButtonRenderable;
  readonly nextButton: ButtonRenderable;
  readonly pageHost: ToolbarRenderable;
  readonly jumpInput: InputControlRenderable | null;

  page: number;
  pageCount: number;
  siblingCount: number;
  showEdges: boolean;
  showJumpInput: boolean;
  pageButtons: ButtonRenderable[] = [];

  constructor(options: PaginationRenderableOptions) {
    super({
      layout: {
        flexDirection: "row",
        alignItems: "center",
        gap: 1,
        height: 3,
        ...options.layout,
      },
      style: {
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.page = clampPage(options.page, options.pageCount);
    this.pageCount = Math.max(1, options.pageCount);
    this.siblingCount = Math.max(0, options.siblingCount ?? 1);
    this.showEdges = options.showEdges ?? true;
    this.showJumpInput = options.showJumpInput ?? false;

    this.previousButton = new ButtonRenderable({
      label: "Prev",
      variant: "ghost",
      size: "compact",
    });
    this.nextButton = new ButtonRenderable({
      label: "Next",
      variant: "ghost",
      size: "compact",
    });
    this.pageHost = new ToolbarRenderable({
      layout: {
        gap: 1,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
      },
    });
    this.jumpInput = this.showJumpInput
      ? new InputControlRenderable({
          value: String(this.page),
          placeholder: "Page",
          width: 7,
        })
      : null;

    this.previousButton.on("submit", () => {
      this.previous();
    });
    this.nextButton.on("submit", () => {
      this.next();
    });
    this.jumpInput?.on("submit", () => {
      this.commitJumpInput();
    });

    this.add(this.previousButton, this.pageHost, this.nextButton);

    if (this.jumpInput) {
      this.add(
        new BoxRenderable({
          content: "Jump",
          layout: { height: 1, width: 4 },
          style: {
            bg: defaultComponentTheme.surfaceBg,
            fg: defaultComponentTheme.muted,
          },
        }),
        this.jumpInput,
      );
    }

    this.syncButtons();
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    const childSizes = this.children.map((child) => child.measurePreferredSize(parentBounds));
    const gap = this.layoutProps.gap ?? 0;
    const calculatedWidth =
      childSizes.reduce((total, size) => total + size.width, 0) +
      gap * Math.max(0, childSizes.length - 1);

    return {
      width: Math.max(measured.width, calculatedWidth),
      height: Math.max(measured.height, ...childSizes.map((size) => size.height)),
    };
  }

  getPage(): number {
    return this.page;
  }

  setPage(page: number): this {
    const nextPage = clampPage(page, this.pageCount);
    if (nextPage === this.page) {
      this.jumpInput?.setValue(String(this.page));
      return this;
    }

    const previousPage = this.page;
    this.page = nextPage;
    this.jumpInput?.setValue(String(this.page));
    this.syncButtons();

    const event = createSyntheticEvent({
      type: "change",
      value: { page: this.page, pageCount: this.pageCount },
      previousValue: { page: previousPage, pageCount: this.pageCount },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
    return this;
  }

  setPageCount(pageCount: number): this {
    this.pageCount = Math.max(1, pageCount);
    this.page = clampPage(this.page, this.pageCount);
    this.jumpInput?.setValue(String(this.page));
    this.syncButtons();
    return this;
  }

  next(): this {
    return this.setPage(this.page + 1);
  }

  previous(): this {
    return this.setPage(this.page - 1);
  }

  private syncButtons(): void {
    this.previousButton.setDisabled(this.page <= 1);
    this.nextButton.setDisabled(this.page >= this.pageCount);

    for (const child of [...this.pageHost.children]) {
      this.pageHost.remove(child);
    }

    this.pageButtons = [];

    for (const token of resolvePageTokens(
      this.page,
      this.pageCount,
      this.siblingCount,
      this.showEdges,
    )) {
      if (token === "ellipsis") {
        this.pageHost.add(
          new BoxRenderable({
            content: "…",
            layout: { width: 1, height: 1 },
            style: {
              bg: defaultComponentTheme.surfaceBg,
              fg: defaultComponentTheme.muted,
            },
          }),
        );
        continue;
      }

      const button = new ButtonRenderable({
        label: String(token),
        variant: token === this.page ? "primary" : "ghost",
        size: "compact",
        minWidth: 3,
      });
      button.on("submit", () => {
        this.setPage(token);
      });
      this.pageButtons.push(button);
      this.pageHost.add(button);
    }

    this.invalidate("pagination:buttons");
  }

  private commitJumpInput(): void {
    if (!this.jumpInput) {
      return;
    }

    const nextPage = Number.parseInt(this.jumpInput.getValue(), 10);
    if (Number.isNaN(nextPage)) {
      this.jumpInput.setValue(String(this.page));
      return;
    }

    this.setPage(nextPage);
  }
}

function clampPage(page: number, pageCount: number): number {
  return Math.max(1, Math.min(Math.max(1, pageCount), page));
}

function resolvePageTokens(
  page: number,
  pageCount: number,
  siblingCount: number,
  showEdges: boolean,
): PageToken[] {
  if (pageCount <= 1) {
    return [1];
  }

  const tokens: PageToken[] = [];
  const added = new Set<number>();
  const start = Math.max(1, page - siblingCount);
  const end = Math.min(pageCount, page + siblingCount);

  const pushPage = (value: number) => {
    if (!added.has(value)) {
      tokens.push(value);
      added.add(value);
    }
  };

  if (showEdges) {
    pushPage(1);
  }

  if (start > (showEdges ? 2 : 1)) {
    tokens.push("ellipsis");
  }

  for (let value = start; value <= end; value += 1) {
    pushPage(value);
  }

  if (end < pageCount - (showEdges ? 1 : 0)) {
    tokens.push("ellipsis");
  }

  if (showEdges) {
    pushPage(pageCount);
  }

  if (!showEdges) {
    if (!added.has(1)) {
      pushPage(1);
    }
    if (!added.has(pageCount)) {
      pushPage(pageCount);
    }
  }

  return tokens;
}

import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
  type RenderEvent,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { DropdownMenuRenderable } from "./dropdown-menu";
import { defaultComponentTheme } from "./theme";

export interface NavigationMenuItem {
  id: string;
  label: string;
  description?: string;
  href?: string;
  disabled?: boolean;
  items?: Array<{
    id: string;
    label: string;
    description?: string;
    disabled?: boolean;
  }>;
}

export interface NavigationMenuRenderableOptions {
  items: NavigationMenuItem[];
  orientation?: "horizontal" | "vertical";
  activeItemId?: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface NavigationControl {
  id: string;
  descendantIds: Set<string>;
  focusTarget: Renderable;
  dropdown?: DropdownMenuRenderable;
}

export class NavigationMenuRenderable extends BoxRenderable {
  items: NavigationMenuItem[];
  orientation: NonNullable<NavigationMenuRenderableOptions["orientation"]>;
  activeItemId?: string;
  controls: NavigationControl[] = [];

  constructor(options: NavigationMenuRenderableOptions) {
    super({
      layout: {
        flexDirection: options.orientation === "vertical" ? "column" : "row",
        alignItems: "start",
        gap: 1,
        overflow: "visible",
        ...options.layout,
      },
      style: {
        focusable: true,
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
        ...options.style,
      },
    });
    this.items = options.items;
    this.orientation = options.orientation ?? "horizontal";
    this.activeItemId = options.activeItemId;
    this.syncControls();
  }

  getActiveItemId(): string | undefined {
    return this.activeItemId;
  }

  setActiveItem(id: string): this {
    if (this.activeItemId === id) {
      return this;
    }

    const previousValue = this.activeItemId;
    this.activeItemId = id;
    this.syncControls(id);

    const event = createSyntheticEvent({
      type: "change",
      value: { id },
      previousValue: { id: previousValue },
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
    return this;
  }

  openItem(id: string): this {
    this.closeAll(id);
    this.controls.find((control) => control.id === id)?.dropdown?.open();
    return this;
  }

  closeItem(id: string): this {
    this.controls.find((control) => control.id === id)?.dropdown?.close("programmatic");
    return this;
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      const control = this.resolveCurrentControl() ?? this.controls[0];
      if (control) {
        this.renderer?.focus(control.focusTarget);
      }
      return;
    }

    if (event.type !== "key") {
      return;
    }

    const isForward =
      this.orientation === "horizontal" ? event.key === "ArrowRight" : event.key === "ArrowDown";
    const isBackward =
      this.orientation === "horizontal" ? event.key === "ArrowLeft" : event.key === "ArrowUp";

    if (isForward || isBackward) {
      const control = this.resolveCurrentControl();
      const currentIndex = control ? this.controls.indexOf(control) : -1;
      const nextIndex =
        currentIndex === -1
          ? 0
          : (currentIndex + (isForward ? 1 : -1) + this.controls.length) % this.controls.length;
      this.renderer?.focus(this.controls[nextIndex]?.focusTarget ?? null);
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      this.closeAll();
      event.preventDefault();
      return;
    }

    if (event.key === "ArrowDown" && this.orientation === "horizontal") {
      const control = this.resolveCurrentControl();
      control?.dropdown?.open();
      event.preventDefault();
    }
  }

  private syncControls(focusId?: string): void {
    for (const child of [...this.children]) {
      this.remove(child);
    }

    const previousFocus = focusId ?? this.resolveCurrentControl()?.id;
    this.controls = this.items.map((item) => this.createControl(item));
    this.add(...this.controls.map((control) => control.dropdown ?? control.focusTarget));

    if (previousFocus && this.renderer) {
      const next = this.controls.find((control) => control.id === previousFocus);
      if (next) {
        this.renderer.focus(next.focusTarget);
      }
    }

    this.invalidate("navigation-menu:controls");
  }

  private createControl(item: NavigationMenuItem): NavigationControl {
    const isActive = this.isItemActive(item);

    if (item.items && item.items.length > 0) {
      const dropdown = new DropdownMenuRenderable({
        triggerLabel: item.label,
        items: item.items.map((entry) => ({
          id: entry.id,
          label: entry.label,
          description: entry.description,
          disabled: entry.disabled,
        })),
        width: "content",
        disabled: item.disabled,
      });
      dropdown.trigger.variant = isActive ? "secondary" : "ghost";
      dropdown.trigger.updateStyle({
        border: false,
        fg: isActive ? defaultComponentTheme.title : defaultComponentTheme.fg,
      });
      dropdown.on("select", (event) => {
        const detail = (event as { value: { id: string; item: { label: string } } }).value;
        this.setActiveItem(detail.id);

        const submitEvent = createSyntheticEvent({
          type: "submit",
          value: {
            id: detail.id,
            parentId: item.id,
            item: item.items?.find((entry) => entry.id === detail.id) ?? null,
          },
        } as const);
        submitEvent.target = this;
        submitEvent.currentTarget = this;
        this.emit("select", submitEvent);
      });
      return {
        id: item.id,
        descendantIds: new Set([item.id, ...item.items.map((entry) => entry.id)]),
        focusTarget: dropdown.trigger,
        dropdown,
      };
    }

    const button = new ButtonRenderable({
      label: item.label,
      variant: isActive ? "secondary" : "ghost",
      size: "compact",
      disabled: item.disabled,
      style: {
        border: false,
        fg: isActive ? defaultComponentTheme.title : defaultComponentTheme.fg,
      },
    });
    button.on("submit", () => {
      this.closeAll();
      this.setActiveItem(item.id);

      const submitEvent = createSyntheticEvent({
        type: "submit",
        value: {
          id: item.id,
          href: item.href,
        },
      } as const);
      submitEvent.target = this;
      submitEvent.currentTarget = this;
      this.emit("select", submitEvent);
    });

    return {
      id: item.id,
      descendantIds: new Set([item.id]),
      focusTarget: button,
    };
  }

  private isItemActive(item: NavigationMenuItem): boolean {
    if (!this.activeItemId) {
      return false;
    }

    if (item.id === this.activeItemId) {
      return true;
    }

    return item.items?.some((entry) => entry.id === this.activeItemId) ?? false;
  }

  private resolveCurrentControl(): NavigationControl | undefined {
    return this.controls.find((control) => {
      const focused = this.renderer?.focusedNode;
      return (
        !!focused && (focused === control.focusTarget || focused.parent === control.focusTarget)
      );
    });
  }

  private closeAll(exceptId?: string): void {
    for (const control of this.controls) {
      if (control.id !== exceptId) {
        control.dropdown?.close("programmatic");
      }
    }
  }
}

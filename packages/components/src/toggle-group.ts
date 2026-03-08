import {
  type BaseLayoutProps,
  type BaseStyleProps,
  createSyntheticEvent,
  type RenderEvent,
} from "@neotui/core";
import { ToggleRenderable } from "./toggle";
import { ToolbarRenderable } from "./toolbar";

export interface ToggleGroupItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface ToggleGroupRenderableOptions {
  items: ToggleGroupItem[];
  type?: "single" | "multiple";
  value?: string | string[];
  disabled?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class ToggleGroupRenderable extends ToolbarRenderable {
  items: ToggleGroupItem[];
  groupType: NonNullable<ToggleGroupRenderableOptions["type"]>;
  disabled: boolean;
  readonly toggles: ToggleRenderable[] = [];

  private groupValue?: string | string[];

  constructor(options: ToggleGroupRenderableOptions) {
    super({
      layout: {
        ...options.layout,
      },
      style: options.style,
    });
    this.items = options.items;
    this.groupType = options.type ?? "single";
    this.disabled = options.disabled ?? false;
    this.groupValue = options.value ?? (this.groupType === "multiple" ? [] : this.items[0]?.id);
    this.syncItems();
  }

  getValue(): string | string[] | undefined {
    return Array.isArray(this.groupValue) ? [...this.groupValue] : this.groupValue;
  }

  setValue(value: string | string[]): this {
    const previousValue = this.getValue();
    this.groupValue =
      this.groupType === "multiple" ? normalizeMultipleValue(value) : normalizeSingleValue(value);
    this.syncPressedStates();
    this.emitChange(previousValue);
    this.invalidate("toggle-group:value");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    for (const [index, toggle] of this.toggles.entries()) {
      toggle.setDisabled(disabled || this.items[index]?.disabled === true);
    }
    this.invalidate("toggle-group:disabled");
    return this;
  }

  private syncItems(): void {
    for (const child of [...this.children]) {
      this.remove(child);
    }
    this.toggles.length = 0;

    for (const [index, item] of this.items.entries()) {
      const toggle = new ToggleRenderable({
        label: item.label,
        pressed: this.isItemSelected(item.id),
        disabled: this.disabled || item.disabled === true,
      });

      toggle.on("submit", (event) => {
        this.applySelection(index);
        event.preventDefault();
      });

      toggle.on("key", (event) => {
        const renderEvent = event as RenderEvent;
        if (renderEvent.type !== "key") {
          return;
        }

        if (renderEvent.key === "ArrowRight" || renderEvent.key === "ArrowDown") {
          this.focusToggle(index, 1);
          renderEvent.preventDefault();
          return;
        }

        if (renderEvent.key === "ArrowLeft" || renderEvent.key === "ArrowUp") {
          this.focusToggle(index, -1);
          renderEvent.preventDefault();
        }
      });

      this.toggles.push(toggle);
      this.add(toggle);
    }

    this.syncPressedStates();
  }

  private applySelection(index: number): void {
    const item = this.items[index];
    if (!item || item.disabled || this.disabled) {
      return;
    }

    const previousValue = this.getValue();
    if (this.groupType === "single") {
      this.groupValue = item.id;
    } else {
      const next = new Set(normalizeMultipleValue(this.groupValue));
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      this.groupValue = [...next];
    }

    this.syncPressedStates();
    this.emitChange(previousValue);
    this.emitSubmit();
    this.invalidate("toggle-group:selection");
  }

  private focusToggle(index: number, delta: 1 | -1): void {
    if (!this.renderer || this.toggles.length === 0) {
      return;
    }

    let nextIndex = index;
    for (let attempts = 0; attempts < this.toggles.length; attempts += 1) {
      nextIndex = (nextIndex + delta + this.toggles.length) % this.toggles.length;
      const item = this.items[nextIndex];
      if (item && item.disabled !== true && this.disabled !== true) {
        this.renderer.focus(this.toggles[nextIndex] ?? null);
        return;
      }
    }
  }

  private syncPressedStates(): void {
    for (const [index, toggle] of this.toggles.entries()) {
      const item = this.items[index];
      if (!item) {
        continue;
      }
      toggle.setPressed(this.isItemSelected(item.id));
      toggle.setDisabled(this.disabled || item.disabled === true);
    }
  }

  private isItemSelected(id: string): boolean {
    if (this.groupType === "multiple") {
      return normalizeMultipleValue(this.groupValue).includes(id);
    }

    return this.groupValue === id;
  }

  private emitChange(previousValue: string | string[] | undefined): void {
    const event = createSyntheticEvent({
      type: "change",
      value: this.getValue(),
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
  }

  private emitSubmit(): void {
    const event = createSyntheticEvent({
      type: "submit",
      value: this.getValue(),
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("submit", event);
  }
}

function normalizeSingleValue(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value) ? value[0] : undefined;
}

function normalizeMultipleValue(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) {
    return [...value];
  }

  return typeof value === "string" ? [value] : [];
}

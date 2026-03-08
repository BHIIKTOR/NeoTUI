import { type BaseLayoutProps, type BaseStyleProps, createSyntheticEvent } from "@neotui/core";
import { type DropdownMenuItem, DropdownMenuRenderable } from "./dropdown-menu";
import { defaultComponentTheme } from "./theme";

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectControlRenderableOptions {
  value?: string;
  placeholder?: string;
  options: SelectOption[];
  disabled?: boolean;
  invalid?: boolean;
  open?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class SelectControlRenderable extends DropdownMenuRenderable {
  options: SelectOption[];
  placeholder: string;
  selectedValue?: string;
  invalid: boolean;

  constructor(options: SelectControlRenderableOptions) {
    super({
      triggerLabel: resolveTriggerLabel(options.options, options.value, options.placeholder),
      items: buildSelectMenuItems(options.options),
      disabled: options.disabled,
      open: options.open,
      width: "content",
      layout: options.layout,
      style: {
        borderFg: options.invalid ? defaultComponentTheme.danger : options.style?.borderFg,
        ...options.style,
      },
    });
    this.options = options.options;
    this.placeholder = options.placeholder ?? "Select…";
    this.selectedValue = options.value;
    this.invalid = options.invalid ?? false;
    this.syncTriggerSizing(options.layout);

    this.on("select", (event) => {
      const selectedId = String((event as { value: { id: string } }).value.id);
      if (this.selectedValue !== selectedId) {
        const previousValue = this.selectedValue;
        this.selectedValue = selectedId;
        this.trigger.setLabel(
          resolveTriggerLabel(this.options, this.selectedValue, this.placeholder),
        );
        this.syncTriggerSizing(this.layoutProps);
        const changeEvent = createSyntheticEvent({
          type: "change",
          value: {
            value: this.selectedValue,
            option: this.options.find((option) => option.value === this.selectedValue),
          },
          previousValue: {
            value: previousValue,
            option: this.options.find((option) => option.value === previousValue),
          },
        } as const);
        changeEvent.target = this;
        changeEvent.currentTarget = this;
        this.emit("change", changeEvent);
      }
    });
  }

  getValue(): string | undefined {
    return this.selectedValue;
  }

  setValue(value: string): this {
    this.selectedValue = value;
    this.trigger.setLabel(resolveTriggerLabel(this.options, value, this.placeholder));
    this.setActiveItem(value);
    this.syncTriggerSizing(this.layoutProps);
    this.invalidate("select-control:value");
    return this;
  }

  setOptions(options: SelectOption[]): this {
    this.options = options;
    this.setItems(buildSelectMenuItems(options));
    this.trigger.setLabel(resolveTriggerLabel(options, this.selectedValue, this.placeholder));
    this.syncTriggerSizing(this.layoutProps);
    this.invalidate("select-control:options");
    return this;
  }

  override setDisabled(disabled: boolean): this {
    super.setDisabled(disabled);
    return this;
  }

  setInvalid(invalid: boolean): this {
    this.invalid = invalid;
    this.trigger.updateStyle({
      borderFg: invalid ? defaultComponentTheme.danger : defaultComponentTheme.border,
    });
    this.invalidate("select-control:invalid");
    return this;
  }

  private syncTriggerSizing(layout?: BaseLayoutProps): void {
    const contentWidth = Math.max(
      this.placeholder.length,
      ...this.options.map((option) => option.label.length),
    );
    this.trigger.minWidth = Math.max(12, contentWidth + 4);

    if (layout?.width === "100%") {
      this.trigger.updateLayout({ width: "100%" });
      return;
    }

    if (typeof layout?.width === "number") {
      this.trigger.updateLayout({ width: layout.width });
    }
  }
}

function buildSelectMenuItems(options: readonly SelectOption[]): DropdownMenuItem[] {
  return options.map((option) => ({
    id: option.value,
    label: option.label,
    description: option.description,
    disabled: option.disabled,
  }));
}

function resolveTriggerLabel(
  options: readonly SelectOption[],
  value: string | undefined,
  placeholder = "Select…",
): string {
  const selected = options.find((option) => option.value === value);
  return selected?.label ?? placeholder;
}

import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  type Renderable,
  TextRenderable,
} from "@neotui/core";
import { findFirstFocusableNode, isFocusableVisible } from "./internal/focus";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

export interface FieldRenderableOptions {
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  orientation?: "vertical" | "horizontal";
  validationState?: "default" | "error" | "success" | "warning";
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class FieldRenderable extends BoxRenderable {
  readonly labelNode: TextRenderable;
  readonly descriptionNode: TextRenderable;
  readonly validationNode: TextRenderable;
  readonly labelStack: ToolbarRenderable;
  readonly contentStack: ToolbarRenderable;

  label: string;
  description?: string;
  error?: string;
  required: boolean;
  disabled: boolean;
  orientation: NonNullable<FieldRenderableOptions["orientation"]>;
  validationState: NonNullable<FieldRenderableOptions["validationState"]>;
  private control: Renderable | null = null;

  constructor(options: FieldRenderableOptions) {
    const orientation = options.orientation ?? "vertical";
    super({
      layout: {
        flexDirection: orientation === "horizontal" ? "row" : "column",
        gap: 1,
        ...options.layout,
      },
      style: {
        ...options.style,
      },
    });
    this.label = options.label;
    this.description = options.description;
    this.error = options.error;
    this.required = options.required ?? false;
    this.disabled = options.disabled ?? false;
    this.orientation = orientation;
    this.validationState = options.validationState ?? (options.error ? "error" : "default");

    this.labelNode = new TextRenderable({
      content: this.renderLabel(),
      style: {
        fg: this.disabled ? defaultComponentTheme.muted : defaultComponentTheme.title,
      },
      layout: { height: 1 },
    });
    this.descriptionNode = new TextRenderable({
      content: options.description ?? "",
      wrapMode: "word",
      style: {
        fg: defaultComponentTheme.muted,
      },
      layout: {
        height: options.description ? 1 : 0,
      },
    });
    this.validationNode = new TextRenderable({
      content: options.error ?? "",
      wrapMode: "word",
      style: {
        fg: resolveValidationColor(this.validationState),
      },
      layout: {
        height: options.error ? 1 : 0,
      },
    });
    this.labelStack = new ToolbarRenderable({
      orientation: "vertical",
      layout:
        orientation === "horizontal"
          ? {
              alignItems: "start",
              width: 22,
              gap: 0,
            }
          : {
              alignItems: "start",
              gap: 0,
            },
    });
    this.contentStack = new ToolbarRenderable({
      orientation: "vertical",
      layout: {
        alignItems: "start",
        gap: 0,
        flexGrow: 1,
      },
    });

    this.labelStack.add(this.labelNode, this.descriptionNode);
    this.contentStack.add(this.validationNode);
    super.add(this.labelStack, this.contentStack);

    this.labelNode.on("mousedown", (event) => {
      this.focusControl();
      event.preventDefault();
    });
    this.descriptionNode.on("mousedown", (event) => {
      this.focusControl();
      event.preventDefault();
    });
  }

  setControl(control: Renderable): this {
    if (this.control && this.control.parent === this.contentStack) {
      this.contentStack.remove(this.control);
    }

    this.control = control;
    this.contentStack.remove(this.validationNode);
    this.contentStack.add(control, this.validationNode);
    this.propagateDisabled();
    this.invalidate("field:control");
    return this;
  }

  getControl(): Renderable | null {
    return this.control;
  }

  setLabel(label: string): this {
    this.label = label;
    this.labelNode.setContent(this.renderLabel());
    this.invalidate("field:label");
    return this;
  }

  setDescription(description?: string): this {
    this.description = description;
    this.descriptionNode.setContent(description ?? "");
    this.descriptionNode.updateLayout({ height: description ? 1 : 0 });
    this.invalidate("field:description");
    return this;
  }

  setError(error?: string): this {
    this.error = error;
    this.validationState = error ? "error" : "default";
    this.validationNode.setContent(error ?? "");
    this.validationNode.updateLayout({ height: error ? 1 : 0 });
    this.validationNode.updateStyle({ fg: resolveValidationColor(this.validationState) });
    this.invalidate("field:error");
    return this;
  }

  setValidationState(
    validationState: NonNullable<FieldRenderableOptions["validationState"]>,
  ): this {
    this.validationState = validationState;
    this.validationNode.updateStyle({ fg: resolveValidationColor(validationState) });
    this.invalidate("field:validation");
    return this;
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.labelNode.updateStyle({
      fg: disabled ? defaultComponentTheme.muted : defaultComponentTheme.title,
    });
    this.propagateDisabled();
    this.invalidate("field:disabled");
    return this;
  }

  setOrientation(orientation: NonNullable<FieldRenderableOptions["orientation"]>): this {
    this.orientation = orientation;
    this.updateLayout({
      flexDirection: orientation === "horizontal" ? "row" : "column",
    });
    this.labelStack.updateLayout(
      orientation === "horizontal"
        ? { width: 22, flexDirection: "column", gap: 0 }
        : { width: undefined, flexDirection: "column", gap: 0 },
    );
    this.invalidate("field:orientation");
    return this;
  }

  protected override paint(): void {}

  override measurePreferredSize(
    parentBounds: Parameters<BoxRenderable["measurePreferredSize"]>[0],
  ) {
    const measured = super.measurePreferredSize(parentBounds);
    const gap = this.layoutProps.gap ?? 0;
    const labelSize = this.labelStack.measurePreferredSize(parentBounds);
    const contentSize = this.contentStack.measurePreferredSize(parentBounds);

    if (this.orientation === "horizontal") {
      return {
        width: Math.max(measured.width, labelSize.width + contentSize.width + gap),
        height: Math.max(measured.height, labelSize.height, contentSize.height),
      };
    }

    return {
      width: Math.max(measured.width, labelSize.width, contentSize.width),
      height: Math.max(measured.height, labelSize.height + contentSize.height + gap),
    };
  }

  private focusControl(): void {
    if (!this.renderer || !this.control) {
      return;
    }

    const focusTarget = isFocusableVisible(this.control)
      ? this.control
      : findFirstFocusableNode(this.control, { includeRoot: true });
    if (focusTarget) {
      this.renderer.focus(focusTarget);
    }
  }

  private renderLabel(): string {
    return this.required ? `${this.label} *` : this.label;
  }

  private propagateDisabled(): void {
    if (!this.control) {
      return;
    }

    const maybeDisabled = this.control as Renderable & {
      setDisabled?: (disabled: boolean) => Renderable;
    };
    if (typeof maybeDisabled.setDisabled === "function") {
      maybeDisabled.setDisabled(this.disabled);
    }
  }
}

function resolveValidationColor(
  validationState: NonNullable<FieldRenderableOptions["validationState"]>,
): string {
  switch (validationState) {
    case "error":
      return defaultComponentTheme.danger;
    case "success":
      return defaultComponentTheme.success;
    case "warning":
      return defaultComponentTheme.title;
    default:
      return defaultComponentTheme.muted;
  }
}

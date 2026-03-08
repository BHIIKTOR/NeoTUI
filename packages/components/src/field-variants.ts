import type { BaseLayoutProps, BaseStyleProps } from "@neotui/core";
import { FieldRenderable, type FieldRenderableOptions } from "./field";
import { InputControlRenderable, type InputControlRenderableOptions } from "./input";
import { SelectControlRenderable, type SelectControlRenderableOptions } from "./select";
import { TextareaControlRenderable, type TextareaControlRenderableOptions } from "./textarea";

export interface InputFieldRenderableOptions
  extends FieldRenderableOptions,
    InputControlRenderableOptions {
  fieldLayout?: BaseLayoutProps;
  fieldStyle?: BaseStyleProps;
}

export class InputFieldRenderable extends FieldRenderable {
  readonly input: InputControlRenderable;

  constructor(options: InputFieldRenderableOptions) {
    super({
      label: options.label,
      description: options.description,
      error: options.error,
      required: options.required,
      disabled: options.disabled,
      orientation: options.orientation,
      validationState: options.validationState,
      layout: options.fieldLayout,
      style: options.fieldStyle,
    });
    this.input = new InputControlRenderable(options);
    this.setControl(this.input);
  }
}

export interface TextareaFieldRenderableOptions
  extends FieldRenderableOptions,
    TextareaControlRenderableOptions {
  fieldLayout?: BaseLayoutProps;
  fieldStyle?: BaseStyleProps;
}

export class TextareaFieldRenderable extends FieldRenderable {
  readonly textarea: TextareaControlRenderable;

  constructor(options: TextareaFieldRenderableOptions) {
    super({
      label: options.label,
      description: options.description,
      error: options.error,
      required: options.required,
      disabled: options.disabled,
      orientation: options.orientation,
      validationState: options.validationState,
      layout: options.fieldLayout,
      style: options.fieldStyle,
    });
    this.textarea = new TextareaControlRenderable(options);
    this.setControl(this.textarea);
  }
}

export interface SelectFieldRenderableOptions
  extends FieldRenderableOptions,
    SelectControlRenderableOptions {
  fieldLayout?: BaseLayoutProps;
  fieldStyle?: BaseStyleProps;
}

export class SelectFieldRenderable extends FieldRenderable {
  readonly select: SelectControlRenderable;

  constructor(options: SelectFieldRenderableOptions) {
    super({
      label: options.label,
      description: options.description,
      error: options.error,
      required: options.required,
      disabled: options.disabled,
      orientation: options.orientation,
      validationState: options.validationState,
      layout: options.fieldLayout,
      style: options.fieldStyle,
    });
    this.select = new SelectControlRenderable(options);
    this.setControl(this.select);
  }
}

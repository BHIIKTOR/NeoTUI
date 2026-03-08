import {
  ASCIIFontRenderable,
  type ASCIIFontRenderableOptions,
  CodeRenderable,
  type CodeRenderableOptions,
  DiffRenderable,
  type DiffRenderableOptions,
  LineNumberRenderable,
  type LineNumberRenderableOptions,
  MarkdownRenderable,
  type MarkdownRenderableOptions,
} from "./advanced";
import {
  BoxRenderable,
  type BoxRenderableOptions,
  FrameBufferRenderable,
  type FrameBufferRenderableOptions,
  type Renderable,
  ScrollBarRenderable,
  type ScrollBarRenderableOptions,
  ScrollBoxRenderable,
  type ScrollBoxRenderableOptions,
  TextRenderable,
  type TextRenderableOptions,
} from "./renderable";
import type { KittyRenderer } from "./renderer";
import {
  FormRenderable,
  ImageRenderable,
  type ImageRenderableOptions,
  InputRenderable,
  type InputRenderableOptions,
  LabelRenderable,
  SelectRenderable,
  type SelectRenderableOptions,
  TabSelectRenderable,
  type TabSelectRenderableOptions,
  TextareaRenderable,
  type TextareaRenderableOptions,
} from "./widgets";

export type ConstructKind =
  | "ascii-font"
  | "box"
  | "code"
  | "diff"
  | "form"
  | "framebuffer"
  | "image"
  | "input"
  | "label"
  | "line-number"
  | "markdown"
  | "scrollbar"
  | "scrollbox"
  | "select"
  | "tab-select"
  | "text"
  | "textarea";

export interface ConstructNode {
  kind: ConstructKind;
  props: unknown;
  children: Array<ConstructNode | Renderable | string>;
  queue: Array<(renderable: Renderable) => void>;
}

export function Box(
  props: BoxRenderableOptions = {},
  ...children: Array<ConstructNode | Renderable | string>
): ConstructNode {
  return createConstruct("box", props, children);
}

export function Text(props: TextRenderableOptions): ConstructNode {
  return createConstruct("text", props, []);
}

export function ScrollBox(
  props: ScrollBoxRenderableOptions = {},
  ...children: Array<ConstructNode | Renderable | string>
): ConstructNode {
  return createConstruct("scrollbox", props, children);
}

export function ScrollBar(props: ScrollBarRenderableOptions = {}): ConstructNode {
  return createConstruct("scrollbar", props, []);
}

export function FrameBuffer(props: FrameBufferRenderableOptions): ConstructNode {
  return createConstruct("framebuffer", props, []);
}

export function Input(props: InputRenderableOptions = {}): ConstructNode {
  return createConstruct("input", props, []);
}

export function Textarea(props: TextareaRenderableOptions = {}): ConstructNode {
  return createConstruct("textarea", props, []);
}

export function Select(props: SelectRenderableOptions): ConstructNode {
  return createConstruct("select", props, []);
}

export function TabSelect(props: TabSelectRenderableOptions): ConstructNode {
  return createConstruct("tab-select", props, []);
}

export function Image(props: ImageRenderableOptions): ConstructNode {
  return createConstruct("image", props, []);
}

export function Form(
  props: BoxRenderableOptions = {},
  ...children: Array<ConstructNode | Renderable | string>
): ConstructNode {
  return createConstruct("form", props, children);
}

export function Label(props: TextRenderableOptions): ConstructNode {
  return createConstruct("label", props, []);
}

export function Code(props: CodeRenderableOptions): ConstructNode {
  return createConstruct("code", props, []);
}

export function Markdown(props: MarkdownRenderableOptions): ConstructNode {
  return createConstruct("markdown", props, []);
}

export function Diff(props: DiffRenderableOptions): ConstructNode {
  return createConstruct("diff", props, []);
}

export function LineNumber(props: LineNumberRenderableOptions): ConstructNode {
  return createConstruct("line-number", props, []);
}

export function ASCIIFont(props: ASCIIFontRenderableOptions): ConstructNode {
  return createConstruct("ascii-font", props, []);
}

export function delegate<T extends ConstructNode>(
  construct: T,
  callback: (renderable: Renderable) => void,
): T {
  construct.queue.push(callback);
  return construct;
}

export function materializeConstruct(
  _renderer: KittyRenderer,
  input: ConstructNode | Renderable | string,
): Renderable {
  const renderable =
    typeof input === "string"
      ? new TextRenderable({ content: input })
      : isRenderable(input)
        ? input
        : createRenderableFromConstruct(input);

  if (!isRenderable(input) && typeof input !== "string") {
    for (const child of input.children) {
      renderable.add(materializeConstruct(_renderer, child));
    }

    for (const callback of input.queue) {
      callback(renderable);
    }
  }

  return renderable;
}

function createConstruct(
  kind: ConstructKind,
  props: unknown,
  children: Array<ConstructNode | Renderable | string>,
): ConstructNode {
  return {
    kind,
    props,
    children,
    queue: [],
  };
}

function createRenderableFromConstruct(node: ConstructNode): Renderable {
  switch (node.kind) {
    case "ascii-font":
      return new ASCIIFontRenderable(node.props as ASCIIFontRenderableOptions);
    case "box":
      return new BoxRenderable(node.props as BoxRenderableOptions);
    case "code":
      return new CodeRenderable(node.props as CodeRenderableOptions);
    case "diff":
      return new DiffRenderable(node.props as DiffRenderableOptions);
    case "form":
      return new FormRenderable(node.props as BoxRenderableOptions);
    case "framebuffer":
      return new FrameBufferRenderable(node.props as FrameBufferRenderableOptions);
    case "image":
      return new ImageRenderable(node.props as ImageRenderableOptions);
    case "input":
      return new InputRenderable(node.props as InputRenderableOptions);
    case "label":
      return new LabelRenderable(node.props as TextRenderableOptions);
    case "line-number":
      return new LineNumberRenderable(node.props as LineNumberRenderableOptions);
    case "markdown":
      return new MarkdownRenderable(node.props as MarkdownRenderableOptions);
    case "scrollbar":
      return new ScrollBarRenderable(node.props as ScrollBarRenderableOptions);
    case "scrollbox":
      return new ScrollBoxRenderable(node.props as ScrollBoxRenderableOptions);
    case "select":
      return new SelectRenderable(node.props as SelectRenderableOptions);
    case "tab-select":
      return new TabSelectRenderable(node.props as TabSelectRenderableOptions);
    case "text":
      return new TextRenderable(node.props as TextRenderableOptions);
    case "textarea":
      return new TextareaRenderable(node.props as TextareaRenderableOptions);
  }
}

function isRenderable(value: ConstructNode | Renderable | string): value is Renderable {
  return typeof value !== "string" && "type" in value && "render" in value;
}

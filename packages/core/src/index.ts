export type {
  ASCIIFontRenderableOptions,
  CodeRenderableOptions,
  DiffRenderableOptions,
  LineNumberRenderableOptions,
  MarkdownRenderableOptions,
} from "./advanced";
export {
  ASCIIFontRenderable,
  CodeRenderable,
  DiffRenderable,
  LineNumberRenderable,
  MarkdownRenderable,
} from "./advanced";
export type {
  ClipboardAccess,
  ClipboardCapabilities,
  ClipboardModifier,
  ClipboardShortcutProfile,
} from "./clipboard";
export {
  detectClipboardShortcutProfile,
  NativeClipboardAccess,
} from "./clipboard";
export type { ConstructKind, ConstructNode } from "./constructs";
export {
  ASCIIFont,
  Box,
  Code,
  Diff,
  delegate,
  Form,
  FrameBuffer as FrameBufferConstruct,
  Image,
  Input,
  Label,
  LineNumber,
  Markdown,
  materializeConstruct,
  ScrollBar,
  ScrollBox,
  Select,
  TabSelect,
  Text,
  Textarea,
} from "./constructs";
export type {
  ChangeEvent,
  EventModifiers,
  FocusEvent,
  KeyEvent,
  MouseEvent,
  PasteEvent,
  RenderEvent,
  RenderEventHandler,
  RenderEventType,
  SubmitEvent,
} from "./events";
export { createFocusEvent, createSyntheticEvent, eventAliases, parseInput } from "./events";
export { FrameBuffer } from "./frame-buffer";
export { layoutTree, normalizeSpacing, resolveDimension, shrinkRect } from "./layout";
export type { CursorStyleOptions, KittyImageWriteOptions } from "./protocol";
export { CONTROL_SEQUENCES, ProtocolWriter } from "./protocol";
export type {
  BoxRenderableOptions,
  FrameBufferRenderableOptions,
  ScrollBarRenderableOptions,
  ScrollBoxRenderableOptions,
  TextRenderableOptions,
} from "./renderable";
export {
  BoxRenderable,
  FrameBufferRenderable,
  LineCollectionRenderable,
  Renderable,
  ScrollBarRenderable,
  ScrollBoxRenderable,
  TextRenderable,
} from "./renderable";
export type { CreateKittyRendererOptions } from "./renderer";
export {
  createKittyRenderer,
  createMinimalRendererTree,
  KittyRenderer,
  RootRenderable,
} from "./renderer";
export type {
  KittySessionCapabilities,
  MouseMode,
  RawModeInput,
  RuntimeTarget,
  SignalTarget,
  TerminalSessionOptions,
  TerminalSize,
  TerminalTarget,
  WritableOutput,
} from "./terminal-session";
export { detectKittyCapabilities, TerminalSession, withTerminalSession } from "./terminal-session";
export type {
  MultilineEditorSnapshot,
  RenderTextBlockOptions,
  StyledGrapheme,
  TextareaCursorRenderState,
  TextareaDisplayState,
  TextareaDocumentInsertOptions,
  TextareaInteractionOptions,
  TextareaInteractionResult,
  TextareaKeyInput,
  TextareaPasteSummaryState,
  TextareaPointerInput,
  TextareaPresentationState,
  TextareaRenderOptions,
  TextareaRenderState,
  TextareaScrollbarRenderState,
  TextareaVisualCell,
  TextareaVisualRow,
  TextLineMeta,
  TextSelection,
  WrappedLine,
} from "./text";
export {
  createSelection,
  EditingBuffer,
  getTextLineMetas,
  graphemeCount,
  locateCursorInText,
  MultilineEditorBuffer,
  measureGraphemeWidth,
  measureTextWidth,
  normalizeTextSpans,
  renderTextBlock,
  serializeSelection,
  sliceByGrapheme,
  splitGraphemes,
  TextareaControllerModel,
  TextareaDocumentModel,
  TextareaViewportModel,
  TextareaViewportState,
  wrapText,
} from "./text";
export type {
  AlignItems,
  BaseLayoutProps,
  BaseStyleProps,
  BorderStyle,
  CursorShape,
  CursorState,
  DimensionValue,
  FlexDirection,
  ImageOperation,
  JustifyContent,
  LayoutState,
  OverflowMode,
  PositionMode,
  PositionValue,
  Rect,
  RenderCell,
  RenderDiff,
  RenderMetrics,
  Size,
  Spacing,
  SpacingValue,
  TextSpan,
  WrapMode,
} from "./types";
export type {
  FormRenderableOptions,
  ImageRenderableOptions,
  InputRenderableOptions,
  SelectRenderableOptions,
  TabSelectRenderableOptions,
  TextareaRenderableOptions,
} from "./widgets";
export {
  FormRenderable,
  ImageRenderable,
  InputRenderable,
  LabelRenderable,
  SelectRenderable,
  TabSelectRenderable,
  TextareaRenderable,
} from "./widgets";

export function createM1SmokeScene(): string[] {
  return [
    "NeoTui",
    "milestone: M10 interactive core online",
    "runtime: bun",
    "terminal target: kitty",
    "renderer: interactive and kitty-native",
  ];
}

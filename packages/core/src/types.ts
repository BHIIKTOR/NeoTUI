export type DimensionValue = number | `${number}%` | "auto";
export type PositionValue = number | `${number}%`;
export type FlexDirection = "row" | "column";
export type AlignItems = "start" | "center" | "end" | "stretch";
export type JustifyContent = "start" | "center" | "end" | "between";
export type OverflowMode = "visible" | "hidden" | "scroll";
export type PositionMode = "relative" | "absolute";
export type BorderStyle = "none" | "line";
export type WrapMode = "none" | "char" | "word";
export type CursorShape = "block" | "beam" | "underline";
export type ColorValue = string;

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Spacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type SpacingValue = number | Partial<Spacing>;

export interface BaseLayoutProps {
  width?: DimensionValue;
  height?: DimensionValue;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  flexDirection?: FlexDirection;
  flexGrow?: number;
  flexShrink?: number;
  padding?: SpacingValue;
  margin?: SpacingValue;
  gap?: number;
  position?: PositionMode;
  top?: PositionValue;
  right?: PositionValue;
  bottom?: PositionValue;
  left?: PositionValue;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
  overflow?: OverflowMode;
  zIndex?: number;
}

export interface BaseStyleProps {
  border?: BorderStyle | boolean;
  title?: string;
  backgroundChar?: string;
  opacity?: number;
  visible?: boolean;
  focusable?: boolean;
  fg?: ColorValue;
  bg?: ColorValue;
  borderFg?: ColorValue;
  titleFg?: ColorValue;
}

export interface LayoutState {
  bounds: Rect;
  innerBounds: Rect;
  clipRect: Rect;
}

export interface RenderCell {
  char: string;
  href?: string;
  title?: string;
  fg?: ColorValue;
  bg?: ColorValue;
}

export interface TextSpan {
  text: string;
  href?: string;
  fg?: ColorValue;
  bg?: ColorValue;
}

export interface RenderMetrics {
  frameCount: number;
  lastFrameDurationMs: number;
  lastDirtyRows: number[];
  lastDirtyCellCount: number;
  lastInvalidatedIds: string[];
  lastRenderedNodeCount: number;
}

export interface RenderDiff {
  dirtyRows: number[];
  dirtyCellCount: number;
  changed: boolean;
}

export interface CursorState {
  x: number;
  y: number;
  shape?: CursorShape;
  color?: string;
  blink?: boolean;
  visible?: boolean;
}

export interface ImageOperation {
  imageId: string;
  source: string;
  alt?: string;
  bounds: Rect;
}

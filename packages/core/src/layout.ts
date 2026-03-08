import type { Renderable } from "./renderable";
import type {
  AlignItems,
  BaseLayoutProps,
  FlexDirection,
  Rect,
  Size,
  Spacing,
  SpacingValue,
} from "./types";

export function layoutTree(root: Renderable, size: Size): void {
  const bounds: Rect = { x: 0, y: 0, width: size.width, height: size.height };
  const rootSpacing = normalizeSpacing(root.layoutProps.padding);
  const rootInner = shrinkRect(bounds, rootSpacing, root.hasBorder());

  root.layoutState = {
    bounds,
    innerBounds: rootInner,
    clipRect: bounds,
  };

  layoutChildren(root, rootInner, bounds);
}

export function normalizeSpacing(value?: SpacingValue): Spacing {
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }

  return {
    top: value?.top ?? 0,
    right: value?.right ?? 0,
    bottom: value?.bottom ?? 0,
    left: value?.left ?? 0,
  };
}

export function shrinkRect(rect: Rect, spacing: Spacing, border: boolean): Rect {
  const borderOffset = border ? 1 : 0;

  return {
    x: rect.x + spacing.left + borderOffset,
    y: rect.y + spacing.top + borderOffset,
    width: Math.max(0, rect.width - spacing.left - spacing.right - borderOffset * 2),
    height: Math.max(0, rect.height - spacing.top - spacing.bottom - borderOffset * 2),
  };
}

function layoutChildren(parent: Renderable, containerRect: Rect, clipRect: Rect): void {
  const children = parent.children.filter((child) => child.isVisibleForLayout());
  const relativeChildren = children.filter((child) => child.layoutProps.position !== "absolute");
  const absoluteChildren = children.filter((child) => child.layoutProps.position === "absolute");

  layoutRelativeChildren(parent, relativeChildren, containerRect, clipRect);

  for (const child of absoluteChildren) {
    applyAbsoluteLayout(child, containerRect, clipRect);
  }
}

function layoutRelativeChildren(
  parent: Renderable,
  children: Renderable[],
  containerRect: Rect,
  clipRect: Rect,
): void {
  const direction = parent.layoutProps.flexDirection ?? "column";
  const gap = parent.layoutProps.gap ?? 0;
  const mainAvailable = direction === "row" ? containerRect.width : containerRect.height;
  const crossAvailable = direction === "row" ? containerRect.height : containerRect.width;

  const items = children.map((child) => {
    const margin = normalizeSpacing(child.layoutProps.margin);
    const measured = child.measurePreferredSize(containerRect);
    const mainExplicit = resolveMainDimension(child.layoutProps, direction, mainAvailable);
    const crossExplicit = resolveCrossDimension(child.layoutProps, direction, crossAvailable);
    const mainSize = mainExplicit ?? (direction === "row" ? measured.width : measured.height);
    const crossSize = crossExplicit ?? (direction === "row" ? measured.height : measured.width);

    return {
      child,
      margin,
      measured,
      mainSize,
      crossSize,
      grow: child.layoutProps.flexGrow ?? 0,
      shrink: child.layoutProps.flexShrink ?? 1,
    };
  });

  const fixedMain = items.reduce((total, item) => {
    const marginMain =
      direction === "row"
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;

    return total + item.mainSize + marginMain;
  }, 0);

  const totalGap = Math.max(0, items.length - 1) * gap;
  const growTotal = items.reduce((total, item) => total + item.grow, 0);
  const shrinkTotal =
    direction === "row" ? items.reduce((total, item) => total + item.shrink * item.mainSize, 0) : 0;
  const occupiedMain = fixedMain + totalGap;
  const overflow = direction === "row" ? Math.max(0, occupiedMain - mainAvailable) : 0;
  const remaining = Math.max(0, mainAvailable - occupiedMain);
  const adjustedMainSizes = items.map((item) => {
    if (overflow > 0 && shrinkTotal > 0) {
      return Math.max(1, item.mainSize - (overflow * item.shrink * item.mainSize) / shrinkTotal);
    }

    if (overflow === 0 && growTotal > 0) {
      return item.mainSize + (remaining * item.grow) / growTotal;
    }

    return item.mainSize;
  });
  const adjustedOccupiedMain =
    adjustedMainSizes.reduce((total, size, index) => {
      const margin = items[index]?.margin;
      const marginMain =
        direction === "row"
          ? (margin?.left ?? 0) + (margin?.right ?? 0)
          : (margin?.top ?? 0) + (margin?.bottom ?? 0);

      return total + size + marginMain;
    }, 0) + totalGap;
  const justifyRemaining = Math.max(0, mainAvailable - adjustedOccupiedMain);
  const justify = parent.layoutProps.justifyContent ?? "start";
  const extraGap =
    justify === "between" && items.length > 1 ? justifyRemaining / (items.length - 1) : 0;
  const leadingOffset =
    justify === "center" ? justifyRemaining / 2 : justify === "end" ? justifyRemaining : 0;

  let cursor = leadingOffset;

  for (const [index, item] of items.entries()) {
    const mainSize = clampMainSize(
      item.child.layoutProps,
      adjustedMainSizes[index] ?? item.mainSize,
      direction,
    );
    const crossSize = clampCrossSize(
      item.child.layoutProps,
      parent.layoutProps.alignItems ?? "stretch",
      item.crossSize,
      crossAvailable,
      direction,
    );

    const rect =
      direction === "row"
        ? {
            x: containerRect.x + cursor + item.margin.left,
            y:
              containerRect.y +
              crossOffset(
                parent.layoutProps.alignItems ?? "stretch",
                crossAvailable,
                crossSize,
                item.margin,
                "row",
              ),
            width: Math.max(0, Math.floor(mainSize)),
            height: Math.max(0, Math.floor(crossSize)),
          }
        : {
            x:
              containerRect.x +
              crossOffset(
                parent.layoutProps.alignItems ?? "stretch",
                crossAvailable,
                crossSize,
                item.margin,
                "column",
              ),
            y: containerRect.y + cursor + item.margin.top,
            width: Math.max(0, Math.floor(crossSize)),
            height: Math.max(0, Math.floor(mainSize)),
          };

    applyLayoutState(item.child, rect, clipRect);

    const marginMain =
      direction === "row"
        ? item.margin.left + item.margin.right
        : item.margin.top + item.margin.bottom;

    cursor += mainSize + marginMain + gap + extraGap;
  }
}

function applyAbsoluteLayout(child: Renderable, containerRect: Rect, clipRect: Rect): void {
  const measured = child.measurePreferredSize(containerRect);
  const left = resolveDimension(child.layoutProps.left, containerRect.width);
  const right = resolveDimension(child.layoutProps.right, containerRect.width);
  const top = resolveDimension(child.layoutProps.top, containerRect.height);
  const bottom = resolveDimension(child.layoutProps.bottom, containerRect.height);
  const resolvedWidth =
    resolveDimension(child.layoutProps.width, containerRect.width) ??
    (left !== undefined && right !== undefined
      ? Math.max(0, containerRect.width - left - right)
      : measured.width);
  const resolvedHeight =
    resolveDimension(child.layoutProps.height, containerRect.height) ??
    (top !== undefined && bottom !== undefined
      ? Math.max(0, containerRect.height - top - bottom)
      : measured.height);
  const width = clampDimension(
    resolvedWidth,
    child.layoutProps.minWidth,
    child.layoutProps.maxWidth,
  );
  const height = clampDimension(
    resolvedHeight,
    child.layoutProps.minHeight,
    child.layoutProps.maxHeight,
  );
  const rect: Rect = {
    x: containerRect.x + (left ?? Math.max(0, containerRect.width - width - (right ?? 0))),
    y: containerRect.y + (top ?? Math.max(0, containerRect.height - height - (bottom ?? 0))),
    width,
    height,
  };

  applyLayoutState(child, rect, clipRect);
}

function applyLayoutState(child: Renderable, bounds: Rect, clipRect: Rect): void {
  const padding = normalizeSpacing(child.layoutProps.padding);
  const innerBounds = shrinkRect(bounds, padding, child.hasBorder());
  const nextClipRect =
    child.layoutProps.overflow === "visible" ? clipRect : intersectRects(clipRect, bounds);

  child.layoutState = {
    bounds,
    innerBounds,
    clipRect: nextClipRect,
  };

  layoutChildren(child, innerBounds, nextClipRect);
}

function resolveMainDimension(
  props: BaseLayoutProps,
  direction: FlexDirection,
  available: number,
): number | undefined {
  return direction === "row"
    ? resolveDimension(props.width, available)
    : resolveDimension(props.height, available);
}

function resolveCrossDimension(
  props: BaseLayoutProps,
  direction: FlexDirection,
  available: number,
): number | undefined {
  return direction === "row"
    ? resolveDimension(props.height, available)
    : resolveDimension(props.width, available);
}

function clampMainSize(props: BaseLayoutProps, value: number, direction: FlexDirection): number {
  return direction === "row"
    ? clampDimension(value, props.minWidth, props.maxWidth)
    : clampDimension(value, props.minHeight, props.maxHeight);
}

function clampCrossSize(
  props: BaseLayoutProps,
  align: AlignItems,
  value: number,
  available: number,
  direction: FlexDirection,
): number {
  const stretched =
    align === "stretch" && resolveCrossDimension(props, direction, available) === undefined
      ? available
      : value;

  return direction === "row"
    ? clampDimension(stretched, props.minHeight, props.maxHeight)
    : clampDimension(stretched, props.minWidth, props.maxWidth);
}

function crossOffset(
  align: AlignItems,
  available: number,
  size: number,
  margin: Spacing,
  direction: FlexDirection,
): number {
  const start = direction === "row" ? margin.top : margin.left;
  const end = direction === "row" ? margin.bottom : margin.right;
  const free = Math.max(0, available - size - start - end);

  if (align === "center") {
    return Math.floor(free / 2) + start;
  }

  if (align === "end") {
    return free + start;
  }

  return start;
}

export function resolveDimension(value: unknown, available: number): number | undefined {
  if (typeof value === "number") {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value === "string" && value.endsWith("%")) {
    return Math.max(0, Math.floor((Number.parseFloat(value) / 100) * available));
  }

  return undefined;
}

function clampDimension(value: number, min?: number, max?: number): number {
  let next = Math.max(0, Math.floor(value));

  if (typeof min === "number") {
    next = Math.max(next, min);
  }

  if (typeof max === "number") {
    next = Math.min(next, max);
  }

  return next;
}

function intersectRects(left: Rect, right: Rect): Rect {
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const width = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - x);
  const height = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - y);

  return { x, y, width, height };
}

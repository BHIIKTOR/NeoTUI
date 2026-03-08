import type { KittyRenderer, Renderable } from "@neotui/core";

export function collectFocusableNodes(
  node: Renderable,
  options: { includeRoot?: boolean } = {},
): Renderable[] {
  const focusables: Renderable[] = [];

  const visit = (current: Renderable, includeSelf: boolean) => {
    if (includeSelf && current.isFocusable() && current.isVisibleForLayout()) {
      focusables.push(current);
    }

    for (const child of current.children) {
      visit(child, true);
    }
  };

  visit(node, options.includeRoot ?? false);
  return focusables;
}

export function findFirstFocusableNode(
  node: Renderable,
  options: { includeRoot?: boolean } = {},
): Renderable | null {
  return collectFocusableNodes(node, options)[0] ?? null;
}

export function isFocusableVisible(node: Renderable | null | undefined): node is Renderable {
  return !!node && node.isFocusable() && node.isVisibleForLayout();
}

export function cycleFocusableNodes(
  renderer: KittyRenderer,
  scope: Renderable,
  reverse = false,
  options: { includeRoot?: boolean } = {},
): Renderable | null {
  const focusables = collectFocusableNodes(scope, options);
  if (focusables.length === 0) {
    return null;
  }

  const currentIndex = renderer.focusedNode ? focusables.indexOf(renderer.focusedNode) : -1;
  const nextIndex =
    currentIndex === -1
      ? 0
      : (currentIndex + (reverse ? -1 : 1) + focusables.length) % focusables.length;
  const next = focusables[nextIndex] ?? null;
  renderer.focus(next);
  return next;
}

export function isNodeWithin(target: Renderable | null, scope: Renderable | null): boolean {
  if (!target || !scope) {
    return false;
  }

  let current: Renderable | null = target;
  while (current) {
    if (current === scope) {
      return true;
    }
    current = current.parent;
  }

  return false;
}

import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  type Renderable,
  type RenderEvent,
} from "@neotui/core";
import { cycleFocusableNodes, findFirstFocusableNode, isFocusableVisible } from "./internal/focus";
import { ScrimRenderable } from "./internal/scrim";

export interface OverlayManagerRenderableOptions {
  closeTopOnEscape?: boolean;
  trapFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export interface OverlayRegistration {
  id: string;
  node: Renderable;
  modal: boolean;
  backdrop?: boolean;
  initialFocus?: Renderable | null;
  restoreFocus?: Renderable | null;
  manageFocus?: boolean;
  exclusiveGroup?: string;
  openOverlay?: () => void;
  closeOverlay?: (reason?: string) => void;
  isOverlayOpen?: () => boolean;
}

interface RegisteredOverlay extends OverlayRegistration {
  trackedOpen: boolean;
  dispose: Array<() => void>;
}

export class OverlayManagerRenderable extends BoxRenderable {
  readonly backdrop: ScrimRenderable;
  closeTopOnEscape: boolean;
  trapFocus: boolean;

  private readonly overlays = new Map<string, RegisteredOverlay>();
  private readonly stack: string[] = [];

  constructor(options: OverlayManagerRenderableOptions = {}) {
    super({
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: "visible",
        zIndex: 180,
        ...options.layout,
      },
      style: {
        visible: false,
        focusable: false,
        ...options.style,
      },
    });
    this.closeTopOnEscape = options.closeTopOnEscape ?? true;
    this.trapFocus = options.trapFocus ?? true;
    this.backdrop = new ScrimRenderable({
      style: {
        visible: false,
        bg: "#0f0a08",
        fg: "#c4b39d",
      },
    });

    super.add(this.backdrop);

    this.backdrop.on("mousedown", (event) => {
      const top = this.topOverlay();
      if (top?.modal && top.backdrop !== false) {
        this.closeTop("backdrop");
        event.preventDefault();
      }
    });
  }

  register(entry: OverlayRegistration): this {
    const existing = this.overlays.get(entry.id);
    if (existing?.node !== entry.node && existing?.node.parent === this) {
      this.remove(existing.node);
    }
    existing?.dispose.forEach((dispose) => {
      dispose();
    });

    const overlay: RegisteredOverlay = {
      ...entry,
      trackedOpen:
        existing?.trackedOpen ?? entry.isOverlayOpen?.() ?? entry.node.styleProps.visible === true,
      dispose: [],
    };
    this.overlays.set(entry.id, overlay);
    if (!overlay.isOverlayOpen && !overlay.openOverlay && !overlay.closeOverlay) {
      overlay.node.setVisible(overlay.trackedOpen);
    }
    if (overlay.node.parent !== this) {
      super.add(overlay.node);
    }
    this.attachOverlayListeners(overlay);
    this.syncStack();
    return this;
  }

  unregister(id: string): this {
    const overlay = this.overlays.get(id);
    if (!overlay) {
      return this;
    }

    overlay.dispose.forEach((dispose) => {
      dispose();
    });
    this.overlays.delete(id);
    const stackIndex = this.stack.indexOf(id);
    if (stackIndex !== -1) {
      this.stack.splice(stackIndex, 1);
    }
    if (overlay.node.parent === this) {
      this.remove(overlay.node);
    }
    this.syncStack();
    return this;
  }

  open(id: string): this {
    const overlay = this.overlays.get(id);
    if (!overlay) {
      return this;
    }

    if (overlay.exclusiveGroup) {
      for (const [candidateId, candidate] of this.overlays) {
        if (candidateId !== id && candidate.exclusiveGroup === overlay.exclusiveGroup) {
          this.close(candidateId, "superseded");
        }
      }
    }

    this.setOverlayOpenState(overlay, true);
    const stackIndex = this.stack.indexOf(id);
    if (stackIndex !== -1) {
      this.stack.splice(stackIndex, 1);
    }
    this.stack.push(id);
    this.syncStack();

    if (overlay.manageFocus !== false) {
      const nextFocus = isFocusableVisible(overlay.initialFocus)
        ? overlay.initialFocus
        : (findFirstFocusableNode(overlay.node, { includeRoot: true }) ?? overlay.node);
      this.renderer?.focus(nextFocus);
    }
    return this;
  }

  close(id: string, reason = "programmatic"): this {
    const overlay = this.overlays.get(id);
    if (!overlay || !this.isOverlayOpen(overlay)) {
      return this;
    }

    this.setOverlayOpenState(overlay, false, reason);
    const stackIndex = this.stack.indexOf(id);
    if (stackIndex !== -1) {
      this.stack.splice(stackIndex, 1);
    }
    this.syncStack();

    const restore = this.topOverlay();
    if (restore && restore.manageFocus !== false) {
      const restoreTarget = isFocusableVisible(restore.initialFocus)
        ? restore.initialFocus
        : (findFirstFocusableNode(restore.node, { includeRoot: true }) ?? restore.node);
      this.renderer?.focus(restoreTarget);
    } else if (
      overlay.manageFocus !== false &&
      overlay.restoreFocus?.isFocusable() &&
      overlay.restoreFocus.isVisibleForLayout()
    ) {
      this.renderer?.focus(overlay.restoreFocus);
    }

    const event = createSyntheticEvent({
      type: "cancel",
      reason,
      id,
    } as const);
    event.target = overlay.node;
    event.currentTarget = this;
    this.emit("close", event as never);
    return this;
  }

  closeTop(reason = "programmatic"): this {
    const id = this.getTopOverlayId();
    if (id) {
      this.close(id, reason);
    }
    return this;
  }

  getTopOverlayId(): string | null {
    return this.stack.at(-1) ?? null;
  }

  override handleEvent(event: RenderEvent): void {
    const top = this.topOverlay();
    if (!top) {
      return;
    }

    if (this.closeTopOnEscape && event.type === "key" && event.key === "Escape") {
      this.closeTop("escape");
      event.preventDefault();
      return;
    }

    if (this.trapFocus && event.type === "key" && event.key === "Tab") {
      if (this.renderer) {
        cycleFocusableNodes(this.renderer, top.node, event.modifiers.shift, { includeRoot: true });
      }
      event.preventDefault();
    }
  }

  protected override paint(): void {}

  private syncStack(): void {
    const openOverlays = this.stack
      .map((id) => this.overlays.get(id))
      .filter((overlay): overlay is RegisteredOverlay => !!overlay && this.isOverlayOpen(overlay));

    this.setVisible(openOverlays.length > 0);

    openOverlays.forEach((overlay, index) => {
      overlay.node.updateLayout({ zIndex: 2 + index * 2 });
    });

    const topModal = [...openOverlays].reverse().find((overlay) => overlay.modal);
    this.backdrop.setVisible(!!topModal && topModal.backdrop !== false);
    this.backdrop.updateLayout({
      zIndex: topModal ? Math.max(1, (topModal.node.layoutProps.zIndex ?? 2) - 1) : 0,
    });
    this.invalidate("overlay-manager:sync");
  }

  private topOverlay(): RegisteredOverlay | null {
    const id = this.getTopOverlayId();
    return id ? (this.overlays.get(id) ?? null) : null;
  }

  private attachOverlayListeners(overlay: RegisteredOverlay): void {
    const syncTrackedOpen = (open: boolean) => {
      if (overlay.trackedOpen === open) {
        return;
      }

      overlay.trackedOpen = open;
      if (!open) {
        const stackIndex = this.stack.indexOf(overlay.id);
        if (stackIndex !== -1) {
          this.stack.splice(stackIndex, 1);
        }
      }
      this.syncStack();
    };

    const onClose = () => {
      syncTrackedOpen(false);
    };
    const onOpenChange = (event: { value?: { open?: boolean } }) => {
      if (typeof event?.value?.open === "boolean") {
        syncTrackedOpen(event.value.open);
      }
    };

    overlay.node.on("close", onClose as never);
    overlay.node.on("openChange", onOpenChange as never);
    overlay.dispose.push(
      () => overlay.node.off("close", onClose as never),
      () => overlay.node.off("openChange", onOpenChange as never),
    );
  }

  private isOverlayOpen(overlay: RegisteredOverlay): boolean {
    return overlay.isOverlayOpen?.() ?? overlay.trackedOpen;
  }

  private setOverlayOpenState(overlay: RegisteredOverlay, open: boolean, reason?: string): void {
    overlay.trackedOpen = open;
    if (open) {
      overlay.openOverlay?.();
      if (!overlay.openOverlay && !overlay.isOverlayOpen) {
        overlay.node.setVisible(true);
      }
      return;
    }

    overlay.closeOverlay?.(reason);
    if (!overlay.closeOverlay && !overlay.isOverlayOpen) {
      overlay.node.setVisible(false);
    }
  }
}

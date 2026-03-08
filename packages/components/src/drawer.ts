import type { BaseLayoutProps, BaseStyleProps } from "@neotui/core";
import { SheetRenderable, type SheetRenderableOptions } from "./sheet";

export interface DrawerRenderableOptions {
  title?: string;
  open?: boolean;
  side?: "bottom" | "left" | "right";
  modal?: boolean;
  dismissible?: boolean;
  height?: number | `${number}%`;
  width?: number | `${number}%`;
  compact?: boolean;
  showCloseButton?: boolean;
  restoreFocus?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DrawerRenderable extends SheetRenderable {
  compact: boolean;

  constructor(options: DrawerRenderableOptions = {}) {
    const side = options.side ?? "bottom";
    const compact = options.compact ?? true;
    const sheetOptions: SheetRenderableOptions = {
      title: options.title,
      open: options.open,
      side,
      modal: options.modal ?? true,
      dismissible: options.dismissible ?? true,
      height: options.height ?? (side === "bottom" ? (compact ? 8 : "34%") : "40%"),
      width: options.width ?? (side === "bottom" ? "100%" : compact ? 24 : "34%"),
      showCloseButton: options.showCloseButton ?? false,
      restoreFocus: options.restoreFocus ?? true,
      layout: options.layout,
      style: options.style,
    };
    super(sheetOptions);
    this.compact = compact;
  }
}

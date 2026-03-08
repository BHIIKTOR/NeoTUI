import {
  BadgeRenderable,
  type BadgeRenderableOptions,
  BreadcrumbRenderable,
  type BreadcrumbRenderableOptions,
  ButtonRenderable,
  type ButtonRenderableOptions,
  CalendarRenderable,
  type CalendarRenderableOptions,
  CheckboxRenderable,
  type CheckboxRenderableOptions,
  CommandRenderable,
  type CommandRenderableOptions,
  DatePickerRenderable,
  type DatePickerRenderableOptions,
  DialogRenderable,
  type DialogRenderableOptions,
  DrawerRenderable,
  type DrawerRenderableOptions,
  defaultComponentTheme,
  InputFieldRenderable,
  type InputFieldRenderableOptions,
  PaginationRenderable,
  type PaginationRenderableOptions,
  PanelRenderable,
  type PanelRenderableOptions,
  RadioGroupRenderable,
  type RadioGroupRenderableOptions,
  ScrollAreaRenderable,
  type ScrollAreaRenderableOptions,
  SelectFieldRenderable,
  type SelectFieldRenderableOptions,
  SheetRenderable,
  type SheetRenderableOptions,
  SidebarRenderable,
  type SidebarRenderableOptions,
  SliderRenderable,
  type SliderRenderableOptions,
  SwitchRenderable,
  type SwitchRenderableOptions,
  TableRenderable,
  type TableRenderableOptions,
  TabsRenderable,
  type TabsRenderableOptions,
  TextareaFieldRenderable,
  type TextareaFieldRenderableOptions,
  ToastRenderable,
  type ToastRenderableOptions,
  ToggleGroupRenderable,
  type ToggleGroupRenderableOptions,
  ToggleRenderable,
  type ToggleRenderableOptions,
  ToolbarRenderable,
  type ToolbarRenderableOptions,
  WindowManagerRenderable,
  type WindowManagerRenderableOptions,
  WindowRenderable,
  type WindowRenderableOptions,
} from "@neotui/components";
import type { BaseLayoutProps, BaseStyleProps, Renderable, RenderEvent } from "@neotui/core";
import {
  createElement,
  type ForwardedRef,
  forwardRef,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

type EventHandler = ((event: unknown) => void) | undefined;
type ManagedRenderableProps<T extends Renderable> = { children?: ReactNode; ref?: Ref<T> };

const MANAGED_RENDERABLE_TYPE = "managed-renderable" as const;

export interface PanelProps
  extends PanelRenderableOptions,
    ManagedRenderableProps<PanelRenderable> {}

export interface ToolbarProps
  extends ToolbarRenderableOptions,
    ManagedRenderableProps<ToolbarRenderable> {}

export interface ButtonProps
  extends ButtonRenderableOptions,
    ManagedRenderableProps<ButtonRenderable> {
  onPress?: EventHandler;
  onSubmit?: EventHandler;
}

export interface BadgeProps
  extends BadgeRenderableOptions,
    ManagedRenderableProps<BadgeRenderable> {}

export interface BreadcrumbProps
  extends BreadcrumbRenderableOptions,
    ManagedRenderableProps<BreadcrumbRenderable> {
  onSelect?: EventHandler;
}

export interface TabsProps extends TabsRenderableOptions, ManagedRenderableProps<TabsRenderable> {
  onChange?: EventHandler;
}

export interface SidebarProps
  extends SidebarRenderableOptions,
    ManagedRenderableProps<SidebarRenderable> {
  onSelect?: EventHandler;
  onAction?: EventHandler;
  onCollapseChange?: EventHandler;
  onGroupCollapseChange?: EventHandler;
}

export interface ScrollAreaProps
  extends ScrollAreaRenderableOptions,
    ManagedRenderableProps<ScrollAreaRenderable> {
  scrollX?: number;
  scrollY?: number;
}

export interface DialogProps
  extends DialogRenderableOptions,
    ManagedRenderableProps<DialogRenderable> {
  footer?: ReactNode;
  onClose?: EventHandler;
  onOpenChange?: EventHandler;
}

export interface SheetProps
  extends SheetRenderableOptions,
    ManagedRenderableProps<SheetRenderable> {
  footer?: ReactNode;
  onClose?: EventHandler;
  onOpenChange?: EventHandler;
}

export interface DrawerProps
  extends DrawerRenderableOptions,
    ManagedRenderableProps<DrawerRenderable> {
  footer?: ReactNode;
  onClose?: EventHandler;
  onOpenChange?: EventHandler;
}

export interface ToastProps
  extends Omit<ToastRenderableOptions, "open">,
    ManagedRenderableProps<ToastRenderable> {
  open?: boolean;
  onClose?: EventHandler;
}

export interface CommandProps
  extends Omit<CommandRenderableOptions, "open">,
    ManagedRenderableProps<CommandRenderable> {
  open?: boolean;
  query?: string;
  onSelect?: EventHandler;
  onOpenChange?: EventHandler;
  onQueryChange?: EventHandler;
}

export interface InputFieldProps
  extends InputFieldRenderableOptions,
    ManagedRenderableProps<InputFieldRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface TextareaFieldProps
  extends TextareaFieldRenderableOptions,
    ManagedRenderableProps<TextareaFieldRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface SelectFieldProps
  extends SelectFieldRenderableOptions,
    ManagedRenderableProps<SelectFieldRenderable> {
  onChange?: EventHandler;
}

export interface CheckboxProps
  extends CheckboxRenderableOptions,
    ManagedRenderableProps<CheckboxRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface SwitchProps
  extends SwitchRenderableOptions,
    ManagedRenderableProps<SwitchRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface RadioGroupProps
  extends RadioGroupRenderableOptions,
    ManagedRenderableProps<RadioGroupRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface ToggleProps
  extends ToggleRenderableOptions,
    ManagedRenderableProps<ToggleRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface ToggleGroupProps
  extends ToggleGroupRenderableOptions,
    ManagedRenderableProps<ToggleGroupRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface SliderProps
  extends SliderRenderableOptions,
    ManagedRenderableProps<SliderRenderable> {
  onChange?: EventHandler;
  onSubmit?: EventHandler;
}

export interface PaginationProps
  extends PaginationRenderableOptions,
    ManagedRenderableProps<PaginationRenderable> {
  onChange?: EventHandler;
}

export interface TableProps
  extends TableRenderableOptions,
    ManagedRenderableProps<TableRenderable> {
  onHeaderSelect?: EventHandler;
  onRowSelect?: EventHandler;
}

export interface CalendarProps
  extends CalendarRenderableOptions,
    ManagedRenderableProps<CalendarRenderable> {
  onChange?: EventHandler;
}

export interface DatePickerProps
  extends DatePickerRenderableOptions,
    ManagedRenderableProps<DatePickerRenderable> {
  onChange?: EventHandler;
  onOpenChange?: EventHandler;
}

export interface WindowProps
  extends Omit<WindowRenderableOptions, "role">,
    ManagedRenderableProps<WindowRenderable> {
  footer?: ReactNode;
  windowRole?: WindowRenderableOptions["role"];
  onActivate?: EventHandler;
  onClose?: EventHandler;
  onMinimize?: EventHandler;
  onMaximize?: EventHandler;
  onRestore?: EventHandler;
  onRestoreRequest?: EventHandler;
}

export interface WindowManagerProps
  extends WindowManagerRenderableOptions,
    ManagedRenderableProps<WindowManagerRenderable> {
  activeWindowId?: string | null;
}

export const Panel = forwardRef<PanelRenderable, PanelProps>(function Panel(props, ref) {
  const instance = useManagedInstance(() => new PanelRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useEffect(() => {
    instance.setTitle(props.title);
    instance.setSubtitle(props.subtitle);
    instance.setTone(props.tone ?? "default");
    if (typeof props.content === "string") {
      instance.setContent(props.content);
    }

    if (instance.body instanceof ScrollAreaRenderable) {
      instance.body.direction = props.scrollDirection ?? instance.body.direction;
      instance.body.showScrollbars = props.showScrollbars ?? instance.body.showScrollbars;
      instance.body.scrollbarVisibility =
        props.scrollbarVisibility ?? instance.body.scrollbarVisibility;
      instance.body.invalidate("react:panel-scroll-sync");
    }
  }, [
    instance,
    props.content,
    props.scrollDirection,
    props.scrollbarVisibility,
    props.showScrollbars,
    props.subtitle,
    props.title,
    props.tone,
  ]);

  return renderManaged(
    instance,
    props.children ? renderManaged(instance.body, props.children) : null,
  );
});

export const Toolbar = forwardRef<ToolbarRenderable, ToolbarProps>(function Toolbar(props, ref) {
  const instance = useManagedInstance(() => new ToolbarRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useEffect(() => {
    instance.setOrientation(props.orientation ?? "horizontal");
  }, [instance, props.orientation]);

  return renderManaged(instance, props.children);
});

export const Button = forwardRef<ButtonRenderable, ButtonProps>(function Button(props, ref) {
  const instance = useManagedInstance(() => new ButtonRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "press", props.onPress);
  useRenderableEvent(instance, "submit", props.onSubmit);
  useEffect(() => {
    instance.setLabel(props.label);
    instance.setDisabled(props.disabled ?? false);
    instance.variant = props.variant ?? "secondary";
    instance.size = props.size ?? "compact";
    instance.minWidth = props.minWidth;
    instance.leftIcon = props.leftIcon;
    instance.rightIcon = props.rightIcon;
    instance.tone = props.tone ?? (instance.variant === "danger" ? "danger" : "accent");
    instance.invalidate("react:button-sync");
  }, [
    instance,
    props.disabled,
    props.label,
    props.leftIcon,
    props.minWidth,
    props.rightIcon,
    props.size,
    props.tone,
    props.variant,
  ]);

  return renderManaged(instance, props.children);
});

export const Badge = forwardRef<BadgeRenderable, BadgeProps>(function Badge(props, ref) {
  const instance = useManagedInstance(() => new BadgeRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useEffect(() => {
    instance.setLabel(props.label);
    instance.tone = props.tone ?? "default";
    instance.emphasis = props.emphasis ?? "subtle";
    instance.invalidate("react:badge-sync");
  }, [instance, props.emphasis, props.label, props.tone]);

  return renderManaged(instance);
});

export const Breadcrumb = forwardRef<BreadcrumbRenderable, BreadcrumbProps>(
  function Breadcrumb(props, ref) {
    const instance = useManagedInstance(() => new BreadcrumbRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "select", props.onSelect);
    useEffect(() => {
      instance.setItems(props.items);
      instance.maxVisibleItems = props.maxVisibleItems;
      instance.separator = props.separator ?? "/";
      instance.invalidate("react:breadcrumb-sync");
    }, [instance, props.items, props.maxVisibleItems, props.separator]);

    return renderManaged(instance);
  },
);

export const Tabs = forwardRef<TabsRenderable, TabsProps>(function Tabs(props, ref) {
  const instance = useManagedInstance(() => new TabsRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "change", props.onChange);
  useEffect(() => {
    instance.tabs = props.tabs;
    instance.orientation = props.orientation ?? "horizontal";
    instance.activationMode = props.activationMode ?? "automatic";
    if (props.activeTabId && instance.getActiveTabId() !== props.activeTabId) {
      instance.setActiveTab(props.activeTabId);
      return;
    }
    instance.invalidate("react:tabs-sync");
  }, [instance, props.activationMode, props.activeTabId, props.orientation, props.tabs]);

  return renderManaged(instance);
});

export const Sidebar = forwardRef<SidebarRenderable, SidebarProps>(function Sidebar(props, ref) {
  const instance = useManagedInstance(() => new SidebarRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "select", props.onSelect);
  useRenderableEvent(instance, "action", props.onAction);
  useRenderableEvent(instance, "collapseChange", props.onCollapseChange);
  useRenderableEvent(instance, "groupCollapseChange", props.onGroupCollapseChange);
  useEffect(() => {
    instance.title = props.title;
    instance.subtitle = props.subtitle;
    instance.styleProps.title = formatTitle(props.title, props.subtitle);
    instance.side = props.side ?? "left";
    instance.collapsedWidth = props.collapsedWidth ?? 8;
    instance.collapsible = props.collapsible ?? false;
    instance.groups = props.groups;
    instance.activeItemId = props.activeItemId;
    instance.showBadges = props.showBadges ?? true;
    instance.showShortcuts = props.showShortcuts ?? true;
    instance.footerActions = props.footerActions ?? [];
    instance.setCollapsed(props.collapsed ?? false);
    if (props.activeItemId) {
      instance.setActiveItem(props.activeItemId);
      return;
    }
    instance.invalidate("react:sidebar-sync");
  }, [
    instance,
    props.activeItemId,
    props.collapsed,
    props.collapsedWidth,
    props.collapsible,
    props.footerActions,
    props.groups,
    props.showBadges,
    props.showShortcuts,
    props.side,
    props.subtitle,
    props.title,
  ]);

  return renderManaged(instance);
});

export const ScrollArea = forwardRef<ScrollAreaRenderable, ScrollAreaProps>(
  function ScrollArea(props, ref) {
    const instance = useManagedInstance(() => new ScrollAreaRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useEffect(() => {
      instance.direction = props.direction ?? "vertical";
      instance.showScrollbars = props.showScrollbars ?? true;
      instance.scrollbarVisibility = props.scrollbarVisibility ?? "auto";
      if (typeof props.scrollX === "number") {
        instance.setScrollX(props.scrollX);
      }
      if (typeof props.scrollY === "number") {
        instance.setScrollY(props.scrollY);
      }
      instance.invalidate("react:scroll-area-sync");
    }, [
      instance,
      props.direction,
      props.scrollX,
      props.scrollY,
      props.scrollbarVisibility,
      props.showScrollbars,
    ]);

    return renderManaged(instance, props.children);
  },
);

export const Dialog = forwardRef<DialogRenderable, DialogProps>(function Dialog(props, ref) {
  const instance = useManagedInstance(() => new DialogRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "close", props.onClose);
  useRenderableEvent(instance, "openChange", props.onOpenChange);
  useEffect(() => {
    instance.setTitle(props.title);
    instance.variant = props.variant ?? "default";
    instance.card.setTone(resolveDialogTone(instance.variant));
    instance.dialogWidth = props.width ?? "60%";
    instance.dialogHeight = props.height ?? "auto";
    instance.closeOnEscape = props.closeOnEscape ?? true;
    instance.closeOnBackdrop = props.closeOnBackdrop ?? true;
    instance.initialFocusTarget = props.initialFocus ?? null;
    instance.restoreFocusTarget = props.restoreFocus ?? null;
    syncVisibility(instance, props.open);
    instance.invalidate("react:dialog-sync");
  }, [
    instance,
    props.closeOnBackdrop,
    props.closeOnEscape,
    props.height,
    props.initialFocus,
    props.open,
    props.restoreFocus,
    props.title,
    props.variant,
    props.width,
  ]);

  return renderManaged(
    instance,
    <>
      {renderManaged(instance.body, props.children)}
      {props.footer ? renderManaged(instance.footer, props.footer) : null}
    </>,
  );
});

export const Sheet = forwardRef<SheetRenderable, SheetProps>(function Sheet(props, ref) {
  const instance = useManagedInstance(() => new SheetRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "close", props.onClose);
  useRenderableEvent(instance, "openChange", props.onOpenChange);
  useEffect(() => {
    instance.title = props.title;
    instance.description = props.description;
    instance.container.setTitle(props.title);
    instance.side = props.side ?? "right";
    instance.modal = props.modal ?? true;
    instance.dismissible = props.dismissible ?? true;
    instance.sheetWidth = props.width ?? "42%";
    instance.sheetHeight = props.height ?? "38%";
    instance.minWidth = props.minWidth ?? 24;
    instance.minHeight = props.minHeight ?? 8;
    instance.restoreFocus = props.restoreFocus ?? true;
    instance.showCloseButton = props.showCloseButton ?? false;
    syncVisibility(instance, props.open);
    instance.invalidate("react:sheet-sync");
  }, [
    instance,
    props.description,
    props.dismissible,
    props.height,
    props.minHeight,
    props.minWidth,
    props.modal,
    props.open,
    props.restoreFocus,
    props.showCloseButton,
    props.side,
    props.title,
    props.width,
  ]);

  return renderManaged(
    instance,
    <>
      {renderManaged(instance.body, props.children)}
      {props.footer ? renderManaged(instance.footer, props.footer) : null}
    </>,
  );
});

export const Drawer = forwardRef<DrawerRenderable, DrawerProps>(function Drawer(props, ref) {
  const instance = useManagedInstance(() => new DrawerRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "close", props.onClose);
  useRenderableEvent(instance, "openChange", props.onOpenChange);
  useEffect(() => {
    instance.title = props.title;
    instance.container.setTitle(props.title);
    instance.compact = props.compact ?? true;
    instance.modal = props.modal ?? true;
    instance.dismissible = props.dismissible ?? true;
    instance.restoreFocus = props.restoreFocus ?? true;
    instance.showCloseButton = props.showCloseButton ?? false;
    instance.setSide(props.side ?? "bottom");
    instance.sheetWidth = props.width ?? (instance.side === "bottom" ? "100%" : "34%");
    instance.sheetHeight = props.height ?? (instance.side === "bottom" ? "34%" : "40%");
    syncVisibility(instance, props.open);
    instance.invalidate("react:drawer-sync");
  }, [
    instance,
    props.compact,
    props.dismissible,
    props.height,
    props.modal,
    props.open,
    props.restoreFocus,
    props.showCloseButton,
    props.side,
    props.title,
    props.width,
  ]);

  return renderManaged(
    instance,
    <>
      {renderManaged(instance.body, props.children)}
      {props.footer ? renderManaged(instance.footer, props.footer) : null}
    </>,
  );
});

export const Toast = forwardRef<ToastRenderable, ToastProps>(function Toast(props, ref) {
  const instance = useManagedInstance(() => new ToastRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "close", props.onClose);
  useEffect(() => {
    instance.title = props.title;
    instance.message = props.message;
    instance.kind = props.kind ?? "info";
    instance.durationMs = props.durationMs;
    instance.titleNode.setContent(props.title ?? "");
    instance.titleNode.updateLayout({ height: props.title ? 1 : 0 });
    instance.messageNode.setContent(props.message);
    instance.updateStyle({ borderFg: resolveToastColor(props.kind ?? "info") });
    syncVisibility(
      instance,
      props.open,
      () => instance.show(),
      () => instance.hide(),
    );
    instance.invalidate("react:toast-sync");
  }, [instance, props.durationMs, props.kind, props.message, props.open, props.title]);

  return renderManaged(instance);
});

export const Command = forwardRef<CommandRenderable, CommandProps>(function Command(props, ref) {
  const instance = useManagedInstance(() => new CommandRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "select", props.onSelect);
  useRenderableEvent(instance, "openChange", props.onOpenChange);
  useRenderableEvent(instance, "queryChange", props.onQueryChange);
  useEffect(() => {
    instance.maxResults = Math.max(1, props.maxResults ?? 8);
    instance.recentLimit = Math.max(0, props.recentLimit ?? 5);
    instance.variant = props.variant ?? "overlay";
    instance.previewTitle = props.previewTitle ?? "Preview";
    instance.renderPreview = props.renderPreview;
    instance.queryInput.placeholder = props.placeholder ?? "";
    instance.setItems(props.items);
    if (props.recentIds) {
      instance.setRecentIds(props.recentIds);
    }
    if (typeof props.query === "string") {
      instance.setQuery(props.query);
    }
    if (instance.variant === "overlay") {
      syncVisibility(
        instance,
        props.open,
        () => instance.open(),
        () => instance.close(),
      );
    }
    instance.invalidate("react:command-sync");
  }, [
    instance,
    props.items,
    props.maxResults,
    props.open,
    props.placeholder,
    props.previewTitle,
    props.query,
    props.recentIds,
    props.recentLimit,
    props.renderPreview,
    props.variant,
  ]);

  return renderManaged(instance);
});

export const InputField = forwardRef<InputFieldRenderable, InputFieldProps>(
  function InputField(props, ref) {
    const instance = useManagedInstance(() => new InputFieldRenderable(props), ref);

    useCommonRenderableProps(instance, props.fieldLayout, props.fieldStyle);
    useRenderableEvent(instance.input, "change", props.onChange);
    useRenderableEvent(instance.input, "submit", props.onSubmit);
    useEffect(() => {
      syncField(instance, {
        label: props.label,
        description: props.description,
        error: props.error,
        required: props.required,
        disabled: props.disabled,
        orientation: props.orientation,
        validationState: props.validationState,
      });
      instance.input.placeholder = props.placeholder ?? "";
      instance.input.setValue(props.value ?? "");
      instance.input.setDisabled(props.disabled ?? false);
      instance.input.setReadOnly(props.readOnly ?? false);
      instance.input.setInvalid(props.invalid ?? false);
      instance.input.setType(props.type ?? "text");
      if (props.layout) {
        instance.input.updateLayout(resolveInputLayout(props.width, props.layout));
      }
      if (props.style) {
        instance.input.updateStyle(props.style);
      }
    }, [
      instance,
      props.description,
      props.disabled,
      props.error,
      props.invalid,
      props.label,
      props.layout,
      props.orientation,
      props.placeholder,
      props.readOnly,
      props.required,
      props.style,
      props.type,
      props.validationState,
      props.value,
      props.width,
    ]);

    return renderManaged(instance);
  },
);

export const TextareaField = forwardRef<TextareaFieldRenderable, TextareaFieldProps>(
  function TextareaField(props, ref) {
    const instance = useManagedInstance(() => new TextareaFieldRenderable(props), ref);

    useCommonRenderableProps(instance, props.fieldLayout, props.fieldStyle);
    useRenderableEvent(instance.textarea, "change", props.onChange);
    useRenderableEvent(instance.textarea, "submit", props.onSubmit);
    useEffect(() => {
      syncField(instance, {
        label: props.label,
        description: props.description,
        error: props.error,
        required: props.required,
        disabled: props.disabled,
        orientation: props.orientation,
        validationState: props.validationState,
      });
      instance.textarea.placeholder = props.placeholder ?? "";
      instance.textarea.setValue(props.value ?? "");
      instance.textarea.setDisabled(props.disabled ?? false);
      instance.textarea.setReadOnly(props.readOnly ?? false);
      instance.textarea.setInvalid(props.invalid ?? false);
      instance.textarea.autoResize =
        props.viewportMode === "auto-resize" ? true : (props.autoResize ?? false);
      instance.textarea.minRows = props.minRows ?? 4;
      instance.textarea.maxRows = props.maxRows;
      instance.textarea.setWrapMode(props.wrapMode ?? "word");
      if (props.layout) {
        instance.textarea.updateLayout(props.layout);
      }
      if (props.style) {
        instance.textarea.updateStyle(props.style);
      }
    }, [
      instance,
      props.autoResize,
      props.description,
      props.disabled,
      props.error,
      props.invalid,
      props.label,
      props.layout,
      props.maxRows,
      props.minRows,
      props.orientation,
      props.placeholder,
      props.readOnly,
      props.required,
      props.style,
      props.validationState,
      props.value,
      props.viewportMode,
      props.wrapMode,
    ]);

    return renderManaged(instance);
  },
);

export const SelectField = forwardRef<SelectFieldRenderable, SelectFieldProps>(
  function SelectField(props, ref) {
    const instance = useManagedInstance(() => new SelectFieldRenderable(props), ref);

    useCommonRenderableProps(instance, props.fieldLayout, props.fieldStyle);
    useRenderableEvent(instance.select, "change", props.onChange);
    useEffect(() => {
      syncField(instance, {
        label: props.label,
        description: props.description,
        error: props.error,
        required: props.required,
        disabled: props.disabled,
        orientation: props.orientation,
        validationState: props.validationState,
      });
      instance.select.placeholder = props.placeholder ?? "Select…";
      instance.select.setOptions(props.options);
      if (typeof props.value !== "undefined") {
        instance.select.setValue(props.value);
      }
      instance.select.setDisabled(props.disabled ?? false);
      instance.select.setInvalid(props.invalid ?? false);
      if (typeof props.open === "boolean") {
        syncVisibility(
          instance.select,
          props.open,
          () => instance.select.open(),
          () => instance.select.close(),
        );
      }
      if (props.layout) {
        instance.select.updateLayout(props.layout);
      }
      if (props.style) {
        instance.select.updateStyle(props.style);
      }
    }, [
      instance,
      props.description,
      props.disabled,
      props.error,
      props.invalid,
      props.label,
      props.layout,
      props.open,
      props.options,
      props.orientation,
      props.placeholder,
      props.required,
      props.style,
      props.validationState,
      props.value,
    ]);

    return renderManaged(instance);
  },
);

export const Checkbox = forwardRef<CheckboxRenderable, CheckboxProps>(
  function Checkbox(props, ref) {
    const instance = useManagedInstance(() => new CheckboxRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useRenderableEvent(instance, "submit", props.onSubmit);
    useEffect(() => {
      instance.label = props.label;
      instance.setDisabled(props.disabled ?? false);
      instance.setIndeterminate(props.indeterminate ?? false);
      instance.setChecked(props.checked ?? false);
    }, [instance, props.checked, props.disabled, props.indeterminate, props.label]);

    return renderManaged(instance);
  },
);

export const Switch = forwardRef<SwitchRenderable, SwitchProps>(function Switch(props, ref) {
  const instance = useManagedInstance(() => new SwitchRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "change", props.onChange);
  useRenderableEvent(instance, "submit", props.onSubmit);
  useEffect(() => {
    instance.label = props.label;
    instance.setDisabled(props.disabled ?? false);
    instance.setChecked(props.checked ?? false);
    instance.invalidate("react:switch-sync");
  }, [instance, props.checked, props.disabled, props.label]);

  return renderManaged(instance);
});

export const RadioGroup = forwardRef<RadioGroupRenderable, RadioGroupProps>(
  function RadioGroup(props, ref) {
    const instance = useManagedInstance(() => new RadioGroupRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useRenderableEvent(instance, "submit", props.onSubmit);
    useEffect(() => {
      instance.options = props.options;
      instance.orientation = props.orientation ?? "vertical";
      instance.setDisabled(props.disabled ?? false);
      if (typeof props.value !== "undefined") {
        instance.setValue(props.value);
        return;
      }
      instance.invalidate("react:radio-group-sync");
    }, [instance, props.disabled, props.options, props.orientation, props.value]);

    return renderManaged(instance);
  },
);

export const Toggle = forwardRef<ToggleRenderable, ToggleProps>(function Toggle(props, ref) {
  const instance = useManagedInstance(() => new ToggleRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "change", props.onChange);
  useRenderableEvent(instance, "submit", props.onSubmit);
  useEffect(() => {
    instance.label = props.label;
    instance.setDisabled(props.disabled ?? false);
    instance.setPressed(props.pressed ?? false);
    instance.invalidate("react:toggle-sync");
  }, [instance, props.disabled, props.label, props.pressed]);

  return renderManaged(instance);
});

export const ToggleGroup = forwardRef<ToggleGroupRenderable, ToggleGroupProps>(
  function ToggleGroup(props, ref) {
    const instance = useManagedInstance(() => new ToggleGroupRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useRenderableEvent(instance, "submit", props.onSubmit);
    useEffect(() => {
      instance.items = props.items;
      instance.groupType = props.type ?? "single";
      instance.setDisabled(props.disabled ?? false);
      if (typeof props.value !== "undefined") {
        instance.setValue(props.value);
        return;
      }
      instance.invalidate("react:toggle-group-sync");
    }, [instance, props.disabled, props.items, props.type, props.value]);

    return renderManaged(instance);
  },
);

export const Slider = forwardRef<SliderRenderable, SliderProps>(function Slider(props, ref) {
  const instance = useManagedInstance(() => new SliderRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "change", props.onChange);
  useRenderableEvent(instance, "submit", props.onSubmit);
  useEffect(() => {
    instance.min = props.min ?? 0;
    instance.max = props.max ?? 100;
    instance.step = props.step ?? 1;
    instance.showValue = props.showValue ?? true;
    instance.setDisabled(props.disabled ?? false);
    instance.setValue(props.value ?? instance.min);
  }, [instance, props.disabled, props.max, props.min, props.showValue, props.step, props.value]);

  return renderManaged(instance);
});

export const Pagination = forwardRef<PaginationRenderable, PaginationProps>(
  function Pagination(props, ref) {
    const instance = useManagedInstance(() => new PaginationRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useEffect(() => {
      instance.setPageCount(props.pageCount);
      instance.setPage(props.page);
    }, [instance, props.page, props.pageCount]);

    return renderManaged(instance);
  },
);

export const Table = forwardRef<TableRenderable, TableProps>(function Table(props, ref) {
  const instance = useManagedInstance(() => new TableRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "headerSelect", props.onHeaderSelect);
  useRenderableEvent(instance, "rowSelect", props.onRowSelect);
  useEffect(() => {
    instance.setColumns(props.columns);
    instance.setRows(props.rows);
    instance.striped = props.striped ?? true;
    instance.compact = props.compact ?? false;
    instance.showHeader = props.showHeader ?? true;
    instance.setActiveRowId(props.activeRowId);
  }, [
    instance,
    props.activeRowId,
    props.columns,
    props.compact,
    props.rows,
    props.showHeader,
    props.striped,
  ]);

  return renderManaged(instance);
});

export const Calendar = forwardRef<CalendarRenderable, CalendarProps>(
  function Calendar(props, ref) {
    const instance = useManagedInstance(() => new CalendarRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useEffect(() => {
      instance.minDate = props.minDate;
      instance.maxDate = props.maxDate;
      instance.disabledDates = new Set(props.disabledDates ?? []);
      instance.showOutsideDays = props.showOutsideDays ?? true;
      if (props.visibleMonth) {
        instance.setVisibleMonth(props.visibleMonth);
      }
      if (typeof props.value !== "undefined") {
        instance.setValue(props.value);
        return;
      }
      instance.invalidate("react:calendar-sync");
    }, [
      instance,
      props.disabledDates,
      props.maxDate,
      props.minDate,
      props.showOutsideDays,
      props.value,
      props.visibleMonth,
    ]);

    return renderManaged(instance);
  },
);

export const DatePicker = forwardRef<DatePickerRenderable, DatePickerProps>(
  function DatePicker(props, ref) {
    const instance = useManagedInstance(() => new DatePickerRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useRenderableEvent(instance, "change", props.onChange);
    useRenderableEvent(instance, "openChange", props.onOpenChange);
    useEffect(() => {
      instance.placeholder = props.placeholder ?? "Pick a date";
      instance.presentation = props.presentation ?? "popover";
      instance.setDisabled(props.disabled ?? false);
      instance.setInvalid(props.invalid ?? false);
      instance.calendar.minDate = props.minDate;
      instance.calendar.maxDate = props.maxDate;
      if (typeof props.value !== "undefined") {
        instance.setValue(props.value);
      }
      syncVisibility(
        instance,
        props.open,
        () => instance.open(),
        () => instance.close(),
      );
      instance.invalidate("react:date-picker-sync");
    }, [
      instance,
      props.disabled,
      props.invalid,
      props.maxDate,
      props.minDate,
      props.open,
      props.placeholder,
      props.presentation,
      props.value,
    ]);

    return renderManaged(instance);
  },
);

export const Window = forwardRef<WindowRenderable, WindowProps>(function Window(props, ref) {
  const instance = useManagedInstance(() => new WindowRenderable(props), ref);

  useCommonRenderableProps(instance, props.layout, props.style);
  useRenderableEvent(instance, "activate", props.onActivate);
  useRenderableEvent(instance, "close", props.onClose);
  useRenderableEvent(instance, "minimize", props.onMinimize);
  useRenderableEvent(instance, "maximize", props.onMaximize);
  useRenderableEvent(instance, "restore", props.onRestore);
  useRenderableEvent(instance, "restore-request", props.onRestoreRequest);
  useEffect(() => {
    instance.title = props.title;
    instance.subtitle = props.subtitle;
    instance.role = props.windowRole ?? "document";
    instance.draggable = props.draggable ?? true;
    instance.resizable = props.resizable ?? true;
    instance.closable = props.closable ?? true;
    instance.minimizable = props.minimizable ?? true;
    instance.maximizable = props.maximizable ?? true;
    instance.minWidth = Math.max(16, props.minWidth ?? 24);
    instance.minHeight = Math.max(8, props.minHeight ?? 10);
    instance.maxWidth = props.maxWidth;
    instance.maxHeight = props.maxHeight;
    instance.contentWrapMode = props.contentWrapMode ?? "word";
    if (typeof props.content === "string") {
      instance.setContent(props.content);
    }
    if (typeof props.x === "number" && typeof props.y === "number") {
      instance.moveTo(props.x, props.y);
    }
    if (typeof props.width === "number" && typeof props.height === "number") {
      instance.resizeTo(props.width, props.height);
    } else {
      instance.updateLayout({
        width: props.width ?? instance.layoutProps.width,
        height: props.height ?? instance.layoutProps.height,
      });
    }
    if ((props.active ?? false) !== instance.active) {
      instance.setActive(props.active ?? false);
    } else {
      syncWindowChrome(instance);
    }
  }, [
    instance,
    props.active,
    props.closable,
    props.content,
    props.contentWrapMode,
    props.draggable,
    props.height,
    props.maxHeight,
    props.maxWidth,
    props.maximizable,
    props.minHeight,
    props.minWidth,
    props.minimizable,
    props.resizable,
    props.windowRole,
    props.subtitle,
    props.title,
    props.width,
    props.x,
    props.y,
  ]);

  return renderManaged(
    instance,
    <>
      {renderManaged(instance.body, props.children)}
      {props.footer ? renderManaged(instance.footer, props.footer) : null}
    </>,
  );
});

export const WindowManager = forwardRef<WindowManagerRenderable, WindowManagerProps>(
  function WindowManager(props, ref) {
    const instance = useManagedInstance(() => new WindowManagerRenderable(props), ref);

    useCommonRenderableProps(instance, props.layout, props.style);
    useEffect(() => {
      if (props.activeWindowId) {
        instance.activate(props.activeWindowId);
      }
    }, [instance, props.activeWindowId]);

    return renderManaged(instance, props.children);
  },
);

function useManagedInstance<T extends Renderable>(
  factory: () => T,
  forwardedRef: ForwardedRef<T>,
): T {
  const instanceRef = useRef<T | null>(null);
  if (!instanceRef.current) {
    instanceRef.current = factory();
  }

  const instance = instanceRef.current;
  if (!instance) {
    throw new Error("Managed renderable instance was not created.");
  }

  useImperativeHandle(forwardedRef, () => instance, [instance]);
  return instance;
}

function useCommonRenderableProps(
  instance: Renderable,
  layout?: BaseLayoutProps,
  style?: BaseStyleProps,
): void {
  useEffect(() => {
    if (layout) {
      instance.updateLayout(layout);
    }
    if (style) {
      instance.updateStyle(style);
    }
  }, [instance, layout, style]);
}

function useRenderableEvent(instance: Renderable, type: string, handler: EventHandler): void {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    if (!handler) {
      return;
    }

    const listener = (event: RenderEvent) => {
      latest.current?.(event);
    };
    instance.on<RenderEvent>(type, listener);
    return () => {
      instance.off<RenderEvent>(type, listener);
    };
  }, [handler, instance, type]);
}

function renderManaged(instance: Renderable, children?: ReactNode) {
  return createElement(MANAGED_RENDERABLE_TYPE, { instance }, children);
}

function formatTitle(title?: string, subtitle?: string): string | undefined {
  if (!title && !subtitle) {
    return undefined;
  }
  if (!title) {
    return subtitle;
  }
  if (!subtitle) {
    return title;
  }
  return `${title} | ${subtitle}`;
}

function resolveDialogTone(variant: NonNullable<DialogRenderableOptions["variant"]>) {
  switch (variant) {
    case "danger":
      return "danger" as const;
    case "info":
      return "info" as const;
    default:
      return "accent" as const;
  }
}

function resolveToastColor(kind: NonNullable<ToastRenderableOptions["kind"]>): string {
  switch (kind) {
    case "success":
      return defaultComponentTheme.success;
    case "warning":
      return defaultComponentTheme.title;
    case "danger":
      return defaultComponentTheme.danger;
    default:
      return defaultComponentTheme.info;
  }
}

function syncVisibility(
  instance: {
    isOpen?: () => boolean;
    isVisible?: () => boolean;
    open?: () => unknown;
    close?: (...args: never[]) => unknown;
    show?: () => unknown;
    hide?: () => unknown;
  },
  visible: boolean | undefined,
  open: (() => void) | undefined = instance.open?.bind(instance),
  close: (() => void) | undefined = () => {
    if (typeof instance.close === "function") {
      instance.close();
      return;
    }
    instance.hide?.();
  },
): void {
  if (typeof visible !== "boolean") {
    return;
  }

  const current =
    (typeof instance.isOpen === "function" ? instance.isOpen() : undefined) ??
    (typeof instance.isVisible === "function" ? instance.isVisible() : false);

  if (visible && !current) {
    open?.();
  } else if (!visible && current) {
    close?.();
  }
}

function syncField(
  instance: InputFieldRenderable | TextareaFieldRenderable | SelectFieldRenderable,
  props: {
    label: string;
    description?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    orientation?: "vertical" | "horizontal";
    validationState?: "default" | "error" | "success" | "warning";
  },
): void {
  instance.required = props.required ?? false;
  instance.setLabel(renderRequiredLabel(props.label, instance.required));
  instance.label = props.label;
  instance.setDescription(props.description);
  instance.setError(props.error);
  instance.setValidationState(props.validationState ?? (props.error ? "error" : "default"));
  instance.setDisabled(props.disabled ?? false);
  instance.setOrientation(props.orientation ?? "vertical");
}

function renderRequiredLabel(label: string, required: boolean): string {
  return required ? `${label} *` : label;
}

function resolveInputLayout(
  width: InputFieldRenderableOptions["width"],
  layout: BaseLayoutProps,
): BaseLayoutProps {
  if (width === "fill") {
    return { ...layout, width: "100%" };
  }
  if (typeof width === "number") {
    return { ...layout, width };
  }
  return layout;
}

function syncWindowChrome(instance: WindowRenderable): void {
  const activeBorder = instance.active
    ? defaultComponentTheme.borderStrong
    : defaultComponentTheme.border;
  const titleFg = instance.active ? defaultComponentTheme.title : defaultComponentTheme.muted;
  const minimized = instance.minimized;
  const windowBg = instance.styleProps.bg ?? defaultComponentTheme.surfaceBg;
  const windowTitle = minimized
    ? instance.title
    : instance.subtitle
      ? `${instance.title} | ${instance.subtitle}`
      : instance.title;

  instance.updateStyle({
    borderFg: activeBorder,
    titleFg,
    bg: windowBg,
  });
  instance.titleBar.updateStyle({
    bg: windowBg,
    fg: titleFg,
  });
  instance.controls.setVisible(!minimized);
  instance.titleText.setContent(windowTitle);
  instance.titleText.updateStyle({
    bg: windowBg,
    fg: titleFg,
  });
  instance.body.setVisible(!minimized);
  instance.body.updateStyle({
    bg: windowBg,
    fg: instance.styleProps.fg ?? defaultComponentTheme.fg,
  });
  instance.bodyScrollViewport?.updateStyle({
    bg: windowBg,
    fg: instance.styleProps.fg ?? defaultComponentTheme.fg,
  });
  instance.bodyContentText?.updateStyle({
    bg: windowBg,
    fg: instance.styleProps.fg ?? defaultComponentTheme.fg,
  });
  instance.footerShell.updateStyle({ bg: windowBg });
  instance.footer.updateStyle({ bg: windowBg });
  instance.resizeHandle.updateStyle({
    fg: instance.active ? defaultComponentTheme.borderStrong : defaultComponentTheme.muted,
    bg: windowBg,
    visible: instance.resizable && !minimized,
  });
}

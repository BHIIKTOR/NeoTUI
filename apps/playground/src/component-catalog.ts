import {
  BadgeRenderable,
  BreadcrumbRenderable,
  ButtonRenderable,
  CalendarRenderable,
  CheckboxRenderable,
  CommandRenderable,
  ContextMenuRenderable,
  DataTableRenderable,
  DatePickerRenderable,
  DialogRenderable,
  DrawerRenderable,
  DropdownMenuRenderable,
  EmptyRenderable,
  FieldRenderable,
  InputControlRenderable,
  InputFieldRenderable,
  KbdRenderable,
  MenuBarRenderable,
  NavigationMenuRenderable,
  OverlayManagerRenderable,
  PanelRenderable,
  ProgressRenderable,
  RadioGroupRenderable,
  ScrollAreaRenderable,
  SelectControlRenderable,
  SelectFieldRenderable,
  SeparatorRenderable,
  SheetRenderable,
  SidebarRenderable,
  SliderRenderable,
  SpinnerRenderable,
  SwitchRenderable,
  TableRenderable,
  TabsRenderable,
  TextareaControlRenderable,
  TextareaFieldRenderable,
  ToastRenderable,
  ToggleGroupRenderable,
  ToggleRenderable,
  ToolbarRenderable,
  WindowManagerRenderable,
  WindowRenderable,
} from "@neotui/components";
import {
  BoxRenderable,
  type KittyRenderer,
  type Renderable,
  type SubmitEvent,
  TextRenderable,
} from "@neotui/core";

export const componentCatalogSectionIds = [
  "primitives",
  "navigation",
  "menus",
  "fields",
  "choice",
  "feedback",
  "data",
  "command",
  "temporal",
  "overlay",
  "windows",
] as const;

export type ComponentCatalogSectionId = (typeof componentCatalogSectionIds)[number];

export interface PlaygroundTheme {
  rootBg: string;
  rootFg: string;
  panelBg: string;
  panelAltBg: string;
  border: string;
  borderStrong: string;
  title: string;
  accent: string;
  accentSoft: string;
  info: string;
  success: string;
  danger: string;
  muted: string;
  ink: string;
}

export interface ComponentCatalogSurfaces {
  sections: Record<ComponentCatalogSectionId, Renderable>;
  focusTargets: Partial<
    Record<ComponentCatalogSectionId, Renderable | (() => Renderable | null | undefined)>
  >;
}

export function createComponentCatalogSurfaces(
  renderer: KittyRenderer,
  theme: PlaygroundTheme,
): ComponentCatalogSurfaces {
  const primitives = createPrimitivesSection(theme);
  const navigation = createNavigationSection(theme);
  const menus = createMenusSection(theme);
  const fields = createFieldsSection(theme);
  const choice = createChoiceSection(theme);
  const feedback = createFeedbackSection(theme);
  const data = createDataSection(theme);
  const command = createCommandSection(theme);
  const temporal = createTemporalSection(theme);
  const overlay = createOverlaySection(renderer, theme);
  const windows = createWindowsSection(renderer, theme);

  const sections = {
    primitives: primitives.section,
    navigation: navigation.section,
    menus: menus.section,
    fields: fields.section,
    choice: choice.section,
    feedback: feedback.section,
    data: data.section,
    command: command.section,
    temporal: temporal.section,
    overlay: overlay.section,
    windows: windows.section,
  } satisfies Record<ComponentCatalogSectionId, Renderable>;

  return {
    sections,
    focusTargets: {
      primitives: primitives.focusTarget,
      navigation: navigation.focusTarget,
      menus: menus.focusTarget,
      fields: fields.focusTarget,
      choice: choice.focusTarget,
      feedback: feedback.focusTarget,
      data: data.focusTarget,
      command: command.focusTarget,
      temporal: temporal.focusTarget,
      overlay: overlay.focusTarget,
      windows: windows.focusTarget,
    },
  };
}

interface CatalogSection {
  section: BoxRenderable;
  focusTarget?: Renderable | (() => Renderable | null | undefined);
}

function createSectionRoot(theme: PlaygroundTheme): BoxRenderable {
  return new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });
}

function createPrimitivesSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const intro = new PanelRenderable({
    title: "component primitives",
    content:
      "Buttons, panels, toolbars, badges, and kbd hints are the styling baseline for the catalog.",
    tone: "accent",
    layout: { height: 5 },
  });

  const badges = new ToolbarRenderable({
    layout: { height: 1 },
  });
  badges.add(
    new BadgeRenderable({ label: "button", tone: "accent" }),
    new BadgeRenderable({ label: "panel", tone: "info" }),
    new BadgeRenderable({ label: "toolbar", tone: "success" }),
    new BadgeRenderable({ label: "danger", tone: "danger" }),
    new KbdRenderable({ label: "Shift+Tab", compact: true }),
  );

  const actionPanel = new PanelRenderable({
    title: "actions",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
    },
  });
  const status = new TextRenderable({
    content: "Try the different action styles. Primary is now calmer by default.",
    layout: { height: 1 },
    style: { fg: theme.muted, bg: theme.panelBg },
  });
  const actionRow = new ToolbarRenderable({
    layout: { height: 3 },
  });
  const buttons = [
    new ButtonRenderable({ label: "Primary", variant: "primary" }),
    new ButtonRenderable({ label: "Secondary", variant: "secondary" }),
    new ButtonRenderable({ label: "Ghost", variant: "ghost" }),
    new ButtonRenderable({ label: "Danger", variant: "danger" }),
  ];

  for (const button of buttons) {
    button.on("press", () => {
      status.setContent(`Pressed ${button.getLabel()}.`);
    });
  }

  actionRow.add(...buttons);
  actionPanel.add(
    new TextRenderable({
      content: "All component families build on these primitives.",
      layout: { height: 1 },
      style: { fg: theme.rootFg, bg: theme.panelBg },
    }),
    actionRow,
    status,
  );

  section.add(intro, badges, actionPanel);
  return { section, focusTarget: buttons[0] };
}

function createNavigationSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const breadcrumb = new BreadcrumbRenderable({
    items: [
      { id: "root", label: "workspace" },
      { id: "docs", label: "docs" },
      { id: "components", label: "components" },
      { id: "navigation", label: "navigation" },
    ],
    maxVisibleItems: 3,
  });

  const tabs = new TabsRenderable({
    tabs: [
      { id: "overview", label: "Overview" },
      { id: "logs", label: "Logs", badge: "9" },
      { id: "metrics", label: "Metrics" },
    ],
    activeTabId: "overview",
  });

  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
    style: { bg: theme.panelBg },
  });

  const sidebar = new SidebarRenderable({
    title: "navigation",
    subtitle: "catalog surfaces",
    collapsible: true,
    groups: [
      {
        id: "main",
        label: "Main",
        items: [
          { id: "overview", label: "Overview", badge: "3" },
          { id: "inputs", label: "Inputs" },
          { id: "docs", label: "Docs", shortcut: "g d" },
        ],
      },
      {
        id: "workspace",
        label: "Workspace",
        collapsible: true,
        items: [
          { id: "preview", label: "Preview" },
          { id: "inspector", label: "Inspector" },
        ],
      },
    ],
    activeItemId: "overview",
    footerActions: [{ id: "help", label: "Help" }],
    layout: { width: 24 },
  });

  const content = new PanelRenderable({
    title: "scroll area",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
      padding: 1,
    },
  });

  const scrollArea = new ScrollAreaRenderable({
    layout: {
      flexGrow: 1,
    },
    style: {
      borderFg: theme.info,
      titleFg: "#9ac6ff",
      title: "content",
    },
  });

  for (let index = 1; index <= 12; index += 1) {
    scrollArea.add(
      new TextRenderable({
        content: `Line ${index}: navigation primitives now live in the shared catalog.`,
        layout: { height: 1 },
      }),
    );
  }

  content.add(
    new TextRenderable({
      content: "Sidebar, tabs, breadcrumb, separator, and scroll area now live in one section.",
      layout: { height: 1 },
      style: { fg: theme.rootFg, bg: theme.panelBg },
    }),
    new SeparatorRenderable({ label: "feed" }),
    scrollArea,
  );

  body.add(sidebar, content);
  section.add(breadcrumb, tabs, body);
  return { section, focusTarget: sidebar };
}

function createMenusSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const menubar = new MenuBarRenderable({
    menus: [
      {
        id: "file",
        label: "File",
        items: [
          { id: "new", label: "New File", shortcut: "n" },
          { id: "open", label: "Open…", shortcut: "o" },
          { type: "separator", id: "file-divider" },
          { id: "quit", label: "Quit", shortcut: "q", danger: true },
        ],
      },
      {
        id: "view",
        label: "View",
        items: [
          { id: "palette", label: "Command Palette", shortcut: "p" },
          { id: "sidebar", label: "Toggle Sidebar", checked: true, shortcut: "s" },
        ],
      },
    ],
  });

  const navMenu = new NavigationMenuRenderable({
    items: [
      { id: "overview", label: "Overview" },
      {
        id: "docs",
        label: "Docs",
        items: [
          { id: "getting-started", label: "Getting Started" },
          { id: "components", label: "Components" },
          { id: "api", label: "API" },
        ],
      },
      { id: "settings", label: "Settings" },
    ],
    activeItemId: "components",
  });

  const playground = new PanelRenderable({
    title: "menu playground",
    tone: "accent",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });

  const dropdown = new DropdownMenuRenderable({
    triggerLabel: "Workspace",
    items: [
      { type: "label", id: "workspace-label", label: "Workspace" },
      { id: "rename", label: "Rename", shortcut: "r" },
      { id: "share", label: "Share", shortcut: "s" },
      { type: "separator", id: "workspace-divider" },
      { id: "delete", label: "Delete", danger: true, shortcut: "d" },
    ],
  });

  const contextMenu = new ContextMenuRenderable({
    items: [
      { id: "copy", label: "Copy" },
      { id: "duplicate", label: "Duplicate" },
      { type: "separator", id: "ctx-divider" },
      { id: "archive", label: "Archive", danger: true },
    ],
    layout: {
      width: "100%",
      flexGrow: 1,
    },
  });

  contextMenu.add(
    new PanelRenderable({
      title: "right-click target",
      tone: "info",
      content:
        "Use Enter or click File and View.\nUse Space or click Workspace.\nRight-click here for context actions.",
      layout: {
        position: "absolute",
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
      },
    }),
  );

  playground.add(
    new TextRenderable({
      content:
        "Menubar, navigation-menu, dropdown, and context-menu all share the same keyboard and mouse-first menu model.",
      wrapMode: "word",
      layout: { height: 2 },
      style: { fg: theme.muted, bg: theme.panelBg },
    }),
    dropdown,
    contextMenu,
  );

  section.add(menubar, navMenu, playground);
  return { section, focusTarget: menubar };
}

function createFieldsSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);
  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const fieldsPanel = new PanelRenderable({
    title: "field wrappers",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });

  const inputField = new InputFieldRenderable({
    label: "Search",
    description: "Single-line input with placeholder and label-to-focus behavior.",
    placeholder: "Find widgets",
    width: "fill",
    fieldLayout: { width: "100%" },
  });
  const passwordField = new InputFieldRenderable({
    label: "Token",
    description: "Password mode masks visible output.",
    value: "topsecret",
    type: "password",
    width: "fill",
    fieldLayout: { width: "100%" },
  });
  const selectField = new SelectFieldRenderable({
    label: "Status",
    description: "Select uses dropdown menu infrastructure under the hood.",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In review" },
      { value: "shipped", label: "Shipped" },
    ],
    placeholder: "Choose status",
    fieldLayout: { width: "100%" },
  });
  const textareaField = new TextareaFieldRenderable({
    label: "Notes",
    description: "Auto-resize now grows within row limits and keeps editing predictable.",
    value: "This textarea grows with content.\nIt still stays inside bounds.",
    autoResize: true,
    minRows: 2,
    maxRows: 4,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%" },
    fieldLayout: { width: "100%" },
  });
  fieldsPanel.add(inputField, passwordField, selectField, textareaField);

  const rawPanel = new PanelRenderable({
    title: "raw controls",
    tone: "accent",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  rawPanel.add(
    new InputControlRenderable({
      value: "inline search",
      placeholder: "Search",
      width: "fill",
      type: "search",
    }),
    new SelectControlRenderable({
      options: [
        { value: "left", label: "Left" },
        { value: "split", label: "Split" },
        { value: "right", label: "Right" },
      ],
      value: "split",
      layout: { width: "100%" },
    }),
    new TextareaControlRenderable({
      value:
        "Bare controls are still available when a field wrapper is too heavy.\nThis fixed viewport keeps word wrap inside the editor and exposes the new internal scrolling model.",
      autoResize: false,
      minRows: 4,
      maxRows: 4,
      wrapMode: "word",
      showScrollbars: true,
      layout: { width: "100%", height: 6 },
    }),
    new TextareaControlRenderable({
      value:
        "release/build/output/path=packages/components/src/textarea.ts?mode=nowrap&tracking=neotui-textarea-rewrite",
      autoResize: false,
      wrapMode: "none",
      showScrollbars: true,
      layout: { width: "100%", height: 4 },
    }),
    new TextareaControlRenderable({
      value:
        "Readonly textareas should still allow cursor movement, selection, and scroll.\nMutation paths are blocked, not the viewport.",
      readOnly: true,
      autoResize: false,
      wrapMode: "word",
      showScrollbars: true,
      invalid: true,
      layout: { width: "100%", height: 5 },
    }),
  );

  body.add(fieldsPanel, rawPanel);
  section.add(body);
  return { section, focusTarget: inputField.input };
}

function createChoiceSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const shortcuts = new ToolbarRenderable({
    layout: { height: 1, alignItems: "start" },
  });
  shortcuts.add(
    new KbdRenderable({ label: "Space" }),
    new TextRenderable({ content: "toggle", layout: { height: 1 } }),
    new KbdRenderable({ label: "Enter" }),
    new TextRenderable({ content: "commit", layout: { height: 1 } }),
    new KbdRenderable({ label: "Arrows" }),
    new TextRenderable({ content: "move", layout: { height: 1 } }),
  );

  const controls = new PanelRenderable({
    title: "choice controls",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });

  const checkbox = new CheckboxRenderable({
    label: "Enable command hints",
    checked: true,
  });
  const livePreview = new SwitchRenderable({
    label: "Live preview",
    checked: true,
  });
  const toggle = new ToggleRenderable({
    label: "Pinned",
  });
  const layoutToggle = new ToggleGroupRenderable({
    items: [
      { id: "list", label: "List" },
      { id: "split", label: "Split" },
      { id: "grid", label: "Grid" },
    ],
    type: "single",
    value: "split",
  });
  const optionToggle = new ToggleGroupRenderable({
    items: [
      { id: "lineNumbers", label: "Line #" },
      { id: "wrap", label: "Wrap" },
      { id: "minimap", label: "Minimap", disabled: true },
    ],
    type: "multiple",
    value: ["lineNumbers"],
  });
  const radioGroup = new RadioGroupRenderable({
    orientation: "vertical",
    value: "review",
    options: [
      { value: "draft", label: "Draft" },
      { value: "review", label: "In review" },
      { value: "shipped", label: "Shipped", description: "production ready" },
    ],
  });
  const slider = new SliderRenderable({
    value: 70,
    min: 0,
    max: 100,
    step: 5,
    layout: { width: 28 },
  });

  controls.add(
    checkbox,
    livePreview,
    toggle,
    new TextRenderable({ content: "View mode", layout: { height: 1 } }),
    layoutToggle,
    new TextRenderable({ content: "Editor options", layout: { height: 1 } }),
    optionToggle,
    new TextRenderable({ content: "Release status", layout: { height: 1 } }),
    radioGroup,
    new TextRenderable({ content: "Zoom", layout: { height: 1 } }),
    slider,
  );

  const fieldPanel = new PanelRenderable({
    title: "field composition",
    tone: "default",
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 8,
    },
  });

  const volumeField = new FieldRenderable({
    label: "Volume",
    description: "Compose a slider into the field.",
    orientation: "horizontal",
  });
  volumeField.setControl(
    new SliderRenderable({
      min: 0,
      max: 10,
      step: 1,
      value: 6,
      layout: { width: 18 },
    }),
  );

  const notificationsField = new FieldRenderable({
    label: "Notifications",
    description: "Switch control inside a field surface.",
    orientation: "horizontal",
  });
  notificationsField.setControl(
    new SwitchRenderable({
      checked: true,
    }),
  );
  fieldPanel.add(volumeField, notificationsField);

  section.add(shortcuts, controls, fieldPanel);
  return { section, focusTarget: checkbox };
}

function createFeedbackSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);
  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const intro = new PanelRenderable({
    title: "feedback surfaces",
    content:
      "Spinners, progress, empty states, skeletons, kbd hints, and toasts now share the same theme.",
    tone: "accent",
    layout: { height: 5 },
  });

  const progressPanel = new PanelRenderable({
    title: "work in progress",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  const spinner = new SpinnerRenderable({
    label: "Indexing workspace",
    frameSet: "line",
  }).start();
  const upload = new ProgressRenderable({
    label: "Upload",
    value: 64,
    variant: "success",
    layout: { width: "100%" },
  });
  const migration = new ProgressRenderable({
    label: "Migration",
    value: 28,
    variant: "warning",
    layout: { width: "100%" },
  });
  progressPanel.add(spinner, upload, migration);

  const feedbackColumn = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });
  const empty = new EmptyRenderable({
    title: "No saved searches",
    description: "Create a saved search to pin filters and share them.",
    hint: "Use the primary action to create one.",
    actions: [
      { id: "create", label: "Create Search", variant: "primary" },
      { id: "import", label: "Import", variant: "ghost" },
    ],
    layout: {
      minHeight: 10,
      flexGrow: 1,
    },
  });

  const toast = new ToastRenderable({
    title: "Saved",
    message: "Workspace preferences were written successfully.",
    kind: "success",
    dismissible: true,
    layout: {
      position: "absolute",
      right: 2,
      bottom: 1,
      zIndex: 240,
    },
  });
  const toastStatus = new TextRenderable({
    content: "Launch the toast or press an empty-state action.",
    layout: { height: 1 },
    style: { fg: theme.muted, bg: theme.panelBg },
  });
  const toastTrigger = new ButtonRenderable({
    label: "Show toast",
    variant: "secondary",
    tone: "info",
  });
  toastTrigger.on("press", () => {
    toast.show();
    toastStatus.setContent("Showing toast notification.");
  });
  empty.on("action", (event) => {
    const detail = (event as SubmitEvent<{ id: string; label: string }>).value;
    toastStatus.setContent(`Empty state action: ${detail.id}.`);
  });

  const toastPanel = new PanelRenderable({
    title: "toast",
    tone: "default",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
    },
  });
  toastPanel.add(toastTrigger, toastStatus);

  feedbackColumn.add(empty, toastPanel);
  body.add(progressPanel, feedbackColumn);
  section.add(intro, body, toast);
  return { section, focusTarget: toastTrigger };
}

function createDataSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const rows = [
    {
      id: "rel-01",
      cells: { service: "api", status: "Ready", owner: "Platform", latency: "24ms" },
    },
    {
      id: "rel-02",
      cells: { service: "web", status: "Review", owner: "Frontend", latency: "31ms" },
    },
    {
      id: "rel-03",
      cells: { service: "worker", status: "Draft", owner: "Infra", latency: "52ms" },
    },
    { id: "rel-04", cells: { service: "docs", status: "Ready", owner: "Docs", latency: "14ms" } },
    {
      id: "rel-05",
      cells: { service: "search", status: "Ready", owner: "Platform", latency: "44ms" },
    },
    {
      id: "rel-06",
      cells: { service: "billing", status: "Review", owner: "Core", latency: "29ms" },
    },
  ];

  const tablePanel = new PanelRenderable({
    title: "table",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
    },
  });
  const table = new TableRenderable({
    columns: [
      { id: "service", header: "Service", width: 14 },
      { id: "status", header: "Status", width: 10 },
      { id: "owner", header: "Owner", width: 12 },
      { id: "latency", header: "Latency", align: "right", width: 8 },
    ],
    rows: rows.slice(0, 4),
  });
  table.setActiveRowId("rel-02");
  tablePanel.add(table);

  const dataPanel = new PanelRenderable({
    title: "data table",
    tone: "accent",
    contentMode: "fit",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });
  const dataTable = new DataTableRenderable({
    columns: [
      { id: "service", header: "Service", sortable: true, width: "fill" },
      { id: "status", header: "Status", sortable: true, width: 10 },
      { id: "owner", header: "Owner", sortable: true, width: 12 },
      { id: "latency", header: "Latency", sortable: true, align: "right", width: 8 },
    ],
    rows,
    pageSize: 3,
    layout: { flexGrow: 1 },
  });
  dataTable.setSort("service", "asc");
  dataTable.toggleRowSelection("rel-02");
  dataTable.toggleRowSelection("rel-05");

  dataPanel.add(dataTable);

  section.add(tablePanel, dataPanel);
  return { section, focusTarget: dataTable };
}

function createCommandSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const intro = new PanelRenderable({
    title: "command surface",
    content:
      "Command is a reusable keyboard-first overlay with deterministic filtering, pinned actions, recent actions, focus restore, and an optional preview panel.",
    tone: "accent",
    layout: { height: 5 },
  });

  const workspace = new PanelRenderable({
    title: "workspace",
    tone: "info",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
  });

  const launcher = new ButtonRenderable({
    label: "Open command palette",
    variant: "secondary",
    tone: "info",
  });
  const status = new TextRenderable({
    content: "Open the palette and pick a command.",
    layout: { height: 1 },
    style: { fg: theme.muted, bg: theme.panelBg },
  });
  const command = new CommandRenderable({
    items: [
      {
        id: "deploy-release",
        title: "Deploy Release",
        group: "Release",
        subtitle: "ship the current release candidate",
        shortcut: "d",
        pinned: true,
      },
      {
        id: "open-file",
        title: "Open File",
        group: "File",
        subtitle: "jump to a workspace asset",
        shortcut: "o",
      },
      {
        id: "open-recent",
        title: "Open Recent",
        group: "File",
        subtitle: "restore a recently viewed surface",
        shortcut: "r",
      },
      {
        id: "toggle-sidebar",
        title: "Toggle Sidebar",
        group: "View",
        subtitle: "collapse the navigation rail",
        shortcut: "s",
      },
      {
        id: "promote-build",
        title: "Promote Build",
        group: "Release",
        subtitle: "promote staging to production",
      },
    ],
    recentIds: ["open-recent"],
    previewTitle: "selected action",
    renderPreview: (item) =>
      item
        ? `${item.title}\n${item.subtitle ?? "No summary"}\nshortcut: ${item.shortcut ?? "none"}`
        : null,
  });

  launcher.on("press", () => {
    command.open();
    command.setQuery("");
    status.setContent("Opened command palette.");
  });
  command.on("select", (event) => {
    const detail = (event as SubmitEvent<{ item: { id: string; title: string } }>).value;
    status.setContent(`Selected command: ${detail.item.id}.`);
  });

  workspace.add(
    new TextRenderable({
      content:
        "Use keyboard search, arrow navigation, Enter to select, Escape to restore focus, and pinned or recent sections to keep high-value actions near the top.",
      wrapMode: "word",
      layout: { height: 3 },
      style: { fg: theme.rootFg, bg: theme.panelBg },
    }),
    launcher,
    status,
  );

  section.add(intro, workspace, command);
  return {
    section,
    focusTarget: () => (command.isOpen() ? command.queryInput : launcher),
  };
}

function createTemporalSection(theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const intro = new PanelRenderable({
    title: "temporal surfaces",
    content: "Calendar and date picker share one deterministic UTC-backed date model.",
    tone: "accent",
    layout: { height: 5 },
  });

  const body = new PanelRenderable({
    title: "calendar + picker",
    tone: "info",
    layout: {
      flexDirection: "row",
      gap: 2,
      flexGrow: 1,
      padding: 1,
    },
  });

  const calendar = new CalendarRenderable({
    value: "2026-03-12",
    visibleMonth: "2026-03-01",
    disabledDates: ["2026-03-13", "2026-03-20"],
  });
  const picker = new DatePickerRenderable({
    value: "2026-03-12",
    presentation: "popover",
  });
  body.add(calendar, picker);

  section.add(intro, body);
  return { section, focusTarget: calendar };
}

function createOverlaySection(_renderer: KittyRenderer, theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const intro = new PanelRenderable({
    title: "overlay surfaces",
    content:
      "Dialogs, sheets, drawers, toasts, and the overlay manager now sit on top of the shared component layer.",
    tone: "accent",
    layout: { height: 4 },
  });

  const launchers = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      height: 7,
    },
    style: {
      bg: theme.panelAltBg,
    },
  });
  const launcherRowPrimary = new ToolbarRenderable({
    layout: { height: 3 },
    style: { bg: theme.panelAltBg },
  });
  const launcherRowSecondary = new ToolbarRenderable({
    layout: { height: 3 },
    style: { bg: theme.panelAltBg },
  });
  const dialogLauncher = new ButtonRenderable({ label: "Dialog", variant: "secondary" });
  const sheetLauncher = new ButtonRenderable({
    label: "Sheet",
    variant: "secondary",
    tone: "info",
  });
  const drawerLauncher = new ButtonRenderable({
    label: "Drawer",
    variant: "secondary",
    tone: "accent",
  });
  const overlayLauncher = new ButtonRenderable({ label: "Managed overlay", variant: "ghost" });
  const toastLauncher = new ButtonRenderable({ label: "Toast", variant: "ghost" });
  launcherRowPrimary.add(dialogLauncher, sheetLauncher, drawerLauncher);
  launcherRowSecondary.add(overlayLauncher, toastLauncher);
  launchers.add(launcherRowPrimary, launcherRowSecondary);

  const workspace = new PanelRenderable({
    title: "workspace",
    subtitle: "overlay host",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexGrow: 1,
    },
    style: {
      bg: theme.panelAltBg,
    },
  });
  const status = new TextRenderable({
    content: "Open an overlay surface to test focus handoff and dismissal behavior.",
    layout: { height: 1 },
    style: { fg: theme.muted, bg: theme.panelAltBg },
  });
  const workspaceContent = new TextRenderable({
    content:
      "Release queue\n" +
      "- Deploy release v0.1.0-rc.1\n" +
      "- Run visual overlay QA\n" +
      "- Publish workspace notes\n" +
      "- Verify focus restore",
    wrapMode: "word",
    layout: {
      flexGrow: 1,
    },
    style: {
      fg: theme.rootFg,
      bg: theme.panelAltBg,
    },
  });

  const dialog = new DialogRenderable({
    title: "Confirm release",
    variant: "info",
    width: "56%",
  });
  dialog.add(
    new TextRenderable({
      content:
        "Dialog is now a real reusable component with a built-in focus trap, backdrop handling, and restore-focus behavior.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
  );
  const dialogCancel = new ButtonRenderable({ label: "Cancel", variant: "ghost" });
  const dialogConfirm = new ButtonRenderable({
    label: "Confirm",
    variant: "primary",
    tone: "info",
  });
  dialog.addFooter(dialogCancel, dialogConfirm);
  dialog.initialFocusTarget = dialogCancel;

  const sheet = new SheetRenderable({
    title: "Workspace details",
    description: "Sheet is anchored to the edge and restores focus when it closes.",
    side: "right",
    width: "38%",
    showCloseButton: true,
  });
  sheet.add(
    new TextRenderable({
      content:
        "Use sheets for inspector panels, side drawers, and contextual detail panes that should not block the whole workspace permanently.",
      wrapMode: "word",
      layout: { height: 4 },
    }),
  );

  const drawer = new DrawerRenderable({
    title: "Build output",
    side: "bottom",
    compact: true,
    height: 10,
    showCloseButton: true,
  });
  drawer.add(
    new TextRenderable({
      content:
        "Drawer uses the same edge-surface model as Sheet but defaults to a compact bottom-mounted presentation.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
  );

  const overlayManager = new OverlayManagerRenderable();
  const managedOverlay = new PanelRenderable({
    title: "managed overlay",
    tone: "accent",
    contentMode: "grow",
    layout: {
      position: "absolute",
      left: "24%",
      top: 5,
      width: "52%",
    },
  });
  const managedClose = new ButtonRenderable({ label: "Close", variant: "secondary" });
  managedOverlay.add(
    new TextRenderable({
      content:
        "Overlay manager owns stack order, backdrops, and focus handoff for arbitrary renderables.",
      wrapMode: "word",
      layout: { height: 3 },
    }),
    managedClose,
  );
  overlayManager.register({
    id: "dialog",
    node: dialog,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      dialog.open();
    },
    closeOverlay: (reason) => {
      dialog.close({ reason: normalizeDialogOverlayReason(reason) });
    },
    isOverlayOpen: () => dialog.isOpen(),
  });
  overlayManager.register({
    id: "sheet",
    node: sheet,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      sheet.open();
    },
    closeOverlay: (reason) => {
      sheet.close({ reason: normalizeSheetOverlayReason(reason) });
    },
    isOverlayOpen: () => sheet.isOpen(),
  });
  overlayManager.register({
    id: "drawer",
    node: drawer,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      drawer.open();
    },
    closeOverlay: (reason) => {
      drawer.close({ reason: normalizeSheetOverlayReason(reason) });
    },
    isOverlayOpen: () => drawer.isOpen(),
  });
  overlayManager.register({
    id: "managed",
    node: managedOverlay,
    modal: true,
    initialFocus: managedClose,
    restoreFocus: overlayLauncher,
    exclusiveGroup: "workspace-overlays",
  });

  const toast = new ToastRenderable({
    title: "Released",
    message: "The overlay demo wrote its status update successfully.",
    kind: "info",
    dismissible: true,
    layout: {
      position: "absolute",
      right: 2,
      bottom: 1,
      zIndex: 240,
    },
  });
  overlayManager.register({
    id: "toast",
    node: toast,
    modal: false,
    backdrop: false,
    manageFocus: false,
    exclusiveGroup: "workspace-overlays",
    openOverlay: () => {
      toast.show();
    },
    closeOverlay: () => {
      toast.hide();
    },
    isOverlayOpen: () => toast.isVisible(),
  });

  dialogLauncher.on("press", () => {
    overlayManager.open("dialog");
    status.setContent("Opened dialog.");
  });
  sheetLauncher.on("press", () => {
    overlayManager.open("sheet");
    status.setContent("Opened sheet.");
  });
  drawerLauncher.on("press", () => {
    overlayManager.open("drawer");
    status.setContent("Opened drawer.");
  });
  overlayLauncher.on("press", () => {
    overlayManager.open("managed");
    status.setContent("Opened managed overlay.");
  });
  toastLauncher.on("press", () => {
    overlayManager.open("toast");
    status.setContent("Showing toast.");
  });
  dialogCancel.on("press", () => {
    dialog.close({ reason: "action" });
    status.setContent("Closed dialog.");
  });
  dialogConfirm.on("press", () => {
    dialog.close({ reason: "submit" });
    status.setContent("Confirmed dialog action.");
  });
  managedClose.on("press", () => {
    overlayManager.close("managed", "action");
    status.setContent("Closed managed overlay.");
  });
  dialog.on("close", (event) => {
    const detail = event as unknown as { reason: string };
    status.setContent(`Closed dialog: ${detail.reason}.`);
  });
  sheet.on("close", (event) => {
    const detail = event as unknown as { reason: string };
    status.setContent(`Closed sheet: ${detail.reason}.`);
  });
  drawer.on("close", (event) => {
    const detail = event as unknown as { reason: string };
    status.setContent(`Closed drawer: ${detail.reason}.`);
  });
  toast.on("close", () => {
    status.setContent("Closed toast.");
  });
  overlayManager.on("close", (event) => {
    const detail = event as unknown as { reason: string; id: string };
    if (detail.id === "managed") {
      status.setContent(`Closed ${detail.id} from overlay manager: ${detail.reason}.`);
    }
  });

  workspace.add(launchers, status, workspaceContent, overlayManager);
  section.add(intro, workspace);
  return { section, focusTarget: dialogLauncher };
}

function normalizeDialogOverlayReason(
  reason?: string,
): "escape" | "backdrop" | "action" | "programmatic" | "submit" {
  switch (reason) {
    case "escape":
    case "backdrop":
    case "action":
    case "submit":
      return reason;
    default:
      return "programmatic";
  }
}

function normalizeSheetOverlayReason(
  reason?: string,
): "escape" | "backdrop" | "action" | "programmatic" {
  switch (reason) {
    case "escape":
    case "backdrop":
    case "action":
      return reason;
    default:
      return "programmatic";
  }
}

function createWindowsSection(renderer: KittyRenderer, theme: PlaygroundTheme): CatalogSection {
  const section = createSectionRoot(theme);

  const intro = new PanelRenderable({
    title: "window workspace",
    content:
      "Floating windows, scrolling bodies, utility-window layering, fixed chrome modes, and drag/resize all live in the component layer now.",
    tone: "accent",
    layout: { height: 5 },
  });

  const workspace = new PanelRenderable({
    title: "windows",
    tone: "info",
    contentMode: "scroll",
    scrollDirection: "both",
    layout: {
      flexGrow: 1,
    },
  });
  const manager = new WindowManagerRenderable({
    layout: { width: 74, height: 22 },
  });

  const inspector = new WindowRenderable({
    title: "Inspector",
    subtitle: "wrap + footer",
    x: 2,
    y: 1,
    width: 38,
    height: 13,
    active: true,
    content: [
      "Drag this title bar to move the window.",
      "Use the bottom-right handle to resize it.",
      "This variant keeps word-wrap on and adds a compact footer.",
    ].join("\n"),
    contentWrapMode: "word",
    contentScrollable: false,
  });
  inspector.addFooter(
    new ButtonRenderable({ label: "Apply", variant: "primary", width: 7 }),
    new ButtonRenderable({ label: "Reset", variant: "ghost", width: 7 }),
  );

  const preview = new WindowRenderable({
    title: "Preview",
    subtitle: "wrap only",
    x: 44,
    y: 2,
    width: 28,
    height: 9,
    content:
      "This window shows fixed-size wrapping without inner scrolling. Short content stays pinned at the top.",
    contentWrapMode: "word",
    contentScrollable: false,
  });

  const activity = new WindowRenderable({
    title: "Activity",
    subtitle: "scroll + wrap",
    x: 8,
    y: 13,
    width: 32,
    height: 8,
    content: [
      "12:01 build queued",
      "12:02 preparing workspace",
      "12:03 syncing packages",
      "12:04 compiling core",
      "12:05 compiling components",
      "12:06 running targeted tests",
      "12:07 collecting snapshots",
      "12:08 verifying kitty session",
    ].join("\n"),
    contentWrapMode: "word",
    contentScrollable: true,
  });

  const palette = new WindowRenderable({
    title: "Palette",
    subtitle: "utility window",
    role: "utility",
    x: 42,
    y: 13,
    width: 28,
    height: 8,
    resizable: false,
    maximizable: false,
    content:
      "Utility-role windows stay above document windows without pushing z-index policy back into app code.",
    contentWrapMode: "word",
    contentScrollable: false,
  });

  manager.addWindow(inspector).addWindow(preview).addWindow(activity).addWindow(palette);
  workspace.add(manager);
  manager.activate(inspector.id);
  renderer.focus(inspector);

  section.add(intro, workspace);
  return { section, focusTarget: inspector };
}

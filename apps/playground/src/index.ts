import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  BadgeRenderable,
  ButtonRenderable,
  DialogRenderable,
  DockLayoutRenderable,
  InputControlRenderable,
  InputFieldRenderable,
  PanelRenderable,
  ScrollAreaRenderable,
  SelectFieldRenderable,
  SidebarRenderable,
  TabsRenderable,
  TextareaFieldRenderable,
  ToolbarRenderable,
} from "@neotui/components";
import {
  BoxRenderable,
  type ChangeEvent,
  CodeRenderable,
  createKittyRenderer,
  DiffRenderable,
  ImageRenderable,
  MarkdownRenderable,
  type Renderable,
  type SubmitEvent,
  TextRenderable,
} from "@neotui/core";
import { componentCatalogSectionIds, createComponentCatalogSurfaces } from "./component-catalog";

type SectionFocusTarget = Renderable | (() => Renderable | null | undefined);

export interface PlaygroundSessionOptions {
  fail?: boolean;
  durationMs?: number;
  waitForExit?: boolean;
}

const theme = {
  rootBg: "#14110f",
  rootFg: "#f5e9d4",
  panelBg: "#1d1916",
  panelAltBg: "#211c18",
  border: "#d08c60",
  borderStrong: "#f0c674",
  title: "#ffd27d",
  accent: "#84c7ae",
  accentSoft: "#4d8f7a",
  info: "#61afef",
  success: "#98c379",
  danger: "#e06c75",
  muted: "#c7b7a3",
  ink: "#0f1419",
} as const;

const playgroundSections = [
  "overview",
  "inputs",
  "markdown",
  "code",
  "diff",
  "image",
  "dialog",
  "command",
  "overlay",
  "drag",
  "windows",
  "primitives",
  "navigation",
  "menus",
  "fields",
  "choice",
  "feedback",
  "data",
  "temporal",
] as const;

type PlaygroundSectionId = (typeof playgroundSections)[number];

const playgroundSectionMeta: Record<
  PlaygroundSectionId,
  {
    label: string;
    tab: PlaygroundTabId;
  }
> = {
  overview: { label: "overview", tab: "overview" },
  inputs: { label: "inputs", tab: "core" },
  markdown: { label: "markdown", tab: "core" },
  code: { label: "code", tab: "core" },
  diff: { label: "diff", tab: "core" },
  image: { label: "image", tab: "core" },
  dialog: { label: "dialog", tab: "overlay" },
  command: { label: "command", tab: "components" },
  overlay: { label: "overlay", tab: "overlay" },
  drag: { label: "drag", tab: "workspace" },
  windows: { label: "windows", tab: "workspace" },
  primitives: { label: "primitives", tab: "components" },
  navigation: { label: "navigation", tab: "components" },
  menus: { label: "menus", tab: "components" },
  fields: { label: "fields", tab: "components" },
  choice: { label: "choice", tab: "components" },
  feedback: { label: "feedback", tab: "components" },
  data: { label: "data", tab: "components" },
  temporal: { label: "temporal", tab: "components" },
};

const playgroundTabs = [
  { id: "overview", label: "Overview" },
  { id: "core", label: "Core" },
  { id: "components", label: "Components" },
  { id: "overlay", label: "Overlay" },
  { id: "workspace", label: "Workspace" },
] as const;

type PlaygroundTabId = (typeof playgroundTabs)[number]["id"];

const defaultSectionByTab: Record<PlaygroundTabId, PlaygroundSectionId> = {
  overview: "overview",
  core: "inputs",
  components: "navigation",
  overlay: "overlay",
  workspace: "windows",
};

function tabIdForSection(section: PlaygroundSectionId): PlaygroundTabId {
  return playgroundSectionMeta[section].tab;
}

function sectionsForTab(tab: PlaygroundTabId): PlaygroundSectionId[] {
  if (tab === "overview") {
    return [...playgroundSections];
  }

  return playgroundSections.filter((section) => playgroundSectionMeta[section].tab === tab);
}

function sidebarGroupsForTab(tab: PlaygroundTabId) {
  if (tab === "overview") {
    return [
      {
        id: "all-sections",
        label: "all sections",
        items: playgroundSections.map((section) => ({
          id: section,
          label: playgroundSectionMeta[section].label,
        })),
      },
    ];
  }

  const tabLabel = playgroundTabs.find((entry) => entry.id === tab)?.label ?? tab;
  return [
    {
      id: `${tab}-sections`,
      label: `${tabLabel.toLowerCase()} sections`,
      items: sectionsForTab(tab).map((section) => ({
        id: section,
        label: playgroundSectionMeta[section].label,
      })),
    },
  ];
}

const kittyImageSource = fileURLToPath(new URL("../../../examples/kitty.png", import.meta.url));
const resolvedKittyImageSource = existsSync(kittyImageSource) ? kittyImageSource : "";

export function createPlaygroundRenderer() {
  const renderer = createKittyRenderer({
    appName: "playground",
    width: process.stdout.columns ?? 96,
    height: process.stdout.rows ?? 30,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });
  renderer.root.updateStyle({
    bg: theme.rootBg,
    fg: theme.rootFg,
  });

  const hero = new PanelRenderable({
    title: "NeoTui",
    tone: "accent",
    contentMode: "grow",
    content: [
      "NeoTui playground",
      "kitty-native renderer | bun-first runtime | TypeScript core",
      "top tabs now filter the left rail by section family",
      "overview shows all sections; core, components, overlay, and workspace narrow the catalog",
      "click any left-rail item to switch surfaces inside the active filter",
    ].join("\n"),
    layout: {
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
    },
    style: {
      fg: theme.rootFg,
      bg: theme.panelBg,
      borderFg: theme.borderStrong,
      titleFg: theme.title,
    },
  });

  const tabs = new TabsRenderable({
    tabs: [...playgroundTabs],
    activeTabId: "overview",
    layout: { height: 1 },
    style: {
      fg: theme.muted,
      bg: theme.rootBg,
      borderFg: theme.accent,
      titleFg: theme.borderStrong,
    },
  });

  const body = new BoxRenderable({
    layout: {
      flexDirection: "row",
      flexGrow: 1,
      gap: 1,
    },
  });

  const nav = new SidebarRenderable({
    title: "sections",
    groups: sidebarGroupsForTab("overview"),
    activeItemId: "overview",
    layout: { width: "22%", minWidth: 18 },
    style: {
      fg: theme.rootFg,
      bg: theme.panelAltBg,
      borderFg: theme.border,
      titleFg: theme.accent,
    },
  });

  const panel = new PanelRenderable({
    title: "surface:overview",
    contentMode: "grow",
    layout: {
      flexGrow: 1,
    },
    style: {
      fg: theme.rootFg,
      bg: theme.panelBg,
      borderFg: theme.border,
      titleFg: theme.title,
    },
  });

  const input = new InputFieldRenderable({
    label: "command",
    description: "Single-line input wrapper with integrated label, focus, and validation chrome.",
    value: "NeoTui",
    placeholder: "single-line input",
    width: "fill",
    fieldLayout: { width: "100%" },
    style: {
      fg: theme.rootFg,
      bg: "#27211d",
      borderFg: theme.accent,
      titleFg: theme.borderStrong,
    },
  });

  const textarea = new TextareaFieldRenderable({
    label: "notes",
    description: "Multiline editor wrapper with predictable sizing and textarea semantics.",
    value: "Bun-first.\nkitty-first.\nOpenTUI direction.",
    minRows: 4,
    maxRows: 4,
    autoResize: false,
    wrapMode: "word",
    showScrollbars: true,
    layout: { width: "100%", height: 7 },
    fieldLayout: { width: "100%" },
    style: {
      fg: theme.muted,
      bg: "#27211d",
      borderFg: theme.info,
      titleFg: theme.borderStrong,
    },
  });

  const inputMode = new SelectFieldRenderable({
    label: "mode",
    description: "Selection control wrapper for compact enumerated choices.",
    value: "normal",
    options: [
      { value: "normal", label: "normal" },
      { value: "insert", label: "insert" },
      { value: "visual", label: "visual" },
    ],
    layout: { width: "100%" },
    fieldLayout: { width: "100%" },
    style: {
      fg: theme.rootFg,
      bg: "#211c18",
      borderFg: theme.border,
      titleFg: theme.accent,
    },
  });

  const markdown = new MarkdownRenderable({
    markdown: [
      "# Docs Showcase",
      "> This surface renders headings, links, checklists, quotes, ordered lists, and fenced code.",
      "",
      "- [x] renderer kernel",
      "- [x] widget composition",
      "- [x] kitty graphics and links",
      "- [ ] dockable panes",
      "",
      "1. create the renderer",
      "2. mount the scene tree",
      "3. start the kitty session",
      "",
      "```ts",
      'const renderer = createKittyRenderer({ appName: "docs" });',
      "renderer.add(surface);",
      "renderer.start();",
      "```",
      "",
      "Read [OpenTUI](https://opentui.com/docs/getting-started/) for the renderer-first direction.",
    ].join("\n"),
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#201a17",
      borderFg: theme.accentSoft,
      titleFg: theme.accent,
    },
  });

  const code = new CodeRenderable({
    code: [
      'import { BoxRenderable, createKittyRenderer } from "@neotui/core";',
      "",
      'const renderer = createKittyRenderer({ appName: "playground" });',
      "const panel = new BoxRenderable({",
      '  content: "kitty-first surface",',
      '  layout: { width: "100%", height: "100%", padding: 1 },',
      '  style: { border: true, title: "panel" },',
      "});",
      "",
      "renderer.add(panel);",
      "renderer.start();",
    ].join("\n"),
    language: "ts",
    lineNumbers: true,
    layout: { flexGrow: 1 },
    style: {
      fg: "#d8dee9",
      bg: "#171d23",
      borderFg: theme.info,
      titleFg: "#8fb9ff",
    },
  });

  const diff = new DiffRenderable({
    before: [
      "const renderer = createKittyRenderer({ appName: 'old' })",
      "renderer.root.updateLayout({ padding: 1 })",
      "renderer.add(oldSurface)",
      "renderer.renderFrame()",
    ].join("\n"),
    after: [
      "const renderer = createKittyRenderer({ appName: 'workspace' })",
      "renderer.add(shell, overlays)",
      "renderer.subscribe(handleInput)",
      "renderer.renderFrame()",
    ].join("\n"),
    split: true,
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#1f1b17",
      borderFg: theme.danger,
      titleFg: "#ff9e8f",
    },
  });

  const image = new ImageRenderable({
    source: resolvedKittyImageSource,
    alt: existsSync(resolvedKittyImageSource) ? "kitty photo" : "kitty image asset missing",
    layout: { width: "40%" },
    style: {
      fg: theme.rootFg,
      bg: "#1c1815",
      borderFg: theme.success,
      titleFg: "#b6e39a",
    },
  });

  const link = new TextRenderable({
    content: [
      { text: "OpenTUI docs", href: "https://opentui.com/docs/getting-started/", fg: theme.info },
      {
        text: "\nrenderer-first | kitty-native | bun-first\n\nThe image panel uses the kitty graphics protocol instead of ANSI art fallbacks.",
        fg: theme.muted,
      },
    ],
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: theme.panelBg,
    },
  });

  const overviewSection = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const overviewSummary = new PanelRenderable({
    contentMode: "grow",
    content: [
      "This playground is stateful now.",
      "The top tabs and the left rail both switch the visible section.",
      "Use the drag section to swap panes with the mouse.",
      "Use the dialog section to open a modal and close it with Escape.",
    ].join("\n"),
    layout: {
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
    },
    title: "overview",
    tone: "accent",
    style: {
      fg: theme.rootFg,
      bg: "#201a17",
      borderFg: theme.accent,
      titleFg: theme.title,
    },
  });

  const overviewMeta = new ToolbarRenderable({
    layout: { height: 1 },
    style: { bg: theme.panelBg },
  });
  overviewMeta.add(
    new BadgeRenderable({ label: "kitty-native", tone: "accent" }),
    new BadgeRenderable({ label: "bun-first", tone: "info" }),
    new BadgeRenderable({ label: "components c2", tone: "success" }),
  );

  const overviewHighlights = new MarkdownRenderable({
    markdown: [
      "# Capabilities",
      "- truecolor borders and fills",
      "- kitty graphics protocol",
      "- mouse focus, tabs, and selection",
      "- dialog stacks and focus handoff",
      "- drag aliases and overlays",
      "",
      "## Notes",
      "> The playground is meant to show interactive surfaces, not just static boxes.",
    ].join("\n"),
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#1c1714",
      borderFg: theme.border,
      titleFg: theme.accent,
    },
  });

  const inputsIntro = new PanelRenderable({
    title: "field wrappers",
    tone: "accent",
    content:
      "Inputs, textarea, and select now go through reusable field composition instead of app-local widget chrome.",
    layout: { height: 5 },
    style: {
      fg: theme.rootFg,
      bg: "#201a17",
      borderFg: theme.accent,
      titleFg: theme.title,
    },
  });

  const inputsSection = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });
  const inputsBody = new ScrollAreaRenderable({
    direction: "vertical",
    showScrollbars: true,
    scrollbarVisibility: "auto",
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      border: false,
      bg: theme.panelBg,
      fg: theme.rootFg,
    },
  });

  const dragSection = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const dialogSection = new BoxRenderable({
    layout: {
      flexDirection: "column",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const imageSection = new BoxRenderable({
    layout: {
      flexDirection: "row",
      gap: 1,
      flexGrow: 1,
    },
    style: {
      bg: theme.panelBg,
    },
  });

  const dialogLauncherRow = new ToolbarRenderable({
    layout: { height: 3 },
    style: { bg: theme.panelBg },
  });

  const dialogLauncher = new ButtonRenderable({
    label: "Basic dialog",
    variant: "primary",
  });
  const dialogInputLauncher = new ButtonRenderable({
    label: "Input focus dialog",
    variant: "secondary",
    tone: "info",
  });
  const dialogStackLauncher = new ButtonRenderable({
    label: "Stacked dialogs",
    variant: "secondary",
    tone: "accent",
  });

  const dialogStatus = new TextRenderable({
    content: "Launch a modal to test focus, overlay, and dismissal paths.",
    layout: { height: 1 },
    style: { fg: theme.muted, bg: theme.panelBg },
  });

  const dialogNotes = new PanelRenderable({
    content:
      "The dialog surface now uses reusable dialog components for three cases:\n- basic modal dismissal\n- input-first focus\n- stacked modal focus handoff",
    contentMode: "grow",
    title: "dialog notes",
    style: {
      fg: theme.rootFg,
      bg: "#1c1714",
      borderFg: theme.border,
      titleFg: theme.accent,
    },
  });

  const dialogWorkspace = new PanelRenderable({
    title: "workspace",
    subtitle: "dialog host",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexGrow: 1,
      flexDirection: "column",
      gap: 1,
    },
    style: {
      fg: theme.rootFg,
      bg: theme.panelAltBg,
      borderFg: theme.info,
      titleFg: theme.title,
    },
  });
  const dialogWorkspaceMeta = new ToolbarRenderable({
    layout: { height: 1 },
    style: { bg: theme.panelAltBg },
  });
  dialogWorkspaceMeta.add(
    new BadgeRenderable({ label: "focus trap", tone: "accent" }),
    new BadgeRenderable({ label: "backdrop", tone: "info" }),
    new BadgeRenderable({ label: "restore focus", tone: "success" }),
  );
  const dialogWorkspaceContent = new TextRenderable({
    content:
      "Release checklist\n- verify overlay stack\n- confirm focus restore\n- submit modal input\n- close nested dialogs safely",
    wrapMode: "word",
    layout: { height: 4 },
    style: {
      fg: theme.rootFg,
      bg: theme.panelAltBg,
    },
  });

  const dialogBasic = new DialogRenderable({
    title: "dialog:basic",
    variant: "info",
    width: "56%",
  });
  dialogBasic.add(
    new TextRenderable({
      content:
        "kitty-native modal dialog\nOverlay, backdrop dismissal, and Escape close\nall use the reusable dialog path now.",
      wrapMode: "word",
      layout: { height: 3 },
      style: { fg: theme.rootFg, bg: "#241d19" },
    }),
  );
  const dialogClose = new ButtonRenderable({
    label: "Close",
    variant: "primary",
  });
  dialogBasic.addFooter(dialogClose);
  dialogBasic.initialFocusTarget = dialogClose;
  dialogBasic.body.updateLayout({ gap: 1 });

  const dialogInput = new DialogRenderable({
    title: "dialog:input",
    variant: "info",
    width: "60%",
    height: 16,
  });
  dialogInput.add(
    new TextRenderable({
      content:
        "The first focus target in this modal is the input.\nType, Tab through the controls, and submit to test focus order.",
      wrapMode: "word",
      layout: { height: 3 },
      style: { fg: theme.rootFg, bg: "#241d19" },
    }),
  );
  const dialogInputLabel = new TextRenderable({
    content: "modal input",
    layout: { height: 1 },
    style: { fg: theme.title, bg: "#241d19" },
  });
  const dialogInputField = new InputControlRenderable({
    value: "NeoTui",
    placeholder: "type in the modal",
    width: "fill",
    layout: { width: "100%" },
    style: {
      fg: theme.rootFg,
      bg: "#1b232a",
      borderFg: theme.info,
      titleFg: "#8fb9ff",
    },
  });
  const dialogInputCancel = new ButtonRenderable({
    label: "Cancel",
    variant: "ghost",
  });
  const dialogInputSubmit = new ButtonRenderable({
    label: "Submit",
    variant: "primary",
    tone: "info",
  });
  dialogInput.add(dialogInputLabel, dialogInputField);
  dialogInput.addFooter(dialogInputCancel, dialogInputSubmit);
  dialogInput.initialFocusTarget = dialogInputField;
  dialogInput.body.updateLayout({ gap: 1 });

  const dialogStackBase = new DialogRenderable({
    title: "dialog:stack-base",
    width: "62%",
    height: 12,
  });
  dialogStackBase.add(
    new TextRenderable({
      content:
        "This is the first layer.\nOpen the second dialog, then close it and confirm\nfocus returns here instead of leaking to the page.",
      wrapMode: "word",
      layout: { height: 3 },
      style: { fg: theme.rootFg, bg: "#241d19" },
    }),
  );
  const dialogStackNext = new ButtonRenderable({
    label: "Open second layer",
    variant: "secondary",
    tone: "accent",
  });
  const dialogStackClose = new ButtonRenderable({
    label: "Close base",
    variant: "ghost",
  });
  dialogStackBase.addFooter(dialogStackNext, dialogStackClose);
  dialogStackBase.initialFocusTarget = dialogStackNext;
  dialogStackBase.body.updateLayout({ gap: 1 });

  const dialogStackTop = new DialogRenderable({
    title: "dialog:stack-top",
    variant: "info",
    width: "50%",
    height: 16,
  });
  dialogStackTop.add(
    new TextRenderable({
      content: "Top-most dialog layer.\nClose it and confirm focus returns to the base layer.",
      wrapMode: "word",
      layout: { height: 2 },
      style: { fg: theme.rootFg, bg: "#1d2328" },
    }),
  );
  const dialogStackTopLabel = new TextRenderable({
    content: "nested input",
    layout: { height: 1 },
    style: { fg: "#8fb9ff", bg: "#1d2328" },
  });
  const dialogStackTopInput = new InputControlRenderable({
    value: "nested focus",
    placeholder: "nested modal input",
    width: "fill",
    layout: { width: "100%" },
    style: {
      fg: theme.rootFg,
      bg: "#111920",
      borderFg: theme.info,
      titleFg: "#8fb9ff",
    },
  });
  const dialogStackBack = new ButtonRenderable({
    label: "Back",
    variant: "ghost",
  });
  const dialogStackConfirm = new ButtonRenderable({
    label: "Confirm",
    variant: "primary",
    tone: "info",
  });
  dialogStackTop.add(dialogStackTopLabel, dialogStackTopInput);
  dialogStackTop.addFooter(dialogStackBack, dialogStackConfirm);
  dialogStackTop.initialFocusTarget = dialogStackTopInput;
  dialogStackTop.body.updateLayout({ gap: 1 });

  const tintDialog = (dialog: DialogRenderable, bg: string, borderFg: string, titleFg: string) => {
    dialog.backdrop.updateStyle({ bg: "#0e0b0a" });
    dialog.card.updateStyle({
      fg: theme.rootFg,
      bg,
      borderFg,
      titleFg,
    });
    dialog.body.updateStyle({
      fg: theme.rootFg,
      bg,
    });
    dialog.footer.updateStyle({ bg });
  };

  tintDialog(dialogBasic, "#241d19", theme.borderStrong, theme.title);
  tintDialog(dialogInput, "#241d19", theme.info, "#8fb9ff");
  tintDialog(dialogStackBase, "#241d19", theme.accent, theme.accent);
  tintDialog(dialogStackTop, "#1d2328", theme.info, "#8fb9ff");

  const dragIntro = new PanelRenderable({
    contentMode: "grow",
    content:
      "Drag one pane and release it over another pane. Center drops swap positions; edge drops insert before or after.\nThis uses the renderer's dragstart and mouseup path, not fake state toggles.",
    layout: {
      padding: { top: 0, right: 1, bottom: 0, left: 1 },
    },
    title: "drag instructions",
    tone: "accent",
    style: {
      fg: theme.rootFg,
      bg: "#1c1714",
      borderFg: theme.accent,
      titleFg: theme.title,
    },
  });

  const dragStatus = new TextRenderable({
    content:
      "Drag a pane onto another pane to reorder the workspace. Edge drops insert; center drops swap.",
    layout: { height: 1 },
    style: {
      fg: theme.muted,
      bg: theme.panelBg,
    },
  });

  const dragPaneA = new BoxRenderable({
    content: "Logs\n\nDrop onto another pane to move this surface.",
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#1f1a17",
    },
  });

  const dragPaneB = new BoxRenderable({
    content: "Preview\n\nThis pane accepts drops from the others.",
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#1f1a17",
    },
  });

  const dragPaneC = new BoxRenderable({
    content: "Inspector\n\nThe workspace order mutates after a drop.",
    layout: { flexGrow: 1 },
    style: {
      fg: theme.rootFg,
      bg: "#1f1a17",
    },
  });

  const dragWorkspace = new DockLayoutRenderable({
    items: [
      { id: "logs", title: "logs", node: dragPaneA, tone: "info" },
      { id: "preview", title: "preview", node: dragPaneB, tone: "success" },
      { id: "inspector", title: "inspector", node: dragPaneC, tone: "danger" },
    ],
    layout: {
      flexGrow: 1,
    },
  });
  const componentCatalog = createComponentCatalogSurfaces(renderer, theme);

  const sections = {
    overview: overviewSection,
    inputs: inputsSection,
    markdown,
    code,
    diff,
    image: imageSection,
    dialog: dialogSection,
    drag: dragSection,
    ...componentCatalog.sections,
  } satisfies Record<PlaygroundSectionId, Renderable>;

  overviewSection.add(overviewSummary, overviewMeta, overviewHighlights);
  inputsBody.add(input, textarea, inputMode);
  inputsSection.add(inputsIntro, inputsBody);
  imageSection.add(image, link);
  dialogLauncherRow.add(dialogLauncher, dialogInputLauncher, dialogStackLauncher);
  dialogWorkspace.add(dialogWorkspaceMeta, dialogWorkspaceContent);
  dialogSection.add(dialogLauncherRow, dialogStatus, dialogNotes, dialogWorkspace);
  dragSection.add(dragIntro, dragWorkspace, dragStatus);
  const sectionFocusTargets: Partial<Record<PlaygroundSectionId, SectionFocusTarget>> = {
    inputs: input.input,
    dialog: dialogLauncher,
    ...(componentCatalog.focusTargets as Partial<Record<PlaygroundSectionId, SectionFocusTarget>>),
  };

  let activeSection: PlaygroundSectionId = "overview";
  let syncingSelection = false;
  const lastSectionByTab: Record<PlaygroundTabId, PlaygroundSectionId> = { ...defaultSectionByTab };
  const dialogs = [dialogBasic, dialogInput, dialogStackBase, dialogStackTop] as const;

  const closeDialogOverlays = (reason: string) => {
    const openDialogs = dialogs.filter((dialog) => dialog.isOpen());
    if (openDialogs.length === 0) {
      return;
    }

    for (const dialog of openDialogs.reverse()) {
      dialog.close({ reason: "programmatic" });
    }

    dialogStatus.setContent(reason);

    if (activeSection === "dialog") {
      renderer.focus(dialogLauncher);
    }
  };

  const closeStackDialogs = (reason: string) => {
    if (dialogStackTop.isOpen()) {
      dialogStackTop.close({ reason: "programmatic" });
    }
    if (dialogStackBase.isOpen()) {
      dialogStackBase.close({ reason: "action" });
    }
    dialogStatus.setContent(reason);
  };

  const applySection = (section: PlaygroundSectionId) => {
    activeSection = section;
    lastSectionByTab[tabIdForSection(section)] = section;

    for (const sectionId of playgroundSections) {
      sections[sectionId].setVisible(sectionId === section);
    }

    panel.setTitle(`surface:${section}`);
  };

  const focusSection = (section: PlaygroundSectionId) => {
    if (section !== "dialog") {
      closeDialogOverlays("Closed dialog overlays while leaving the dialog surface.");
    }

    applySection(section);
    nav.setActiveItem(section);

    const focusTarget = sectionFocusTargets[section];
    const resolvedFocusTarget =
      typeof focusTarget === "function" ? (focusTarget() ?? nav) : (focusTarget ?? nav);
    renderer.focus(resolvedFocusTarget);
  };

  const syncFilter = (tab: PlaygroundTabId, requestedSection?: PlaygroundSectionId) => {
    const allowedSections = sectionsForTab(tab);
    const nextSection =
      requestedSection && allowedSections.includes(requestedSection)
        ? requestedSection
        : allowedSections.includes(activeSection)
          ? activeSection
          : (allowedSections.find((section) => section === lastSectionByTab[tab]) ??
            allowedSections[0] ??
            "overview");

    syncingSelection = true;
    nav.setGroups(sidebarGroupsForTab(tab));
    nav.setActiveItem(nextSection);
    tabs.setActiveTab(tab);
    syncingSelection = false;

    focusSection(nextSection);
  };

  tabs.on("change", (event) => {
    if (syncingSelection) {
      return;
    }

    syncFilter((event as ChangeEvent<{ id: PlaygroundTabId }>).value.id);
  });

  nav.on("select", (event) => {
    if (syncingSelection) {
      return;
    }

    const next = (event as ChangeEvent<{ id: string }>).value.id as PlaygroundSectionId;
    focusSection(next);
  });

  dialogLauncher.on("press", () => {
    dialogBasic.open();
    dialogStatus.setContent("Opened basic dialog.");
  });
  dialogInputLauncher.on("press", () => {
    dialogInput.open();
    dialogStatus.setContent("Opened input focus dialog.");
  });
  dialogStackLauncher.on("press", () => {
    dialogStackBase.open();
    dialogStatus.setContent("Opened stacked dialog base layer.");
  });
  dialogClose.on("press", () => {
    dialogBasic.close({ reason: "action" });
    dialogStatus.setContent("Closed the basic dialog.");
  });
  dialogInputCancel.on("press", () => {
    dialogInput.close({ reason: "action" });
    dialogStatus.setContent("Closed the input dialog.");
  });
  dialogInputSubmit.on("press", () => {
    dialogInput.close({ reason: "submit" });
    dialogStatus.setContent(`Submitted modal input: ${dialogInputField.getValue()}`);
  });
  dialogStackNext.on("press", () => {
    dialogStackTop.restoreFocusTarget = dialogStackNext;
    dialogStackTop.open();
    dialogStatus.setContent("Opened the second stacked dialog layer.");
  });
  dialogStackClose.on("press", () => {
    closeStackDialogs("Closed the base dialog.");
  });
  dialogStackBack.on("press", () => {
    dialogStackTop.close({ reason: "action" });
    dialogStatus.setContent("Closed the top stacked dialog and returned focus to the base layer.");
  });
  dialogStackConfirm.on("press", () => {
    dialogStackTop.close({ reason: "submit" });
    dialogStatus.setContent(`Confirmed nested dialog input: ${dialogStackTopInput.getValue()}`);
  });

  dialogInputField.on("submit", (event) => {
    const submit = event as SubmitEvent<string>;
    dialogInput.close({ reason: "submit" });
    dialogStatus.setContent(`Submitted modal input from keyboard: ${submit.value}`);
  });
  dialogStackTopInput.on("submit", (event) => {
    const submit = event as SubmitEvent<string>;
    dialogStackTop.close({ reason: "submit" });
    dialogStatus.setContent(`Submitted nested dialog input from keyboard: ${submit.value}`);
  });

  dragWorkspace.on("reorder", (event) => {
    const reorder = event as ChangeEvent<{
      sourceId: string;
      targetId: string;
      placement: "after" | "before" | "swap";
      order: string[];
    }>;
    dragStatus.setContent(
      `${reorder.value.placement === "swap" ? `Swapped ${reorder.value.sourceId} with ${reorder.value.targetId}` : `Moved ${reorder.value.sourceId} ${reorder.value.placement} ${reorder.value.targetId}`}. Order: ${reorder.value.order.join(" -> ")}.`,
    );
  });

  panel.add(
    overviewSection,
    inputsSection,
    markdown,
    code,
    diff,
    imageSection,
    dialogSection,
    dragSection,
    ...componentCatalogSectionIds.map((sectionId) => componentCatalog.sections[sectionId]),
    dialogBasic,
    dialogInput,
    dialogStackBase,
    dialogStackTop,
  );
  body.add(nav, panel);
  renderer.add(hero, tabs, body);
  syncFilter("overview", "overview");

  return renderer;
}

export function buildPlaygroundMessage(): string {
  const renderer = createPlaygroundRenderer();

  return [
    `app: ${renderer.appName}`,
    `runtime: ${renderer.runtime}`,
    `terminal: ${renderer.terminalTarget}`,
    "screen:",
    renderer.renderToString(),
  ].join("\n");
}

export function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}

export async function runPlaygroundSession(options: PlaygroundSessionOptions = {}): Promise<void> {
  const { fail = false, durationMs = 75, waitForExit = false } = options;
  const renderer = createPlaygroundRenderer();

  try {
    renderer.captureConsole();
    renderer.start();
    console.log(
      waitForExit
        ? "playground session active | Tab moves focus | Ctrl-C exits"
        : "playground session active",
    );

    if (waitForExit) {
      while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
        await Bun.sleep(50);
      }
    } else {
      await Bun.sleep(durationMs);
    }

    if (fail) {
      throw new Error("intentional playground failure");
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--session-demo")) {
    await runPlaygroundSession({ fail: process.argv.includes("--fail") });
  } else if (process.argv.includes("--print")) {
    process.stdout.write(`${buildPlaygroundMessage()}\n`);
  } else if (isKittyInteractiveRuntime()) {
    await runPlaygroundSession({ waitForExit: true });
  } else {
    process.stdout.write(`${buildPlaygroundMessage()}\n`);
  }
}

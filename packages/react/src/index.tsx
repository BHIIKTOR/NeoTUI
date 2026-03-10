import {
  ASCIIFontRenderable,
  type ASCIIFontRenderableOptions,
  BoxRenderable,
  type BoxRenderableOptions,
  CodeRenderable,
  type CodeRenderableOptions,
  DiffRenderable,
  type DiffRenderableOptions,
  FormRenderable,
  type FormRenderableOptions,
  ImageRenderable,
  type ImageRenderableOptions,
  InputRenderable,
  type InputRenderableOptions,
  type KittyRenderer,
  LabelRenderable,
  LineNumberRenderable,
  type LineNumberRenderableOptions,
  MarkdownRenderable,
  type MarkdownRenderableOptions,
  Renderable,
  type RenderEvent,
  ScrollBarRenderable,
  type ScrollBarRenderableOptions,
  ScrollBoxRenderable,
  type ScrollBoxRenderableOptions,
  SelectRenderable,
  type SelectRenderableOptions,
  type Size,
  TabSelectRenderable,
  type TabSelectRenderableOptions,
  TextareaRenderable,
  type TextareaRenderableOptions,
  TextRenderable,
  type TextRenderableOptions,
} from "@neotui/core";
import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Reconciler from "react-reconciler";
import { DefaultEventPriority, LegacyRoot } from "react-reconciler/constants";
import { Badge, Button, InputField, Panel, Toolbar } from "./wrappers";

type ReactHostNode = Renderable;
type ReactTextInstance = TextRenderable;
type UpdatePayload = { oldProps: Record<string, unknown>; newProps: Record<string, unknown> };

interface ReactContainer {
  renderer: KittyRenderer;
}

interface ReactRootHandle {
  current: unknown;
}

interface ReactReconcilerFacade {
  createContainer(
    containerInfo: ReactContainer,
    tag: number,
    hydrationCallbacks: null,
    isStrictMode: boolean,
    concurrentUpdatesByDefaultOverride: null,
    identifierPrefix: string,
    onUncaughtError: (error: unknown) => void,
    onCaughtError: (error: unknown) => void,
    onRecoverableError: (error: unknown) => void,
    transitionCallbacks: () => void,
    formState: null,
  ): ReactRootHandle;
  updateContainerSync(
    element: ReactNode,
    container: ReactRootHandle,
    parentComponent: null,
    callback?: (() => void) | null,
  ): void;
  flushSyncWork(): void;
  flushPassiveEffects(): boolean;
}

const RendererContext = createContext<KittyRenderer | null>(null);
const HostTransitionContext = createInternalContext<null>(null);
let currentUpdatePriority: number = DefaultEventPriority;

const reconciler = coerceReconciler(
  Reconciler(
    createHostConfig({
      now: Date.now,
      supportsMutation: true,
      isPrimaryRenderer: true,
      supportsPersistence: false,
      supportsHydration: false,
      supportsMicrotasks: true,
      scheduleMicrotask: queueMicrotask,
      NotPendingTransition: null,
      HostTransitionContext,
      getRootHostContext() {
        return {};
      },
      getChildHostContext() {
        return {};
      },
      setCurrentUpdatePriority(newPriority: number) {
        currentUpdatePriority = newPriority;
      },
      getCurrentUpdatePriority() {
        return currentUpdatePriority;
      },
      resolveUpdatePriority() {
        return DefaultEventPriority;
      },
      resetFormInstance() {},
      requestPostPaintCallback(callback: (time: number) => void) {
        setTimeout(() => callback(performance.now()), 0);
      },
      shouldAttemptEagerTransition() {
        return false;
      },
      trackSchedulerEvent() {},
      resolveEventType() {
        return null;
      },
      resolveEventTimeStamp() {
        return performance.now();
      },
      maySuspendCommit() {
        return false;
      },
      preloadInstance() {
        return false;
      },
      startSuspendingCommit() {},
      suspendInstance() {},
      waitForCommitToBeReady() {
        return null;
      },
      shouldSetTextContent(type: string, props: Record<string, unknown>) {
        return type === "label" && typeof props.content === "string";
      },
      createTextInstance(text: string) {
        return new TextRenderable({ content: text });
      },
      createInstance(type: string, props: Record<string, unknown>) {
        return createRenderable(type, props);
      },
      appendInitialChild(parent: ReactHostNode, child: ReactHostNode | ReactTextInstance) {
        if (parent instanceof TextRenderable && child instanceof TextRenderable) {
          parent.setContent(String(parent.content) + String(child.content));
          return;
        }

        if (isNodeWithinSubtree(child, parent)) {
          return;
        }

        attachChild(parent, child);
      },
      appendChild(parent: ReactHostNode, child: ReactHostNode | ReactTextInstance) {
        if (parent instanceof TextRenderable && child instanceof TextRenderable) {
          parent.setContent(String(parent.content) + String(child.content));
          return;
        }

        if (isNodeWithinSubtree(child, parent)) {
          return;
        }

        attachChild(parent, child);
      },
      appendChildToContainer(container: ReactContainer, child: ReactHostNode | ReactTextInstance) {
        if (isNodeWithinSubtree(child, container.renderer.root)) {
          return;
        }

        container.renderer.add(child);
      },
      removeChild(parent: ReactHostNode, child: ReactHostNode | ReactTextInstance) {
        detachChild(parent, child);
      },
      removeChildFromContainer(
        container: ReactContainer,
        child: ReactHostNode | ReactTextInstance,
      ) {
        container.renderer.root.remove(child);
      },
      insertBefore(
        parent: ReactHostNode,
        child: ReactHostNode | ReactTextInstance,
        beforeChild: ReactHostNode | ReactTextInstance,
      ) {
        if (isNodeWithinSubtree(child, parent)) {
          return;
        }

        const existingIndex = parent.children.indexOf(beforeChild);

        if (child.parent) {
          child.parent.remove(child);
        }

        if (existingIndex === -1) {
          parent.add(child);
          return;
        }

        (parent.children as ReactHostNode[]).splice(existingIndex, 0, child);
        child.parent = parent;
        const renderer = parent.renderer ?? beforeChild.renderer;

        if (!renderer) {
          throw new Error("React host parent has no renderer during insertBefore.");
        }

        child.mount(renderer);
        parent.invalidate("react:insert-before");
      },
      insertInContainerBefore(
        container: ReactContainer,
        child: ReactHostNode | ReactTextInstance,
        beforeChild: ReactHostNode | ReactTextInstance,
      ) {
        if (isNodeWithinSubtree(child, container.renderer.root)) {
          return;
        }

        const existingIndex = container.renderer.root.children.indexOf(beforeChild);

        if (child.parent) {
          child.parent.remove(child);
        }

        if (existingIndex === -1) {
          container.renderer.add(child);
          return;
        }

        (container.renderer.root.children as ReactHostNode[]).splice(existingIndex, 0, child);
        child.parent = container.renderer.root;
        child.mount(container.renderer);
        container.renderer.root.invalidate("react:insert-before");
      },
      finalizeInitialChildren() {
        return false;
      },
      prepareUpdate(
        _instance: ReactHostNode,
        _type: string,
        oldProps: Record<string, unknown>,
        newProps: Record<string, unknown>,
      ) {
        return { oldProps, newProps } satisfies UpdatePayload;
      },
      commitUpdate(
        instance: ReactHostNode,
        updatePayload: UpdatePayload,
        type: string,
        _oldProps: Record<string, unknown>,
        _newProps: Record<string, unknown>,
      ) {
        applyRenderableProps(instance, type, updatePayload.newProps);
      },
      commitTextUpdate(textInstance: ReactTextInstance, _oldText: string, newText: string) {
        textInstance.setContent(newText);
      },
      clearContainer(container: ReactContainer) {
        for (const child of [...container.renderer.root.children]) {
          container.renderer.root.remove(child);
        }

        return false;
      },
      prepareForCommit() {
        return null;
      },
      resetAfterCommit(container: ReactContainer) {
        if (container.renderer.isRunning()) {
          container.renderer.renderFrame();
        }
      },
      getPublicInstance(instance: ReactHostNode | ReactTextInstance) {
        return instance;
      },
      scheduleTimeout: setTimeout,
      cancelTimeout: clearTimeout,
      noTimeout: -1,
      hideInstance(instance: ReactHostNode) {
        instance.setVisible(false);
      },
      hideTextInstance(instance: ReactTextInstance) {
        instance.setVisible(false);
      },
      unhideInstance(instance: ReactHostNode) {
        instance.setVisible(true);
      },
      unhideTextInstance(instance: ReactTextInstance, text: string) {
        instance.setVisible(true);
        instance.setContent(text);
      },
      detachDeletedInstance() {},
    }),
  ),
);

export interface ReactBindingBootstrap {
  readonly framework: "react";
  readonly dependsOn: "@neotui/core";
  readonly rendererMilestone: "M10";
  readonly bindingMilestone: "M12";
}

export interface ReactRoot {
  renderer: KittyRenderer;
  render(element: ReactNode): void;
  flush(): void;
  unmount(): void;
}

export function createReactBindingBootstrap(): ReactBindingBootstrap {
  return {
    framework: "react",
    dependsOn: "@neotui/core",
    rendererMilestone: "M10",
    bindingMilestone: "M12",
  };
}

export function createReactRoot(renderer: KittyRenderer): ReactRoot {
  const container: ReactContainer = { renderer };
  const root = reconciler.createContainer(
    container,
    LegacyRoot,
    null,
    false,
    null,
    "",
    console.error,
    console.error,
    console.error,
    () => undefined,
    null,
  );

  const renderElement = (element: ReactNode) => {
    reconciler.updateContainerSync(
      <RendererContext.Provider value={renderer}>{element}</RendererContext.Provider>,
      root,
      null,
    );
  };

  const flush = () => {
    reconciler.flushSyncWork();
    while (reconciler.flushPassiveEffects()) {
      // Keep draining passive effects until React reports the queue is empty.
    }
    if (renderer.isRunning()) {
      renderer.renderFrame();
    }
  };
  const releaseEventFlush = renderer.subscribe(() => {
    queueMicrotask(flush);
  });
  const releaseResizeFlush = renderer.subscribeToResize(() => {
    queueMicrotask(flush);
  });

  return {
    renderer,
    render(element: ReactNode) {
      renderElement(element);
      flush();
    },
    flush,
    unmount() {
      releaseEventFlush();
      releaseResizeFlush();
      reconciler.updateContainerSync(null, root, null);
      flush();
    },
  };
}

export function renderReactTree(renderer: KittyRenderer, element: ReactElement): ReactRoot {
  const root = createReactRoot(renderer);
  root.render(element);
  return root;
}

export function useRenderer(): KittyRenderer {
  const renderer = useContext(RendererContext);

  if (!renderer) {
    throw new Error("useRenderer must be called under createReactRoot().render().");
  }

  return renderer;
}

export function useKeyboard(
  listener: (event: Extract<RenderEvent, { type: "key" }>) => void,
): void {
  const renderer = useRenderer();
  const latest = useRef(listener);
  latest.current = listener;

  useEffect(() => {
    return renderer.subscribe((event) => {
      if (event.type === "key") {
        latest.current(event);
      }
    });
  }, [renderer]);
}

export function useTerminalDimensions(): Size {
  const renderer = useRenderer();
  const snapshot = useSyncExternalStore(
    (onStoreChange: () => void) => renderer.subscribeToResize(onStoreChange),
    () => `${renderer.width}:${renderer.height}`,
    () => `${renderer.width}:${renderer.height}`,
  );
  const [width, height] = snapshot.split(":").map((value) => Number.parseInt(value, 10));

  return { width: width || 0, height: height || 0 };
}

export function useTimeline(enabled = true, intervalMs = 16): number {
  const renderer = useRenderer();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    renderer.requestLive();
    const handle = setInterval(() => {
      setTick((current: number) => current + 1);
    }, intervalMs);

    return () => {
      clearInterval(handle);
      renderer.dropLive();
    };
  }, [enabled, intervalMs, renderer]);

  return tick;
}

export function ReactCounterDemo(): ReactElement {
  const [count, setCount] = useState(0);
  const tick = useTimeline(true, 50);

  useEffect(() => {
    if (tick % 4 === 0) {
      setCount((current: number) => current + 1);
    }
  }, [tick]);

  return (
    <Panel title="counter" tone="accent" layout={{ padding: 1, width: 26, height: 6, gap: 1 }}>
      <Toolbar>
        <Badge label="react" tone="info" />
        <Button label={`count ${count}`} variant="secondary" />
      </Toolbar>
    </Panel>
  );
}

export function ReactLoginDemo(): ReactElement {
  return (
    <Panel title="login" tone="accent" layout={{ gap: 1, padding: 1, width: 34, height: 13 }}>
      <InputField
        label="username"
        value="neo"
        placeholder="username"
        width="fill"
        fieldLayout={{ width: "100%" }}
      />
      <InputField
        label="password"
        value="kitty"
        placeholder="password"
        type="password"
        width="fill"
        fieldLayout={{ width: "100%" }}
      />
      <Toolbar>
        <Button label="submit" variant="primary" />
        <Button label="cancel" variant="ghost" />
      </Toolbar>
    </Panel>
  );
}

function isNodeWithinSubtree(
  child: ReactHostNode | ReactTextInstance,
  parent: ReactHostNode,
): boolean {
  let cursor = child.parent;

  while (cursor) {
    if (cursor === parent) {
      return true;
    }
    cursor = cursor.parent;
  }

  return false;
}

function attachChild(parent: ReactHostNode, child: ReactHostNode | ReactTextInstance): void {
  if (isWindowCollectionHost(parent) && child.type === "window") {
    parent.addWindow(child);
    return;
  }

  parent.add(child);
}

function detachChild(parent: ReactHostNode, child: ReactHostNode | ReactTextInstance): void {
  if (isWindowCollectionHost(parent) && child.type === "window") {
    parent.removeWindow(child.id);
    return;
  }

  parent.remove(child);
}

function isWindowCollectionHost(node: ReactHostNode): node is ReactHostNode & {
  addWindow(window: ReactHostNode | ReactTextInstance): void;
  removeWindow(windowId: string): void;
} {
  const candidate = node as Partial<{
    addWindow: unknown;
    removeWindow: unknown;
  }>;

  return typeof candidate.addWindow === "function" && typeof candidate.removeWindow === "function";
}

function createRenderable(type: string, props: Record<string, unknown>): ReactHostNode {
  switch (type) {
    case "managed-renderable":
      if (props.instance instanceof Renderable) {
        return props.instance;
      }
      throw new Error("managed-renderable requires an existing Renderable instance.");
    case "ascii-font":
      return new ASCIIFontRenderable(coerceOptions<ASCIIFontRenderableOptions>(props));
    case "box":
      return new BoxRenderable(coerceOptions<BoxRenderableOptions>(props));
    case "code":
    case "nb-code":
      return new CodeRenderable(coerceOptions<CodeRenderableOptions>(props));
    case "diff":
      return new DiffRenderable(coerceOptions<DiffRenderableOptions>(props));
    case "form":
    case "nb-form":
      return new FormRenderable(coerceOptions<FormRenderableOptions>(props));
    case "image":
    case "nb-image":
      return new ImageRenderable(coerceOptions<ImageRenderableOptions>(props));
    case "input":
    case "nb-input":
      return new InputRenderable(coerceOptions<InputRenderableOptions>(props));
    case "label":
    case "nb-label":
      return new LabelRenderable(coerceOptions<TextRenderableOptions>(props));
    case "line-number":
      return new LineNumberRenderable(coerceOptions<LineNumberRenderableOptions>(props));
    case "markdown":
      return new MarkdownRenderable(coerceOptions<MarkdownRenderableOptions>(props));
    case "scrollbar":
      return new ScrollBarRenderable(coerceOptions<ScrollBarRenderableOptions>(props));
    case "scrollbox":
      return new ScrollBoxRenderable(coerceOptions<ScrollBoxRenderableOptions>(props));
    case "select":
    case "nb-select":
      return new SelectRenderable(coerceOptions<SelectRenderableOptions>(props));
    case "tab-select":
      return new TabSelectRenderable(coerceOptions<TabSelectRenderableOptions>(props));
    case "text":
    case "nb-text":
      return new TextRenderable(coerceOptions<TextRenderableOptions>(props));
    case "textarea":
    case "nb-textarea":
      return new TextareaRenderable(coerceOptions<TextareaRenderableOptions>(props));
    default:
      throw new Error(`Unsupported intrinsic react node: ${type}`);
  }
}

function coerceOptions<T>(props: Record<string, unknown>): T {
  return props as unknown as T;
}

function coerceReconciler(value: unknown): ReactReconcilerFacade {
  return value as ReactReconcilerFacade;
}

function createHostConfig(value: unknown): Parameters<typeof Reconciler>[0] {
  return value as Parameters<typeof Reconciler>[0];
}

interface InternalReactContext<T> {
  $$typeof: symbol | number;
  Consumer: InternalReactContext<T>;
  Provider: {
    $$typeof: symbol | number;
    _context: InternalReactContext<T>;
  };
  _currentValue: T;
  _currentValue2: T;
  _threadCount: number;
  displayName?: string;
}

function createInternalContext<T>(value: T): InternalReactContext<T> {
  return createContext(value) as unknown as InternalReactContext<T>;
}

function applyRenderableProps(
  instance: ReactHostNode,
  type: string,
  props: Record<string, unknown>,
): void {
  switch (type) {
    case "managed-renderable":
      break;
    case "ascii-font":
      if (instance instanceof ASCIIFontRenderable && typeof props.content !== "undefined") {
        instance.text = String(props.content);
        instance.invalidate("react:update");
      }
      break;
    case "box":
      if (instance instanceof BoxRenderable && typeof props.content === "string") {
        instance.setContent(props.content);
      }
      break;
    case "code":
    case "nb-code":
      if (instance instanceof CodeRenderable && typeof props.code === "string") {
        instance.setCode(props.code);
      }
      break;
    case "diff":
      if (instance instanceof DiffRenderable) {
        instance.before = props.before as string | undefined;
        instance.after = props.after as string | undefined;
        instance.diff = props.diff as string | undefined;
        instance.invalidate("react:update");
      }
      break;
    case "image":
    case "nb-image":
      if (instance instanceof ImageRenderable) {
        instance.source = String(props.source ?? instance.source);
        instance.alt = props.alt as string | undefined;
        instance.invalidate("react:update");
      }
      break;
    case "input":
    case "nb-input":
      if (instance instanceof InputRenderable && typeof props.value === "string") {
        instance.setValue(props.value);
      }
      break;
    case "markdown":
      if (instance instanceof MarkdownRenderable && typeof props.markdown === "string") {
        instance.setMarkdown(props.markdown);
      }
      break;
    case "select":
    case "nb-select":
      if (instance instanceof SelectRenderable && Array.isArray(props.options)) {
        instance.options = props.options.map(String);
        instance.invalidate("react:update");
      }
      break;
    case "tab-select":
      if (instance instanceof TabSelectRenderable && Array.isArray(props.options)) {
        instance.tabs = props.options.map(String);
        instance.descriptions = Array.isArray(props.descriptions)
          ? props.descriptions.map(String)
          : instance.descriptions;
        instance.invalidate("react:update");
      }
      break;
    case "text":
    case "label":
    case "nb-label":
    case "nb-text":
      if (instance instanceof TextRenderable && typeof props.content !== "undefined") {
        instance.setContent(props.content as TextRenderableOptions["content"]);
      }
      break;
    case "textarea":
    case "nb-textarea":
      if (instance instanceof TextareaRenderable && typeof props.value === "string") {
        instance.setValue(props.value);
      }
      break;
  }

  if (
    props &&
    typeof props === "object" &&
    "layout" in props &&
    props.layout &&
    typeof props.layout === "object"
  ) {
    instance.updateLayout(props.layout as NonNullable<BoxRenderableOptions["layout"]>);
  }

  if (
    props &&
    typeof props === "object" &&
    "style" in props &&
    props.style &&
    typeof props.style === "object"
  ) {
    instance.updateStyle(props.style as NonNullable<BoxRenderableOptions["style"]>);
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "ascii-font": ASCIIFontRenderableOptions & { children?: ReactNode };
      box: BoxRenderableOptions & { children?: ReactNode };
      "nb-code": CodeRenderableOptions & { children?: ReactNode };
      diff: DiffRenderableOptions & { children?: ReactNode };
      "nb-form": FormRenderableOptions & { children?: ReactNode };
      "nb-image": ImageRenderableOptions & { children?: ReactNode };
      "nb-input": InputRenderableOptions & { children?: never };
      "nb-label": TextRenderableOptions & { children?: never };
      "line-number": LineNumberRenderableOptions & { children?: never };
      "managed-renderable": { instance: Renderable; children?: ReactNode };
      markdown: MarkdownRenderableOptions & { children?: never };
      scrollbar: ScrollBarRenderableOptions & { children?: never };
      scrollbox: ScrollBoxRenderableOptions & { children?: ReactNode };
      "nb-select": SelectRenderableOptions & { children?: never };
      "tab-select": TabSelectRenderableOptions & { children?: never };
      "nb-text": TextRenderableOptions & { children?: never };
      "nb-textarea": TextareaRenderableOptions & { children?: never };
    }
  }
}

export * from "./wrappers";

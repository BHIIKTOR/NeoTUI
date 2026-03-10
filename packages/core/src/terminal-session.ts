import { ProtocolWriter } from "./protocol";

export type RuntimeTarget = "bun";
export type TerminalTarget = "kitty";
export type MouseMode = "none" | "drag";

export interface RawModeInput {
  isTTY?: boolean;
  setRawMode?(value: boolean): void;
  resume?(): void;
  pause?(): void;
  on?(event: "data", listener: (chunk: string | Buffer) => void): void;
  off?(event: "data", listener: (chunk: string | Buffer) => void): void;
}

export interface WritableOutput {
  write(chunk: string): void;
  columns?: number;
  rows?: number;
  on?(event: "resize", listener: () => void): void;
  off?(event: "resize", listener: () => void): void;
}

export interface SignalTarget {
  on(signal: string, listener: () => void): void;
  off(signal: string, listener: () => void): void;
}

export interface KittySessionCapabilities {
  readonly isKitty: boolean;
  readonly term: string | undefined;
  readonly kittyWindowId: string | undefined;
  readonly supportsGraphics: boolean;
  readonly supportsHyperlinks: boolean;
  readonly supportsClipboard: boolean;
  readonly supportsSynchronizedUpdates: boolean;
  readonly supportsBracketedPaste: boolean;
  readonly supportsMouseTracking: boolean;
}

export interface TerminalSize {
  width: number;
  height: number;
}

export interface TerminalSessionOptions {
  input?: RawModeInput;
  output?: WritableOutput;
  env?: Record<string, string | undefined>;
  signalTarget?: SignalTarget;
  appName?: string;
  bracketedPaste?: boolean;
  mouseMode?: MouseMode;
  registerSignalHandlers?: boolean;
}

const DEFAULT_SIGNALS = ["SIGINT", "SIGTERM", "SIGQUIT"] as const;

export class TerminalSession {
  readonly appName: string;
  readonly capabilities: KittySessionCapabilities;
  readonly protocol: ProtocolWriter;
  readonly lifecycleEvents: string[] = [];

  private readonly input: RawModeInput;
  private readonly output: WritableOutput;
  private readonly signalTarget?: SignalTarget;
  private readonly bracketedPaste: boolean;
  private readonly mouseMode: MouseMode;
  private readonly registerSignalHandlers: boolean;
  private readonly signalListeners = new Map<string, () => void>();

  private active = false;
  private destroyed = false;
  private ownsRawMode = false;
  private inputListeners = new Set<(chunk: string) => void>();
  private dataHandler: ((chunk: string | Buffer) => void) | null = null;

  constructor(options: TerminalSessionOptions = {}) {
    this.input = options.input ?? process.stdin;
    this.output = options.output ?? process.stdout;
    this.signalTarget = options.signalTarget ?? process;
    this.appName = options.appName ?? "NeoTui";
    this.bracketedPaste = options.bracketedPaste ?? true;
    this.mouseMode = options.mouseMode ?? "drag";
    this.registerSignalHandlers = options.registerSignalHandlers ?? true;
    this.capabilities = detectKittyCapabilities(options.env ?? process.env);
    this.protocol = new ProtocolWriter({
      sink: {
        write: (chunk) => {
          this.output.write(chunk);
          this.lifecycleEvents.push(`write:${JSON.stringify(chunk)}`);
        },
      },
    });
  }

  activate(): void {
    if (this.destroyed) {
      throw new Error("TerminalSession has already been destroyed.");
    }

    if (this.active) {
      return;
    }

    if (!this.capabilities.isKitty) {
      throw new Error("TerminalSession requires kitty.");
    }

    this.registerSignals();
    this.enableRawMode();
    this.protocol.enterAlternateScreen();
    this.protocol.enableKittyKeyboard();
    this.protocol.hideCursor();

    if (this.bracketedPaste) {
      this.protocol.enableBracketedPaste();
    }

    if (this.mouseMode === "drag") {
      this.protocol.enableMouseTracking();
    }

    this.attachInput();

    this.active = true;
    this.lifecycleEvents.push("session:active");
  }

  async destroy(): Promise<void> {
    if (this.destroyed) {
      this.lifecycleEvents.push("session:destroy:noop");
      return;
    }

    this.destroyed = true;

    if (this.active) {
      if (this.mouseMode === "drag") {
        this.protocol.disableMouseTracking();
      }

      if (this.bracketedPaste) {
        this.protocol.disableBracketedPaste();
      }

      this.protocol.disableKittyKeyboard();
      this.protocol.showCursor();
      this.protocol.exitAlternateScreen();
    }

    this.disableRawMode();
    this.detachInput();
    this.unregisterSignals();
    this.active = false;
    this.lifecycleEvents.push("session:destroyed");
  }

  getTranscript(): string {
    return this.protocol.getTranscript();
  }

  isActive(): boolean {
    return this.active;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  onInput(listener: (chunk: string) => void): () => void {
    this.inputListeners.add(listener);

    return () => {
      this.inputListeners.delete(listener);
    };
  }

  getTerminalSize(): TerminalSize | null {
    if (
      typeof this.output.columns !== "number" ||
      typeof this.output.rows !== "number" ||
      !Number.isFinite(this.output.columns) ||
      !Number.isFinite(this.output.rows) ||
      this.output.columns <= 0 ||
      this.output.rows <= 0
    ) {
      return null;
    }

    return {
      width: Math.floor(this.output.columns),
      height: Math.floor(this.output.rows),
    };
  }

  onResize(listener: (size: TerminalSize) => void): () => void {
    if (typeof this.output.on !== "function" || typeof this.output.off !== "function") {
      this.lifecycleEvents.push("resize:attach:skipped");
      return () => undefined;
    }

    const handleResize = () => {
      const size = this.getTerminalSize();

      if (!size) {
        return;
      }

      listener(size);
    };

    this.output.on("resize", handleResize);
    this.lifecycleEvents.push("resize:attached");

    return () => {
      this.output.off?.("resize", handleResize);
      this.lifecycleEvents.push("resize:detached");
    };
  }

  private enableRawMode(): void {
    if (!this.input.isTTY || typeof this.input.setRawMode !== "function") {
      this.lifecycleEvents.push("raw-mode:skipped");
      return;
    }

    this.input.setRawMode(true);
    this.input.resume?.();
    this.ownsRawMode = true;
    this.lifecycleEvents.push("raw-mode:on");
  }

  private attachInput(): void {
    if (this.dataHandler || typeof this.input.on !== "function") {
      this.lifecycleEvents.push("input:attach:skipped");
      return;
    }

    this.dataHandler = (chunk) => {
      const normalized = typeof chunk === "string" ? chunk : chunk.toString("utf8");

      for (const listener of this.inputListeners) {
        listener(normalized);
      }
    };

    this.input.on("data", this.dataHandler);
    this.lifecycleEvents.push("input:attached");
  }

  private detachInput(): void {
    if (!this.dataHandler || typeof this.input.off !== "function") {
      return;
    }

    this.input.off("data", this.dataHandler);
    this.dataHandler = null;
    this.lifecycleEvents.push("input:detached");
  }

  private disableRawMode(): void {
    if (!this.ownsRawMode || typeof this.input.setRawMode !== "function") {
      return;
    }

    this.input.setRawMode(false);
    this.input.pause?.();
    this.ownsRawMode = false;
    this.lifecycleEvents.push("raw-mode:off");
  }

  private registerSignals(): void {
    if (!this.registerSignalHandlers || !this.signalTarget) {
      this.lifecycleEvents.push("signals:skipped");
      return;
    }

    for (const signal of DEFAULT_SIGNALS) {
      const listener = () => {
        void this.destroy();
      };

      this.signalTarget.on(signal, listener);
      this.signalListeners.set(signal, listener);
      this.lifecycleEvents.push(`signal:on:${signal}`);
    }
  }

  private unregisterSignals(): void {
    if (!this.signalTarget) {
      return;
    }

    for (const [signal, listener] of this.signalListeners) {
      this.signalTarget.off(signal, listener);
      this.lifecycleEvents.push(`signal:off:${signal}`);
    }

    this.signalListeners.clear();
  }
}

export async function withTerminalSession<T>(
  session: TerminalSession,
  run: () => Promise<T> | T,
): Promise<T> {
  session.activate();

  try {
    return await run();
  } catch (error) {
    session.lifecycleEvents.push("session:handled-error");
    await session.destroy();
    throw error;
  } finally {
    await session.destroy();
  }
}

export function detectKittyCapabilities(
  env: Record<string, string | undefined>,
): KittySessionCapabilities {
  const term = env.TERM;
  const kittyWindowId = env.KITTY_WINDOW_ID;
  const isKitty = term === "xterm-kitty" || Boolean(kittyWindowId);

  return {
    isKitty,
    term,
    kittyWindowId,
    supportsGraphics: isKitty,
    supportsHyperlinks: isKitty,
    supportsClipboard: isKitty,
    supportsSynchronizedUpdates: isKitty,
    supportsBracketedPaste: isKitty,
    supportsMouseTracking: isKitty,
  };
}

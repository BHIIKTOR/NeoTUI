import { spawnSync } from "node:child_process";

export type ClipboardModifier = "ctrl" | "meta";

export interface ClipboardShortcutProfile {
  copy: ClipboardModifier;
  cut: ClipboardModifier;
  paste: ClipboardModifier;
}

export interface ClipboardCapabilities {
  backend: string;
  bindings: ClipboardShortcutProfile;
  supportsRead: boolean;
  supportsWrite: boolean;
}

export interface ClipboardAccess {
  readonly capabilities: ClipboardCapabilities;
  readText(): string | null;
  writeText(text: string): boolean;
}

export interface NativeClipboardAccessOptions {
  env?: Record<string, string | undefined>;
  platform?: NodeJS.Platform;
}

interface ClipboardBackendSpec {
  name: string;
  readCommand?: string[];
  writeCommand?: string[];
}

export class NativeClipboardAccess implements ClipboardAccess {
  readonly capabilities: ClipboardCapabilities;

  private readonly backend: ClipboardBackendSpec;

  constructor(options: NativeClipboardAccessOptions = {}) {
    const platform = options.platform ?? process.platform;
    this.backend = detectClipboardBackend(platform, options.env ?? process.env);
    this.capabilities = {
      backend: this.backend.name,
      bindings: detectClipboardShortcutProfile(platform),
      supportsRead: Array.isArray(this.backend.readCommand),
      supportsWrite: Array.isArray(this.backend.writeCommand),
    };
  }

  readText(): string | null {
    if (!this.backend.readCommand) {
      return null;
    }

    const [command, ...args] = this.backend.readCommand;

    if (!command) {
      return null;
    }

    try {
      const result = spawnSync(command, args, {
        encoding: "utf8",
      });

      if (result.status !== 0 || typeof result.stdout !== "string") {
        return null;
      }

      return result.stdout;
    } catch {
      return null;
    }
  }

  writeText(text: string): boolean {
    if (!this.backend.writeCommand) {
      return false;
    }

    const [command, ...args] = this.backend.writeCommand;

    if (!command) {
      return false;
    }

    try {
      const result = spawnSync(command, args, {
        encoding: "utf8",
        input: text,
      });

      return result.status === 0;
    } catch {
      return false;
    }
  }
}

export function detectClipboardShortcutProfile(
  platform: NodeJS.Platform = process.platform,
): ClipboardShortcutProfile {
  if (platform === "darwin") {
    return {
      copy: "meta",
      cut: "meta",
      paste: "meta",
    };
  }

  return {
    copy: "ctrl",
    cut: "ctrl",
    paste: "ctrl",
  };
}

function detectClipboardBackend(
  platform: NodeJS.Platform,
  env: Record<string, string | undefined>,
): ClipboardBackendSpec {
  if (platform === "darwin") {
    return {
      name: "pbcopy",
      readCommand: ["pbpaste"],
      writeCommand: ["pbcopy"],
    };
  }

  if (platform === "linux") {
    const hasWaylandTools = commandExists("wl-copy") && commandExists("wl-paste");
    if (env.WAYLAND_DISPLAY && hasWaylandTools) {
      return {
        name: "wayland",
        readCommand: ["wl-paste"],
        writeCommand: ["wl-copy"],
      };
    }

    if (commandExists("xclip")) {
      return {
        name: "xclip",
        readCommand: ["xclip", "-selection", "clipboard", "-o"],
        writeCommand: ["xclip", "-selection", "clipboard"],
      };
    }

    if (commandExists("xsel")) {
      return {
        name: "xsel",
        readCommand: ["xsel", "--clipboard", "--output"],
        writeCommand: ["xsel", "--clipboard", "--input"],
      };
    }

    if (hasWaylandTools) {
      return {
        name: "wayland",
        readCommand: ["wl-paste"],
        writeCommand: ["wl-copy"],
      };
    }
  }

  if (platform === "win32") {
    return {
      name: "powershell",
      readCommand: ["powershell", "-NoProfile", "-Command", "Get-Clipboard"],
      writeCommand: ["powershell", "-NoProfile", "-Command", "Set-Clipboard"],
    };
  }

  return {
    name: "none",
  };
}

function commandExists(command: string): boolean {
  if (!/^[a-zA-Z0-9._+-]+$/.test(command)) {
    return false;
  }

  try {
    const result = spawnSync("which", [command], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

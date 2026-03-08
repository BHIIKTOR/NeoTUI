export const CONTROL_SEQUENCES = {
  enterAlternateScreen: "\u001b[?1049h",
  exitAlternateScreen: "\u001b[?1049l",
  hideCursor: "\u001b[?25l",
  showCursor: "\u001b[?25h",
  enableBracketedPaste: "\u001b[?2004h",
  disableBracketedPaste: "\u001b[?2004l",
  enableMouseTracking: "\u001b[?1002h\u001b[?1006h",
  disableMouseTracking: "\u001b[?1002l\u001b[?1006l",
  beginSynchronizedUpdate: "\u001b[?2026h",
  endSynchronizedUpdate: "\u001b[?2026l",
  clearScreen: "\u001b[2J\u001b[H",
} as const;

export interface ProtocolSink {
  write(chunk: string): void;
}

export interface ProtocolWriterOptions {
  sink?: ProtocolSink;
}

export interface CursorStyleOptions {
  shape?: "block" | "beam" | "underline";
  blink?: boolean;
  color?: string;
  visible?: boolean;
}

export interface KittyImageWriteOptions {
  imageId: number;
  placementId?: number;
  source: string;
  width: number;
  height: number;
  x: number;
  y: number;
}

export class ProtocolWriter {
  private readonly sink: ProtocolSink;
  private readonly chunks: string[] = [];

  constructor(options: ProtocolWriterOptions = {}) {
    this.sink = options.sink ?? { write: () => undefined };
  }

  write(chunk: string): void {
    this.chunks.push(chunk);
    this.sink.write(chunk);
  }

  clearScreen(): void {
    this.write(CONTROL_SEQUENCES.clearScreen);
  }

  enterAlternateScreen(): void {
    this.write(CONTROL_SEQUENCES.enterAlternateScreen);
  }

  exitAlternateScreen(): void {
    this.write(CONTROL_SEQUENCES.exitAlternateScreen);
  }

  hideCursor(): void {
    this.write(CONTROL_SEQUENCES.hideCursor);
  }

  showCursor(): void {
    this.write(CONTROL_SEQUENCES.showCursor);
  }

  enableBracketedPaste(): void {
    this.write(CONTROL_SEQUENCES.enableBracketedPaste);
  }

  disableBracketedPaste(): void {
    this.write(CONTROL_SEQUENCES.disableBracketedPaste);
  }

  enableMouseTracking(): void {
    this.write(CONTROL_SEQUENCES.enableMouseTracking);
  }

  disableMouseTracking(): void {
    this.write(CONTROL_SEQUENCES.disableMouseTracking);
  }

  beginSynchronizedUpdate(): void {
    this.write(CONTROL_SEQUENCES.beginSynchronizedUpdate);
  }

  endSynchronizedUpdate(): void {
    this.write(CONTROL_SEQUENCES.endSynchronizedUpdate);
  }

  withSynchronizedUpdate(run: () => void): void {
    this.beginSynchronizedUpdate();
    run();
    this.endSynchronizedUpdate();
  }

  openHyperlink(href: string): void {
    const safeHref = normalizeHyperlink(href);
    this.write(`\u001b]8;;${safeHref}\u001b\\`);
  }

  closeHyperlink(): void {
    this.write("\u001b]8;;\u001b\\");
  }

  writeClipboard(text: string): void {
    const encoded = Buffer.from(text, "utf8").toString("base64");
    this.write(`\u001b]52;c;${encoded}\u0007`);
  }

  setCursorStyle(options: CursorStyleOptions = {}): void {
    const shapeMap = {
      block: options.blink === false ? 2 : 1,
      underline: options.blink === false ? 4 : 3,
      beam: options.blink === false ? 6 : 5,
    } as const;
    const shape = options.shape ?? "block";

    this.write(`\u001b[${shapeMap[shape]} q`);

    if (options.color) {
      this.write(`\u001b]12;${options.color}\u0007`);
    }

    if (options.visible === false) {
      this.hideCursor();
    } else if (options.visible === true) {
      this.showCursor();
    }
  }

  writeKittyImage(options: KittyImageWriteOptions): void {
    const validated = normalizeKittyImageOptions(options);
    const encodedSource = Buffer.from(validated.source, "utf8").toString("base64");
    this.write(`\u001b[${validated.y + 1};${validated.x + 1}H`);
    this.write(
      `\u001b_Ga=T,t=f,f=100,C=1,i=${validated.imageId},p=${validated.placementId ?? validated.imageId},c=${validated.width},r=${validated.height};${encodedSource}\u001b\\`,
    );
  }

  deleteVisibleImages(): void {
    this.write("\u001b_Ga=d\u001b\\");
  }

  getTranscriptChunks(): readonly string[] {
    return [...this.chunks];
  }

  getTranscript(): string {
    return this.chunks.join("");
  }

  resetTranscript(): void {
    this.chunks.length = 0;
  }
}

function normalizeHyperlink(href: string): string {
  const safeHref = sanitizeProtocolText(href, "hyperlink");
  const url = new URL(safeHref);

  if (!ALLOWED_HYPERLINK_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Unsupported hyperlink protocol: ${url.protocol}`);
  }

  return safeHref;
}

function normalizeKittyImageOptions(options: KittyImageWriteOptions): KittyImageWriteOptions {
  return {
    imageId: validateProtocolInteger(options.imageId, "imageId", { min: 0, max: 0xffff_ffff }),
    placementId:
      typeof options.placementId === "number"
        ? validateProtocolInteger(options.placementId, "placementId", {
            min: 0,
            max: 0xffff_ffff,
          })
        : undefined,
    source: sanitizeProtocolText(options.source, "image source"),
    width: validateProtocolInteger(options.width, "image width", { min: 1, max: 10_000 }),
    height: validateProtocolInteger(options.height, "image height", { min: 1, max: 10_000 }),
    x: validateProtocolInteger(options.x, "image x", { min: 0, max: 10_000 }),
    y: validateProtocolInteger(options.y, "image y", { min: 0, max: 10_000 }),
  };
}

function sanitizeProtocolText(value: string, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid ${label}: expected non-empty string`);
  }

  if (containsControlCharacters(value)) {
    throw new Error(`Invalid ${label}: control characters are not allowed`);
  }

  return value;
}

function validateProtocolInteger(
  value: number,
  label: string,
  bounds: { min: number; max: number },
): number {
  if (!Number.isInteger(value) || value < bounds.min || value > bounds.max) {
    throw new Error(`Invalid ${label}: ${value}`);
  }

  return value;
}

const ALLOWED_HYPERLINK_PROTOCOLS = new Set(["http:", "https:", "mailto:"]);

function containsControlCharacters(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      typeof codePoint === "number" &&
      ((codePoint >= 0x00 && codePoint <= 0x1f) || (codePoint >= 0x7f && codePoint <= 0x9f))
    ) {
      return true;
    }
  }

  return false;
}

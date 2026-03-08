import type { Rect, RenderCell } from "./types";

const BORDER_GLYPHS = {
  topLeft: "┌",
  topRight: "┐",
  bottomLeft: "└",
  bottomRight: "┘",
  horizontal: "─",
  vertical: "│",
} as const;

export interface DrawTextOptions {
  clip?: Rect;
  href?: string;
  title?: string;
  fg?: string;
  bg?: string;
}

export interface DrawBorderOptions {
  fg?: string;
  bg?: string;
  titleFg?: string;
}

export class FrameBuffer {
  readonly width: number;
  readonly height: number;
  private readonly cells: RenderCell[];

  constructor(width: number, height: number, fillChar = " ") {
    this.width = Math.max(0, width);
    this.height = Math.max(0, height);
    this.cells = Array.from({ length: this.width * this.height }, () => ({
      char: fillChar,
    }));
  }

  clone(): FrameBuffer {
    const next = new FrameBuffer(this.width, this.height);

    for (let index = 0; index < this.cells.length; index += 1) {
      next.cells[index] = {
        char: this.cells[index]?.char ?? " ",
        href: this.cells[index]?.href,
        title: this.cells[index]?.title,
        fg: this.cells[index]?.fg,
        bg: this.cells[index]?.bg,
      };
    }

    return next;
  }

  fill(value: string | Partial<RenderCell> = " ", rect?: Rect, clip?: Rect): void {
    const target = rect ?? { x: 0, y: 0, width: this.width, height: this.height };

    for (let y = target.y; y < target.y + target.height; y += 1) {
      for (let x = target.x; x < target.x + target.width; x += 1) {
        if (clip && !containsPoint(clip, x, y)) {
          continue;
        }
        this.setCell(x, y, value);
      }
    }
  }

  setCell(x: number, y: number, value: string | Partial<RenderCell>): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return;
    }

    const nextCell: RenderCell =
      typeof value === "string"
        ? { char: value.slice(0, 1) || " " }
        : {
            char: value.char?.slice(0, 1) || " ",
            href: value.href,
            title: value.title,
            fg: value.fg,
            bg: value.bg,
          };

    this.cells[y * this.width + x] = nextCell;
  }

  getCell(x: number, y: number): RenderCell | undefined {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
      return undefined;
    }

    return this.cells[y * this.width + x];
  }

  getRow(y: number): RenderCell[] {
    if (y < 0 || y >= this.height) {
      return [];
    }

    const row: RenderCell[] = [];

    for (let x = 0; x < this.width; x += 1) {
      row.push(this.getCell(x, y) ?? { char: " " });
    }

    return row;
  }

  drawText(
    x: number,
    y: number,
    content: string,
    maxWidth: number,
    clipOrOptions?: Rect | DrawTextOptions,
  ): void {
    const lines = content.split("\n");
    const options = normalizeDrawTextOptions(clipOrOptions);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const targetY = y + lineIndex;

      if (targetY >= this.height) {
        break;
      }

      const line = lines[lineIndex] ?? "";
      const truncated = line.slice(0, Math.max(0, maxWidth));

      for (let charIndex = 0; charIndex < truncated.length; charIndex += 1) {
        const targetX = x + charIndex;

        if (options.clip && !containsPoint(options.clip, targetX, targetY)) {
          continue;
        }

        this.setCell(targetX, targetY, {
          char: truncated[charIndex] ?? " ",
          href: options.href,
          title: options.title,
          fg: options.fg,
          bg: options.bg,
        });
      }
    }
  }

  drawBorder(rect: Rect, title?: string, options: DrawBorderOptions = {}, clip?: Rect): void {
    if (rect.width < 2 || rect.height < 2) {
      return;
    }

    const left = rect.x;
    const right = rect.x + rect.width - 1;
    const top = rect.y;
    const bottom = rect.y + rect.height - 1;

    this.setCellIfVisible(
      left,
      top,
      { char: BORDER_GLYPHS.topLeft, fg: options.fg, bg: options.bg },
      clip,
    );
    this.setCellIfVisible(
      right,
      top,
      { char: BORDER_GLYPHS.topRight, fg: options.fg, bg: options.bg },
      clip,
    );
    this.setCellIfVisible(
      left,
      bottom,
      { char: BORDER_GLYPHS.bottomLeft, fg: options.fg, bg: options.bg },
      clip,
    );
    this.setCellIfVisible(
      right,
      bottom,
      {
        char: BORDER_GLYPHS.bottomRight,
        fg: options.fg,
        bg: options.bg,
      },
      clip,
    );

    for (let x = left + 1; x < right; x += 1) {
      this.setCellIfVisible(
        x,
        top,
        { char: BORDER_GLYPHS.horizontal, fg: options.fg, bg: options.bg },
        clip,
      );
      this.setCellIfVisible(
        x,
        bottom,
        { char: BORDER_GLYPHS.horizontal, fg: options.fg, bg: options.bg },
        clip,
      );
    }

    for (let y = top + 1; y < bottom; y += 1) {
      this.setCellIfVisible(
        left,
        y,
        { char: BORDER_GLYPHS.vertical, fg: options.fg, bg: options.bg },
        clip,
      );
      this.setCellIfVisible(
        right,
        y,
        { char: BORDER_GLYPHS.vertical, fg: options.fg, bg: options.bg },
        clip,
      );
    }

    if (title) {
      this.drawText(left + 2, top, title, Math.max(0, rect.width - 4), {
        clip,
        fg: options.titleFg ?? options.fg,
        bg: options.bg,
      });
    }
  }

  private setCellIfVisible(
    x: number,
    y: number,
    value: string | Partial<RenderCell>,
    clip?: Rect,
  ): void {
    if (clip && !containsPoint(clip, x, y)) {
      return;
    }

    this.setCell(x, y, value);
  }

  blit(other: FrameBuffer, originX: number, originY: number, clip?: Rect): void {
    for (let y = 0; y < other.height; y += 1) {
      for (let x = 0; x < other.width; x += 1) {
        const targetX = originX + x;
        const targetY = originY + y;

        if (clip && !containsPoint(clip, targetX, targetY)) {
          continue;
        }

        const cell = other.getCell(x, y);

        if (cell) {
          this.setCell(targetX, targetY, cell);
        }
      }
    }
  }

  toLines(): string[] {
    const lines: string[] = [];

    for (let y = 0; y < this.height; y += 1) {
      let line = "";

      for (let x = 0; x < this.width; x += 1) {
        line += this.getCell(x, y)?.char ?? " ";
      }

      lines.push(line);
    }

    return lines;
  }
}

function normalizeDrawTextOptions(value?: Rect | DrawTextOptions): DrawTextOptions {
  if (!value) {
    return {};
  }

  if ("x" in value && "y" in value && "width" in value && "height" in value) {
    return { clip: value };
  }

  return value;
}

function containsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

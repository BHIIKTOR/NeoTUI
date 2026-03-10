import {
  BoxRenderable,
  LineCollectionRenderable,
  type RenderContext,
  type TextRenderableOptions,
} from "./renderable";
import { renderTextBlock, wrapText } from "./text";
import type { BaseLayoutProps, BaseStyleProps, TextSpan, WrapMode } from "./types";

const codeColors = {
  base: "#d8dee9",
  keyword: "#c792ea",
  string: "#98c379",
  number: "#d19a66",
  comment: "#7f8c98",
  function: "#61afef",
  punctuation: "#89a2b0",
  lineNumber: "#62707c",
} as const;

const diffColors = {
  removedFg: "#f28b82",
  removedBg: "#2a1718",
  addedFg: "#98c379",
  addedBg: "#182419",
  unchangedFg: "#d7cbb8",
  separator: "#6f6259",
} as const;

export interface CodeRenderableOptions {
  code: string;
  language?: string;
  lineNumbers?: boolean;
  wrapMode?: WrapMode;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class CodeRenderable extends BoxRenderable {
  code: string;
  language?: string;
  lineNumbers: boolean;
  wrapMode: WrapMode;

  constructor(options: CodeRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        border: true,
        title: options.language ? `code:${options.language}` : "code",
        ...options.style,
      },
    });
    this.code = options.code;
    this.language = options.language;
    this.lineNumbers = options.lineNumbers ?? false;
    this.wrapMode = options.wrapMode ?? "none";
  }

  setCode(code: string): this {
    this.code = code;
    this.invalidate("code:update");
    return this;
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;
    const lines = this.code.split("\n");
    const lineNumberWidth = String(lines.length).length;

    for (let row = 0; row < Math.min(innerBounds.height, lines.length); row += 1) {
      const spans = [
        ...(this.lineNumbers
          ? [
              {
                text: `${String(row + 1).padStart(lineNumberWidth, " ")} `,
                fg: codeColors.lineNumber,
              } satisfies TextSpan,
            ]
          : []),
        ...highlightCodeLine(lines[row] ?? "", this.language),
      ];

      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: innerBounds.y + row, width: innerBounds.width, height: 1 },
        spans,
        {
          clip: clipRect,
          fg: this.styleProps.fg,
          bg: this.styleProps.bg,
          wrapMode: this.wrapMode,
        },
      );
    }
  }
}

export interface MarkdownRenderableOptions {
  markdown: string;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class MarkdownRenderable extends BoxRenderable {
  markdown: string;

  constructor(options: MarkdownRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        border: true,
        title: "markdown",
        ...options.style,
      },
    });
    this.markdown = options.markdown;
  }

  setMarkdown(markdown: string): this {
    this.markdown = markdown;
    this.invalidate("markdown:update");
    return this;
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;
    const lines = markdownToLines(this.markdown);

    for (let index = 0; index < Math.min(innerBounds.height, lines.length); index += 1) {
      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: innerBounds.y + index, width: innerBounds.width, height: 1 },
        lines[index] ?? [],
        { clip: clipRect, wrapMode: "none" },
      );
    }
  }
}

export interface DiffRenderableOptions {
  diff?: string;
  before?: string;
  after?: string;
  split?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class DiffRenderable extends BoxRenderable {
  diff?: string;
  before?: string;
  after?: string;
  split: boolean;

  constructor(options: DiffRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        border: true,
        title: options.split ? "diff:split" : "diff",
        ...options.style,
      },
    });
    this.diff = options.diff;
    this.before = options.before;
    this.after = options.after;
    this.split = options.split ?? false;
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;

    if (this.split) {
      const rows = buildSyntheticDiffRows(this.before ?? "", this.after ?? "");
      const separatorWidth = 3;
      const paneWidth = Math.max(1, Math.floor((innerBounds.width - separatorWidth) / 2));
      const rightX = innerBounds.x + paneWidth + separatorWidth;

      for (let row = 0; row < Math.min(innerBounds.height, rows.length); row += 1) {
        const current = rows[row];

        if (!current) {
          continue;
        }

        const leftFg = current.changed ? diffColors.removedFg : diffColors.unchangedFg;
        const rightFg = current.changed ? diffColors.addedFg : diffColors.unchangedFg;
        const leftBg = current.changed ? diffColors.removedBg : this.styleProps.bg;
        const rightBg = current.changed ? diffColors.addedBg : this.styleProps.bg;

        buffer.fill(
          { char: " ", fg: leftFg, bg: leftBg },
          { x: innerBounds.x, y: innerBounds.y + row, width: paneWidth, height: 1 },
        );
        buffer.fill(
          { char: " ", fg: rightFg, bg: rightBg },
          { x: rightX, y: innerBounds.y + row, width: paneWidth, height: 1 },
        );

        renderTextBlock(
          buffer,
          { x: innerBounds.x, y: innerBounds.y + row, width: paneWidth, height: 1 },
          [{ text: `${current.changed ? "-" : " "} ${current.before}`, fg: leftFg, bg: leftBg }],
          { clip: clipRect, wrapMode: "none" },
        );
        renderTextBlock(
          buffer,
          {
            x: innerBounds.x + paneWidth,
            y: innerBounds.y + row,
            width: separatorWidth,
            height: 1,
          },
          [{ text: " │ ", fg: diffColors.separator, bg: this.styleProps.bg }],
          { clip: clipRect, wrapMode: "none" },
        );
        renderTextBlock(
          buffer,
          { x: rightX, y: innerBounds.y + row, width: paneWidth, height: 1 },
          [{ text: `${current.changed ? "+" : " "} ${current.after}`, fg: rightFg, bg: rightBg }],
          { clip: clipRect, wrapMode: "none" },
        );
      }

      return;
    }

    const lines = this.diff
      ? this.diff.split("\n")
      : buildSyntheticDiff(this.before ?? "", this.after ?? "", false);

    for (let row = 0; row < Math.min(innerBounds.height, lines.length); row += 1) {
      const line = lines[row] ?? "";
      const prefix = line.slice(0, 1);
      const fg =
        prefix === "+"
          ? diffColors.addedFg
          : prefix === "-"
            ? diffColors.removedFg
            : diffColors.unchangedFg;
      const bg =
        prefix === "+"
          ? diffColors.addedBg
          : prefix === "-"
            ? diffColors.removedBg
            : this.styleProps.bg;

      buffer.fill(
        { char: " ", fg, bg },
        { x: innerBounds.x, y: innerBounds.y + row, width: innerBounds.width, height: 1 },
      );
      renderTextBlock(
        buffer,
        { x: innerBounds.x, y: innerBounds.y + row, width: innerBounds.width, height: 1 },
        [{ text: line, fg, bg }],
        { clip: clipRect, wrapMode: "none" },
      );
    }
  }
}

export interface LineNumberRenderableOptions {
  lines: string[] | number;
  startAt?: number;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class LineNumberRenderable extends LineCollectionRenderable {
  constructor(options: LineNumberRenderableOptions) {
    const lineCount = typeof options.lines === "number" ? options.lines : options.lines.length;
    const startAt = options.startAt ?? 1;
    const wrapped = Array.from({ length: lineCount }, (_, index) => {
      const line = wrapText(String(startAt + index).padStart(4, " "), 4, "none")[0];
      return line ?? { spans: [], plainText: "", width: 0 };
    });

    super("line-number", wrapped, options.layout, options.style);
  }
}

export interface ASCIIFontRenderableOptions extends TextRenderableOptions {}

export class ASCIIFontRenderable extends BoxRenderable {
  text: string;

  constructor(options: ASCIIFontRenderableOptions) {
    super({
      layout: options.layout,
      style: {
        border: true,
        title: "ascii-font",
        ...options.style,
      },
    });
    this.text =
      typeof options.content === "string"
        ? options.content
        : options.content.map((span) => span.text).join("");
  }

  protected override paint(context: RenderContext): void {
    super.paint(context);
    const { buffer } = context;
    const { innerBounds, clipRect } = this.layoutState;

    renderTextBlock(buffer, innerBounds, renderAsciiFont(this.text).join("\n"), {
      clip: clipRect,
      wrapMode: "none",
    });
  }
}

export function markdownToLines(markdown: string): TextSpan[][] {
  const lines: TextSpan[][] = [];
  let inFence = false;
  let fenceLanguage = "";

  for (const line of markdown.split("\n")) {
    const fenceMatch = line.match(/^```(\w+)?$/);

    if (fenceMatch) {
      if (inFence) {
        lines.push([{ text: "╰─ end code block", fg: "#6f6259" }]);
        inFence = false;
        fenceLanguage = "";
      } else {
        inFence = true;
        fenceLanguage = fenceMatch[1] ?? "";
        lines.push([
          { text: "╭─ code block", fg: "#61afef" },
          ...(fenceLanguage ? [{ text: ` · ${fenceLanguage}`, fg: "#98c379" }] : []),
        ]);
      }
      continue;
    }

    if (inFence) {
      lines.push(highlightCodeLine(line, fenceLanguage));
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 0;
      const headingText = headingMatch[2] ?? "";
      lines.push(renderMarkdownHeading(level, headingText));
      continue;
    }

    if (line.startsWith("> ")) {
      lines.push([{ text: "▎ ", fg: "#61afef" }, ...parseInlineMarkdown(line.slice(2), "#d8dee9")]);
      continue;
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);

    if (orderedMatch) {
      lines.push([
        { text: `${orderedMatch[1]}. `, fg: "#d19a66" },
        ...parseInlineMarkdown(orderedMatch[2] ?? "", "#d8dee9"),
      ]);
      continue;
    }

    const checkboxMatch = line.match(/^- \[( |x)\]\s+(.*)$/i);

    if (checkboxMatch) {
      lines.push([
        { text: checkboxMatch[1]?.toLowerCase() === "x" ? "☑ " : "☐ ", fg: "#98c379" },
        ...parseInlineMarkdown(checkboxMatch[2] ?? "", "#d8dee9"),
      ]);
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      lines.push([{ text: "• ", fg: "#98c379" }, ...parseInlineMarkdown(line.slice(2), "#d8dee9")]);
      continue;
    }

    lines.push(parseInlineMarkdown(line, "#d8dee9"));
  }

  return lines;
}

function renderMarkdownHeading(level: number, text: string): TextSpan[] {
  const content = parseInlineMarkdown(text, "#f2e7d5");

  switch (level) {
    case 1:
      return content.map((span) => ({
        ...span,
        text: span.text.toUpperCase(),
        fg: "#f0c674",
      }));
    case 2:
      return [
        { text: "◦ ", fg: "#e5c07b" },
        ...content.map((span) => ({ ...span, fg: "#e5c07b" })),
      ];
    case 3:
      return [
        { text: "▸ ", fg: "#d19a66" },
        ...content.map((span) => ({ ...span, fg: "#d19a66" })),
      ];
    case 4:
      return [
        { text: "• ", fg: "#caa977" },
        ...content.map((span) => ({ ...span, fg: "#caa977" })),
      ];
    case 5:
      return [
        { text: "· ", fg: "#bfa58a" },
        ...content.map((span) => ({ ...span, fg: "#bfa58a" })),
      ];
    default:
      return [
        { text: "› ", fg: "#a88f77" },
        ...content.map((span) => ({ ...span, fg: "#a88f77" })),
      ];
  }
}

function parseInlineMarkdown(line: string, fallbackFg = "#d8dee9"): TextSpan[] {
  const pattern = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  const spans: TextSpan[] = [];
  let cursor = 0;

  for (const match of line.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (index > cursor) {
      spans.push({ text: line.slice(cursor, index), fg: fallbackFg });
    }

    if (match[2] && match[3]) {
      spans.push({
        text: match[2],
        href: match[3],
        fg: "#61afef",
      });
    } else if (match[4]) {
      spans.push({
        text: match[4],
        fg: "#f0c674",
        bg: "#171d23",
      });
    } else if (match[5]) {
      spans.push({
        text: match[5],
        fg: "#ffd27d",
      });
    }

    cursor = index + match[0].length;
  }

  if (cursor < line.length) {
    spans.push({ text: line.slice(cursor), fg: fallbackFg });
  }

  return spans.length > 0 ? spans : [{ text: line, fg: fallbackFg }];
}

function buildSyntheticDiff(before: string, after: string, split: boolean): string[] {
  const left = before.split("\n");
  const right = after.split("\n");
  const length = Math.max(left.length, right.length);
  const lines: string[] = [];

  for (let index = 0; index < length; index += 1) {
    const oldLine = left[index] ?? "";
    const newLine = right[index] ?? "";

    if (split) {
      lines.push(`${oldLine.padEnd(24, " ")} | ${newLine}`);
    } else if (oldLine === newLine) {
      lines.push(`  ${oldLine}`);
    } else {
      if (oldLine) {
        lines.push(`- ${oldLine}`);
      }

      if (newLine) {
        lines.push(`+ ${newLine}`);
      }
    }
  }

  return lines;
}

function buildSyntheticDiffRows(
  before: string,
  after: string,
): Array<{
  before: string;
  after: string;
  changed: boolean;
}> {
  const left = before.split("\n");
  const right = after.split("\n");
  const length = Math.max(left.length, right.length);

  return Array.from({ length }, (_, index) => {
    const oldLine = left[index] ?? "";
    const newLine = right[index] ?? "";
    return {
      before: oldLine,
      after: newLine,
      changed: oldLine !== newLine,
    };
  });
}

function highlightCodeLine(line: string, language?: string): TextSpan[] {
  if (line.length === 0) {
    return [{ text: "", fg: codeColors.base }];
  }

  const spans: TextSpan[] = [];
  const tokenPattern = new RegExp(
    [
      "\\/\\/.*$",
      '"(?:\\\\.|[^"])*"',
      "'(?:\\\\.|[^'])*'",
      "`(?:\\\\.|[^`])*`",
      "\\b(?:const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|new|class|extends|interface|type|async|await|try|catch|throw|typeof|instanceof)\\b",
      "\\b(?:true|false|null|undefined)\\b",
      "\\b\\d+(?:\\.\\d+)?\\b",
      "[A-Za-z_$][\\w$]*(?=\\()",
      "[{}()[\\].,:;=<>+\\-*?\\/]+",
    ].join("|"),
    "g",
  );
  let cursor = 0;

  for (const match of line.matchAll(tokenPattern)) {
    const index = match.index ?? 0;
    const token = match[0] ?? "";

    if (index > cursor) {
      spans.push({ text: line.slice(cursor, index), fg: codeColors.base });
    }

    spans.push({
      text: token,
      fg: classifyCodeToken(token, language),
    });
    cursor = index + token.length;
  }

  if (cursor < line.length) {
    spans.push({ text: line.slice(cursor), fg: codeColors.base });
  }

  return spans;
}

function classifyCodeToken(token: string, _language?: string): string {
  if (token.startsWith("//")) {
    return codeColors.comment;
  }

  if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
    return codeColors.string;
  }

  if (/^\d/.test(token)) {
    return codeColors.number;
  }

  if (
    /^(const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|from|export|default|new|class|extends|interface|type|async|await|try|catch|throw|typeof|instanceof|true|false|null|undefined)$/.test(
      token,
    )
  ) {
    return codeColors.keyword;
  }

  if (/^[{}()[\].,:;=<>+\-/*?]+$/.test(token)) {
    return codeColors.punctuation;
  }

  return codeColors.function;
}

function renderAsciiFont(value: string): string[] {
  const rows = ["", "", ""];

  for (const char of value.toUpperCase()) {
    const glyph = asciiGlyphs[char] ?? [char.repeat(3), ` ${char} `, char.repeat(3)];

    for (let row = 0; row < rows.length; row += 1) {
      rows[row] += `${glyph[row] ?? "   "} `;
    }
  }

  return rows;
}

const asciiGlyphs: Record<string, string[]> = {
  A: [" /\\ ", "/__\\", "/  \\"],
  B: ["|~~\\", "|--<", "|__/"],
  C: [" /~~", "|   ", " \\__"],
  D: ["|~~\\", "|  |", "|__/"],
  E: ["|~~~", "|-- ", "|___"],
  N: ["|\\ |", "| \\|", "|  |"],
  O: [" /\\ ", "|  |", " \\/ "],
  S: [" /~~", "<__ ", "___/"],
  T: ["~~~", " | ", " | "],
  U: ["|  |", "|  |", " \\/ "],
  Y: ["\\ /", " | ", " | "],
  0: [" /\\ ", "|  |", " \\/ "],
  1: [" /| ", "  | ", " _|_"],
  2: ["__/ ", " /  ", "/__ "],
};

import {
  type BaseLayoutProps,
  type BaseStyleProps,
  BoxRenderable,
  createSyntheticEvent,
  measureTextWidth,
  type Rect,
  Renderable,
  type RenderEvent,
  renderTextBlock,
} from "@neotui/core";
import { ButtonRenderable } from "./button";
import { PanelRenderable } from "./panel";
import { defaultComponentTheme } from "./theme";
import { ToolbarRenderable } from "./toolbar";

type RenderContext = Parameters<Renderable["render"]>[0];

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export interface CalendarRenderableOptions {
  value?: string;
  visibleMonth?: string;
  minDate?: string;
  maxDate?: string;
  disabledDates?: string[];
  showOutsideDays?: boolean;
  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

interface CalendarCell {
  date: Date;
  iso: string;
  label: string;
  outside: boolean;
  disabled: boolean;
  selected: boolean;
  focused: boolean;
  today: boolean;
}

class CalendarGridRenderable extends Renderable {
  constructor(private readonly owner: CalendarRenderable) {
    super(
      "calendar-grid",
      {
        flexGrow: 1,
        minHeight: 6,
      },
      {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.fg,
      },
    );
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type !== "mouse" || event.action !== "down" || event.button !== "left") {
      return;
    }

    const cell = this.resolveCellAt(event.x, event.y);
    if (!cell || cell.disabled) {
      return;
    }

    this.owner.focusDate(cell.date);
    this.owner.selectFocusedDate();
    event.preventDefault();
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    return {
      width: Math.max(measured.width, 28),
      height: Math.max(measured.height, 6),
    };
  }

  protected override paint(context: RenderContext): void {
    const { buffer } = context;
    const { bounds, clipRect } = this.layoutState;
    buffer.fill(
      {
        char: " ",
        fg: defaultComponentTheme.fg,
        bg: defaultComponentTheme.surfaceBg,
      },
      bounds,
    );

    const cells = this.owner.buildGrid();
    const cellWidth = Math.max(3, Math.floor(bounds.width / 7));

    for (let index = 0; index < cells.length; index += 1) {
      const cell = cells[index];
      if (!cell) {
        continue;
      }

      const row = Math.floor(index / 7);
      const column = index % 7;
      const x = bounds.x + column * cellWidth;
      const y = bounds.y + row;
      const width =
        column === 6 ? Math.max(1, bounds.width - column * cellWidth) : Math.max(1, cellWidth);

      const bg = cell.selected
        ? defaultComponentTheme.borderStrong
        : cell.focused
          ? "#30271f"
          : defaultComponentTheme.surfaceBg;
      const fg = cell.selected
        ? defaultComponentTheme.ink
        : cell.disabled
          ? defaultComponentTheme.muted
          : cell.today
            ? defaultComponentTheme.title
            : cell.outside
              ? defaultComponentTheme.muted
              : defaultComponentTheme.fg;

      buffer.fill(
        {
          char: " ",
          fg,
          bg,
        },
        {
          x,
          y,
          width,
          height: 1,
        },
      );

      renderTextBlock(buffer, { x, y, width, height: 1 }, alignCell(cell.label, width), {
        clip: clipRect,
        fg,
        bg,
        wrapMode: "none",
      });
    }
  }

  private resolveCellAt(x: number, y: number): CalendarCell | null {
    const { bounds } = this.layoutState;
    if (
      x < bounds.x ||
      y < bounds.y ||
      x >= bounds.x + bounds.width ||
      y >= bounds.y + bounds.height
    ) {
      return null;
    }

    const cellWidth = Math.max(3, Math.floor(bounds.width / 7));
    const column = Math.min(6, Math.floor((x - bounds.x) / cellWidth));
    const row = y - bounds.y;
    return this.owner.buildGrid()[row * 7 + column] ?? null;
  }
}

export class CalendarRenderable extends PanelRenderable {
  readonly header: ToolbarRenderable;
  readonly previousButton: ButtonRenderable;
  readonly nextButton: ButtonRenderable;
  readonly monthLabel: BoxRenderable;
  readonly weekdayHeader: BoxRenderable;
  readonly grid: CalendarGridRenderable;

  value?: string;
  visibleMonth: Date;
  focusedDate: Date;
  minDate?: string;
  maxDate?: string;
  disabledDates: Set<string>;
  showOutsideDays: boolean;

  constructor(options: CalendarRenderableOptions = {}) {
    super({
      title: "calendar",
      tone: "info",
      layout: {
        flexDirection: "column",
        gap: 0,
        width: 32,
        height: 14,
        ...options.layout,
      },
      style: {
        focusable: true,
        ...options.style,
      },
    });
    const initialValue = options.value ? parseIsoDate(options.value) : null;
    const initialMonth =
      parseIsoDate(options.visibleMonth) ??
      initialValue ??
      startOfMonth(new Date(Date.UTC(todayUtc().getUTCFullYear(), todayUtc().getUTCMonth(), 1)));

    this.value = options.value;
    this.visibleMonth = startOfMonth(initialMonth);
    this.focusedDate = initialValue ?? todayUtc();
    this.minDate = options.minDate;
    this.maxDate = options.maxDate;
    this.disabledDates = new Set(options.disabledDates ?? []);
    this.showOutsideDays = options.showOutsideDays ?? true;

    this.header = new ToolbarRenderable({
      layout: {
        height: 3,
      },
    });
    this.previousButton = new ButtonRenderable({
      label: "<",
      variant: "ghost",
      size: "compact",
      minWidth: 3,
      style: {
        border: false,
      },
    });
    this.nextButton = new ButtonRenderable({
      label: ">",
      variant: "ghost",
      size: "compact",
      minWidth: 3,
      style: {
        border: false,
      },
    });
    this.monthLabel = new BoxRenderable({
      layout: {
        flexGrow: 1,
        height: 1,
      },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.title,
      },
    });
    this.weekdayHeader = new BoxRenderable({
      layout: { height: 1 },
      style: {
        bg: defaultComponentTheme.surfaceBg,
        fg: defaultComponentTheme.muted,
      },
    });
    this.grid = new CalendarGridRenderable(this);

    this.header.add(this.previousButton, this.monthLabel, this.nextButton);
    super.add(this.header, this.weekdayHeader, this.grid);

    this.previousButton.on("submit", () => {
      this.previousMonth();
      this.renderer?.focus(this);
    });
    this.nextButton.on("submit", () => {
      this.nextMonth();
      this.renderer?.focus(this);
    });

    this.syncCalendarChrome();
  }

  override measurePreferredSize(parentBounds: Rect) {
    const measured = super.measurePreferredSize(parentBounds);
    return {
      width: Math.max(measured.width, 32),
      height: Math.max(measured.height, 14),
    };
  }

  getValue(): string | undefined {
    return this.value;
  }

  setValue(value: string): this {
    const date = parseIsoDate(value);
    if (!date) {
      return this;
    }

    const previousValue = this.value;
    this.value = formatIsoDate(date);
    this.focusedDate = date;
    this.visibleMonth = startOfMonth(date);
    this.syncCalendarChrome();

    const event = createSyntheticEvent({
      type: "change",
      value: this.value,
      previousValue,
    } as const);
    event.target = this;
    event.currentTarget = this;
    this.emit("change", event);
    return this;
  }

  setVisibleMonth(month: string): this {
    const date = parseIsoDate(month);
    if (!date) {
      return this;
    }

    this.visibleMonth = startOfMonth(date);
    this.syncCalendarChrome();
    return this;
  }

  nextMonth(): this {
    this.visibleMonth = startOfMonth(addMonths(this.visibleMonth, 1));
    this.focusedDate = alignFocusedDateToMonth(this.focusedDate, this.visibleMonth);
    this.syncCalendarChrome();
    return this;
  }

  previousMonth(): this {
    this.visibleMonth = startOfMonth(addMonths(this.visibleMonth, -1));
    this.focusedDate = alignFocusedDateToMonth(this.focusedDate, this.visibleMonth);
    this.syncCalendarChrome();
    return this;
  }

  focusDate(date: Date): this {
    this.focusedDate = date;
    if (!isSameMonth(date, this.visibleMonth)) {
      this.visibleMonth = startOfMonth(date);
    }
    this.syncCalendarChrome();
    return this;
  }

  selectFocusedDate(): this {
    const iso = formatIsoDate(this.focusedDate);
    if (this.isDateDisabled(iso)) {
      return this;
    }

    return this.setValue(iso);
  }

  buildGrid(): CalendarCell[] {
    const monthStart = startOfMonth(this.visibleMonth);
    const gridStart = startOfWeek(monthStart);
    const today = formatIsoDate(todayUtc());

    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(gridStart, index);
      const iso = formatIsoDate(date);
      const outside = !isSameMonth(date, monthStart);
      return {
        date,
        iso,
        label: outside && !this.showOutsideDays ? "" : String(date.getUTCDate()).padStart(2, " "),
        outside,
        disabled: this.isDateDisabled(iso),
        selected: this.value === iso,
        focused: formatIsoDate(this.focusedDate) === iso,
        today: today === iso,
      };
    });
  }

  override handleEvent(event: RenderEvent): void {
    if (event.type === "focus") {
      this.updateStyle({ borderFg: defaultComponentTheme.borderStrong });
      this.invalidate("calendar:focus");
      return;
    }

    if (event.type === "blur") {
      this.updateStyle({ borderFg: defaultComponentTheme.info });
      this.invalidate("calendar:blur");
      return;
    }

    if (event.type !== "key") {
      return;
    }

    switch (event.key) {
      case "ArrowLeft":
        this.focusDate(addDays(this.focusedDate, -1));
        event.preventDefault();
        return;
      case "ArrowRight":
        this.focusDate(addDays(this.focusedDate, 1));
        event.preventDefault();
        return;
      case "ArrowUp":
        this.focusDate(addDays(this.focusedDate, -7));
        event.preventDefault();
        return;
      case "ArrowDown":
        this.focusDate(addDays(this.focusedDate, 7));
        event.preventDefault();
        return;
      case "Home":
        this.focusDate(startOfWeek(this.focusedDate));
        event.preventDefault();
        return;
      case "End":
        this.focusDate(addDays(startOfWeek(this.focusedDate), 6));
        event.preventDefault();
        return;
      case "PageUp":
        this.previousMonth();
        event.preventDefault();
        return;
      case "PageDown":
        this.nextMonth();
        event.preventDefault();
        return;
      case " ":
      case "Space":
      case "Enter":
        this.selectFocusedDate();
        event.preventDefault();
        return;
      default:
        return;
    }
  }

  private syncCalendarChrome(): void {
    this.monthLabel.setContent(formatMonthLabel(this.visibleMonth));
    this.weekdayHeader.setContent(
      WEEKDAY_LABELS.map((label) => alignCell(label, 4))
        .join("")
        .slice(0, 28),
    );
    this.grid.invalidate("calendar:grid");
    this.invalidate("calendar:sync");
  }

  private isDateDisabled(iso: string): boolean {
    if (this.disabledDates.has(iso)) {
      return true;
    }

    if (this.minDate && iso < this.minDate) {
      return true;
    }

    if (this.maxDate && iso > this.maxDate) {
      return true;
    }

    return false;
  }
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function alignCell(value: string, width: number): string {
  const valueWidth = measureTextWidth(value);
  const left = Math.max(0, Math.floor((width - valueWidth) / 2));
  const right = Math.max(0, width - valueWidth - left);
  return `${" ".repeat(left)}${value}${" ".repeat(right)}`;
}

function parseIsoDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1] ?? "0", 10);
  const month = Number.parseInt(match[2] ?? "1", 10) - 1;
  const day = Number.parseInt(match[3] ?? "1", 10);
  return new Date(Date.UTC(year, month, day));
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastDay)));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getUTCDay());
}

function isSameMonth(left: Date, right: Date): boolean {
  return (
    left.getUTCFullYear() === right.getUTCFullYear() && left.getUTCMonth() === right.getUTCMonth()
  );
}

function alignFocusedDateToMonth(date: Date, month: Date): Date {
  const lastDay = new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), Math.min(date.getUTCDate(), lastDay)),
  );
}

import type { Renderable } from "./renderable";

export interface EventModifiers {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

export interface EventBase {
  readonly timestamp: number;
  readonly raw: string;
  target: Renderable | null;
  currentTarget: Renderable | null;
  defaultPrevented: boolean;
  propagationStopped: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface KeyEvent extends EventBase {
  type: "key";
  key: string;
  text?: string;
  modifiers: EventModifiers;
  repeat: boolean;
}

export interface MouseEvent extends EventBase {
  type: "mouse";
  action: "down" | "up" | "move" | "wheel";
  button: "left" | "middle" | "right" | "none";
  x: number;
  y: number;
  wheelDelta: -1 | 0 | 1;
  modifiers: EventModifiers;
}

export interface PasteEvent extends EventBase {
  type: "paste";
  text: string;
}

export interface FocusEvent extends EventBase {
  type: "focus" | "blur";
  relatedTarget: Renderable | null;
}

export interface ChangeEvent<T = unknown> extends EventBase {
  type: "change";
  value: T;
  previousValue: T | undefined;
}

export interface SubmitEvent<T = unknown> extends EventBase {
  type: "submit";
  value: T;
}

export type RenderEvent =
  | KeyEvent
  | MouseEvent
  | PasteEvent
  | FocusEvent
  | ChangeEvent
  | SubmitEvent;

export type RenderEventType = RenderEvent["type"];
export type RenderEventHandler<T extends RenderEvent = RenderEvent> = (event: T) => void;

export type ParsedInputEvent = KeyEvent | MouseEvent | PasteEvent;

const CSI = "\u001b[";
const SS3 = "\u001bO";
const ESC = "\u001b";
const bracketedPasteStart = `${CSI}200~`;
const bracketedPasteEnd = `${CSI}201~`;
const sgrMousePattern = new RegExp(`^${ESC}\\[<(\\d+);(\\d+);(\\d+)([mM])`);
const kittyKeyboardPattern = new RegExp(`^${ESC}\\[([0-9:]+)(?:;([0-9:]*))?(?:;([0-9:]*))?u`);
const modifiedArrowPattern = new RegExp(`^${ESC}\\[(?:1;)?(\\d+)([ABCDHF])`);
const functionPattern = new RegExp(`^${ESC}(?:O([PQRS])|\\[(\\d+)~)`);

export function parseInput(input: string): ParsedInputEvent[] {
  const events: ParsedInputEvent[] = [];
  let cursor = 0;

  while (cursor < input.length) {
    const remaining = input.slice(cursor);

    if (remaining.startsWith(bracketedPasteStart)) {
      const endIndex = remaining.indexOf(bracketedPasteEnd, bracketedPasteStart.length);
      const payload =
        endIndex === -1
          ? remaining.slice(bracketedPasteStart.length)
          : remaining.slice(bracketedPasteStart.length, endIndex);

      events.push(
        createPasteEvent(payload, remaining.slice(0, bracketedPasteStart.length + payload.length)),
      );
      cursor += bracketedPasteStart.length + payload.length;

      if (endIndex !== -1) {
        cursor += bracketedPasteEnd.length;
      }

      continue;
    }

    const sgrMouse = remaining.match(sgrMousePattern);

    if (sgrMouse) {
      events.push(
        createMouseEventFromSgr(
          sgrMouse[0],
          sgrMouse[1] ?? "0",
          sgrMouse[2] ?? "1",
          sgrMouse[3] ?? "1",
          sgrMouse[4] ?? "M",
        ),
      );
      cursor += sgrMouse[0].length;
      continue;
    }

    const kittyKeyboard = remaining.match(kittyKeyboardPattern);

    if (kittyKeyboard) {
      const kittyEvent = createKittyKeyEvent(
        kittyKeyboard[0],
        kittyKeyboard[1] ?? "0",
        kittyKeyboard[2],
        kittyKeyboard[3],
      );
      if (kittyEvent) {
        events.push(kittyEvent);
      }
      cursor += kittyKeyboard[0].length;
      continue;
    }

    if (remaining.startsWith(`${CSI}Z`)) {
      events.push(
        createKeyEvent("Tab", { shift: true, alt: false, ctrl: false, meta: false }, `${CSI}Z`),
      );
      cursor += 3;
      continue;
    }

    const modifiedArrow = remaining.match(modifiedArrowPattern);

    if (modifiedArrow) {
      events.push(
        createModifiedArrowEvent(
          modifiedArrow[0],
          modifiedArrow[1] ?? "1",
          modifiedArrow[2] ?? "A",
        ),
      );
      cursor += modifiedArrow[0].length;
      continue;
    }

    const func = remaining.match(functionPattern);

    if (func) {
      events.push(createFunctionKeyEvent(func[0], func[1], func[2]));
      cursor += func[0].length;
      continue;
    }

    if (
      remaining.startsWith(`${CSI}A`) ||
      remaining.startsWith(`${CSI}B`) ||
      remaining.startsWith(`${CSI}C`) ||
      remaining.startsWith(`${CSI}D`) ||
      remaining.startsWith(`${CSI}H`) ||
      remaining.startsWith(`${CSI}F`)
    ) {
      const map: Record<string, string> = {
        [`${CSI}A`]: "ArrowUp",
        [`${CSI}B`]: "ArrowDown",
        [`${CSI}C`]: "ArrowRight",
        [`${CSI}D`]: "ArrowLeft",
        [`${CSI}H`]: "Home",
        [`${CSI}F`]: "End",
      };
      const raw = remaining.slice(0, 3);
      events.push(createKeyEvent(map[raw] ?? "Unknown", emptyModifiers(), raw));
      cursor += 3;
      continue;
    }

    if (remaining.startsWith("\r")) {
      events.push(createKeyEvent("Enter", emptyModifiers(), "\r", "\n"));
      cursor += 1;
      continue;
    }

    if (remaining.startsWith("\t")) {
      events.push(createKeyEvent("Tab", emptyModifiers(), "\t", "\t"));
      cursor += 1;
      continue;
    }

    if (remaining.startsWith("\u007f")) {
      events.push(createKeyEvent("Backspace", emptyModifiers(), "\u007f"));
      cursor += 1;
      continue;
    }

    if (remaining === ESC) {
      events.push(createKeyEvent("Escape", emptyModifiers(), ESC));
      cursor += 1;
      continue;
    }

    const controlKey = decodeControlKey(remaining);

    if (controlKey) {
      events.push(controlKey.event);
      cursor += controlKey.length;
      continue;
    }

    if (
      remaining.startsWith(ESC) &&
      remaining.length >= 2 &&
      !remaining.startsWith(CSI) &&
      !remaining.startsWith(SS3)
    ) {
      const next = firstChar(remaining.slice(1));
      events.push(
        createKeyEvent(
          normalizeKey(next),
          { shift: false, alt: true, ctrl: false, meta: false },
          `${ESC}${next}`,
          next,
        ),
      );
      cursor += 1 + next.length;
      continue;
    }

    const char = firstChar(remaining);
    events.push(createKeyEvent(normalizeKey(char), emptyModifiers(), char, char));
    cursor += char.length;
  }

  return events;
}

export function createSyntheticEvent<T extends object>(event: T): T & EventBase {
  return {
    ...event,
    timestamp: Date.now(),
    raw: "",
    target: null,
    currentTarget: null,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
  } as T & EventBase;
}

export function createFocusEvent(
  type: "focus" | "blur",
  target: Renderable | null,
  relatedTarget: Renderable | null,
): FocusEvent {
  const event = createSyntheticEvent({ type, relatedTarget } as const) as FocusEvent;
  event.target = target;
  return event;
}

export function eventAliases(event: RenderEvent): string[] {
  const syntheticAlias = (event as RenderEvent & { alias?: string }).alias;

  if (syntheticAlias) {
    return [syntheticAlias];
  }

  if (event.type === "mouse") {
    switch (event.action) {
      case "down":
        return ["mousedown"];
      case "up":
        return ["mouseup"];
      case "move":
        return ["mousemove"];
      case "wheel":
        return ["wheel"];
    }
  }

  return [];
}

function createPasteEvent(text: string, raw: string): PasteEvent {
  return {
    ...baseEvent(raw),
    type: "paste",
    text,
  };
}

function createKittyKeyEvent(
  raw: string,
  keyField: string,
  modifierField?: string,
  textField?: string,
): KeyEvent | null {
  const keyCode = Number.parseInt(keyField.split(":")[0] ?? "0", 10);
  const { modifiers, eventType } = decodeKittyModifierField(modifierField);

  if (eventType === 3) {
    return null;
  }

  const text = decodeKittyTextField(textField) ?? decodeKittyDefaultText(keyCode);
  const key = decodeKittyKeyName(keyCode, text);
  const event = createKeyEvent(key, modifiers, raw, text);
  event.repeat = eventType === 2;
  return event;
}

function createModifiedArrowEvent(raw: string, modifierValue: string, code: string): KeyEvent {
  const keyMap: Record<string, string> = {
    A: "ArrowUp",
    B: "ArrowDown",
    C: "ArrowRight",
    D: "ArrowLeft",
    H: "Home",
    F: "End",
  };

  return createKeyEvent(keyMap[code] ?? code, decodeModifiers(modifierValue), raw);
}

function createFunctionKeyEvent(raw: string, ss3Code?: string, tildeCode?: string): KeyEvent {
  const keyMap: Record<string, string> = {
    P: "F1",
    Q: "F2",
    R: "F3",
    S: "F4",
    "1": "Home",
    "2": "Insert",
    "3": "Delete",
    "4": "End",
    "5": "PageUp",
    "6": "PageDown",
    "7": "Home",
    "8": "End",
    "15": "F5",
    "17": "F6",
    "18": "F7",
    "19": "F8",
    "20": "F9",
    "21": "F10",
    "23": "F11",
    "24": "F12",
  };

  return createKeyEvent(keyMap[ss3Code ?? tildeCode ?? ""] ?? "Unknown", emptyModifiers(), raw);
}

function createMouseEventFromSgr(
  raw: string,
  buttonCodeValue: string,
  xValue: string,
  yValue: string,
  terminator: string,
): MouseEvent {
  const buttonCode = Number.parseInt(buttonCodeValue, 10);
  const button = decodeMouseButton(buttonCode);
  const modifiers = {
    shift: Boolean(buttonCode & 4),
    alt: Boolean(buttonCode & 8),
    ctrl: Boolean(buttonCode & 16),
    meta: false,
  };
  const wheel = buttonCode >= 64;
  const move = Boolean(buttonCode & 32) && !wheel;

  return {
    ...baseEvent(raw),
    type: "mouse",
    action: wheel ? "wheel" : move ? "move" : terminator === "m" ? "up" : "down",
    button,
    x: Math.max(0, Number.parseInt(xValue, 10) - 1),
    y: Math.max(0, Number.parseInt(yValue, 10) - 1),
    wheelDelta: wheel ? (buttonCode & 1 ? -1 : 1) : 0,
    modifiers,
  };
}

function createKeyEvent(
  key: string,
  modifiers: EventModifiers,
  raw: string,
  text?: string,
): KeyEvent {
  return {
    ...baseEvent(raw),
    type: "key",
    key,
    text,
    modifiers,
    repeat: false,
  };
}

function normalizeKey(value: string): string {
  if (value.length === 1) {
    return value;
  }

  return value;
}

function decodeControlKey(input: string): { event: KeyEvent; length: number } | null {
  const char = firstChar(input);
  const codePoint = char.codePointAt(0) ?? -1;

  if (codePoint < 1 || codePoint > 26) {
    return null;
  }

  const key = String.fromCharCode(96 + codePoint);

  return {
    event: createKeyEvent(key, { shift: false, alt: false, ctrl: true, meta: false }, char),
    length: char.length,
  };
}

function decodeModifiers(value: string): EventModifiers {
  const numeric = Math.max(1, Number.parseInt(value.split(":")[0] ?? value, 10));
  const bits = numeric - 1;

  return {
    shift: Boolean(bits & 1),
    alt: Boolean(bits & 2),
    ctrl: Boolean(bits & 4),
    meta: Boolean(bits & 8),
  };
}

function decodeKittyModifierField(value?: string): {
  modifiers: EventModifiers;
  eventType: 1 | 2 | 3;
} {
  if (!value || value.length === 0) {
    return {
      modifiers: emptyModifiers(),
      eventType: 1,
    };
  }

  const [modifierPart, eventTypePart] = value.split(":");
  const rawEventType = Number.parseInt(eventTypePart ?? "1", 10);
  const eventType: 1 | 2 | 3 = rawEventType === 2 ? 2 : rawEventType === 3 ? 3 : 1;

  return {
    modifiers: decodeModifiers(modifierPart ?? "1"),
    eventType,
  };
}

function decodeKittyTextField(value?: string): string | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }

  const codePoints = value
    .split(":")
    .map((segment) => Number.parseInt(segment, 10))
    .filter((codePoint) => Number.isFinite(codePoint) && codePoint > 0);

  if (codePoints.length === 0) {
    return undefined;
  }

  return String.fromCodePoint(...codePoints);
}

function decodeKittyDefaultText(keyCode: number): string | undefined {
  if (keyCode >= 32 && keyCode !== 127) {
    try {
      return String.fromCodePoint(keyCode);
    } catch {
      return undefined;
    }
  }

  if (keyCode === 13) {
    return "\n";
  }

  if (keyCode === 9) {
    return "\t";
  }

  return undefined;
}

function decodeKittyKeyName(keyCode: number, text?: string): string {
  const namedKey = kittyNamedKeyMap[keyCode];

  if (namedKey) {
    return namedKey;
  }

  return normalizeKey(text ?? String(keyCode));
}

const kittyNamedKeyMap: Record<number, string> = {
  9: "Tab",
  13: "Enter",
  27: "Escape",
  127: "Backspace",
  57358: "CapsLock",
  57359: "ScrollLock",
  57360: "NumLock",
  57361: "PrintScreen",
  57362: "Pause",
  57363: "Menu",
};

function decodeMouseButton(buttonCode: number): MouseEvent["button"] {
  const normalized = buttonCode & 3;

  if (buttonCode >= 64) {
    return "none";
  }

  switch (normalized) {
    case 0:
      return "left";
    case 1:
      return "middle";
    case 2:
      return "right";
    default:
      return "none";
  }
}

function baseEvent(raw: string): EventBase {
  return {
    timestamp: Date.now(),
    raw,
    target: null,
    currentTarget: null,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
  };
}

function firstChar(value: string): string {
  return Array.from(value)[0] ?? "";
}

function emptyModifiers(): EventModifiers {
  return {
    shift: false,
    alt: false,
    ctrl: false,
    meta: false,
  };
}

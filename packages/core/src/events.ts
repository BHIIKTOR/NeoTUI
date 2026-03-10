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
const modifyOtherKeysPattern = new RegExp(`^${ESC}\\[(27);(\\d+);(\\d+)~`);
const modifiedTildePattern = new RegExp(`^${ESC}\\[(\\d+);(\\d+)~`);
const modifiedArrowPattern = new RegExp(`^${ESC}\\[(?:1;)?(\\d+(?::\\d+)?)([ABCDHF])`);
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

    const modifyOtherKeys = remaining.match(modifyOtherKeysPattern);

    if (modifyOtherKeys) {
      events.push(
        createModifyOtherKeysEvent(
          modifyOtherKeys[0],
          modifyOtherKeys[2] ?? "1",
          modifyOtherKeys[3] ?? "0",
        ),
      );
      cursor += modifyOtherKeys[0].length;
      continue;
    }

    const modifiedTilde = remaining.match(modifiedTildePattern);

    if (modifiedTilde) {
      events.push(
        createModifiedTildeKeyEvent(
          modifiedTilde[0],
          modifiedTilde[1] ?? "0",
          modifiedTilde[2] ?? "1",
        ),
      );
      cursor += modifiedTilde[0].length;
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
      const modifiedArrowEvent = createModifiedArrowEvent(
        modifiedArrow[0],
        modifiedArrow[1] ?? "1",
        modifiedArrow[2] ?? "A",
      );
      if (modifiedArrowEvent) {
        events.push(modifiedArrowEvent);
      }
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
  const key = decodeKittyKeyField(keyField);
  const modifierInfo = decodeKittyModifierField(modifierField);
  const { modifiers, eventType } = modifierInfo;

  if (eventType === 3) {
    return null;
  }

  const text =
    decodeKittyTextField(textField) ?? decodeKittyPrintableText(key, modifierInfo);
  const event = createKeyEvent(decodeKittyKeyName(key.keyCode, text), modifiers, raw, text);
  event.repeat = eventType === 2;
  return event;
}

function createModifiedArrowEvent(
  raw: string,
  modifierValue: string,
  code: string,
): KeyEvent | null {
  const [modifierPart, eventTypePart] = modifierValue.split(":");
  const eventType = Number.parseInt(eventTypePart ?? "1", 10);
  if (eventType === 3) {
    return null;
  }
  const keyMap: Record<string, string> = {
    A: "ArrowUp",
    B: "ArrowDown",
    C: "ArrowRight",
    D: "ArrowLeft",
    H: "Home",
    F: "End",
  };

  return createKeyEvent(keyMap[code] ?? code, decodeModifiers(modifierPart ?? modifierValue), raw);
}

function createFunctionKeyEvent(raw: string, ss3Code?: string, tildeCode?: string): KeyEvent {
  return createKeyEvent(
    decodeFunctionKeyName(ss3Code ?? tildeCode ?? ""),
    emptyModifiers(),
    raw,
  );
}

function createModifiedTildeKeyEvent(
  raw: string,
  keyCodeValue: string,
  modifierValue: string,
): KeyEvent {
  const keyName = decodeFunctionKeyName(keyCodeValue);
  return createKeyEvent(
    keyName,
    decodeModifiers(modifierValue),
    raw,
    defaultTextForKeyName(keyName),
  );
}

function createModifyOtherKeysEvent(
  raw: string,
  modifierValue: string,
  codePointValue: string,
): KeyEvent {
  const key = decodeKittyKeyField(codePointValue);
  const modifierInfo = decodeKittyModifierField(modifierValue);
  const text = decodeKittyPrintableText(key, modifierInfo) ?? decodeCodePointText(key.keyCode);
  return createKeyEvent(decodeKittyKeyName(key.keyCode, text), modifierInfo.modifiers, raw, text);
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
  const bits = decodeModifierBits(value);

  return {
    shift: Boolean(bits & 1),
    alt: Boolean(bits & 2),
    ctrl: Boolean(bits & 4),
    meta: Boolean(bits & (8 | 16 | 32)),
  };
}

function decodeKittyModifierField(value?: string): {
  modifiers: EventModifiers;
  eventType: 1 | 2 | 3;
  capsLock: boolean;
  numLock: boolean;
} {
  if (!value || value.length === 0) {
    return {
      modifiers: emptyModifiers(),
      eventType: 1,
      capsLock: false,
      numLock: false,
    };
  }

  const [modifierPart, eventTypePart] = value.split(":");
  const rawEventType = Number.parseInt(eventTypePart ?? "1", 10);
  const eventType: 1 | 2 | 3 = rawEventType === 2 ? 2 : rawEventType === 3 ? 3 : 1;
  const bits = decodeModifierBits(modifierPart ?? "1");

  return {
    modifiers: decodeModifiers(modifierPart ?? "1"),
    eventType,
    capsLock: Boolean(bits & 64),
    numLock: Boolean(bits & 128),
  };
}

function decodeModifierBits(value: string): number {
  const numeric = Math.max(1, Number.parseInt(value.split(":")[0] ?? value, 10));
  return numeric - 1;
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

function decodeKittyKeyField(value: string): {
  keyCode: number;
  shiftedKeyCode?: number;
  baseLayoutKeyCode?: number;
} {
  const [keyCodeValue, shiftedKeyCodeValue, baseLayoutKeyCodeValue] = value.split(":");
  const keyCode = Number.parseInt(keyCodeValue ?? "0", 10);
  const shiftedKeyCode = parseOptionalPositiveInt(shiftedKeyCodeValue);
  const baseLayoutKeyCode = parseOptionalPositiveInt(baseLayoutKeyCodeValue);

  return {
    keyCode,
    shiftedKeyCode,
    baseLayoutKeyCode,
  };
}

function decodeKittyDefaultText(keyCode: number): string | undefined {
  if (isPrivateUseCodePoint(keyCode)) {
    return undefined;
  }

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

function decodeKittyPrintableText(
  key: { keyCode: number; shiftedKeyCode?: number },
  modifierInfo: { modifiers: EventModifiers; capsLock: boolean },
): string | undefined {
  if (modifierInfo.modifiers.shift && key.shiftedKeyCode) {
    const shifted = decodeCodePointText(key.shiftedKeyCode);
    if (shifted) {
      return shifted;
    }
  }

  const base = decodeKittyDefaultText(key.keyCode);
  if (!base || base.length !== 1) {
    return base;
  }

  if (isAsciiLetter(base)) {
    const uppercase = base.toUpperCase();
    if (modifierInfo.capsLock) {
      return modifierInfo.modifiers.shift ? base : uppercase;
    }
    return modifierInfo.modifiers.shift ? uppercase : base;
  }

  if (modifierInfo.modifiers.shift) {
    return shiftedAsciiMap[base] ?? base;
  }

  return base;
}

function decodeCodePointText(keyCode: number): string | undefined {
  if (isPrivateUseCodePoint(keyCode)) {
    return undefined;
  }

  if (keyCode < 32 || keyCode === 127) {
    return undefined;
  }

  try {
    return String.fromCodePoint(keyCode);
  } catch {
    return undefined;
  }
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
  57441: "LeftShift",
  57442: "LeftControl",
  57443: "LeftAlt",
  57444: "LeftSuper",
  57445: "LeftHyper",
  57446: "LeftMeta",
  57447: "RightShift",
  57448: "RightControl",
  57449: "RightAlt",
  57450: "RightSuper",
  57451: "RightHyper",
  57452: "RightMeta",
};

function decodeFunctionKeyName(code: string): string {
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
    "9": "Tab",
    "13": "Enter",
    "15": "F5",
    "17": "F6",
    "18": "F7",
    "19": "F8",
    "20": "F9",
    "21": "F10",
    "23": "F11",
    "24": "F12",
  };

  return keyMap[code] ?? "Unknown";
}

function defaultTextForKeyName(keyName: string): string | undefined {
  switch (keyName) {
    case "Enter":
      return "\n";
    case "Tab":
      return "\t";
    default:
      return undefined;
  }
}

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

function isPrivateUseCodePoint(value: number): boolean {
  return (
    (value >= 0xe000 && value <= 0xf8ff) ||
    (value >= 0xf0000 && value <= 0xffffd) ||
    (value >= 0x100000 && value <= 0x10fffd)
  );
}

function parseOptionalPositiveInt(value?: string): number | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isAsciiLetter(value: string): boolean {
  return value.length === 1 && value >= "a" && value <= "z";
}

const shiftedAsciiMap: Record<string, string> = {
  "`": "~",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
  "0": ")",
  "-": "_",
  "=": "+",
  "[": "{",
  "]": "}",
  "\\": "|",
  ";": ":",
  "'": "\"",
  ",": "<",
  ".": ">",
  "/": "?",
};

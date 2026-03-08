import type { KeyEvent, RenderEvent } from "@neotui/core";

export function isActivationKey(event: RenderEvent): event is KeyEvent {
  return (
    event.type === "key" && (event.key === "Enter" || event.key === " " || event.key === "Space")
  );
}

export function isPrimaryMouseDown(
  event: RenderEvent,
): event is Extract<RenderEvent, { type: "mouse"; action: "down"; button: "left" }> {
  return event.type === "mouse" && event.action === "down" && event.button === "left";
}

export function isPrimaryMouseUp(
  event: RenderEvent,
): event is Extract<RenderEvent, { type: "mouse"; action: "up"; button: "left" }> {
  return event.type === "mouse" && event.action === "up" && event.button === "left";
}

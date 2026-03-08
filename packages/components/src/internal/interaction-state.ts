export interface InteractionState {
  focused: boolean;
  hovered: boolean;
  pressed: boolean;
  disabled: boolean;
}

export function createInteractionState(disabled = false): InteractionState {
  return {
    focused: false,
    hovered: false,
    pressed: false,
    disabled,
  };
}

export function canActivate(state: InteractionState): boolean {
  return state.disabled !== true;
}

# Textarea

## Status

This spec is intentionally more detailed than most of the component catalog.
The current textarea implementation exists, but it is not yet at the quality
bar required for a serious editor-like multiline input. This document is the
source of truth for the rewrite and the validation surface that will be used to
decide whether the implementation is actually complete.

The implementation has improved materially since the first draft of this spec:
multiline cursor movement, paging, document navigation, mouse placement,
clipboard shortcuts, paste summarization, and resize-aware auto-resize behavior
now exist. The text layer now owns a real textarea stack:
`TextareaDocumentModel`, `TextareaViewportModel`, `TextareaViewportState`, and
`TextareaControllerModel`. The remaining work is less about "add any multiline
behavior at all" and more about edge-case reliability, performance depth, and
manual kitty validation.

## Purpose

Provide a production-grade multiline text editing surface for NeoTui that works
reliably in fixed panels, forms, dialogs, sheets, drawers, windows, and other
host surfaces without app-local hacks.

The target is not a full code editor. The target is a very capable multiline
text control that feels trustworthy for real product UI.

## Why This Needs A Rewrite

The current stack is too small and too coupled to evolve safely:

- `packages/core/src/widgets.ts`
  `TextareaRenderable` is now a thin host surface. It owns focus state,
  renderer clipboard IO, widget event emission, and the final paint pass, but
  no longer defines textarea interaction policy itself.
- `packages/core/src/text.ts`
  The text layer now contains `MultilineEditorBuffer`,
  `TextareaDocumentModel`, `TextareaViewportModel`, `TextareaViewportState`,
  and `TextareaControllerModel`, which is the right direction for the rewrite.
- `packages/components/src/textarea.ts`
  `TextareaControlRenderable` adds chrome and auto-resize, but not serious
  editor behavior.
- `packages/test-utils/tests/widgets.test.ts`
  textarea coverage is materially broader now, but it still is not exhaustive
  enough for every long-document and host-container edge case.
- `packages/test-utils/tests/components-fields.test.ts`
  the wrapper now has stronger resize and wrap-mode coverage, but it still is
  not the final word on real-kitty editing validation.

### Current Gaps

The current implementation is still weakest in these areas:

- long wrapped selections and large-document movement need more confidence under
  sustained editing pressure
- transaction grouping is now explicit enough to keep paste, typing, and delete
  flows separate, but it still does not expose richer batching semantics
- clipboard and mouse behavior are covered in tests, but still need more real
  kitty confidence to graduate from "solid" to "boring"
- the component wrapper needs more proof in larger app surfaces beyond the
  focused textarea examples and host-specific tests

## Product Goal

After this work lands, a NeoTui textarea should be good enough for:

- issue and PR descriptions
- notes and comments
- commit-message style entry
- structured multiline forms
- inspector sidebars with editable text
- modal editing flows
- medium-length content entry inside windows and docked panels

It should not feel like a placeholder control or a demo widget.

## In Scope

- multiline cursor movement
- selection
- insertion and deletion
- undo / redo
- wrapped and unwrapped editing
- vertical and horizontal scrolling
- auto-resize and fixed-height modes
- mouse placement and drag selection
- bracketed paste
- clipboard hooks
- scrollbars
- readonly / disabled / invalid states
- deterministic tests
- real examples and playground coverage

## Non-Goals

These are explicitly out of scope for the first serious textarea rewrite:

- syntax highlighting
- multi-cursor editing
- language-aware indentation
- search-and-replace UI
- full code-editor feature parity
- diagnostics, lint markers, or semantic tokens
- vi / emacs modal keymaps

Those can come later, but they must not distort the first implementation.

## Success Criteria

The textarea rewrite is only considered complete when all of these are true:

- the core editing engine is no longer embedded directly inside
  `TextareaRenderable`
- multiline keyboard movement feels correct in real kitty sessions
- selection, scroll, and cursor state stay coherent under edit pressure
- fixed-size textareas remain usable for long content
- auto-resize textareas remain stable and predictable
- the component wrapper exposes explicit behavior instead of accidental behavior
- the tests and examples are strong enough that regressions are caught quickly

## Architectural Target

The textarea should be split into explicit layers.

### 1. Editor Engine

Owns the text document and edit semantics.

Responsibilities:

- text storage
- cursor index
- selection anchor / focus
- line-aware and grapheme-aware movement
- text insertion and deletion
- history
- transaction grouping

Candidate shape:

```ts
export class MultilineEditorBuffer {
  constructor(value?: string);

  getText(): string;
  setText(value: string): void;

  getCursorIndex(): number;
  getCursorLocation(): { line: number; column: number };
  getSelection(): TextSelection | null;
  hasSelection(): boolean;

  moveLeft(extend?: boolean): void;
  moveRight(extend?: boolean): void;
  moveUp(extend?: boolean): void;
  moveDown(extend?: boolean): void;
  moveWordLeft(extend?: boolean): void;
  moveWordRight(extend?: boolean): void;
  moveLineStart(extend?: boolean): void;
  moveLineEnd(extend?: boolean): void;
  moveDocumentStart(extend?: boolean): void;
  moveDocumentEnd(extend?: boolean): void;
  movePageUp(lines: number, extend?: boolean): void;
  movePageDown(lines: number, extend?: boolean): void;

  insert(value: string): void;
  backspace(): void;
  deleteForward(): void;
  insertLineBreak(): void;

  selectAll(): void;
  clearSelection(): void;

  undo(): boolean;
  redo(): boolean;
}
```

### 2. Viewport Model

Owns how editor content maps into visible rows and columns.

Responsibilities:

- wrap-aware line layout
- visual row mapping
- scrollbar metrics
- logical cursor-to-display mapping

Current concrete types:

- `TextareaViewportModel` for row layout and hit-testing
- `TextareaViewportState` for horizontal and vertical scroll offsets plus
  preferred cursor X memory

### 3. Controller Layer

Owns interaction state that should not live in the renderable itself.

Responsibilities:

- page and vertical movement relative to viewport height
- cursor visibility rules
- wrap-mode changes and scroll clamping
- pointer selection lifecycle
- coordination between document and viewport state

Current concrete type:

- `TextareaControllerModel`

### 4. Renderable Surface

`TextareaRenderable` should become the orchestration layer between the editor
engine, the viewport, the renderer, and input events.

Responsibilities:

- event routing
- focus ownership
- caret painting
- selection painting
- scroll sync
- emitting `change` and `submit`
- readonly / disabled behavior

### 5. Component Wrapper

`TextareaControlRenderable` should remain the themed field-level wrapper.

Responsibilities:

- border, palette, and status chrome
- auto-resize and min/max row policy
- invalid / disabled / readonly styling
- integration with `FieldRenderable`
- examples and forms

## Target Public API

The existing API is too narrow. The target shape below is the contract the
implementation should converge toward.

```ts
export type TextareaWrapMode = "none" | "word" | "grapheme";
export type TextareaViewportMode = "fixed" | "auto-resize";
export type TextareaSubmitMode = "none" | "ctrl-enter" | "meta-enter";

export interface TextareaControlRenderableOptions {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  invalid?: boolean;

  minRows?: number;
  maxRows?: number;
  autoResize?: boolean;

  wrapMode?: TextareaWrapMode;
  viewportMode?: TextareaViewportMode;
  submitMode?: TextareaSubmitMode;
  showScrollbars?: boolean;
  summarizePastedText?: boolean;
  pasteSummaryThreshold?: number;
  pasteSummaryLineThreshold?: number;

  layout?: BaseLayoutProps;
  style?: BaseStyleProps;
}

export class TextareaControlRenderable extends Renderable {
  getValue(): string;
  setValue(value: string): this;

  getSelection(): TextSelection | null;
  selectAll(): this;
  clearSelection(): this;

  undo(): this;
  redo(): this;

  setReadOnly(value: boolean): this;
  setDisabled(value: boolean): this;
  setInvalid(value: boolean): this;
  setWrapMode(mode: TextareaWrapMode): this;

  focus(): this;
  blur(): this;
  scrollToCursor(): this;
}

export function Textarea(
  props: TextareaControlRenderableOptions,
): ConstructNode;
```

Not every method must land immediately, but the rewrite must move toward this
contract instead of remaining a thin wrapper over a minimal text box.

## Behavior Contract

### Keyboard Movement

The textarea must support:

- `ArrowLeft` / `ArrowRight`
- `ArrowUp` / `ArrowDown`
- `Home` / `End`
- `Ctrl+ArrowLeft` / `Ctrl+ArrowRight`
- `Ctrl+Home` / `Ctrl+End` or equivalent document-bound shortcuts
- `PageUp` / `PageDown`
- `Shift+movement` to extend selection
- `Ctrl/Cmd+A` for select all

### Editing

The textarea must support:

- character insertion
- multiline insertion
- replace-selection insertion
- backspace
- delete-forward
- paste as a single edit operation
- readonly suppression of mutation while still allowing selection and scroll

### Submission

Submission behavior must be explicit:

- default multiline `Enter` inserts a newline
- submit behavior must only occur under the configured submit shortcut
- submit behavior must not accidentally destroy focus or text state

### Selection

Selection must support:

- range selection across multiple lines
- range selection through keyboard extension
- selection replacement on insert / paste / delete
- selection preservation under non-mutating cursor movement rules
- select-all

### Wrap And Viewport

The textarea must work in both:

- wrapped mode
- unwrapped mode with horizontal scroll

The cursor must remain visible in both modes, and page navigation must be based
on the visible viewport, not raw document line count alone.

### Mouse

The textarea must support:

- click to move cursor
- drag to select
- wheel scroll
- focus on click
- selection update while dragging

### Clipboard And Paste

At minimum, the textarea must support:

- bracketed paste
- normal paste insertion
- paste replacing selection
- optional large-paste summary rendering, where the visible textarea collapses
  to a token such as `[Pasted Content 2215 chars]` while the full pasted text
  remains in the backing buffer
- default summary behavior should trigger for clearly large multiline pastes,
  which means about five or more pasted lines even if the total character count
  is modest
- platform-aware clipboard shortcuts chosen at startup:
  - macOS prefers `Cmd+C` / `Cmd+X` / `Cmd+V`
  - Linux and other non-macOS platforms prefer `Ctrl+C` / `Ctrl+X` / `Ctrl+V`
- clipboard IO should use the detected host transport first and still write
  through terminal clipboard support when available

Copy and cut must operate on the current selection without breaking focus, and
global `Ctrl+C` exit handling must not win when a focused textarea explicitly
consumes copy on non-macOS platforms.

## Layout Contract

- border and padding must remain stable during editing
- auto-resize must clamp to `minRows` and `maxRows`
- fixed-size viewports must not clip the caret row
- scrollbars must reflect real viewport state
- wrapped lines must not render outside the inner bounds
- placeholder text must not overlap with an active selection or caret
- disabled and invalid styling must apply to the full control, not only content

## Milestones

### T0: Validation Baseline

#### Goal

Lock the behavior contract before rewriting the internals.

#### Deterministic Deliverables

- this spec is updated and treated as active
- textarea-specific test matrix exists in `packages/test-utils/tests/`
- at least one explicit textarea snapshot file exists for:
  - empty
  - wrapped
  - unwrapped
  - fixed-height with overflow
  - auto-resize

#### Passing Gate

- at least 30 focused textarea tests exist before deep internal changes
- current failures are documented as known gaps, not silently ignored

### T1: Engine Split

#### Goal

Extract a real multiline editor engine from the renderable.

#### Deterministic Deliverables

- editor buffer model exists as its own unit
- viewport model exists as its own unit
- `TextareaRenderable` becomes orchestration rather than storage plus behavior

#### Passing Gate

- core editing behavior can be tested without rendering
- no direct multiline movement math remains buried in paint-only code

### T2: Multiline Movement

#### Goal

Make cursor movement line-aware and trustworthy.

#### Deterministic Deliverables

- `ArrowUp` / `ArrowDown`
- preferred column memory
- line start/end movement
- document start/end movement
- page movement

#### Passing Gate

- cursor movement passes in wrapped and unwrapped modes
- vertical movement does not drift unpredictably

### T3: Selection Rewrite

#### Goal

Make selection behave like a serious editor control.

#### Deterministic Deliverables

- multiline selection rendering
- shift-extended movement
- select all
- selection replace on insert/delete/paste

#### Passing Gate

- multi-line selections remain correct after edits
- selection anchor/focus survives viewport changes

### T4: History And Transactions

#### Goal

Add real undo / redo and coherent transaction grouping.

#### Deterministic Deliverables

- undo
- redo
- grouped typing edits
- grouped paste edits

#### Passing Gate

- undo/redo restores text, cursor, selection, and viewport coherently

### T5: Viewport And Scroll

#### Goal

Make fixed textareas usable for long content.

#### Deterministic Deliverables

- vertical scroll
- horizontal scroll
- `scrollToCursor`
- scrollbar metrics
- wrap-aware viewport layout

#### Passing Gate

- long documents and long lines are both usable in fixed-height textareas
- cursor visibility is preserved under movement and edits

### T6: Rendering And Feedback

#### Goal

Raise visual clarity to product quality.

#### Deterministic Deliverables

- visible selection highlight
- improved cursor rendering
- stable placeholder behavior
- clear invalid / disabled / readonly states

#### Passing Gate

- snapshots show readable focus, selection, and state transitions

### T7: Mouse And Kitty Integration

#### Goal

Make the textarea feel correct in real kitty usage.

#### Deterministic Deliverables

- click-to-place cursor
- drag selection
- wheel scroll
- bracketed paste verification
- kitty keyboard modifier verification

#### Passing Gate

- live kitty validation notes are archived
- mouse editing works in a real terminal session, not only in synthetic tests

### T8: Component API Finish

#### Goal

Expose the finished behavior through `TextareaControlRenderable`.

#### Deterministic Deliverables

- public options for wrap, submit, resize, and scroll behavior
- examples updated to use the new surface
- field composition docs updated

#### Passing Gate

- common app usage no longer requires app-local textarea hacks

### T9: Stretch Features

#### Goal

Add practical enhancements without turning the control into a full editor.

#### Candidate Deliverables

- tab indentation policy
- shift-tab outdent policy
- optional line numbers
- monospace mode
- max-lines or max-bytes constraints

#### Passing Gate

- stretch features do not regress the core editing guarantees from T0-T8

## Validation Matrix

The following matrix must be used when implementation starts landing.

### Engine Tests

- text set/get
- grapheme-safe insertion
- newline insertion
- replace-selection insert
- backspace
- delete-forward
- undo
- redo
- select-all

### Movement Tests

- left/right across graphemes
- up/down across uneven line lengths
- preferred column retention
- wrapped-row movement
- `Home` / `End`
- document start/end
- page navigation

### Selection Tests

- shift-left/right
- shift-up/down
- multiline selection
- replace selected text
- delete selected text

### Viewport Tests

- fixed-height vertical scroll
- unwrapped horizontal scroll
- wrapped visibility
- `scrollToCursor`
- scrollbar visibility and position

### State Tests

- disabled blocks mutation
- readonly blocks mutation but allows navigation
- invalid styling snapshots
- placeholder snapshots
- paste summary snapshots
- focus / blur snapshots

### Integration Tests

- textarea inside `FieldRenderable`
- textarea inside `DialogRenderable`
- textarea inside `SheetRenderable`
- textarea inside `WindowRenderable`
- textarea inside fixed-height `PanelRenderable`

### Manual Kitty Validation

- paste large multiline content
- paste a large payload with summary mode enabled, then verify that movement or
  selection reveals the real content without data loss
- drag mouse selection
- wheel scroll through long content
- verify wrap and cursor stay aligned after resize
- verify submit shortcut does not fire on plain `Enter`

## Required Examples

The rewrite is not done until all of these exist:

- fixed-height wrapped textarea
- fixed-height unwrapped textarea with horizontal scroll
- auto-resize notes textarea
- readonly textarea
- invalid textarea
- textarea with summarized large-paste preview
- textarea inside dialog
- textarea inside window with scrollbars visible

## Required Playground Coverage

The main playground must show at least:

- a basic editing textarea
- a fixed-height textarea with overflow
- an auto-resize textarea
- a readonly or invalid variant

The playground should validate real interaction, not just static rendering.

## Exit Gate

The textarea rewrite is considered complete only when all of the following are
true:

- this spec has no unchecked major gaps against the implementation
- the T0-T8 milestones are either complete or explicitly waived
- the examples exist and are usable
- the playground demonstrates real editing behavior
- the test matrix is in place and passing
- live kitty behavior has been manually checked and archived

Until then, the textarea should be treated as under active reconstruction rather
than feature-complete.

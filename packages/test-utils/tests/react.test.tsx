import { expect, test } from "bun:test";
import type {
  CalendarRenderable,
  CheckboxRenderable,
  CommandRenderable,
  DatePickerRenderable,
  DialogRenderable,
  InputFieldRenderable,
  PaginationRenderable,
  RadioGroupRenderable,
  SelectFieldRenderable,
  SliderRenderable,
  TabsRenderable,
  ToggleGroupRenderable,
  WindowManagerRenderable,
  WindowRenderable,
} from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";
import {
  Badge,
  Button,
  Calendar,
  Checkbox,
  Command,
  createReactRoot,
  DatePicker,
  Dialog,
  InputField,
  Pagination,
  Panel,
  RadioGroup,
  SelectField,
  Slider,
  Table,
  Tabs,
  TextareaField,
  ToggleGroup,
  Toolbar,
  useKeyboard,
  useRenderer,
  useTerminalDimensions,
  Window,
  WindowManager,
} from "@neotui/react";
import { useState } from "react";

test("react root can mount and unmount without leaking renderables", () => {
  const renderer = createKittyRenderer({ width: 40, height: 12, exitOnCtrlC: false });
  const root = createReactRoot(renderer);

  root.render(
    <box layout={{ padding: 1, width: 24, height: 5 }} style={{ border: true, title: "react" }}>
      <nb-text content="hello react" />
    </box>,
  );

  expect(renderer.renderToString()).toContain("hello react");

  root.unmount();
  renderer.renderFrame();

  expect(renderer.root.countNodes()).toBe(1);
});

test("react hooks can observe keyboard and terminal dimensions", async () => {
  const renderer = createKittyRenderer({ width: 40, height: 12, exitOnCtrlC: false });
  const root = createReactRoot(renderer);
  const seenKeys: string[] = [];

  function Demo() {
    const terminal = useTerminalDimensions();
    const [count] = useState(0);
    useKeyboard((event) => {
      seenKeys.push(event.key);
    });
    const runtime = useRenderer().runtime;

    return (
      <box layout={{ padding: 1, width: 28, height: 5 }} style={{ border: true, title: runtime }}>
        <nb-text content={`size:${terminal.width}x${terminal.height} count:${count}`} />
      </box>
    );
  }

  root.render(<Demo />);
  renderer.renderFrame();
  const initial = renderer.renderToString();

  renderer.dispatchInput("a");
  await Bun.sleep(5);

  const next = renderer.renderToString();

  expect(initial).toContain("size:40x12");
  expect(next).toContain("size:40x12");
  expect(seenKeys).toEqual(["a"]);
});

test("react wrappers render primitives, navigation, and field controls with controlled values", () => {
  const renderer = createKittyRenderer({ width: 72, height: 24, exitOnCtrlC: false });
  const root = createReactRoot(renderer);
  let tabsRef: TabsRenderable | null = null;
  let inputFieldRef: InputFieldRenderable | null = null;
  let selectFieldRef: SelectFieldRenderable | null = null;

  root.render(
    <Panel title="settings" tone="accent" layout={{ width: 60, height: 18, padding: 1, gap: 1 }}>
      <Toolbar>
        <Badge label="beta" tone="info" />
        <Button label="save" variant="primary" />
      </Toolbar>
      <Tabs
        ref={(node) => {
          tabsRef = node;
        }}
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "security", label: "Security" },
        ]}
        activeTabId="profile"
      />
      <InputField
        ref={(node) => {
          inputFieldRef = node;
        }}
        label="username"
        value="neo"
        width="fill"
        placeholder="user"
        fieldLayout={{ width: "100%" }}
      />
      <TextareaField
        label="notes"
        value={"bun-first\nkitty-first"}
        fieldLayout={{ width: "100%" }}
        layout={{ width: "100%", height: 6 }}
      />
      <SelectField
        ref={(node) => {
          selectFieldRef = node;
        }}
        label="role"
        value="operator"
        options={[
          { value: "operator", label: "operator" },
          { value: "admin", label: "admin" },
        ]}
        fieldLayout={{ width: "100%" }}
      />
    </Panel>,
  );

  const first = renderer.renderToString();
  const tabs = requireNode<TabsRenderable | null>(tabsRef);
  const inputField = requireNode<InputFieldRenderable | null>(inputFieldRef);
  const selectField = requireNode<SelectFieldRenderable | null>(selectFieldRef);

  expect(first).toContain("settings");
  expect(first).toContain("beta");
  expect(first).toContain("username");
  expect(first).toContain("neo");
  expect(tabs.getActiveTabId()).toBe("profile");
  expect(inputField.input.getValue()).toBe("neo");
  expect(selectField.select.getValue()).toBe("operator");

  root.render(
    <Panel title="settings" tone="accent" layout={{ width: 60, height: 18, padding: 1, gap: 1 }}>
      <Toolbar>
        <Badge label="stable" tone="success" />
        <Button label="save" variant="primary" />
      </Toolbar>
      <Tabs
        ref={(node) => {
          tabsRef = node;
        }}
        tabs={[
          { id: "profile", label: "Profile" },
          { id: "security", label: "Security" },
        ]}
        activeTabId="security"
      />
      <InputField
        ref={(node) => {
          inputFieldRef = node;
        }}
        label="username"
        value="kitty"
        width="fill"
        placeholder="user"
        fieldLayout={{ width: "100%" }}
      />
      <TextareaField
        label="notes"
        value={"wrapped editor\nupdated"}
        fieldLayout={{ width: "100%" }}
        layout={{ width: "100%", height: 6 }}
      />
      <SelectField
        ref={(node) => {
          selectFieldRef = node;
        }}
        label="role"
        value="admin"
        options={[
          { value: "operator", label: "operator" },
          { value: "admin", label: "admin" },
        ]}
        fieldLayout={{ width: "100%" }}
      />
    </Panel>,
  );

  expect(tabs.getActiveTabId()).toBe("security");
  expect(inputField.input.getValue()).toBe("kitty");
  expect(selectField.select.getValue()).toBe("admin");
});

test("react wrappers compose overlay bodies, footers, and managed windows", () => {
  const renderer = createKittyRenderer({ width: 90, height: 28, exitOnCtrlC: false });
  const root = createReactRoot(renderer);
  let windowRef: WindowRenderable | null = null;
  let managerRef: WindowManagerRenderable | null = null;
  let dialogRef: DialogRenderable | null = null;

  root.render(
    <>
      <Dialog
        ref={(node) => {
          dialogRef = node;
        }}
        open
        title="confirm release"
        footer={<Button label="close" variant="ghost" />}
      >
        <Button label="launch" variant="primary" />
      </Dialog>
      <WindowManager
        ref={(node) => {
          managerRef = node;
        }}
        layout={{ width: "100%", height: "100%" }}
      >
        <Window
          ref={(node) => {
            windowRef = node;
          }}
          title="workspace"
          subtitle="editor"
          active
          x={2}
          y={3}
          width={32}
          height={12}
          footer={<Button label="save" variant="primary" />}
        >
          <Panel title="body">
            <Button label="inspect" />
          </Panel>
        </Window>
        <Window title="palette" windowRole="utility" x={12} y={6} width={28} height={9}>
          <Button label="search" />
        </Window>
      </WindowManager>
    </>,
  );

  const frame = renderer.renderToString();
  const dialog = requireNode<DialogRenderable | null>(dialogRef);
  const windowNode = requireNode<WindowRenderable | null>(windowRef);
  const manager = requireNode<WindowManagerRenderable | null>(managerRef);

  expect(frame).toContain("launch");
  expect(frame).toContain("workspace | editor");
  expect(frame).toContain("palette");
  expect(frame).toContain("search");
  expect(dialog.isOpen()).toBe(true);
  expect(dialog.title).toBe("confirm release");
  expect(windowNode.footer.children.length).toBe(1);
  expect(manager.children.length).toBeGreaterThan(0);
});

test("react wrappers cover choice, data, and temporal surfaces", () => {
  const renderer = createKittyRenderer({ width: 96, height: 32, exitOnCtrlC: false });
  const root = createReactRoot(renderer);
  let checkboxRef: CheckboxRenderable | null = null;
  let radioGroupRef: RadioGroupRenderable | null = null;
  let toggleGroupRef: ToggleGroupRenderable | null = null;
  let sliderRef: SliderRenderable | null = null;
  let paginationRef: PaginationRenderable | null = null;
  let calendarRef: CalendarRenderable | null = null;
  let datePickerRef: DatePickerRenderable | null = null;

  root.render(
    <Panel title="data shell" layout={{ width: 88, height: 28, padding: 1, gap: 1 }}>
      <Toolbar>
        <Checkbox
          ref={(node) => {
            checkboxRef = node;
          }}
          label="audit"
          checked
        />
        <RadioGroup
          ref={(node) => {
            radioGroupRef = node;
          }}
          orientation="horizontal"
          options={[
            { value: "day", label: "day" },
            { value: "week", label: "week" },
          ]}
          value="week"
        />
        <ToggleGroup
          ref={(node) => {
            toggleGroupRef = node;
          }}
          items={[
            { id: "pinned", label: "pinned" },
            { id: "recent", label: "recent" },
          ]}
          value="recent"
        />
        <Slider
          ref={(node) => {
            sliderRef = node;
          }}
          min={0}
          max={10}
          value={7}
          layout={{ width: 20 }}
        />
      </Toolbar>
      <Pagination
        ref={(node) => {
          paginationRef = node;
        }}
        page={3}
        pageCount={8}
      />
      <Table
        columns={[
          { id: "task", header: "Task" },
          { id: "state", header: "State" },
        ]}
        rows={[
          { id: "t1", cells: { task: "Ship rc.1", state: "ready" } },
          { id: "t2", cells: { task: "Validate kitty", state: "pending" } },
        ]}
        activeRowId="t2"
      />
      <Toolbar>
        <Calendar
          ref={(node) => {
            calendarRef = node;
          }}
          value="2026-03-08"
          visibleMonth="2026-03-01"
        />
        <DatePicker
          ref={(node) => {
            datePickerRef = node;
          }}
          value="2026-03-09"
          open
          presentation="dialog"
        />
      </Toolbar>
    </Panel>,
  );

  expect(renderer.renderToString()).toContain("Ship rc.1");
  expect(requireNode<CheckboxRenderable | null>(checkboxRef).isChecked()).toBe(true);
  expect(requireNode<RadioGroupRenderable | null>(radioGroupRef).getValue()).toBe("week");
  expect(requireNode<ToggleGroupRenderable | null>(toggleGroupRef).getValue()).toBe("recent");
  expect(requireNode<SliderRenderable | null>(sliderRef).getValue()).toBe(7);
  expect(requireNode<PaginationRenderable | null>(paginationRef).getPage()).toBe(3);
  expect(requireNode<CalendarRenderable | null>(calendarRef).getValue()).toBe("2026-03-08");
  expect(requireNode<DatePickerRenderable | null>(datePickerRef).getValue()).toBe("2026-03-09");
  expect(requireNode<DatePickerRenderable | null>(datePickerRef).isOpen()).toBe(true);
});

test("react command wrapper supports controlled query and preview state", () => {
  const renderer = createKittyRenderer({ width: 70, height: 18, exitOnCtrlC: false });
  const root = createReactRoot(renderer);
  let commandRef: CommandRenderable | null = null;

  root.render(
    <Command
      ref={(node) => {
        commandRef = node;
      }}
      variant="inline"
      items={[
        { id: "deploy", title: "Deploy", shortcut: "D", pinned: true },
        { id: "validate", title: "Validate", shortcut: "V" },
      ]}
      recentIds={["validate"]}
      previewTitle="Preview"
      renderPreview={(item) => (item ? `shortcut:${item.shortcut?.toLowerCase()}` : null)}
      query="dep"
      layout={{ width: 48, height: 12 }}
    />,
  );

  const frame = renderer.renderToString();

  expect(frame).toContain("Preview");
  expect(frame).toContain("Deploy");
  expect(requireNode<CommandRenderable | null>(commandRef).queryInput.getValue()).toBe("dep");
  expect(requireNode<CommandRenderable | null>(commandRef).previewText.content).toContain(
    "shortcut:d",
  );
});

function requireNode<T>(value: T): NonNullable<T> {
  if (value === null) {
    throw new Error("Expected React wrapper ref to be assigned.");
  }

  return value as NonNullable<T>;
}

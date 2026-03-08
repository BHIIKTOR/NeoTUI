import { expect, test } from "bun:test";
import {
  DataTableRenderable,
  PaginationRenderable,
  TableRenderable,
  type TableRow,
} from "@neotui/components";
import { createSyntheticEvent } from "@neotui/core";
import { createTestRenderer } from "../src/index.ts";

const defaultModifiers = {
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
} as const;

test("pagination clamps previous next and jump input updates deterministically", () => {
  const renderer = createTestRenderer(80, 8);
  const pagination = new PaginationRenderable({
    page: 3,
    pageCount: 9,
    showJumpInput: true,
  });

  renderer.add(pagination);
  renderer.renderToString();

  renderer.focus(pagination.previousButton);
  renderer.dispatchInput("\r");
  expect(pagination.getPage()).toBe(2);

  renderer.focus(pagination.nextButton);
  renderer.dispatchInput("\r");
  expect(pagination.getPage()).toBe(3);

  pagination.jumpInput?.setValue("8");
  if (pagination.jumpInput) {
    renderer.focus(pagination.jumpInput);
  }
  renderer.dispatchInput("\r");
  expect(pagination.getPage()).toBe(8);
});

test("table emits header and row selection events from mouse targets", () => {
  const renderer = createTestRenderer(60, 10);
  const table = new TableRenderable({
    columns: [
      { id: "name", header: "Name", width: 18 },
      { id: "status", header: "Status", width: 12 },
    ],
    rows: [
      { id: "alpha", cells: { name: "Alpha", status: "Ready" } },
      { id: "beta", cells: { name: "Beta", status: "Draft" } },
    ],
  });

  let selectedHeader = "";
  let selectedRow = "";
  table.on("headerSelect", (event) => {
    selectedHeader = (event as { value: { columnId: string } }).value.columnId;
  });
  table.on("rowSelect", (event) => {
    selectedRow = (event as { value: { rowId: string } }).value.rowId;
  });

  renderer.add(table);
  renderer.renderToString();

  renderer.dispatchEvent(
    table,
    createSyntheticEvent({
      type: "mouse",
      action: "down",
      button: "left",
      x: table.layoutState.innerBounds.x + 1,
      y: table.layoutState.innerBounds.y,
      wheelDelta: 0,
      modifiers: defaultModifiers,
    }),
  );
  renderer.dispatchEvent(
    table,
    createSyntheticEvent({
      type: "mouse",
      action: "down",
      button: "left",
      x: table.layoutState.innerBounds.x + 1,
      y: table.layoutState.innerBounds.y + 1,
      wheelDelta: 0,
      modifiers: defaultModifiers,
    }),
  );

  expect(selectedHeader).toBe("name");
  expect(selectedRow).toBe("alpha");
  expect(renderer.renderToString()).toContain("Status");
});

test("data table composes sort selection and pagination without app-level glue", () => {
  const renderer = createTestRenderer(80, 16);
  const rows: TableRow[] = [
    { id: "r1", cells: { name: "Delta", status: "Draft" } },
    { id: "r2", cells: { name: "Alpha", status: "Review" } },
    { id: "r3", cells: { name: "Echo", status: "Ready" } },
    { id: "r4", cells: { name: "Bravo", status: "Draft" } },
    { id: "r5", cells: { name: "Foxtrot", status: "Ready" } },
  ];
  const table = new DataTableRenderable({
    columns: [
      { id: "name", header: "Name", sortable: true, width: "fill" },
      { id: "status", header: "Status", sortable: true, width: 12 },
    ],
    rows,
    pageSize: 2,
  });

  renderer.add(table);
  renderer.renderToString();
  renderer.focus(table);
  renderer.dispatchInput(" ");
  expect(table.getSelectedRowIds()).toEqual(["r1"]);

  renderer.dispatchEvent(
    table.table,
    createSyntheticEvent({
      type: "mouse",
      action: "down",
      button: "left",
      x: table.table.layoutState.innerBounds.x + 7,
      y: table.table.layoutState.innerBounds.y + 1,
      wheelDelta: 0,
      modifiers: defaultModifiers,
    }),
  );
  expect(table.getSelectedRowIds()).toEqual(["r1"]);

  renderer.dispatchEvent(
    table.table,
    createSyntheticEvent({
      type: "mouse",
      action: "down",
      button: "left",
      x: table.table.layoutState.innerBounds.x + 7,
      y: table.table.layoutState.innerBounds.y,
      wheelDelta: 0,
      modifiers: defaultModifiers,
    }),
  );
  expect(table.sortBy).toBe("name");
  expect(table.sortDirection).toBe("asc");
  expect(String(table.table.rows[0]?.cells.name ?? "")).toBe("Alpha");

  renderer.focus(table.pagination.nextButton);
  renderer.dispatchInput("\r");
  expect(table.page).toBe(2);
  expect(table.summary.content).toContain("Showing 3-4 of 5");
});

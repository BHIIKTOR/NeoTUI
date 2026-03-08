import {
  DataTableRenderable,
  PanelRenderable,
  TableRenderable,
  type TableRow,
} from "@neotui/components";
import { createKittyRenderer } from "@neotui/core";

const rows: TableRow[] = [
  { id: "rel-01", cells: { service: "api", status: "Ready", owner: "Platform", latency: "24ms" } },
  { id: "rel-02", cells: { service: "web", status: "Review", owner: "Frontend", latency: "31ms" } },
  { id: "rel-03", cells: { service: "worker", status: "Draft", owner: "Infra", latency: "52ms" } },
  { id: "rel-04", cells: { service: "docs", status: "Ready", owner: "Docs", latency: "14ms" } },
  {
    id: "rel-05",
    cells: { service: "search", status: "Ready", owner: "Platform", latency: "44ms" },
  },
  { id: "rel-06", cells: { service: "billing", status: "Review", owner: "Core", latency: "29ms" } },
];

function createDataRenderer() {
  const renderer = createKittyRenderer({
    appName: "components-data",
    width: process.stdout.columns ?? 100,
    height: process.stdout.rows ?? 32,
  });

  renderer.root.updateLayout({
    flexDirection: "column",
    gap: 1,
    padding: 1,
  });
  renderer.root.updateStyle({
    bg: "#14110f",
    fg: "#f2e7d5",
  });

  const hero = new PanelRenderable({
    title: "components:data",
    content:
      "Presentational tables, interactive data tables, sort state, row selection, and pagination now live in @neotui/components.",
    tone: "accent",
    layout: { height: 5 },
  });

  const tablePanel = new PanelRenderable({
    title: "table",
    tone: "info",
    contentMode: "grow",
    layout: {
      flexDirection: "column",
      gap: 1,
    },
  });
  const table = new TableRenderable({
    columns: [
      { id: "service", header: "Service", width: 14 },
      { id: "status", header: "Status", width: 10 },
      { id: "owner", header: "Owner", width: 12 },
      { id: "latency", header: "Latency", align: "right", width: 8 },
    ],
    rows: rows.slice(0, 4),
  });
  table.setActiveRowId("rel-02");
  tablePanel.add(table);

  const dataPanel = new PanelRenderable({
    title: "data-table",
    tone: "accent",
    contentMode: "fit",
    layout: {
      flexDirection: "column",
      gap: 0,
      flexGrow: 1,
    },
  });
  const dataTable = new DataTableRenderable({
    columns: [
      { id: "service", header: "Service", sortable: true, width: "fill" },
      { id: "status", header: "Status", sortable: true, width: 10 },
      { id: "owner", header: "Owner", sortable: true, width: 12 },
      { id: "latency", header: "Latency", sortable: true, align: "right", width: 8 },
    ],
    rows,
    pageSize: 3,
    layout: { flexGrow: 1 },
  });
  dataTable.setSort("service", "asc");
  dataTable.toggleRowSelection("rel-02");
  dataTable.toggleRowSelection("rel-05");
  dataPanel.add(dataTable);

  renderer.add(hero, tablePanel, dataPanel);
  return { renderer, dataTable };
}

function buildSnapshot(): string {
  const { renderer } = createDataRenderer();
  renderer.renderFrame();
  return renderer.renderToString();
}

async function runLive(): Promise<void> {
  const { renderer, dataTable } = createDataRenderer();
  try {
    renderer.start();
    renderer.focus(dataTable);
    renderer.renderFrame();
    while (renderer.session.isActive() && !renderer.session.isDestroyed()) {
      await Bun.sleep(50);
    }
  } finally {
    await renderer.destroy();
  }
}

if (import.meta.main) {
  if (process.argv.includes("--print") || !isKittyInteractiveRuntime()) {
    process.stdout.write(`${buildSnapshot()}\n`);
  } else {
    await runLive();
  }
}

function isKittyInteractiveRuntime(
  env: Record<string, string | undefined> = process.env,
  stdoutIsTTY = process.stdout.isTTY,
): boolean {
  return stdoutIsTTY === true && (env.TERM === "xterm-kitty" || Boolean(env.KITTY_WINDOW_ID));
}

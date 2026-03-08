export type FixtureNodeKind = "box" | "text" | "scrollbox" | "scrollbar" | "framebuffer";

export interface FixtureNode {
  kind: FixtureNodeKind;
  props?: Record<string, unknown>;
  children?: FixtureNode[];
}

export interface LayoutFixture {
  id: string;
  width: number;
  height: number;
  tree: FixtureNode;
}

export const layoutFixtures: LayoutFixture[] = [
  fixture("single-box", baseBox({ content: "one" })),
  fixture(
    "nested-column",
    baseBox({}, [baseBox({ content: "top" }), baseBox({ content: "bottom" })]),
  ),
  fixture(
    "nested-row",
    baseBox({ layout: { flexDirection: "row", gap: 1 } }, [
      baseBox({ content: "a", layout: { width: 6 } }),
      baseBox({ content: "b", layout: { width: 6 } }),
    ]),
  ),
  fixture(
    "gap-column",
    baseBox({ layout: { gap: 1 } }, [
      baseBox({ content: "a" }),
      baseBox({ content: "b" }),
      baseBox({ content: "c" }),
    ]),
  ),
  fixture("padding", baseBox({ content: "pad", layout: { padding: 1 } })),
  fixture(
    "margin-row",
    baseBox({ layout: { flexDirection: "row" } }, [
      baseBox({ content: "l", layout: { width: 4, margin: { right: 1 } } }),
      baseBox({ content: "r", layout: { width: 4, margin: { left: 1 } } }),
    ]),
  ),
  fixture(
    "percent-width",
    baseBox({ layout: { flexDirection: "row" } }, [
      baseBox({ content: "half", layout: { width: "50%" } }),
      baseBox({ content: "rest", layout: { flexGrow: 1 } }),
    ]),
  ),
  fixture(
    "percent-height",
    baseBox({}, [
      baseBox({ content: "top", layout: { height: "50%" } }),
      baseBox({ content: "bottom", layout: { flexGrow: 1 } }),
    ]),
  ),
  fixture(
    "absolute-overlay",
    baseBox({ content: "base" }, [
      baseBox({
        content: "ov",
        layout: { position: "absolute", top: 1, left: 8, width: 6, height: 3 },
      }),
    ]),
  ),
  fixture(
    "min-width",
    baseBox({ layout: { flexDirection: "row" } }, [
      baseBox({ content: "min", layout: { width: 2, minWidth: 8 } }),
      baseBox({ content: "fill", layout: { flexGrow: 1 } }),
    ]),
  ),
  fixture(
    "max-width",
    baseBox({ layout: { flexDirection: "row" } }, [
      baseBox({ content: "clamp", layout: { width: 20, maxWidth: 8 } }),
      baseBox({ content: "fill", layout: { flexGrow: 1 } }),
    ]),
  ),
  fixture(
    "align-center-row",
    baseBox({ layout: { flexDirection: "row", alignItems: "center" } }, [
      baseBox({ content: "center", layout: { width: 8, height: 3 } }),
    ]),
  ),
  fixture(
    "align-end-column",
    baseBox({ layout: { alignItems: "end" } }, [
      baseBox({ content: "end", layout: { width: 8, height: 3 } }),
    ]),
  ),
  fixture(
    "justify-between",
    baseBox({ layout: { flexDirection: "row", justifyContent: "between" } }, [
      baseBox({ content: "a", layout: { width: 4 } }),
      baseBox({ content: "b", layout: { width: 4 } }),
      baseBox({ content: "c", layout: { width: 4 } }),
    ]),
  ),
  fixture("scrollbox-content", {
    id: "scrollbox-content",
    width: 40,
    height: 12,
    tree: {
      kind: "scrollbox",
      props: { layout: { padding: 1 }, style: { border: true, title: "scroll" }, scrollY: 1 },
      children: [{ kind: "text", props: { content: "line1\nline2\nline3\nline4\nline5" } }],
    },
  }),
  fixture(
    "scrollbar-ratio",
    baseBox({ layout: { flexDirection: "row" } }, [
      baseBox({ content: "body", layout: { flexGrow: 1 } }),
      { kind: "scrollbar", props: { layout: { width: 1 }, ratio: 0.5 } },
    ]),
  ),
  fixture(
    "z-index-overlay",
    baseBox({}, [
      baseBox({ content: "back", layout: { width: 16, height: 5 } }),
      baseBox({
        content: "front",
        layout: { position: "absolute", top: 2, left: 6, width: 10, height: 3, zIndex: 2 },
      }),
    ]),
  ),
  fixture("frame-buffer", {
    id: "frame-buffer",
    width: 40,
    height: 12,
    tree: {
      kind: "framebuffer",
      props: {
        lines: ["abcd", "efgh", "ijkl"],
        layout: { width: 8, height: 4 },
      },
    },
  }),
  fixture(
    "mixed-row-column",
    baseBox({ layout: { flexDirection: "row", gap: 1 } }, [
      baseBox({ content: "left", layout: { width: "30%" } }),
      baseBox({ layout: { flexGrow: 1, gap: 1 } }, [
        baseBox({ content: "top" }),
        baseBox({ content: "bottom" }),
      ]),
    ]),
  ),
  fixture(
    "two-columns-percent",
    baseBox({ layout: { flexDirection: "row", gap: 1 } }, [
      baseBox({ content: "33", layout: { width: "33%" } }),
      baseBox({ content: "67", layout: { width: "67%" } }),
    ]),
  ),
  fixture(
    "grow-split",
    baseBox({ layout: { flexDirection: "row", gap: 1 } }, [
      baseBox({ content: "1", layout: { flexGrow: 1 } }),
      baseBox({ content: "2", layout: { flexGrow: 2 } }),
    ]),
  ),
  fixture(
    "clip-hidden",
    baseBox({ layout: { height: 6, overflow: "hidden" }, style: { border: true } }, [
      { kind: "text", props: { content: "row1\nrow2\nrow3\nrow4\nrow5\nrow6\nrow7" } },
    ]),
  ),
  fixture("title-border", baseBox({ content: "title", style: { border: true, title: "head" } })),
  fixture(
    "auto-text-measure",
    baseBox({}, [{ kind: "text", props: { content: "auto sized text line" } }]),
  ),
  fixture(
    "nested-padding-overlay",
    baseBox({ layout: { padding: 1 }, style: { border: true, title: "pad" } }, [
      baseBox({ content: "inner", layout: { padding: 1 } }),
      baseBox({
        content: "tag",
        layout: { position: "absolute", top: 0, left: 12, width: 7, height: 3, zIndex: 3 },
      }),
    ]),
  ),
];

function fixture(id: string, tree: FixtureNode | LayoutFixture): LayoutFixture {
  if ("tree" in tree) {
    return tree;
  }

  return {
    id,
    width: 40,
    height: 12,
    tree,
  };
}

function baseBox(props: Record<string, unknown>, children: FixtureNode[] = []): FixtureNode {
  return {
    kind: "box",
    props: {
      layout: { padding: 0, ...((props.layout as Record<string, unknown> | undefined) ?? {}) },
      style: { border: true, ...((props.style as Record<string, unknown> | undefined) ?? {}) },
      ...props,
    },
    children,
  };
}

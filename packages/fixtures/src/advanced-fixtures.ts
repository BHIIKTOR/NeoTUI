export const markdownFixture = `# Heading
- item
Visit [OpenTUI](https://opentui.com/docs/getting-started/)`;

export const codeFixture = `const renderer = createKittyRenderer();
renderer.renderFrame();`;

export const diffBeforeFixture = `createKittyRenderer()
renderer.add(surface)`;

export const diffAfterFixture = `createKittyRenderer()
renderer.renderFrame()`;

export const largeTextFixture = Array.from(
  { length: 200 },
  (_, index) => `line ${index} alpha beta gamma delta`,
).join("\n");

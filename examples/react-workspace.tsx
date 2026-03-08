import { createKittyRenderer } from "@neotui/core";
import {
  Button,
  Command,
  createReactRoot,
  Dialog,
  Panel,
  Window,
  WindowManager,
} from "@neotui/react";

const renderer = createKittyRenderer({ appName: "react-workspace", width: 80, height: 24 });
const root = createReactRoot(renderer);

root.render(
  <>
    <WindowManager layout={{ width: "100%", height: "100%" }}>
      <Window
        title="notes"
        subtitle="document"
        active
        x={2}
        y={2}
        width={34}
        height={12}
        footer={<Button label="save" variant="primary" />}
      >
        <Panel title="release notes" layout={{ width: "100%", height: "100%" }}>
          <Button label="inspect" />
        </Panel>
      </Window>
      <Window title="palette" windowRole="utility" x={42} y={4} width={28} height={12}>
        <Command
          variant="inline"
          layout={{ width: "100%", height: "100%" }}
          items={[
            { id: "deploy", title: "Deploy", shortcut: "D", pinned: true },
            { id: "validate", title: "Validate", shortcut: "V" },
          ]}
          previewTitle="Preview"
          renderPreview={(item) => (item ? `shortcut:${item.shortcut?.toLowerCase()}` : null)}
        />
      </Window>
    </WindowManager>
    <Dialog open title="confirm release" footer={<Button label="close" variant="ghost" />}>
      <Button label="launch" variant="primary" />
    </Dialog>
  </>,
);

console.log(renderer.renderToString());

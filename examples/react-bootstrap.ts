import { createReactBindingBootstrap } from "@neotui/react";

const bootstrap = createReactBindingBootstrap();

process.stdout.write(
  `${[
    `framework: ${bootstrap.framework}`,
    `dependsOn: ${bootstrap.dependsOn}`,
    `renderer milestone: ${bootstrap.rendererMilestone}`,
  ].join("\n")}\n`,
);

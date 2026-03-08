import {
  buildPlaygroundMessage,
  isKittyInteractiveRuntime,
  runPlaygroundSession,
} from "../apps/playground/src/index.ts";

if (process.argv.includes("--print")) {
  process.stdout.write(`${buildPlaygroundMessage()}\n`);
} else if (isKittyInteractiveRuntime()) {
  await runPlaygroundSession({ waitForExit: true });
} else {
  process.stdout.write(
    `${buildPlaygroundMessage()}\n\nRun this inside kitty for the live session, or use --print for the static snapshot.\n`,
  );
}

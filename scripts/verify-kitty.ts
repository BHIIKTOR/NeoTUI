import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const artifactsDir = fileURLToPath(new URL("../artifacts/transcripts/m14/", import.meta.url));
const screenshotPath = fileURLToPath(
  new URL("../artifacts/transcripts/m14/kitty-live-surface.png", import.meta.url),
);
const textPath = fileURLToPath(
  new URL("../artifacts/transcripts/m14/kitty-live-surface.txt", import.meta.url),
);
const reportPath = fileURLToPath(
  new URL("../artifacts/transcripts/m14/kitty-manual-validation.md", import.meta.url),
);
const originalWindowId = process.env.KITTY_WINDOW_ID;
const token = `NeoTui kitty validation ${new Date().toISOString()}`;
const windowTitle = "neotui-kitty-validation";
const holdMs = 6000;

if (!isKitty()) {
  process.stderr.write(
    "verify:kitty failed: TERM is not xterm-kitty and KITTY_WINDOW_ID is unset.\n",
  );
  process.exit(1);
}

mkdirSync(artifactsDir, { recursive: true });
rmSync(screenshotPath, { force: true });
rmSync(textPath, { force: true });

const windowId = launchValidationWindow();

try {
  await Bun.sleep(1400);
  focusWindow(windowId);
  await Bun.sleep(900);
  captureScreenshot();
  captureWindowText(windowId);
  await Bun.sleep(500);
  const clipboardValue = readClipboard();
  const textContent = readFileSync(textPath, "utf8");

  const checks = {
    kittyEnvironment: true,
    clipboardRoundTrip: clipboardValue.trim() === token,
    hyperlinkVisibleInCapturedText: textContent.includes("OpenTUI docs"),
    imageScreenshotCaptured: existsAndNonEmpty(screenshotPath),
  };

  writeFileSync(
    reportPath,
    [
      "# Kitty Manual Validation",
      "",
      `Date: \`${new Date().toISOString()}\``,
      "",
      "## Environment",
      "",
      `- \`TERM=${process.env.TERM ?? ""}\``,
      `- \`KITTY_WINDOW_ID=${originalWindowId ?? ""}\``,
      `- validation window id: \`${windowId}\``,
      "",
      "## Command",
      "",
      "```bash",
      "bun run verify:kitty",
      "```",
      "",
      "## Checks",
      "",
      `- kitty environment detected: ${formatPass(checks.kittyEnvironment)}`,
      `- clipboard round-trip via OSC 52 and \`xclip\`: ${formatPass(checks.clipboardRoundTrip)}`,
      `- hyperlink text visible in captured live surface text: ${formatPass(checks.hyperlinkVisibleInCapturedText)}`,
      `- screenshot captured from dedicated kitty OS window: ${formatPass(checks.imageScreenshotCaptured)}`,
      "",
      "## Artifacts",
      "",
      `- screenshot: \`${relativeArtifact(screenshotPath)}\``,
      `- captured text: \`${relativeArtifact(textPath)}\``,
      "",
      "## Notes",
      "",
      `- clipboard token written by the live surface: \`${token}\``,
      `- clipboard token read back from the system clipboard: \`${clipboardValue.trim()}\``,
      "- The screenshot is the release-quality evidence for hyperlink rendering and image placement.",
      "- Browser-launch click-through for the OSC 8 hyperlink still requires a human click in a desktop session and remains documented separately.",
      "",
    ].join("\n"),
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        windowId,
        screenshotPath,
        textPath,
        reportPath,
        token,
        clipboardValue: clipboardValue.trim(),
        checks,
      },
      null,
      2,
    )}\n`,
  );

  if (
    !checks.clipboardRoundTrip ||
    !checks.hyperlinkVisibleInCapturedText ||
    !checks.imageScreenshotCaptured
  ) {
    process.exitCode = 1;
  }
} finally {
  safeCloseWindow(windowId);
  if (originalWindowId) {
    safeExec(["kitty", "@", "focus-window", "--match", `id:${originalWindowId}`]);
  }
}

function isKitty(): boolean {
  return process.env.TERM === "xterm-kitty" || Boolean(process.env.KITTY_WINDOW_ID);
}

function launchValidationWindow(): string {
  const command = [
    "cd",
    shellQuote(repoRoot),
    "&&",
    `NEOTUI_KITTY_CLIPBOARD_TEXT=${shellQuote(token)}`,
    `/home/bhiktor/.bun/bin/bun`,
    "run",
    "scripts/kitty-manual-surface.ts",
    `--hold-ms=${holdMs}`,
  ].join(" ");
  const result = Bun.spawnSync([
    "kitty",
    "@",
    "launch",
    "--type",
    "os-window",
    "--keep-focus",
    "--title",
    windowTitle,
    "bash",
    "-lc",
    command,
  ]);

  if (result.exitCode !== 0) {
    throw new Error(`kitty @ launch failed: ${Buffer.from(result.stderr).toString("utf8")}`);
  }

  return Buffer.from(result.stdout).toString("utf8").trim();
}

function focusWindow(windowId: string): void {
  execOrThrow(["kitty", "@", "focus-window", "--match", `id:${windowId}`], "focus-window");
}

function captureScreenshot(): void {
  execOrThrow(["/home/bhiktor/.local/bin/scrot", "-u", screenshotPath], "scrot");
}

function captureWindowText(windowId: string): void {
  const result = Bun.spawnSync(["kitty", "@", "get-text", "--match", `id:${windowId}`, "--ansi"], {
    cwd: repoRoot,
  });
  if (result.exitCode !== 0) {
    throw new Error(`kitty @ get-text failed: ${Buffer.from(result.stderr).toString("utf8")}`);
  }

  writeFileSync(textPath, Buffer.from(result.stdout));
}

function readClipboard(): string {
  const result = Bun.spawnSync(
    ["/home/bhiktor/.local/bin/xclip", "-selection", "clipboard", "-o"],
    {
      cwd: repoRoot,
    },
  );
  if (result.exitCode !== 0) {
    throw new Error(`xclip failed: ${Buffer.from(result.stderr).toString("utf8")}`);
  }

  return Buffer.from(result.stdout).toString("utf8");
}

function safeCloseWindow(windowId: string): void {
  safeExec(["kitty", "@", "close-window", "--match", `id:${windowId}`]);
}

function safeExec(argv: string[]): void {
  try {
    Bun.spawnSync(argv, { cwd: repoRoot });
  } catch {
    // Best effort cleanup only.
  }
}

function execOrThrow(argv: string[], label: string): void {
  const result = Bun.spawnSync(argv, { cwd: repoRoot });
  if (result.exitCode !== 0) {
    throw new Error(`${label} failed: ${Buffer.from(result.stderr).toString("utf8")}`);
  }
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'"'"'`)}'`;
}

function existsAndNonEmpty(path: string): boolean {
  try {
    return readFileSync(path).length > 0;
  } catch {
    return false;
  }
}

function relativeArtifact(path: string): string {
  return `artifacts/transcripts/m14/${basename(path)}`;
}

function formatPass(value: boolean): string {
  return value ? "pass" : "fail";
}

#!/usr/bin/env node
/**
 * Delegates to the npm CLI shipped with the current Node installation.
 * Used as an override for @semantic-release/npm's dependency on the
 * registry `npm` package, whose tarball embeds vulnerable nested deps
 * that npm overrides cannot patch (inBundle: true).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const npmCli = join(dirname(process.execPath), "npm");

if (!existsSync(npmCli)) {
  console.error(
    `[npm-cli-stub] npm CLI not found next to node at ${npmCli}`,
  );
  process.exit(1);
}

const result = spawnSync(npmCli, process.argv.slice(2), {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(`[npm-cli-stub] failed to spawn ${npmCli}:`, result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);

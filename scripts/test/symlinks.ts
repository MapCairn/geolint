// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Whether this account may create a symbolic link. Linux and macOS always
 * allow it. Windows allows it only in developer mode or to an administrator,
 * so a test that needs a link skips itself there rather than fail for a reason
 * that is about the machine and not the code.
 */
function probe(): boolean {
  const folder = mkdtempSync(path.join(tmpdir(), "geolint-symlink-probe-"));
  try {
    writeFileSync(path.join(folder, "target"), "");
    symlinkSync(path.join(folder, "target"), path.join(folder, "link"));
    return true;
  } catch {
    return false;
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
}

export const canCreateSymlinks: boolean = probe();

// A CI runner has the privilege. If it ever loses it, fail instead of skipping
// the tests quietly, so the loss of coverage is noticed.
if (!canCreateSymlinks && process.env.CI !== undefined) {
  throw new Error(
    "CI cannot create symbolic links, so the tests that need one would be skipped",
  );
}

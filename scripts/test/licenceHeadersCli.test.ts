// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../licenceHeaders.mjs",
);
const AGPL =
  "// SPDX-License-Identifier: AGPL-3.0-only\n// Copyright MapCairn contributors\n";
const APACHE =
  "// SPDX-License-Identifier: Apache-2.0\n// Copyright MapCairn contributors\n";

describe("scripts/licenceHeaders.mjs, run as a command", () => {
  let root: string;

  function put(file: string, text: string): void {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, text);
  }

  function run(...args: string[]) {
    spawnSync("git", ["add", "-A"], { cwd: root });
    return spawnSync(process.execPath, [SCRIPT, ...args], {
      cwd: root,
      encoding: "utf8",
    });
  }

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "geolint-licence-"));
    spawnSync("git", ["init", "-q"], { cwd: root });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("passes when every source file has the Apache-2.0 header", () => {
    put("src/a.ts", `${APACHE}export {};\n`);
    put("scripts/b.mjs", `${APACHE}export {};\n`);
    put("README.md", "No header needed.\n");
    const result = run();
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("every source file has the right one");
  });

  it("fails and names a file with another licence or none", () => {
    put("src/a.ts", `${AGPL}export {};\n`);
    put("scripts/b.cjs", "module.exports = {};\n");
    const result = run();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src/a.ts");
    expect(result.stderr).toContain("scripts/b.cjs");
  });

  it("does not accept a header that names two licences", () => {
    put(
      "src/a.ts",
      "// SPDX-License-Identifier: Apache-2.0 OR AGPL-3.0-only\nexport {};\n",
    );
    expect(run().status).toBe(1);
  });

  it("adds the header with --write, and leaves a wrong one alone and fails", () => {
    put("src/new.ts", "export {};\n");
    put("src/wrong.ts", `${AGPL}export {};\n`);
    const result = run("--write");
    expect(result.status).toBe(1);
    expect(readFileSync(path.join(root, "src/new.ts"), "utf8")).toBe(
      `${APACHE}export {};\n`,
    );
    expect(readFileSync(path.join(root, "src/wrong.ts"), "utf8")).toBe(
      `${AGPL}export {};\n`,
    );
    expect(result.stderr).toContain("name a different licence");
  });

  it("does not add a second header with --write to a file that names an expression", () => {
    const dual =
      "// SPDX-License-Identifier: Apache-2.0 OR MIT\n// Copyright MapCairn contributors\nexport {};\n";
    put("src/dual.ts", dual);
    const result = run("--write");
    expect(readFileSync(path.join(root, "src/dual.ts"), "utf8")).toBe(dual);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("name a different licence");
  });

  it("succeeds with --write when only headers were missing", () => {
    put("src/new.ts", "export {};\n");
    expect(run("--write").status).toBe(0);
  });
});

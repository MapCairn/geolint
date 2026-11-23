// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

interface Manifest {
  type?: string;
  scripts: Record<string, string>;
  devDependencies: Record<string, string>;
  dependencies?: Record<string, string>;
}

const manifest = JSON.parse(
  readFileSync(path.join(REPO, "package.json"), "utf8"),
) as Manifest;

describe("the check of the packed package", () => {
  const script = manifest.scripts["pack:lint"] ?? "";

  it("builds, then runs publint strictly and attw under the ESM-only profile", () => {
    expect(script).toMatch(/^npm run build && /);
    expect(script).toContain("publint run --pack npm --strict");
    expect(script).toContain("attw --pack . --profile esm-only");
  });

  it("ignores no rule", () => {
    expect(script).not.toContain("--ignore");
  });

  it("matches a package that is ESM only", () => {
    expect(manifest.type).toBe("module");
  });

  it("uses two development tools that ship in nothing", () => {
    expect(manifest.devDependencies.publint).toBeDefined();
    expect(manifest.devDependencies["@arethetypeswrong/cli"]).toBeDefined();
    expect(manifest.dependencies?.publint).toBeUndefined();
    expect(manifest.dependencies?.["@arethetypeswrong/cli"]).toBeUndefined();
  });

  it("runs in the pack and install job of CI, after the smoke test", () => {
    const workflow = readFileSync(
      path.join(REPO, ".github/workflows/ci.yml"),
      "utf8",
    );
    const job = workflow.slice(workflow.indexOf("name: pack and install"));
    expect(job.indexOf("npm run smoke")).toBeGreaterThan(-1);
    expect(job.indexOf("npm run pack:lint")).toBeGreaterThan(
      job.indexOf("npm run smoke"),
    );
  });
});

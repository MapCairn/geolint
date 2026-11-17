// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const DEPCRUISE = path.join(
  REPO,
  "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
);
const BIOME = path.join(REPO, "node_modules/@biomejs/biome/bin/biome");

/** Writes `{ "relative/path": "source" }` under `root`. */
function writeTree(root: string, files: Record<string, string>): void {
  for (const [file, source] of Object.entries(files)) {
    const target = path.join(root, file);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, source);
  }
}

describe("dependency-cruiser rules", () => {
  let root: string;
  let findings: string[];

  const files: Record<string, string> = {
    // A MapCairn package installed beside geolint, as it would be in a project
    // that has both.
    "node_modules/@mapcairn/map/package.json":
      '{ "name": "@mapcairn/map", "exports": { ".": "./index.js" } }\n',
    "node_modules/@mapcairn/map/index.js": "export const ui = 1;\n",
    "scripts/helper.mjs": "export const helper = 1;\n",

    "src/engine/badName.ts":
      'import { ui } from "@mapcairn/map";\nexport const x = ui;\n',
    "src/engine/badUnresolvedName.ts":
      'import { x } from "@mapcairn/not-installed";\nexport const y = x;\n',
    "src/engine/badOutside.ts":
      'import { helper } from "../../scripts/helper.mjs";\nexport const x = helper;\n',
    "src/engine/badNode.ts":
      'import { readFileSync } from "node:fs";\nexport const x = readFileSync;\n',
    "src/engine/badBareNode.ts":
      'import { join } from "path";\nexport const x = join;\n',
    "src/badIndexNode.ts":
      'import { join } from "node:path";\nexport const x = join;\n',
    "src/engine/goodInside.ts":
      'import { y } from "./goodSibling";\nexport const x = y;\n',
    "src/engine/goodSibling.ts": "export const y = 1;\n",
    "src/node/goodNode.ts":
      'import { readFileSync } from "node:fs";\nexport const x = readFileSync;\n',
    "src/cli/goodNode.ts":
      'import { join } from "node:path";\nexport const x = join;\n',
  };

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "geolint-depcruise-"));
    writeTree(root, files);
    const result = spawnSync(
      process.execPath,
      [
        DEPCRUISE,
        "src",
        "--config",
        path.join(REPO, ".dependency-cruiser.cjs"),
        "--output-type",
        "json",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    const report = JSON.parse(result.stdout);
    findings = report.summary.violations.map(
      (v: { rule: { name: string }; from: string }) =>
        `${v.rule.name}: ${v.from}`,
    );
  }, 60_000);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each([
    ["geolint-imports-no-mapcairn-package", "src/engine/badName.ts"],
    [
      "geolint-imports-no-mapcairn-package-unresolved",
      "src/engine/badUnresolvedName.ts",
    ],
    ["geolint-source-stays-in-src", "src/engine/badOutside.ts"],
    ["geolint-engine-has-no-node-apis", "src/engine/badNode.ts"],
    ["geolint-engine-has-no-node-apis", "src/engine/badBareNode.ts"],
    ["geolint-engine-has-no-node-apis", "src/badIndexNode.ts"],
  ])("reports %s for %s", (rule, file) => {
    expect(findings).toContain(`${rule}: ${file}`);
  });

  it.each([
    "src/engine/goodInside.ts",
    "src/node/goodNode.ts",
    "src/cli/goodNode.ts",
  ])("accepts %s", (file) => {
    expect(findings.filter((f) => f.endsWith(file))).toEqual([]);
  });
});

describe("Biome rules for the engine", () => {
  let root: string;
  let findings: string[];

  const globals = [
    "export const a = Buffer.from([1]);",
    "export const b = process.env;",
    "export const c = __dirname;",
    "export const d = setImmediate;",
    "",
  ].join("\n");

  const files: Record<string, string> = {
    "src/engine/globals.ts": globals,
    "src/engine/globals.test.ts": globals,
    "src/node/globals.ts": globals,
  };

  beforeAll(() => {
    root = mkdtempSync(path.join(tmpdir(), "geolint-biome-"));
    writeTree(root, files);
    // The config keeps its reasons in whole-line `//` comments.
    const config = JSON.parse(
      readFileSync(path.join(REPO, "biome.jsonc"), "utf8")
        .split("\n")
        .filter((row) => !row.trim().startsWith("//"))
        .join("\n"),
    );
    config.vcs = { enabled: false };
    delete config.$schema;
    writeFileSync(path.join(root, "biome.jsonc"), JSON.stringify(config));
    symlinkSync(
      path.join(REPO, "node_modules"),
      path.join(root, "node_modules"),
      "junction",
    );
    const result = spawnSync(
      process.execPath,
      [
        BIOME,
        "lint",
        "--reporter=github",
        "--colors=off",
        "--max-diagnostics=1000",
        "src",
      ],
      { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    findings = [];
    for (const row of result.stdout.split("\n")) {
      const match =
        /^::error title=lint\/[^/]+\/([^,]+),file=([^,]+),line=(\d+)/.exec(row);
      if (match?.[2]) {
        const file = decodeURIComponent(match[2]).replaceAll("\\", "/");
        findings.push(
          `${match[1]}: ${file.slice(file.indexOf("src/"))}:${match[3]}`,
        );
      }
    }
  }, 60_000);

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it.each([1, 2, 3, 4])(
    "refuses a Node global in the engine, line %i",
    (line) => {
      expect(findings).toContain(
        `noRestrictedGlobals: src/engine/globals.ts:${line}`,
      );
    },
  );

  it("allows Node globals in the engine's tests and in src/node", () => {
    expect(
      findings.filter(
        (f) =>
          f.includes("src/engine/globals.test.ts") ||
          f.includes("src/node/globals.ts"),
      ),
    ).toEqual([]);
  });
});

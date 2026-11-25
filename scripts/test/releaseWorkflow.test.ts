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

/** The workflow's lines with comments removed, so checks see only what runs. */
const source = readFileSync(
  path.join(REPO, ".github/workflows/release.yml"),
  "utf8",
)
  .split("\n")
  .filter((line) => !/^\s*#/.test(line))
  .join("\n");

/** The text of one top-level job, from its name to the next job or the end. */
function job(name: string): string {
  const start = source.indexOf(`\n  ${name}:\n`);
  expect(start, `job ${name}`).toBeGreaterThanOrEqual(0);
  const rest = source.slice(start + 1);
  const next = rest.slice(1).search(/\n {2}[a-z-]+:\n/);
  return next === -1 ? rest : rest.slice(0, next + 1);
}

describe(".github/workflows/release.yml", () => {
  it("starts only from a pushed version tag", () => {
    const on = source.slice(
      source.indexOf("\non:"),
      source.indexOf("\npermissions:"),
    );
    expect(on).toContain("tags:");
    expect(on).toMatch(/- "v\*"|- 'v\*'|- v\*/);
    expect(on).not.toMatch(/pull_request|workflow_dispatch|branches:/);
  });

  it("gives the workflow no permissions of its own", () => {
    expect(source).toMatch(/^permissions: \{\}$/m);
  });

  it("pins every action by commit SHA", () => {
    const uses = [...source.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1] ?? "");
    expect(uses.length).toBeGreaterThan(0);
    for (const use of uses) {
      expect(use).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("never puts a context expression in the text of a shell line", () => {
    const runLines = source
      .split("\n")
      .filter((line) => /^\s+(- )?run:/.test(line));
    expect(runLines.length).toBeGreaterThan(0);
    for (const line of runLines) {
      expect(line).not.toContain("${{");
    }
  });

  it("holds the OIDC permission and the environment in the npm job alone", () => {
    expect(source.match(/id-token: write/g)).toHaveLength(1);
    expect(source.match(/environment: npm/g)).toHaveLength(1);
    expect(job("npm")).toContain("id-token: write");
    expect(job("npm")).toContain("environment: npm");
  });

  it("publishes only in the npm job, with provenance, from the packed tarball", () => {
    expect(source.match(/npm publish/g)).toHaveLength(1);
    const publish = job("npm");
    expect(publish).toMatch(
      /npm publish "\$GITHUB_WORKSPACE\/release\/\$TARBALL"/,
    );
    expect(publish).toContain("--provenance");
    expect(publish).toContain('--tag "$DIST_TAG"');
    expect(publish).toContain("verifyRelease.mjs check release");
  });

  it("cannot publish or release while the manifest is private", () => {
    for (const name of ["npm", "github-release"]) {
      expect(job(name)).toContain("needs.verify.outputs.private == 'false'");
    }
  });

  it("checks the tag, the branch and the tarball before anything is uploaded", () => {
    const verify = job("verify");
    expect(verify).toContain("verifyRelease.mjs decide");
    expect(verify).toContain("git merge-base --is-ancestor");
    expect(verify).toContain("npm run check");
    expect(verify).toContain("verifyRelease.mjs notes");
    expect(verify).toContain("verifyRelease.mjs tarball release");
    expect(verify).toContain("verifyRelease.mjs record release");
    expect(verify.indexOf("verifyRelease.mjs tarball")).toBeLessThan(
      verify.indexOf("upload-artifact"),
    );
  });

  it("creates the GitHub release only after npm, with notes from CHANGELOG.md", () => {
    const release = job("github-release");
    expect(release).toContain("needs: [verify, npm]");
    expect(release).toContain("--notes-file release/notes.md");
    expect(release).toContain("contents: write");
  });
});

// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** The documents that list the project's skills by name. */
const LISTS = ["CLAUDE.md", "AGENTS.md", ".github/CONTRIBUTING.md"];

const skills = readdirSync(path.join(REPO, ".claude/skills"), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe("the lists of skills", () => {
  it("finds the skills", () => {
    expect(skills.length).toBeGreaterThan(0);
  });

  it.each(LISTS)("%s names every skill in .claude/skills", (file) => {
    const text = readFileSync(path.join(REPO, file), "utf8");
    const missing = skills.filter((name) => !text.includes(`\`${name}\``));
    expect(missing).toEqual([]);
  });
});

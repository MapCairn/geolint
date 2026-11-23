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

const SECTIONS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

type Section = (typeof SECTIONS)[number];

type Manifest = Partial<Record<Section, Record<string, string>>>;

/** A semver prerelease carries a hyphen after the core version. */
const PRERELEASE = /^\d+\.\d+\.\d+-/;

const AGE_DAYS = "3";

function read(file: string): string {
  return readFileSync(path.join(REPO, file), "utf8");
}

describe("third-party dependency ranges", () => {
  const manifest = JSON.parse(read("package.json")) as Manifest;

  it("uses a caret range, except a prerelease, which stays an exact version", () => {
    const wrong = SECTIONS.flatMap((section) =>
      Object.entries(manifest[section] ?? {})
        .filter(([, range]) =>
          PRERELEASE.test(range)
            ? /^[\^~]/.test(range)
            : !range.startsWith("^"),
        )
        .map(([name, range]) => `${section}: ${name}@${range}`),
    );
    expect(wrong).toEqual([]);
  });
});

describe("the package age rule", () => {
  it("is 3 days in .npmrc", () => {
    expect(read(".npmrc")).toMatch(
      new RegExp(`^min-release-age=${AGE_DAYS}$`, "m"),
    );
  });

  it("is 3 days for every Dependabot ecosystem", () => {
    const days = [
      ...read(".github/dependabot.yml").matchAll(/default-days:\s*(\d+)/g),
    ];
    expect(days.length).toBeGreaterThan(0);
    for (const day of days) {
      expect(day[1]).toBe(AGE_DAYS);
    }
  });

  it("is 3 days in AGENTS.md and the review-security skill", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain(`\`min-release-age=${AGE_DAYS}\``);
    expect(agents).toContain(`less than ${AGE_DAYS} days ago`);
    expect(read(".claude/skills/review-security/SKILL.md")).toContain(
      `at least ${AGE_DAYS} days old`,
    );
  });

  it("is 3 days in the pack-and-install check", () => {
    expect(read("scripts/smoke.mjs")).toMatch(
      new RegExp(`MIN_RELEASE_AGE_DAYS = ${AGE_DAYS};`),
    );
  });

  it("is not described as a different number of days in a guide", () => {
    expect(read("docs/guides/personal-preferences.md")).not.toMatch(
      /\b\d+-day rule for packages/,
    );
  });

  it("is 3 days in the zizmor dependabot-cooldown rule", () => {
    const config = read(".github/zizmor.yml");
    expect(config).toMatch(/dependabot-cooldown:/);
    expect(config).toMatch(new RegExp(`days:\\s*${AGE_DAYS}\\b`));
  });
});

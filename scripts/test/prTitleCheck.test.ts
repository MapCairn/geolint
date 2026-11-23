// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMMIT_TYPES,
  runCli,
  titleProblem,
  // @ts-expect-error The scripts are dependency-free JavaScript with JSDoc types.
} from "../prTitleCheck.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Spawning Node can be slow while coverage runs in parallel. */
const CHILD_TIMEOUT_MS = 30_000;

describe("titleProblem", () => {
  it.each(COMMIT_TYPES as string[])("accepts the type %s", (type) => {
    expect(titleProblem(`${type}: say what changed`)).toBeNull();
  });

  it.each([
    "fix(engine): keep the winding of a hole",
    "feat!: drop the old option",
    "feat(cli)!: rename --region",
    "refactor(engine/rules): split the check",
    "  docs: padded with spaces  ",
    "fix: a title with a colon: inside",
  ])("accepts %j", (title) => {
    expect(titleProblem(title)).toBeNull();
  });

  it.each([
    ["no type", "Update stuff"],
    ["an unknown type", "update: change things"],
    ["a capitalised type", "Fix: change things"],
    ["no description", "fix:"],
    ["a blank description", "fix:   "],
    ["no space after the colon", "fix:change things"],
    ["an empty scope", "fix(): change things"],
    ["an unclosed scope", "fix(engine: change things"],
    ["a space before the colon", "fix : change things"],
    ["an empty title", ""],
    ["a type with a bang and no colon", "feat! change things"],
    ["a second line", "fix: one\nfix: two"],
  ])("rejects %s", (_name, title) => {
    expect(titleProblem(title)).toMatch(/Conventional Commit/);
  });

  it("names the accepted types and an example in the message", () => {
    const message = titleProblem("nope") as string;
    for (const type of COMMIT_TYPES as string[]) {
      expect(message).toContain(type);
    }
    expect(message).toMatch(/Example: /);
  });
});

describe("runCli", () => {
  function run(env: Record<string, string | undefined>) {
    const lines: string[] = [];
    const code = runCli(env, (line: string) => lines.push(line));
    return { code, lines };
  }

  it("passes a valid title with no output", () => {
    expect(run({ PR_TITLE: "fix: a thing" })).toEqual({ code: 0, lines: [] });
  });

  it("fails an invalid title with exit code 1 and says why", () => {
    const { code, lines } = run({ PR_TITLE: "a thing" });
    expect(code).toBe(1);
    expect(lines.join("\n")).toMatch(/Conventional Commit/);
  });

  it("fails with exit code 2 when no title is given, which is never a pass", () => {
    const { code, lines } = run({});
    expect(code).toBe(2);
    expect(lines.join("\n")).toMatch(/PR_TITLE is not set/);
  });
});

describe("the script as a command", () => {
  const SCRIPT = path.join(REPO, "scripts/prTitleCheck.mjs");

  function command(title: string | undefined) {
    const env: Record<string, string | undefined> = { ...process.env };
    delete env.PR_TITLE;
    if (title !== undefined) {
      env.PR_TITLE = title;
    }
    return spawnSync(process.execPath, [SCRIPT], {
      env,
      encoding: "utf8",
      timeout: CHILD_TIMEOUT_MS,
    });
  }

  it.each([
    ["a valid title", "chore: tidy", 0],
    ["an invalid title", "tidy", 1],
    ["no title", undefined, 2],
  ])("exits with the code for %s", (_name, title, code) => {
    expect(command(title as string | undefined).status).toBe(code);
  });

  it("does not read the title from the command line", () => {
    const result = spawnSync(process.execPath, [SCRIPT, "chore: tidy"], {
      env: { ...process.env, PR_TITLE: undefined } as NodeJS.ProcessEnv,
      encoding: "utf8",
      timeout: CHILD_TIMEOUT_MS,
    });
    expect(result.status).toBe(2);
  });
});

describe("the CI step", () => {
  const workflow = readFileSync(
    path.join(REPO, ".github/workflows/ci.yml"),
    "utf8",
  );
  const step = workflow.slice(
    workflow.indexOf("Check that the pull request title"),
  );

  it("runs the script on pull requests only", () => {
    expect(step).toContain("if: github.event_name == 'pull_request'");
    expect(step).toContain("run: node scripts/prTitleCheck.mjs");
  });

  it("passes the title through the environment, not the script text", () => {
    expect(step).toContain("PR_TITLE: ${{ github.event.pull_request.title }}");
    const run = step.split("\n").find((line) => line.includes("run:")) ?? "";
    expect(run).not.toContain("${{");
  });
});

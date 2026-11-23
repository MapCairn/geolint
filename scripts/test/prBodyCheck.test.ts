// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  checkPullRequestBody,
  runPrBodyCheck,
  skipReason,
  // @ts-expect-error The scripts are dependency-free JavaScript with JSDoc types.
} from "../prBodyCheck.mjs";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Spawning Node can be slow while coverage runs in parallel. */
const CHILD_TIMEOUT_MS = 30_000;

const COMPLETE =
  "## What and why\n\nFixes #12\n\n## Checks\n\n- `npm test` passes\n";

describe("checkPullRequestBody", () => {
  it("has nothing to say about a complete description", () => {
    expect(checkPullRequestBody(COMPLETE)).toEqual([]);
  });

  it.each([
    "Fixes #12",
    "fixed #12",
    "Fix #12",
    "Closes #12",
    "closed #12",
    "Resolves #12",
    "resolved #12",
    "Part of #12",
    "part of MapCairn/geolint#12",
    "Fixes some-org/some.repo#7",
  ])("accepts the issue link %j", (link) => {
    expect(checkPullRequestBody(`${link}\n\n## Checks\n`)).toEqual([]);
  });

  it.each([
    ["no link", "## Checks\n\nran things\n"],
    ["a number with no keyword", "See #12\n\n## Checks\n"],
    ["a keyword with no number", "Fixes the bug\n\n## Checks\n"],
    ["a keyword inside a word", "Prefixes #12\n\n## Checks\n"],
  ])("warns about %s", (_name, body) => {
    const warnings: string[] = checkPullRequestBody(body);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/No issue link/);
  });

  it.each([
    ["no heading", "Fixes #12\n"],
    ["a heading with another name", "Fixes #12\n\n## Tests\n"],
    ["the word in a sentence", "Fixes #12\n\nChecks were run.\n"],
    ["a heading with trailing words", "Fixes #12\n\n## Checks run\n"],
  ])("warns about %s", (_name, body) => {
    const warnings: string[] = checkPullRequestBody(body);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/No `Checks` section/);
  });

  it.each(["# Checks", "### Checks", "###### checks", "## Checks  "])(
    "accepts the heading %j",
    (heading) => {
      expect(checkPullRequestBody(`Fixes #1\n\n${heading}\n`)).toEqual([]);
    },
  );

  it("warns about both when the description is empty, null or missing", () => {
    for (const body of ["", null, undefined]) {
      expect(checkPullRequestBody(body)).toHaveLength(2);
    }
  });

  it("does not count the hints in the template's comments", () => {
    const template =
      '<!-- One or two sentences. Link the issue: "Fixes #123" or "Part of #123". -->\n\n<!-- ## Checks -->\n';
    expect(checkPullRequestBody(template)).toHaveLength(2);
  });

  it("removes comments until none is left, so nested text cannot hide a missing link", () => {
    const joined = "<!<!---->-- Fixes #1 -->\n\n## Checks\n";
    const warnings: string[] = checkPullRequestBody(joined);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/No issue link/);
  });

  it("removes a comment that spans lines", () => {
    expect(
      checkPullRequestBody("<!--\nFixes #1\n-->\n\n## Checks\n"),
    ).toHaveLength(1);
  });

  it("keeps the text around a comment", () => {
    expect(
      checkPullRequestBody("Fixes <!-- note --> #1\n\n## Checks\n"),
    ).toEqual([]);
    expect(
      checkPullRequestBody("<!-- note -->Fixes #1\n\n## Checks\n"),
    ).toEqual([]);
  });
});

describe("skipReason", () => {
  it("skips Dependabot", () => {
    expect(skipReason({ author: "dependabot[bot]" })).toMatch(/Dependabot/);
  });

  it("checks anyone else", () => {
    expect(skipReason({ author: "someone" })).toBeNull();
    expect(skipReason({ author: "" })).toBeNull();
  });
});

describe("runPrBodyCheck", () => {
  function run(input: { author?: string; body: string | null }) {
    const log: string[] = [];
    const summary: string[] = [];
    const code = runPrBodyCheck({
      author: input.author ?? "someone",
      body: input.body,
      log: (line: string) => log.push(line),
      summarise: (text: string) => summary.push(text),
    });
    return { code, log, summary };
  }

  it("is silent about a complete description", () => {
    expect(run({ body: COMPLETE })).toEqual({ code: 0, log: [], summary: [] });
  });

  it("warns with an annotation and a summary, and still exits 0", () => {
    const { code, log, summary } = run({ body: "" });
    expect(code).toBe(0);
    expect(log).toHaveLength(2);
    for (const line of log) {
      expect(line).toMatch(/^::warning title=Pull request description::/);
    }
    expect(summary).toHaveLength(1);
    expect(summary[0]).toMatch(/^### Pull request description/);
    expect(summary[0]).toMatch(/No issue link/);
    expect(summary[0]).toMatch(/No `Checks` section/);
  });

  it("checks nothing for a Dependabot pull request", () => {
    expect(run({ author: "dependabot[bot]", body: "" })).toEqual({
      code: 0,
      log: [],
      summary: [],
    });
  });
});

describe("the script as a command", () => {
  const SCRIPT = path.join(REPO, "scripts/prBodyCheck.mjs");

  function command(env: Record<string, string>) {
    const folder = mkdtempSync(path.join(tmpdir(), "body-check-"));
    try {
      const summary = path.join(folder, "summary.md");
      const result = spawnSync(process.execPath, [SCRIPT], {
        env: { ...process.env, GITHUB_STEP_SUMMARY: summary, ...env },
        encoding: "utf8",
        timeout: CHILD_TIMEOUT_MS,
      });
      let written = "";
      try {
        written = readFileSync(summary, "utf8");
      } catch {
        written = "";
      }
      return { result, written };
    } finally {
      rmSync(folder, { recursive: true, force: true });
    }
  }

  it("warns and exits 0 for an incomplete description", () => {
    const { result, written } = command({
      PR_AUTHOR: "someone",
      PR_BODY: "nothing here",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/::warning title=Pull request description::/);
    expect(written).toMatch(/No issue link/);
  });

  it("prints nothing and writes no summary for a complete description", () => {
    const { result, written } = command({
      PR_AUTHOR: "someone",
      PR_BODY: COMPLETE,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("");
    expect(written).toBe("");
  });

  it("exits 0 when no description is given", () => {
    const { result } = command({ PR_AUTHOR: "someone" });
    expect(result.status).toBe(0);
  });
});

describe("the CI step", () => {
  const workflow = readFileSync(
    path.join(REPO, ".github/workflows/ci.yml"),
    "utf8",
  );
  const step = workflow.slice(
    workflow.indexOf("Warn when the pull request description"),
  );

  it("runs the script on pull requests only", () => {
    expect(step).toContain("if: github.event_name == 'pull_request'");
    expect(step).toContain("run: node scripts/prBodyCheck.mjs");
  });

  it("passes the text through the environment, not the script text", () => {
    expect(step).toContain("PR_BODY: ${{ github.event.pull_request.body }}");
    expect(step).toContain(
      "PR_AUTHOR: ${{ github.event.pull_request.user.login }}",
    );
    const run = step.split("\n").find((line) => line.includes("run:")) ?? "";
    expect(run).not.toContain("${{");
  });
});

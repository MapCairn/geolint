// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * Warns when a pull request description has no issue link (`Fixes #n` or
 * `Part of #n`) or no `Checks` section, the two things AGENTS.md ("Issues and
 * pull requests") and the pull request template ask for.
 *
 *   PR_BODY=... PR_AUTHOR=... node scripts/prBodyCheck.mjs
 *
 * It only ever warns (exit code 0): each finding is a `::warning::` annotation
 * and a line in the job summary. The text arrives through the environment, so
 * it is data and never part of a shell command.
 */
import { appendFileSync } from "node:fs";
import { isEntryPoint } from "./entryPoint.mjs";

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
/** A closing keyword or `Part of`, then an issue number, optionally in another repository. */
const ISSUE_LINK =
  /\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?|part of)\s+(?:[\w.-]+\/[\w.-]+)?#\d+/i;
/** A heading called Checks, at any level. */
const CHECKS_HEADING = /^#{1,6}\s+Checks\s*$/im;
const DEPENDABOT = "dependabot[bot]";
const ANNOTATION = "::warning title=Pull request description::";

/**
 * Removes HTML comments until none is left, because removing one can join the
 * text around it into another (`<!<!---->-- x -->`).
 *
 * @param {string} text
 * @returns {string}
 */
function withoutComments(text) {
  let current = text;
  let previous;
  do {
    previous = current;
    current = previous.replace(HTML_COMMENT, "");
  } while (current !== previous);
  return current;
}

/**
 * @param {string | null | undefined} body The pull request description.
 * @returns {string[]} One warning for each thing the description lacks. Comments in the description (the template's hints) do not count.
 */
export function checkPullRequestBody(body) {
  const text = withoutComments(body ?? "");
  const warnings = [];
  if (!ISSUE_LINK.test(text)) {
    warnings.push(
      "No issue link. Add a line such as `Fixes #123` or `Part of #123`.",
    );
  }
  if (!CHECKS_HEADING.test(text)) {
    warnings.push(
      "No `Checks` section. Keep the section from the pull request template and say what you ran.",
    );
  }
  return warnings;
}

/**
 * @param {object} input
 * @param {string} input.author The login that opened the pull request.
 * @returns {string | null} Why this pull request is not checked, or null when it is.
 */
export function skipReason({ author }) {
  return author === DEPENDABOT ? "Dependabot pull request" : null;
}

/**
 * Checks a pull request and reports the result.
 *
 * @param {object} input
 * @param {string} input.author The login that opened the pull request.
 * @param {string | null} input.body The pull request description.
 * @param {(line: string) => void} input.log Receives the annotations.
 * @param {(text: string) => void} input.summarise Receives the job summary text.
 * @returns {number} The exit code, always 0: this check only warns.
 */
export function runPrBodyCheck({ author, body, log, summarise }) {
  if (skipReason({ author }) !== null) {
    return 0;
  }
  const warnings = checkPullRequestBody(body);
  for (const warning of warnings) {
    log(`${ANNOTATION}${warning}`);
  }
  if (warnings.length > 0) {
    summarise(
      `### Pull request description\n\n${warnings.map((w) => `- ${w}`).join("\n")}\n`,
    );
  }
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  process.exit(
    runPrBodyCheck({
      author: process.env.PR_AUTHOR ?? "",
      body: process.env.PR_BODY ?? "",
      log: console.log,
      summarise: (text) => {
        if (summaryFile !== undefined) {
          appendFileSync(summaryFile, text);
        }
      },
    }),
  );
}

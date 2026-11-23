// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * Fails when a pull request title is not a Conventional Commit
 * (`<type>[optional scope][!]: <description>`). Pull requests are squash-merged
 * with the title as the commit subject, so a title without a type loses it
 * from the history.
 *
 *   PR_TITLE='fix(engine): keep the winding of a hole' node scripts/prTitleCheck.mjs
 *
 * The title reaches the script through the environment, never through shell
 * text or an argument. Exit codes: 0 valid, 1 invalid, 2 no title was given
 * (never a pass).
 */
import { isEntryPoint } from "./entryPoint.mjs";

/** The types the project uses, the standard Conventional Commit set. */
export const COMMIT_TYPES = [
  "build",
  "chore",
  "ci",
  "docs",
  "feat",
  "fix",
  "perf",
  "refactor",
  "revert",
  "style",
  "test",
];

/** A subject on one line: a type, an optional scope, an optional `!`, then a description. */
const SUBJECT = new RegExp(
  `^(?:${COMMIT_TYPES.join("|")})(?:\\([^()\\s]+\\))?!?: \\S.*$`,
);

const INVALID =
  "The pull request title must be a Conventional Commit: <type>[optional scope][!]: <description>, with a type from " +
  `${COMMIT_TYPES.join(", ")}. Example: fix(engine): keep the winding of a hole`;

/**
 * Reads a title as a commit subject.
 *
 * @param {string} title
 * @returns {string | null} Null when the title is valid, otherwise what is wrong.
 */
export function titleProblem(title) {
  return SUBJECT.test(title.trim()) ? null : INVALID;
}

/**
 * @param {Record<string, string | undefined>} env Holds `PR_TITLE`.
 * @param {(line: string) => void} error Where a problem is reported.
 * @returns {number} 0 valid, 1 invalid, 2 no title given.
 */
export function runCli(env, error) {
  const title = env.PR_TITLE;
  if (title === undefined) {
    error("PR_TITLE is not set, so the title could not be checked.");
    return 2;
  }
  const problem = titleProblem(title);
  if (problem !== null) {
    error(problem);
    return 1;
  }
  return 0;
}

if (isEntryPoint(import.meta.url)) {
  process.exit(runCli(process.env, console.error));
}

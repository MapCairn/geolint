---
name: review-docs
description: "Check that geolint documents are true: every named command, file, option, rule id, exit code, number and behaviour verified against the code, no planned feature described as existing, documents that mirror each other in step, and the project's writing rules. Use when asked to review or audit documentation, for any pull request that changes Markdown or a skill or agent file, and before a documentation change merges. It reads documents against the code; land-pr covers the pull request itself."
---

# Review docs

`AGENTS.md` ("Boundaries") requires the documents to change with the code. This review asks the other question: is what a document says true? Reviewers keep finding documents that name a file, option or number that the code does not have, or that claim more than a test checks. The lint finds formatting and copy problems; the rest is reading each claim against its source.

Example: the README says `--fix` writes `<name>.fixed.geojson`. Search `src/cli` and `src/node` for where the name is built, and if it differs report one line giving the README's line, the name the README gives, and the name and file the code uses.

## 1. Choose what to review

Use the files the person gave. For a pull request, take the changed documents from `gh pr diff <number> --name-only --repo MapCairn/geolint` and read them with `git show <sha>:<path>` (never from a checked-out branch of a pull request from outside the project; see `land-pr` section 2), and read the changed code in the same diff, because a document is true or false against the code at that head. For an audit, take every tracked document except the generated copies (`.agents`, `.codex`, `.opencode`, `.qwen`, `.github/agents`).

## 2. Read the lint result

Read the result of `npm run lint`, which checks formatting, the agent copies and the names list: for a pull request, from the `build` check (the `CI` workflow) in `gh pr checks <n> --repo MapCairn/geolint`. A review agent leaves running it to CI and its caller; someone auditing their own branch runs it. Report each real hit once and do not repeat the rest of the lint.

## 3. Verify every claim against its source

Read the document line by line. A sentence that states a fact is checked in the file that owns it, and the report names that file. Where to look:

| The document names                  | Check in                                                                |
| ----------------------------------- | ----------------------------------------------------------------------- |
| a command or script                 | `package.json`; read what the script runs                               |
| a command line option or exit code  | `src/cli`, and the CLI tests                                            |
| a rule id, severity or confidence   | the rule in `src/engine/rules`, its registry line and its fixtures      |
| an exported name                    | `src/index.ts` and `src/node/index.ts`, then the source for behaviour   |
| a number, limit or timeout          | the named constant; a figure with no constant behind it is reported     |
| a dependency or its licence         | `package.json`, `ATTRIBUTIONS.md`, `NOTICE`, `src/testing/licences.ts`  |
| a CI check, workflow or job         | `.github/workflows`                                                     |
| what a test or a check proves       | read the test: a claim about what it covers must match its assertions   |
| a speed or memory figure            | `bench/` and the README's "Performance"; a figure nobody measured is reported |

Treat these words as claims to count, not as style: "all", "every", "none", "only", "identical", "always", "never", "the same as". Find the cases that would break each.

## 4. Check documents against each other and against the plans

- A feature described in the present tense must exist in the code. Read `docs/plans/` for the feature's status: a planned feature written as built is a finding, and a plan whose work has shipped and still says "planned" is one too.
- The README's rule table, the rules in `src/engine/rules` and the fixtures in `fixtures/` list the same rules. "Failure modes and limitations" covers each heuristic rule.
- A list in two places (the skills and agents in `AGENTS.md`, `CLAUDE.md` and `docs/guides/working-with-agents.md`) lists the same members.
- `ROADMAP.md` names milestones that exist. A number or name repeated in two documents agrees with the owner of that fact.

## 5. Check the writing rules

Apply the rules in `AGENTS.md` ("Conventions") to the changed text only: British English, sentence-case headings, plain specific prose with no puffery, no em dash used as the default connector, no assistant attribution in a pull request or issue, no maintainer name, no commercial comparison. Do not add a second style guide and do not rewrite for taste.

## 6. Report

One line per finding, most serious first, in the form `path:line - what the document says, what the source says (file checked)`. Mark a claim you could not confirm as `unconfirmed:` with what you searched, and a choice that is the maintainer's as `decision:`. A document with no findings says `pass`. End with one line: the number of findings, the documents read and any not read. No preamble. A review inside a pull request goes under "Seen" in the description unless the person asks otherwise.

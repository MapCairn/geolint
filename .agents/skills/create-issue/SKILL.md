---
name: create-issue
description: Create a well-formed GitHub issue for geolint with the gh CLI. Use whenever someone asks to log, file, raise or track a bug, a rule idea, a feature, a task or an idea, or when work turns up a problem or opportunity that should be tracked and cannot be fixed in the same session.
---

# Create an issue

Issues are how geolint tracks work. They are public, so write plain project facts only. Use the `gh` CLI for everything.

## Before you write

1. Check the CLI works: `gh auth status`. If it is not signed in, ask the person to run `gh auth login` themselves in their own terminal.
2. Do not file an issue for a gap you can fix in the same session. Fix it, in a pull request (see the `pick-up-issue` skill).
3. Search for a duplicate first, open and closed:
   `gh issue list --repo MapCairn/geolint --state all --search "<key words>" --limit 20`
   (Always name the repository with `--repo MapCairn/geolint`: in a clone of a fork the default is the fork, which has no issues.)
   If one exists, comment on it with the new facts instead of filing another.
4. Read `ROADMAP.md` if the idea might be something the project has said it will not do. Adding a runtime dependency or a dataset, publishing, or anything that changes `.github/SECURITY.md`, the licence, `NOTICE` or `CLA.md` is the maintainer's decision: say so in the issue and do not start the work.

## Choose the kind

- **Bug**: geolint reports something wrong, misses a mistake or fails. Mirror `.github/ISSUE_TEMPLATE/bug_report.yml`: what happened, what was expected, the smallest input that shows it (made-up or public data only), the version, Node and operating system, and the area.
- **Rule or feature**: mirror `.github/ISSUE_TEMPLATE/feature_request.yml`: the problem, what is wanted (for a rule, an input it should report and a similar one it should not), and what false alarms and cost it brings.
- **Task, refactor or research**: a short goal, why it is worth doing, and what done looks like.

## Write the body

- A one-line title in sentence case that says the outcome or the fault, not "Improve X".
- Context first (what exists now, with file paths in backticks), then the proposal or the fault, then constraints, then a **task list** of small checkboxes the person who picks it up can tick as they go. Put the test the work starts with as the first task.
- Say which documents the work will update (`README.md`, `ATTRIBUTIONS.md`, a plan).
- For a large change that decides a public API or the rule model, add a task "Plan in `docs/plans/`" (see the `plan-change` skill) and link the plan from the issue when it exists. Everything else keeps its design notes in the issue.
- Neutral voice. No emails, keys, private details, `@mentions` of people, employer references, assistant attribution, names of commercial products used as comparisons, or any name on the maintainer's private list. Do not name the maintainer.
- Do not describe a planned feature as if it exists.
- Write a decision in its final wording, the exact sentence a document will carry, not a summary, so nobody copies a loose phrase. In a rule about people, name the role, for example "the person who opens the pull request".

## Labels and milestone

Apply the labels that fit from: `bug`, `enhancement`, `documentation`, `performance`, `privacy`, `plan`, `good first issue`, `help wanted`. Check `gh label list --repo MapCairn/geolint` and `gh api repos/MapCairn/geolint/milestones --jq ".[].title"`; give the issue a milestone when one fits (quality, process and test-stability work takes "Maintenance") and leave it unassigned only when none does. Do not invent labels.

## File it

Write the body to a temporary file so formatting survives, then:

```bash
gh issue create --repo MapCairn/geolint --title "<title>" --body-file <path> --label "enhancement" [--milestone "<title>"]
```

On a fork, or without write access to the repository, labels and milestones may be refused: file it without them and say so. Print the issue URL back to the person.

## Afterwards

- `ROADMAP.md` lists milestones, not issues, so an issue is never added to it. Only an outcome a release note could carry becomes a new milestone; say so in the issue, and the maintainer decides whether it joins the list and where.
- If the issue is a child of a tracking issue, tick or add it in the tracker's task list: start from the current body (`node scripts/agents/issue-body.mjs <n> <file>` (the exact body, saved outside the repository as `pick-up-issue` section 4 says)), change only that line, and save it with `gh issue edit <n> --repo MapCairn/geolint --body-file <file>`. Without triage rights, post the child's number as a comment on the tracker.
- If the person asked, start the work with the `pick-up-issue` skill.
- Hand off with the report in `AGENTS.md` ("Definition of done"): the issue URL goes under **PR**, a duplicate found or a label refused under **Deviations**.

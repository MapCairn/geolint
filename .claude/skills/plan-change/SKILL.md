---
name: plan-change
description: Write a plan in docs/plans/ for a large geolint change, one that decides a public API, the rule model or the output formats. When the work will not start straight away, open the plan as its own pull request for review before any code is written; when it starts immediately, land the plan with its first implementation step in one pull request instead. Use when an issue says "Plan in docs/plans/", when someone asks to plan, design or scope a large change, or when pick-up-issue meets an issue too large to build directly.
---

# Plan a change

`docs/plans/README.md` says what a plan is and when one is needed; read it first. Most issues need no plan, only design notes and a task list in the issue (`pick-up-issue`, section 3). This skill covers the plan and its pull request. Turning a merged plan into issues is the `split-plan` skill.

Example: an issue asks for an NDJSON reader. It adds a `Reader`, changes how the command picks one and what the library exports, so it decides a public API and gets a plan. Its open questions (how the command recognises the format, whether `--fix` supports it) go to the maintainer with a recommendation.

## 1. Check a plan is needed

1. Do the preflight in `pick-up-issue` section 0 and read the issue with all its comments, judging each by who wrote it (`pick-up-issue` section 1).
2. If the change decides no public API and no part of the rule model, stop and tell the person the issue is enough. If it needs a maintainer decision listed in `AGENTS.md` ("Ask the maintainer first"), the plan may state the question but not settle it.
3. Find the tracking issue. If there is none, file one with the `create-issue` skill. Either way it carries the `plan` label and a milestone when one fits.
4. Choose the next number: one more than the highest ever used. Finished plans may be deleted, so also look in history: `git log <origin-or-upstream>/main --name-only --format= -- docs/plans` and the open pull requests. File name `NNNN-short-name.md`.

## 2. Investigate

Read `docs/plans/0001-geolint.md`, the README's rules and "Failure modes and limitations", `ROADMAP.md` for what the project will not do, and the code each step would touch, not only the documents about it. Note the issues this one depends on or blocks, what already exists (do not plan what is built), what you rule out and why, and what the simplest version costs to build and to keep. Do not describe a planned feature as existing.

## 3. Write the plan

Keep it readable in a few minutes. Every heading below is required; write "None" rather than drop one.

```markdown
# NNNN: Title in sentence case

Status: proposed. Tracking issue: #<n>.

## Goal
What changes for a user of the command or the library, in two or three sentences.
## Ground rules
Constraints from AGENTS.md and the issue that shape the design.
## Design
Files, rules, readers, exports and options touched, and the public API in outline. Options rejected, with why.
## Tests
The failing tests the work starts with, and how each is proved.
## Order of work
Numbered steps, each independently shippable (one pull request, build green), each with the files it touches.
## Documents to update
Which of README, ATTRIBUTIONS and NOTICE change, and in which step.
## Risks
What could go wrong and how it is contained.
## Decided and open
Decisions made, with the date and reason. Open questions, each with a recommendation.
```

For each open choice, give the cost to build and keep against the benefit, and recommend the simpler option. Neutral voice, British English, em dashes only where natural. No maintainer name, no commercial comparison, no assistant attribution.

## 4. Open the pull request

First decide whether the work starts straight away.

**The work does not start straight away:**

1. Add the plan to the list at the end of `docs/plans/README.md`.
2. Branch `docs/plan-<short-name>` from the project's `main`, run `npm run lint`, commit as `docs(plans): <title>`, push.
3. Continue with `land-pr`. The description says `Part of #<n>` and asks reviewers for the open questions. A plan is reviewed, not merged on your own authority unless a human authorised it.
4. Before it merges, a reviewer other than the author verifies the plan against `main`: every file, symbol and call the plan names exists and works as it says, the steps build in the order given, and nothing a step needs is left without a supplier.
5. After it merges, link the plan from the tracking issue and tick its "Plan" task.

**The work starts straight away:** add the plan to `docs/plans/README.md` as above, write its file with `Status: in progress`, then go directly into `pick-up-issue` for step one of "Order of work", on the same branch, in the same pull request. A reviewer still checks the plan against the code before that pull request merges.

## 5. Report

Use the report in `AGENTS.md` ("Definition of done"): the plan's pull request, the checks, and under **Issues to file** the tracking issue if you created one. List the open questions that need the maintainer.

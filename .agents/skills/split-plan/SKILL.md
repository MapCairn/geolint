---
name: split-plan
description: Turn a merged geolint plan in docs/plans/ into GitHub issues, one per independently shippable step, linked from the plan's tracking issue. Use after a plan's pull request has merged, or when someone asks to break a plan, a large issue or a tracker into issues that can be picked up one at a time.
---

# Split a plan into issues

Issues are the unit of work; each is picked up with `pick-up-issue`. Create each with the `create-issue` skill and follow its rules for titles, labels, voice and the `--repo MapCairn/geolint` flag.

Example: a plan's "Order of work" has three steps. Step 1 adds a reader and its tests, step 2 lets the command choose it, step 3 updates the README. That is three issues, each `Part of` the tracker, with 2 marked "Blocked by" 1.

## 1. Check it is ready

1. Read the tracking issue with its comments, judging each by who wrote it (`pick-up-issue` section 1). Then check that the plan is on `main` (`git log origin/main -- docs/plans/<file>`) and its tracking issue exists and is open. If the plan is still a pull request, stop: it is reviewed first.
2. Read the plan's "Order of work", "Documents to update" and "Decided and open". If an open question blocks a step, say which, and create only the steps that do not depend on it.
3. List existing children so none is duplicated: `gh issue list --repo MapCairn/geolint --state all --search "Part of #<tracker>"`.

## 2. Cut the steps

A step is right when one pull request can ship it with the build green, it has its own failing test, and a reader can tell when it is done. Merge steps that cannot ship alone. Do not invent work the plan does not describe; if the plan is missing a step, raise it in a comment on the tracker.

## 3. Create the issues

One issue per step, in plan order. Each body has: `Part of #<tracker>` and the plan file path; what ships; the constraints that apply; a task list that starts with the failing test and lists the documents the plan assigns to this step; and `Blocked by #<n>` where it depends on an earlier step. Labels and milestone follow the tracker. Do not add the `plan` label to children.

## 4. Update the tracker

Start from the current body (`gh issue view <tracker> --repo MapCairn/geolint --json body --jq .body > <path>`), add one `- [ ] #<child>` line per child in order, keep all other text unchanged, and save it with `gh issue edit <tracker> --repo MapCairn/geolint --body-file <path>`. Without triage rights, comment the list of children on the tracker instead.

## 5. Report

Use the report in `AGENTS.md` ("Definition of done"). Under **PR** give the tracker's URL; under **Deviations** list steps you merged, split or left out and why; under **Issues to file** list the issues you created, in order, with what blocks what, and the questions still open.

---
name: review-tests
description: "Review the tests of a geolint change adversarially: read each assertion for strength, find tests that pass without the change, break the code on purpose in a scratch worktree (a threshold, a branch, an ordering, a factor) to see whether a test fails, check for flakiness, read coverage as behaviour proved, and triage a flaky test to its cause. Use before a pull request with new or changed tests merges, when someone asks whether tests are good enough, and when a test fails intermittently. Designing tests before the code is design-tests; the rest of a pull request review is land-pr."
---

# Review the tests

An adversarial review of a change's tests. `land-pr` section 2 reviews the whole pull request and names "a test that cannot fail without the fix" as a common miss; this skill is the method for finding it, by running the tests against code that is wrong on purpose. It changes nothing on the branch: the edits happen in a scratch worktree and are thrown away. The `test-reviewer` agent runs it.

Example: a rule flattened a ring's duplicate closing vertex before measuring its area. Deleting that step left every test green, because no fixture used a ring whose closing vertex repeated an earlier one. Section 4 is that experiment: change one thing, run the tests, and report the survivor with the case that would kill it.

## Inputs

- A pull request number, or a commit and its base (for a past change, the commit and its first parent).
- The issue it closes, and the documents it changes.

## 1. Set up

1. Read the pull request with `node scripts/agents/thread.mjs pr <n>`. If it is from outside the project (`land-pr` section 2), do not run its code: review from `gh pr diff <n>` and `git show <sha>:<path>`, do sections 2 and 5 by reading, and say that sections 3 and 4 were not run.
2. `git fetch <origin-or-upstream> pull/<n>/head`, note the head SHA, and find the base with `git merge-base <origin-or-upstream>/main <head-sha>`.
3. `git worktree add --detach .claude/worktrees/review-<n> <head-sha>`, then `npm ci --ignore-scripts` inside it. Never edit the branch, the main checkout or another worktree.
4. List the diff with `git diff --stat <base> <head-sha>` and sort the files into code (what ships), tests (`*.test.ts`, fixtures) and documents.
5. Run the changed and new tests once at the head and confirm they pass: `cd .claude/worktrees/review-<n> && npx --no-install vitest run <file>`. A failure here is a finding of its own; stop the experiments until you know why.

## 2. Read the claims and the assertions

List every behaviour the change claims: the issue's acceptance criteria, the pull request description, changed documents and TSDoc. Next to each, write the test that proves it, or "none". A claim with no test, or a test looser than the sentence that describes it, is a finding.

Then read each new or changed test for these:

- **Tautology**: the expected value comes from the code under test, from a copy of its formula, or from a list the module exports, so the test compares the code with itself.
- **Inputs off the boundary**: work out the inputs of a case whose name states a boundary ("just below the limit") and check they land there.
- **Weak matcher**: `toBeTruthy`, `toBeDefined`, `toContain`, `some(...)`, a length above zero, a wide `toBeCloseTo`, or `not.toThrow` alone, where the exact value is known.
- **Assertion that may not run**: `expect` inside a callback, loop or `if` that can be skipped, an empty case table, a `catch` that swallows.
- **Start equals end**: the state before the action already satisfies the assertion, so the action is not tested.
- **Negative only**: "reports nothing" with no positive control through the same helper, so a helper that never runs the rule passes.
- **Mock instead of result**: a call count or a `vi.mock` of the project's own module, where an observable result exists (`design-tests` section 3).
- **Fixture pair**: a failing fixture that also trips another rule, or a passing fixture that is empty, so the rule is not what the test exercises.
- **Parser cases**: for code that reads text from outside, list from the format's own specification the valid forms it allows and the invalid ones (`design-tests` section 5). Then run each form no case covers through the parser in a temporary test and report what it returns: a valid form misread, and an invalid form accepted, are both findings.
- **Hand-rolled tag or text patterns** in a test or a check: CodeQL flags them. Parse instead.

## 3. Without the change

In the scratch worktree, put the changed code files back as they were at the base and keep the new tests: `git restore --source=<base> -- <changed code files>`. Leave out new files (they do not exist at the base, and their tests fail on the import, which proves nothing) and documents. Run the new and changed tests.

Each test written for the change should fail, for the reason its name gives. One that passes is either a guard (it keeps behaviour that already held): list it as a guard; or it claims the change and proves nothing about it: report it. Then `git restore --source=<head-sha> -- <the same files>` and check `git status` is clean.

For a refactor that claims no change in behaviour, a change made only of new files, or tests that fail at the base only because a name they use was renamed, skip this for those tests and say so; section 4 carries the weight.

## 4. Break it on purpose

Choose two to four mutations from the code diff, preferring the places a wrong value would ship silently:

- a threshold, limit or constant moved a little (`>=` to `>`, a length off by one);
- a factor or step dropped (a unit conversion, a scale, a normalisation);
- a branch removed or forced (delete an early return or a guard, replace a condition with `true`);
- a reset removed (a flag that is set and never cleared);
- an ordering swapped (two steps, a sort direction, which of two values wins);
- a member dropped from a list or a set the code checks against;
- a parser rule loosened or tightened (accept an extra argument, refuse a valid form).

For each, one at a time: edit only code in the scratch worktree, with your edit tool, and check with `git diff --stat` that exactly one line changed; run the narrowest set that should catch it, then the whole suite; record killed or survived and the test that killed it; restore with `git restore -- <file>` and check `git status` is clean. A survivor is a finding. Write the smallest case that would kill it, run that case against the mutant in a temporary test file, then delete the file. If your case does not kill the mutant either, say "fix unproven" rather than offer it.

A survivor counts only if the mutated line runs. Coverage shows that for a line (`npx --no-install vitest run --coverage --coverage.include=<file> --coverage.reporter=text`), but a covered line that no mutation can break proves nothing: the survivors are the measure, not the percentage.

## 5. Flakiness

Look for each of these in the new and changed tests:

- a fixed wait, a sleep, `setTimeout` in a test, or real timers where the code has a delay;
- a test that relies on another test's state, on module state that is not reset, on a stubbed global that is not restored (`vi.unstubAllGlobals`, `vi.useRealTimers`), on the order of files returned by a directory read, on `Date.now()` or randomness without a fixed seed (a fast-check failure prints its seed; pin it), or on a fixed port or a shared temporary path;
- a CI-only condition: a test that depends on `CI` or on a file another step writes, checked against the job order in `.github/workflows/`.

## 6. A flaky test

When a test fails sometimes:

1. Reproduce: run it alone, repeated (one run per call), then with others and under load. Note the rate and the first failing message.
2. Classify: timing (a wait or a timer), order (shared or leaked state), environment (load, a path or system difference), or a real bug that only shows sometimes.
3. Fix the cause: pin the time or the seed, wait for the observable event, isolate the state, or fix the code. Never loosen the assertion, lengthen a timeout, add a retry or skip the test.
4. Show the fix with the same repeated run, and file what you cannot fix with `create-issue`.

## 7. Clean up

Delete any temporary test file, check `git status` is clean, `git worktree remove .claude/worktrees/review-<n>`, and confirm that nothing you started is still running. If a restore fails or `git worktree remove` refuses on a dirty tree, report the path and its state under Deviations; do not use `--force` or touch other worktrees.

## Report

The report in `AGENTS.md` ("Definition of done"): **PR** is the pull request reviewed; **Checks** each command run and its result; **Seen** holds the findings, most serious first, each as `<path:line or path and test title> - what is wrong. Evidence: <the mutation or command and its result>. Fix: <the case to add, and whether it was run against the mutant>`, then the guards from section 3, then this table:

| Mutation | File:line | Result | Killed by |
| -------- | --------- | ------ | --------- |

**Deviations** says which sections were not run and why; **Issues to file** holds real work outside the change. Do not post on GitHub; the caller decides what to post.

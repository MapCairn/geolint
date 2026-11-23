---
name: design-tests
description: "Design the tests for a geolint issue or plan before the code: which behaviour each test proves, at which level (unit, fixture, property, fuzz, command, build output, benchmark), how timing and files are handled, which test fails first and why, and what mistake each test would catch. Use when picking up an issue, when writing the Tests section of a plan, or when someone asks what to test or how. Judging tests that already exist is review-tests."
---

# Design the tests

Test design for geolint. `pick-up-issue` starts with a failing test and `plan-change` has a "Tests" section; this skill decides what goes in them. Its output is a test plan for the issue or plan. `review-tests` checks the tests after they are written.

Example: a rule reports a ring as too small below an area threshold. A passing and a failing fixture sit far from the threshold, so moving it from `>=` to `>` or loosening it by a tenth breaks no test. This skill asks for a pair on each side of the threshold, as close as the values allow, so a moved threshold fails a test on purpose.

## Inputs

- The issue with its acceptance criteria, or the plan, and who accepted it.
- The design notes, if `plan-change` wrote them.

## 1. Read

1. `AGENTS.md` ("Engineering principles", "Definition of done") and the parts of `README.md` and `docs/plans/0001-geolint.md` that describe the code.
2. The tests that already cover the code: the `*.test.ts` files beside it, `src/engine/fixtures.test.ts` and the folder under `fixtures/` for a rule, and the CLI tests in `src/cli`. Extend a test file before adding one, and reuse its helpers.
3. The documents that will describe the behaviour (the README rule table, "Failure modes and limitations", TSDoc). Each sentence in them is a claim a test must be at least as strict as.

## 2. List the behaviours

Write one line for each acceptance criterion and each sentence a document will carry: "when <situation>, <observable result>". An observable result is something a person or a later call can see: a finding (rule id, severity, confidence, position), the fixed text, an exit code, a report format, a file written. A private variable or a call count on your own code is not one. A behaviour with no line here has no test.

## 3. Choose the level

Use the lowest level that can fail for the right reason. Most changes use two or three levels; leave the others out.

| Level        | Use it for                                                                                   | Where and how                                                                          |
| ------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Unit         | Pure logic: geometry, winding, projection tests, formatting                                  | A `*.test.ts` beside the file, Vitest                                                  |
| Fixture      | A rule: one input it reports and a similar one it does not                                   | `fixtures/<rule-id>/`, read by `src/engine/fixtures.test.ts`                            |
| Property     | A parser, encoder, fix or round trip over input from outside                                 | fast-check, as in `src/engine/fuzz.test.ts` and `src/engine/fix.test.ts`                |
| Command      | Options, exit codes, standard input, globs, `--fix` files, report formats                    | `main(argv, io)` in `src/cli`, with a temporary directory and fake streams              |
| Build output | The packed tarball, the installed command, generated files, scripts in `scripts/`            | `npm run smoke`, and tests in `scripts/test`                                            |
| Benchmark    | A change to a rule's speed                                                                   | `npm run bench:rules`, run by hand; the result goes in the pull request                 |

A heuristic rule also needs the cases that make it wrong (valid data it flags, a mistake it misses), because "Failure modes and limitations" has to say what they are.

## 4. Time, files and order

- No sleeps. Use fake timers where code has a delay, and wait for the observable event, not a duration.
- Each test builds its own state: a fresh temporary directory, its own input, no dependence on another test running first or on module state it leaves.
- A test that writes files stays in a temporary directory outside the repository and removes it.

## 5. Make each test able to fail

For each test, write the wrong implementation it rejects. If you cannot name one, the test proves nothing.

- Thresholds and limits: one case on each side of every boundary, as close as the values allow, and the exact boundary where the code says "at least" or "more than".
- Branches: one case per branch that only that branch passes. A test whose starting state equals the fallback's result cannot tell the two apart.
- Ordering: a case where swapping two steps changes the output.
- Source: where the same result could come from somewhere else (a default, a cached file, the installed copy instead of the packed one), check where it came from.
- "Reports nothing" cases are paired with a positive control through the same helper, so a helper that never runs the rule fails the pair.
- Hostile input, for anything that parses text from outside: empty, whitespace, wrong case, very long input, very deep nesting, numbers out of range, `NaN` and infinities, objects of the wrong shape, truncated files and invalid UTF-8. Valid input written every way the format allows needs cases too, and so does invalid input the parser might accept rather than refuse.
- A regular expression on input from outside runs in linear time.

## 6. The failing-first test

Pick the one test that shows the issue is real. Say the command that runs it (`npx --no-install vitest run src/<file>`) and the failure you expect: an assertion naming the wrong value. A test of a new export fails first on the missing export; add a stub that returns a wrong value and see the assertion fail too, so the test is known to check something. For a refactor with no change in behaviour, the failing-first test is replaced by the existing tests passing before and after; say which.

## 7. Output

Into the issue's design notes, or under "Tests" in the plan:

```markdown
### Tests

Fails first: `<file>` - "<test name>": <the assertion that fails today, and why>.

| Behaviour | Level | File | Substitutes and timing | Rejects |
| --------- | ----- | ---- | ---------------------- | ------- |

Runs in: <the job and step of `.github/workflows/` for each row; Vitest tests run in the `CI` workflow's coverage step, the packed-tarball test in `pack and install`>.
Not tested, and why: <each behaviour left out, or "none">.
```

"Rejects" names the wrong implementation from section 5. A plan's order of work says which step adds which rows. The issue's task list gets one box per test file.

## Do not

- Write the tests here (`pick-up-issue`), or review tests someone wrote (`review-tests`).
- Plan a test on a private variable, a snapshot of a whole report, or a call count where an observable result exists.
- Plan a sleep, a retry or a longer timeout to make a case pass.
- Post on GitHub unless the person asked; put the plan in your report.

## Report

The report in `AGENTS.md` ("Definition of done"): **PR** is the issue or plan; **Checks** "none, no code" unless you ran something; **Seen** holds the test plan; **Deviations**; **Issues to file**.

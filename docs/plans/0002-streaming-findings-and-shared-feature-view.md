# 0002: Stream findings out per feature, and share one view of each feature between rules

Status: in progress. Tracking issue: [#12](https://github.com/MapCairn/geolint/issues/12). It carries out two tasks of [#3](https://github.com/MapCairn/geolint/issues/3).

## Goal

A file with a very large number of findings (every polygon wound the wrong way is the common case) lints in memory that does not grow with the number of findings, and the command prints its output as it goes. Separately, the rules stop reading and checking the same rings once each: the leaf geometries and rings of a feature are worked out once and shared.

Nothing changes for a user who reads the output: the findings, their text and the exit codes are the same. Two details of the output change and are open questions below (the order of document-level findings, and the key order of the JSON).

## Ground rules

- `src/engine` stays free of Node built-ins, so the streaming API is built on async iteration and plain callbacks, and the Node sink lives in `src/node` or `src/cli`.
- `lintBytes` keeps returning a sorted `LintReport` for library users and the tests. Streaming is added beside it and is not a replacement.
- Every rule keeps working when called as `check(feature, context)`, as every test does. A rule must not mutate its input (`Rule.check` says so already).
- Test first, 95% coverage, no weakened assertions. A speed claim is made only from a benchmark on a quiet machine.
- A change to the JSON output shape is a change to the package's public output format (`formatJson` says so), so it is listed here, not slipped in.

## Design

### What holds the memory today

- `lintBytes` appends every finding to one array and sorts it at the end (`src/engine/lint.ts`).
- The command lints every file, keeps all the reports, then `render` builds the whole output as one string (`src/cli/main.ts`, `src/engine/report.ts`, `src/engine/sarif.ts`). The text of a finding is held at least twice: as an object and as part of the output string.
- With `--jobs`, a worker sends a whole `FileReport` back to the main thread (`src/node/pool.ts`).
- The benchmark's peak memory is not this: see #4. Its inputs have no findings.

Step 1 measures the cost of one finding (heap per finding on a 20 MB collection in which every polygon is wound the wrong way) so the rest is decided on a figure, not a guess.

### A. Streaming findings

Rules can already produce findings one feature at a time, and the findings of one feature, sorted by their feature-relative pointer, come out in document order. So per-feature output needs no global sort.

- **Engine.** A new `lintStream(chunks, options)` returns an async iterable of per-feature batches (`{ index, findings }`, with document paths) and, at the end, a trailer: the feature count, the input error, the document-level findings and the counts by severity. `lintBytes` is rewritten on top of it (collect, sort), so there is one code path.
- **Counts.** The summary and the exit code are computed from counters kept as findings go by, not from `report.findings`.
- **Writers.** `formatText`, `formatJson` and `formatSarif` gain a writer form that takes the stream and a sink (`write(text)`), and keeps the string form for the library and tests by running the writer into an array. Text is one line per finding. JSON and SARIF open their arrays, write one element per finding, and close them. SARIF needs `artifacts` and the rule metadata first and `invocations` last, which suits a single pass.
- **Command.** The sequential path (one thread) streams straight to `io.stdout`. Output for several files is written in the order the files were given, as today.
- **`--jobs`.** A worker would have to send batches back. Rejected for now: a file linted in a worker keeps its report in memory and is written when that worker finishes, so the memory bound is per file. The sequential path, which is the one a very large single file takes (`jobs > 1 && tasks.length > 1` is the only case that uses workers), streams fully.
- **`--fix`.** Unchanged: it lints the fixed copy, which goes through the same path.

Options rejected:

- Shrinking each finding (shared message strings, a compact form) instead of streaming. It lowers the constant, not the growth, and every rule would change. Worth doing only if step 1 shows the object, not the retention, is the cost.
- Writing findings to a temporary file and sorting it afterwards. It keeps the global sort but adds disk use, clean-up and a new failure mode.

### B. One view of each feature for the rules

Every rule that reads geometry calls `leafGeometries`, `ringsOf`, `linesOf` or `matchingPositions` (`src/engine/geometry/walk.ts`) on the same feature, and each call walks and validates the coordinates again. #3 measured this at about 10 percent of the CPU time.

- **Chosen: memoise in `walk.ts`.** `leafGeometries(feature)`, `ringsOf` and `linesOf` keep their results for the feature read last. The first rule to ask pays, the others reuse it, and the next feature replaces the entry, so one feature is held at most. A `WeakMap` keyed by every feature was built first and measured: no faster, and peak memory rose from about 180 MB to 250 to 275 MB on the 50 MB collection, so it was dropped for the one-feature entry (0.83 s to 0.67 s, memory unchanged). The `Rule` interface does not change, no rule needs editing, and a direct call `check(feature, context)` works as before. The results are typed `readonly` so a rule cannot change what the next one sees. A non-object feature is not cached.
- **Rejected: pass a `FeatureView` to `Rule.check`.** It is the explicit design and it is what #3 first proposed, but it changes the signature of every rule, `fix` and every test call, and it asks the engine to build the view for rules that do not read geometry. It is worth reconsidering only if the memoised version measures no better.

The shared view relies on three things that already hold: a rule never mutates the parsed feature, the fix passes build new objects (so a repaired feature is a different object and replaces the entry), and features are linted one at a time.

## Tests

- Streaming: for the fixtures and the fuzz inputs, the findings from `lintStream`, collected, equal `lintBytes` apart from the agreed order change; the counts equal the counts of the collected findings; the exit code is unchanged.
- Writers: the text, JSON and SARIF written through a sink parse to the same content as the string forms; a test with a sink that records the number of `write` calls proves that output starts before the last feature is read (a reader fake that blocks the last chunk).
- Memory: a test that lints a generated input in which every feature has a finding and checks that the heap used by the stream path stays under a bound that the array path exceeds (the bound is set from step 1's measurement, with `--expose-gc`).
- Shared view: a test that counts the walks (a spy on the first read) and proves two rules reading one feature walk it once; a test that proves a feature repaired by `fix` is not served from the old entry; the existing rule tests prove nothing else changed.

## Order of work

1. Measure the retained size of a finding, and the size of the output string, on a generated input in which every feature has a finding. Record it in #12. No code.
2. Memoise the feature view in `walk.ts` (`src/engine/geometry/walk.ts`, its tests). One pull request. Measured with `npm run bench:rules` on a quiet machine before it is called a gain.
3. `lintStream` in the engine, with `lintBytes` rebuilt on it (`src/engine/lint.ts`, `src/engine/types.ts`, tests). Output unchanged apart from the order decision.
4. The text writer and the command's sequential path (`src/engine/report.ts`, `src/cli/main.ts`).
5. The JSON and SARIF writers (`src/engine/report.ts`, `src/engine/sarif.ts`).
6. Counters for the summary and exit code, and removal of the string-building path from the command.

Steps 3 to 6 each build and pass on their own; 4 and 5 can swap.

## Documents to update

- `README.md`: the output format and its order in step 3 or 4 (whichever changes it), "Performance" after the quiet-machine measurement, and the library section for `lintStream` in step 3.
- `ROADMAP.md`: only when #3 and #4 finish.
- `ATTRIBUTIONS.md` and `NOTICE`: none.

## Risks

- **Output order changes** (see open question 1). Contained by deciding it first and testing it.
- **A writer that fails halfway leaves truncated JSON.** An input error already stops reading early; the writer must still close its arrays and report the error in the trailer. A test covers a syntax error in the last feature.
- **Memoisation hides a rule that mutates its input.** The rule contract forbids it; several rule tests already freeze their input, and a new test freezes a feature deeply and lints it with every rule.
- **Streaming adds code to keep** for a case (a file with millions of findings) that step 1 may show is rare. Step 1 comes first for that reason, and a result that shows the retained size is small stops steps 3 to 6.

## Decided and open

Decided by the maintainer on 2026-11-24, taking the recommendations below as written:

1. Document-level findings are written after the feature findings, and the README says so.
2. In the JSON output `findings` is written before `featureCount`; `version` stays 1.
3. The `--jobs` path stays buffered per file, and the README says memory is bounded per file there.
4. The shared feature view (step 2) is done first, and whether to build streaming (steps 3 to 6) is decided from the figure in step 1.

Open: whether to build streaming at all, until step 1 reports. Issues for steps 3 to 6 are filed once it does.

Recommendations the decisions above were taken from:

1. **Order of document-level findings.** Today every finding is sorted together by path, so a finding at `/crs` or at the root comes before the features and one at `/type` comes after them. Streaming cannot place a finding it learns of at the end ahead of findings already written. Recommendation: write feature findings in document order, then document-level findings, and say so in the README. The alternative, buffering all output, defeats the purpose.
2. **JSON key order.** `featureCount` comes before `findings` today and is known only at the end. Recommendation: write `findings` first and `featureCount` after it. JSON readers do not depend on key order, but the bytes change, so it is the maintainer's call as a change to the public output format. Keep `version: 1`.
3. **The `--jobs` path.** Recommendation: leave it buffered per file (above), and say in the README that memory is bounded per file there.
4. **Whether to do part A at all** once step 1 reports. Recommendation: do part B (cheap, no API change) first and decide A from the figure.

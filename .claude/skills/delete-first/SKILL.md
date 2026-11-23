---
name: delete-first
description: "Challenge whether a geolint change should be built at all, before and after it is written: whether the code, option, abstraction, file, dependency or document needs to exist, what the repository or an existing dependency already does, what can be deleted instead, and the smallest change that meets the acceptance criteria. Use before building from an issue or a plan, when a plan or pull request looks large for what it claims, and when someone asks to simplify, cut or lean out a change. It runs earlier and stricter than simplify; the independent read is the lean-reviewer agent."
---

# Delete first

`AGENTS.md` says the best code is the code that is not written: delete what nothing needs, follow KISS, YAGNI and the open-closed principle, and own the code. This skill is the procedure for doing that on one issue, plan or pull request. `plan-change` asks for the smallest option; this skill asks the question on its own, before the design is settled, and again on the diff. `simplify` and the simplify step in `pick-up-issue` tidy code that was written; this asks whether it should exist. `fresh-eyes-reviewer` reads a pull request against everything in `AGENTS.md`; this reads it only for what could be less.

Example: a change adds a second path-matching helper beside the one in `src/node`. The question in section 1 is whether the existing helper does the job; the new one survives only if it names the case the old one cannot serve.

## Inputs

- An issue and its acceptance criteria, a plan, or a pull request.
- For a pull request, its diff and the issue it closes.

## 1. Before building

Answer each in a sentence or two, with a path for anything you say exists. "Do not know" means look, not guess.

1. **Does it need to exist?** Which acceptance criterion fails without it? A piece that serves no criterion, or serves a case nobody has, is cut. Write who uses it today.
2. **What already does this?** Search the repository first (the helpers in `src/engine`, `src/node` and `scripts/`), then a dependency the package already has, then a tool the workflow already runs. Prefer one that needs no new dependency; a new one follows the rules in `AGENTS.md`.
3. **What can be deleted instead?** A change that removes code, a branch, an option or a document and meets the criteria beats one that adds. When the fix is a deletion, it is its own change with its own issue and tests (`AGENTS.md`, "Own the code"): say so and do not fold it into a change about something else.
4. **What is the smallest change that meets the criteria?** Describe it and compare it with what is planned. List what the larger version adds and who needs that.
5. **Does each addition earn its place?** For every new file, module, option, flag, exported name, interface, config key and document, name its first user. An interface needs two implementations, counting the fake. A config key needs a reader. A document that restates code is a pointer to the code.

Stop at the first answer that removes work, and say what the change becomes.

## 2. At review

Read the diff for these, each with `path:line` and the deletion or the simplification you propose:

- An addition no acceptance criterion needs.
- Duplication of an existing helper, script, rule or document.
- A speculative interface: one implementation, counting the fake, and no second one planned in an open issue.
- Dead code, an export nothing imports, a parameter always passed the same value, a branch no input reaches.
- A flag argument, a configuration key nobody reads, an option with one caller.
- A document that restates the code, repeats another document, or describes something not built.
- A test that repeats another test's assertions with different data and no different outcome. Say what it duplicates and where the remaining coverage lives; the author decides.
- Net lines: added minus removed, and for each large file whether the size is the work or the repetition.

Give each proposal's saving in lines or files, as information for the author; it is not a ranking. Check it before you propose it: grep for users of what you would delete, and read the test that covers it.

## 3. What you never propose

These are fixed points, and a smaller change is not worth losing one:

- The only test of a behaviour, a rule's passing and failing fixtures, and any privacy, security, licence, names or portability check, or any review step. A duplicate test may be reported, with what it duplicates and where the remaining coverage lives.
- Duplication that `AGENTS.md` or a check requires: the generated agent copies, and documents the definition of done requires.
- The licence and legal terms and the security policy (`SECURITY.md`).
- Error handling at a boundary where input is untrusted (the reader, the command line, the files the command opens).

A check that is slow or awkward is a reason to make it faster or clearer, not to drop it. A proposal never overrides `AGENTS.md`. When you are unsure whether something is a fixed point or required, report the question, not a cut.

## 4. Report

Order the proposals by risk: a safe removal, such as dead code nothing uses, comes above a duplicated test, and a question above a cut. Each is `path:line - what could go. Saves: N lines or files. Fix: delete, merge or simplify, and what stays`. Add a short "kept" list of things you questioned and found necessary, with the reason, so the author sees what was checked. If you propose nothing, say what you searched for and did not find. Do not pad: a proposal you cannot back with a path is not one.

The author decides. A deletion that is its own change goes under **Issues to file**.

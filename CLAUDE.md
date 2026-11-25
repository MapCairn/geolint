@AGENTS.md

## Project skills and agents

The skills in `.claude/skills/` (`create-issue`, `plan-change`, `split-plan`, `pick-up-issue`, `land-pr`, `delete-first`, `design-tests`, `review-tests`, `review-docs`, `review-security`, `triage-dependency-pr`) are the procedures behind `AGENTS.md`; load the one that matches the task before you start. The agents `implementer`, `fresh-eyes-reviewer`, `lean-reviewer`, `test-reviewer` and `security-reviewer` in `.claude/agents/` run `sonnet` and follow those skills. Other tools read generated copies (see `docs/guides/working-with-agents.md`), so after editing a skill or agent run `npm run agents:sync`.

## Models

In Claude Code the tiers in `AGENTS.md` are `haiku` (small and fast), `sonnet` (default) and `opus` (most capable). Set the `model` parameter on every `Agent` call: leaving it out inherits the session's model, which may be the one above the most capable tier. Agents started through a Workflow script count towards the limit on how many run at once.

`fable` is the model above them, so the rule in `AGENTS.md` on a model above the most capable tier applies to it: never start a `fable` agent or set `model: fable` without that authorisation. If you think a task needs it, say why and ask.

## Personal preferences

Claude Code also reads `CLAUDE.local.md` (git-ignored) for your own working style. `docs/guides/personal-preferences.md` explains it.

## Editing the instruction files

This file and `AGENTS.md` load into every session, so each line costs context and a long or contradictory file is followed less reliably. Keep each under about 200 lines, state rules as specific, checkable instructions, and put procedures that matter for one task in a skill and material for one area of the code in the document that owns it (`README.md`, `docs/guides/`), with a pointer from `AGENTS.md`. Do not import long documents with `@`: an import loads the whole file every session. Rules that must hold every time belong in a hook, a test or the lint, not only in prose. When a rule changes, change it in one place and remove the old wording; run `/doctor prompt-audit` now and then to find stale or conflicting lines.

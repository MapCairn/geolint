@AGENTS.md

## Project skills and agents

The skills in `.claude/skills/` (`create-issue`, `plan-change`, `split-plan`, `pick-up-issue`, `land-pr`) are the procedures behind `AGENTS.md`; load the one that matches the task before you start. The agents `implementer` and `fresh-eyes-reviewer` in `.claude/agents/` run `sonnet` and follow those skills. Other tools read generated copies (see `docs/guides/working-with-agents.md`), so after editing a skill or agent run `npm run agents:sync`.

## Delegating to sub-agents

Use sub-agents for wide searches, long verification runs and a fresh-eyes review of a diff before it is merged. Do a small, strictly sequential task yourself. The limits, the brief and the clean-up rules in `AGENTS.md` ("Sub-agents") apply, and agents started through a Workflow script count towards the limit on how many run at once.

Set the `model` parameter explicitly on every `Agent` call and every `agent()` call inside a Workflow script; omitting it silently inherits the session's model. The tiers in `AGENTS.md` are, in Claude Code, `haiku` (small and fast), `sonnet` (default) and `opus` (most capable).

`fable` is the model above them, so the rule in `AGENTS.md` on a model above the most capable tier applies to it: never start a `fable` agent, set `model: fable` or put it in a Workflow script without that authorisation. If you think a task needs it, say why and ask.

## Dynamic workflows (Workflow tool)

Reach for the Workflow tool when a task has 3+ independent, parallelisable subtasks, or would benefit from a pipeline or judge panel. If `ultracode` isn't already on for the session, propose the workflow in one or two sentences (its rough shape and cost) and wait for a go-ahead before invoking it. Every `agent()` call inside a workflow script must set `model` explicitly.

## Editing the instruction files

This file and `AGENTS.md` load into every session, so keep each under about 200 lines, state rules as specific, checkable instructions, and put procedures for one task in a skill. Do not import long documents with `@`. Rules that must hold every time belong in a hook, a test or the lint, not only in prose. When a rule changes, change it in one place and remove the old wording.

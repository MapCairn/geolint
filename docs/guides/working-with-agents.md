# Working with coding agents

The project's skills and agents were written for Claude Code, and everyone is welcome to use the coding agent they prefer: Claude Code, Codex, opencode, GitHub Copilot, Antigravity, Cursor, Qwen Code or another. The rules live in one place, [`AGENTS.md`](../../AGENTS.md), and apply whichever tool you use. What differs is how much a tool can enforce: a rule is written as an instruction everywhere, and Claude Code can also back some of them with settings. This guide says what each tool reads, how to start, and what only works in Claude Code.

## One source for each thing

| Thing  | Source (edit this)                                    | Copies for other tools (generated, do not edit)                                                                                                   |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules  | `AGENTS.md`                                           | `CLAUDE.md` imports it; `.github/copilot-instructions.md` is a few lines that point to it                                                         |
| Skills | `.claude/skills/<name>/SKILL.md`, project skills only | `.agents/skills/<name>/`                                                                                                                          |
| Agents | `.claude/agents/<name>.md`                            | `.agents/agents/<name>.md`, `.opencode/agents/<name>.md`, `.codex/agents/<name>.toml`, `.github/agents/<name>.agent.md`, `.qwen/agents/<name>.md` |

After you change a skill or an agent, run `npm run agents:sync`. It copies files (never links, so it works on Windows) and removes stale ones in the six output folders only. `npm run agents:check` does the same comparison without writing; `npm run lint` and the pre-commit hook run it, so stale copies cannot merge. The script takes the repository root from its own location, and fails in both modes when `.claude/skills` is missing or there is nothing to generate.

`agents:check` also holds every project skill to the rules that make it work in more than one tool:

- `name` equals the folder name and is lowercase kebab-case, at most 64 characters. A symbolic link anywhere in a skill folder, in the agent files or in a generated folder or its parent is refused, at any depth and in both `agents:sync` and `agents:check`, and the error names its path, because the sync copies and never links and a link could read from or write outside the repository.
- `description` is present and at most 1024 characters.
- Frontmatter is one `key: value` per line, and a plain value does not contain `: ` or ` #`. Wrap such a value in double quotes.
- The body names no tool or feature that only one tool has (the list is `CLAUDE_ONLY_TOOL_NAMES` in `scripts/agents/skills.mjs`). The same list is applied to the body of every agent that is generated.

`skills-lock.json` would record skills installed from other sources; there are none, and the file does not exist. A skill named in it is neither checked nor copied.

### Agents

An agent file is a short role: a name, a description and the text of the role, which points to a skill for the procedure. The generated files carry only those three things (and, for Antigravity, a list of its own tool names). They leave out Claude's tool list and model, so the other tools use their own defaults and the tiers in `AGENTS.md` are chosen by whoever starts the agent.

Tool limits, such as a list of allowed tools, are enforced only in Claude Code (and Antigravity's tool list). In every other tool a limit like "the reviewer does not edit" rests on the instruction in the role text alone, and nothing technical stops a shell from writing. The reviewer's role text says so.

## What each tool reads

This table was checked on 2026-11-12 against each tool's own documentation. A blank means the documentation did not say.

|                | Instructions                                                  | Skills                                                 | Agents                                                                      |
| -------------- | ------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Claude Code    | `CLAUDE.md` (here it imports `AGENTS.md`)                     | `.claude/skills`                                       | `.claude/agents/*.md`                                                       |
| Codex          | `AGENTS.md`                                                   | `.agents/skills`                                       | `.codex/agents/*.toml` with `name`, `description`, `developer_instructions` |
| opencode       | `AGENTS.md`                                                   | `.opencode/skills`, `.claude/skills`, `.agents/skills` | `.opencode/agents/*.md`, with `mode: subagent`                              |
| GitHub Copilot | `.github/copilot-instructions.md`, `AGENTS.md` or `CLAUDE.md` | `.github/skills`, `.claude/skills`, `.agents/skills`   | `.github/agents/*.agent.md`                                                 |
| Antigravity    | `AGENTS.md`, also inside `.agents/`, and `.agents/rules/*.md` | `.agents/skills`                                       | `.agents/agents/<name>.md`, with a `tools` list in tool names of its own    |
| Cursor         | `AGENTS.md`, and `.cursor/rules/*.mdc`                        | `.agents/skills`, `.cursor/skills`, `.claude/skills`   | `.cursor/agents`, `.claude/agents` and `.codex/agents`                      |
| Qwen Code      | `AGENTS.md`, as well as its own `QWEN.md`                     | `.agents/skills` and `.qwen/skills`                    | `.qwen/agents/*.md`, with `name` and `description`                          |

A tool that has skills but no agents, or the reverse, still works: tell the agent which skill to follow.

## How to start

Tell the agent the issue and the skill, in your own words. For example:

- "Pick up issue 12 and follow the `pick-up-issue` skill."
- "Open the pull request and follow the `land-pr` skill. Do not merge."
- "Review pull request 14 with the `fresh-eyes-reviewer` role."

Where the tool has agent support, name the agent (`implementer` or `fresh-eyes-reviewer`) instead. Where it does not read the skill folder on its own, point it at `.agents/skills/<name>/SKILL.md`. The rules, including the limits on sub-agents and the model tiers, are in `AGENTS.md`. In Claude Code the tiers are named in `CLAUDE.md`; the generated agent files set no model.

When you start an agent, copy the brief block from `pick-up-issue` ("Briefing an agent") so it carries the checks, the clean-up and the report. An agent that another agent started does not start sub-agents: it does the simplify step and the review checklist inline, and its caller runs the independent review.

Use the small tier (in Claude Code, haiku) where the work is mechanical and the result is easy to check: searching and listing, applying a fully specified edit, running a fixed check and summarising it, formatting, and ticking boxes. Do not use it for design decisions, geometry or parsing code, reasoning about hostile input, or a review that must find what the author missed. Brief a small model with one task, the exact files, the exact change or question, the format of the answer and a stop condition. When a small-tier brief fails, escalate to the default tier with a clearer brief instead of retrying the same one.

## Names the project keeps out

`npm run lint`, the `commit-msg` hook and the CI pull request check refuse a name the maintainer keeps only as a hash (`scripts/names-check.mjs`) and print where it is, never what it is, so delete the text at that location and do not try to find out what matched.

## Only in Claude Code

- The Workflow tool and its opt-in rule, and the `fable` model rule, in `CLAUDE.md`.
- Tool limits on agents (their `tools` lists).

## What has not been checked

- No skill has been run end to end in another tool in this repository.
- Documentation changes often. A path that stops working is a reason to open an issue, with the tool, its version and the page that says otherwise.

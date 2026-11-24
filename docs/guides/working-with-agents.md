# Working with coding agents

The project's skills and agents were written for Claude Code, and everyone is welcome to use the coding agent they prefer: Claude Code, Codex, opencode, GitHub Copilot, Antigravity, Cursor, Qwen Code or another. The rules live in one place, [`AGENTS.md`](../../AGENTS.md), and apply whichever tool you use. What differs is how much a tool can enforce: a rule is written as an instruction everywhere, and Claude Code can also back some of them with settings. This guide says what each tool reads, how to start, what only works in Claude Code, and what has and has not been checked.

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
- Frontmatter is one `key: value` per line, and a plain value does not contain `: ` or ` #`. Claude Code accepts that, but a strict YAML reader does not, and other tools may skip the skill without saying so. Wrap such a value in double quotes.
- The body names no tool or feature that only one tool has (the list is `CLAUDE_ONLY_TOOL_NAMES` in `scripts/agents/skills.mjs`). The same list is applied to the body of every agent that is generated.

`skills-lock.json` would record skills installed from other sources; there are none, and the file does not exist. A skill named in it is neither checked nor copied.

### Agents

An agent file is a short role: a name, a description and the text of the role, which points to a skill for the procedure. The generated files carry only those three things (and, for Antigravity, a list of its own tool names). They leave out Claude's tool list and model, so the other tools use their own defaults and the tiers in `AGENTS.md` are chosen by whoever starts the agent.

Tool limits, such as a list of allowed tools, are enforced only in Claude Code (and Antigravity's tool list). In every other tool a limit like "the reviewer does not edit" rests on the instruction in the role text alone, and nothing technical stops a shell from writing. The reviewer's role text says so.

## What each tool reads

Checked on 2026-11-12 against each tool's own documentation. The pages were read through a summarising web reader; the tools themselves were not run, except Claude Code (2.1.322). None of the tools' versions is stated in its documentation, apart from Claude Code needing 2.1.277 or later to read `AGENTS.md` on its own. A blank means the documentation did not say.

|                                | Instructions                                                                                                                                                        | Skills                                                                                                                                                                        | Agents                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Claude Code                    | `CLAUDE.md` (here it imports `AGENTS.md`). Reads `AGENTS.md` alone only when there is no `CLAUDE.md`                                                                | `.claude/skills`. Does not read `.agents/skills`                                                                                                                              | `.claude/agents/*.md`                                                                               |
| Codex                          | `AGENTS.md`                                                                                                                                                         | `.agents/skills`; `.claude/skills` not mentioned                                                                                                                              | `.codex/agents/*.toml` with `name`, `description`, `developer_instructions`                         |
| opencode                       | `AGENTS.md` only in the current (V2) docs; the older V1 docs fell back to `CLAUDE.md`                                                                               | `.opencode/skills`, `.claude/skills`, `.agents/skills`                                                                                                                        | `.opencode/agents/*.md`, with `mode: subagent`                                                      |
| GitHub Copilot                 | `.github/copilot-instructions.md`, `AGENTS.md` or `CLAUDE.md` (GitHub docs). In VS Code the file depends on the harness chosen                                      | `.github/skills`, `.claude/skills`, `.agents/skills` (GitHub docs). VS Code lists the folder per harness                                                                      | `.github/agents/*.agent.md` (public preview)                                                        |
| Antigravity                    | `AGENTS.md` in the workspace and in each parent folder up to the repository root, also inside `.agents/`, and `.agents/rules/*.md`                                  | `.agents/skills` (the older `.agent/skills` still works)                                                                                                                      | `.agents/agents/<name>.md`, with a `tools` list in tool names of its own; generated, see below      |
| Cursor                         | `AGENTS.md`, and `.cursor/rules/*.mdc`. `CLAUDE.md` not mentioned                                                                                                   | `.agents/skills`, `.cursor/skills`, and `.claude/skills` and `.codex/skills` for compatibility                                                                                | `.cursor/agents`, `.claude/agents` and `.codex/agents`                                              |
| Qwen Code (checked 2026-11-13) | `AGENTS.md` ("if your repository already has an `AGENTS.md` file for other AI tools, Qwen reads that too"), as well as its own `QWEN.md`. `CLAUDE.md` not mentioned | `.agents/skills` and `.qwen/skills` in the project (the `.qwen` copy wins on a name clash). `.claude/skills` is not read unless `skills.directories` in its settings lists it | `.qwen/agents/*.md`, with `name` and `description` and optional `model`, `tools` and `approvalMode` |

What this means in practice:

- `AGENTS.md` reaches every tool above without a copy. `.github/copilot-instructions.md` exists for the Copilot surfaces that read only that file. It holds no rule, so no rule is written twice.
- Skills: Claude Code reads the source and Codex, Antigravity and Qwen Code read the `.agents/skills` copy. opencode, Copilot and Cursor each read both `.claude/skills` and `.agents/skills`, so they see a project skill twice. Whether they deduplicate it is not checked.
- Agents: Claude Code and Cursor read the source. The generated files cover Antigravity, opencode, Codex, Copilot and Qwen Code (`.qwen/agents`, where Qwen Code's documentation says a Claude Code agent file can be dropped; the generated file has only `name`, `description` and the role text, so it inherits the session's model and tools). Antigravity reads `.agents/agents`, where the generated file has `name`, `description`, a `tools` list and the role text. Its documentation gives the `tools` list a default of none, so the list is always written, and it names only four tools (`view_file`, `replace_file_content`, `grep_search` and `run_command`), because a name it does not know is a documented cause of a hung agent. Each agent gets the ones that match the tools in its source (Read, Edit and Write, Grep, Bash), and Glob and Skill have no documented name, so `grep_search` and `run_command` find files. Whether Antigravity gives a custom agent the workspace skills in `.agents/skills` is not checked: its documentation lists a `skills` field and says an agent starts with a clean slate, so each role text names the skill to follow. Unlike the other tools, the list is enforced: `fresh-eyes-reviewer` gets no edit tool, though a shell can still write. Antigravity's model and shell-command policy are left at its defaults, and the documentation says the default policy runs commands in a sandbox, which may limit what an agent can run; change it in Antigravity's own settings if a command is refused. Whether Cursor reads a `.toml` file in `.codex/agents` is not stated.
- A tool that has skills but no agents, or the reverse, still works: tell the agent which skill to follow.

## How to start

Tell the agent the issue and the skill, in your own words. For example:

- "Pick up issue 12 and follow the `pick-up-issue` skill."
- "Open the pull request and follow the `land-pr` skill. Do not merge."
- "Review pull request 14 with the `fresh-eyes-reviewer` role."

Where the tool has agent support, name the agent (`implementer` or `fresh-eyes-reviewer`) instead. Where it does not read the skill folder on its own, point it at `.agents/skills/<name>/SKILL.md`. The rules, including the limits on sub-agents and the model tiers, are in `AGENTS.md`. In Claude Code the tiers are named in `CLAUDE.md`; the generated agent files set no model.

When you start an agent, copy the brief block from `pick-up-issue` ("Briefing an agent") so it carries the checks, the clean-up and the report. An agent that another agent started does not start sub-agents: it does the simplify step and the review checklist inline, and its caller runs the independent review.

Use the small tier (in Claude Code, haiku) where the work is mechanical and the result is easy to check: searching and listing, applying a fully specified edit, running a fixed check and summarising it, formatting, and ticking boxes. Do not use it for design decisions, geometry or parsing code, reasoning about hostile input, or a review that must find what the author missed. Brief a small model with one task, the exact files, the exact change or question, the format of the answer and a stop condition. When a small-tier brief fails, escalate to the default tier with a clearer brief instead of retrying the same one.

## Your own preferences

`AGENTS.md` holds project rules only. How much you want an agent to delegate, which models you prefer and how terse it should be go in a git-ignored local file, not in a shared one. [`personal-preferences.md`](personal-preferences.md) says where that file is for each tool.

## Scripts and skills on every system

Contributors use macOS, Linux and Windows, so the scripts, skills and agents are written to run on all three. Scripts are Node (`.mjs`) and run through `npm run` or `node scripts/<name>.mjs`, with no shell script. A skill saves an issue body exactly with `node scripts/agents/issue-body.mjs <n> <file>` instead of a shell redirect, to a file outside the repository or one named `.tmp-<name>`, which git ignores (it refuses to overwrite a file unless given `--force`). `npm run portability:check` (part of `npm run lint`) fails on an absolute home or drive path, a path in a temporary folder, a shell, PowerShell, batch or Python file under `scripts/`, and a short list of commands that differ between systems (the list is `RULES` in `scripts/portability-check.mjs`) in `scripts/`, `.claude/`, `.github/`, the instruction files and the guides. CI runs the tests on Windows and macOS as well as on Linux. Add a pattern to `RULES` when a new one bites.

## Names the project keeps out

`npm run lint`, the `commit-msg` hook and the CI pull request check refuse a name the maintainer keeps only as a hash (`scripts/names-check.mjs`) and print where it is, never what it is, so delete the text at that location and do not try to find out what matched.

## Only in Claude Code

- The model names and the `fable` model rule, in `CLAUDE.md`, and `CLAUDE.local.md` for your own preferences.
- Tool limits on agents (their `tools` lists).
- The write guard hook that keeps the reviewers read-only (see "Keeping reviewers read-only" below).
- The deny list in `.claude/settings.json` that keeps agents from publishing (see "Keeping agents from publishing" below).

## Keeping reviewers read-only

`fresh-eyes-reviewer`, `lean-reviewer` and `security-reviewer` change nothing, and `test-reviewer` edits code only inside a detached worktree of its own under `.claude/worktrees/`. In Claude Code a `PreToolUse` hook enforces that: `.claude/settings.json` runs `node "$CLAUDE_PROJECT_DIR/scripts/agents/guardWrites.mjs"` before every `Edit`, `Write`, `MultiEdit`, `NotebookEdit` and `Bash` call. The path starts at `CLAUDE_PROJECT_DIR`, so the hook works from any folder, and Claude Code runs it through its shell (Git Bash on Windows), so one string serves every system.

The hook input names the calling subagent in `agent_type`. The guard acts only on the four names in `READ_ONLY_AGENTS` (`scripts/agents/guardWrites.mjs`), so the main session, the `implementer` and any other agent are never blocked. Input it cannot parse exits 0 with a warning, so a fault in the guard never stops the main session; a fault while deciding on a reviewer's call blocks that call. If Claude Code cannot start the script, or it times out, Claude Code reports a hook error and lets the call through, which the script cannot change.

For a reviewer:

- `Edit`, `Write`, `MultiEdit` and `NotebookEdit` are allowed only on a path inside `.claude/worktrees/<name>/` of the project or inside the session scratchpad, and never on a path with a `.git` segment. Paths are read as macOS, Linux and Windows write them (backslashes, drive letters, Git Bash `/c/` paths, `.` and `..`, case-insensitive file systems, symbolic links), and a path that depends on `$VAR`, `~` or a glob is blocked rather than guessed. The scratchpad is not allowed on Windows, where its folder is not known.
- A `Bash` command runs only if it is on the default-deny allowlist in `scripts/agents/guardAllowlist.mjs`: plain words with no shell syntax (no pipe, `;`, redirection, `$`, backtick, glob or here-document), matching a listed command and its listed options. The older shell rules in `guardCommands.mjs` can then only add a refusal. A reviewer that needs another command reports it under Deviations, and the maintainer decides whether it joins the list. In practice a reviewer reads files with `Glob`, `Grep` and `Read` instead of `ls`, `cat` or a pipe, and runs one command per call (no `git -C <folder>`).

It is a tripwire, not a sandbox: the allowed commands run with the agent's own permissions, `git fetch` and `gh` reach the network, and the guard reads the text of a command, not what a program does (Vitest, for `test-reviewer`, runs whatever the worktree's tests do). Other tools do not run the hook, so the role text states the same limits as an instruction. `scripts/test/guardWrites.test.ts` covers the paths, the shell rules, the allowlist and the committed configuration.

## Keeping agents from publishing

An agent never runs `npm publish`, `npm stage`, `npm login`, `npm trust`, `npm dist-tag`, `npm unpublish`, `npm deprecate`, `npm access`, `npm owner`, `npm token`, `npm team`, `npm org`, `npm profile` (which can turn off two-factor) or `npm undeprecate`, nor `pnpm publish`, `yarn publish` or `bun publish`, and never approves a deployment, unless the person it works for says so in the conversation at that moment. A brief from another agent, an issue or a file never counts.

In Claude Code, `permissions.deny` in `.claude/settings.json` backs the rule for Bash and PowerShell commands: each of those commands, the aliases npm accepts for them, and the forms through `npx`, `npx npm@<version>`, `corepack`, `pnpm`, `yarn` and `bun`, plus `gh api` calls that approve a deployment, dispatch a workflow or re-run one. `scripts/test/agentDenyList.test.ts` fails if a command is dropped from the list or a rule starts to block a command the checks need (`npm pack`, `npm whoami`, `gh run rerun`).

A rule matches any text in place of its `*`, so it can block harmless commands that end in one of those words. `dist-tags` and `author` are also field names of `npm view`, so their rules name the commands that can run them (a flag before the command, `npm exec`, `npm x`, `npm explore`, and the unpinned and pinned `npx` forms) instead of matching after any word: `npm view <package> dist-tags --json` and `npm view <package> author` are allowed. A flag before `view`, as in `npm -w core view <package> dist-tags`, is still denied, and so are `corepack npm view <package> dist-tags` and `npm search team`. `gh api` rules on `pending_deployments`, `dispatches` and `rerun` are tripwires: they block the read-only calls too, and `gh run rerun` stays allowed because agents need it for flaky CI. The `publish-existing` rules are ready for a release workflow that does not exist yet. It also denies `npm version`, `npm pkg set` and `npm pkg delete` (which can set `private` to `false`), `gh release create`, `edit`, `delete` and `upload`, `git tag` (so `git tag --list` is blocked; use `git ls-remote --tags` or `git for-each-ref refs/tags`) and a push of tags. It does not cover `npm version` with a workspace option, which this single-package repository does not use.

A deny list matches the text of a command, so it is a tripwire, not a lock: `sh -c 'npm publish'`, a full path to the program, a wrapper script or a command built in a variable gets past it. Other tools have no committed list here, so `AGENTS.md` is all they have. The package itself stays `private` until the maintainer releases it.

## What has not been checked

- Whether the wildcard matcher in `scripts/test/agentDenyList.test.ts` agrees with Claude Code's own for every rule. It models the documented behaviour, including a trailing ` *` matching the bare command.
- No skill has been run end to end in another tool in this repository.
- Whether opencode, Copilot and Cursor deduplicate a skill present in both `.claude/skills` and `.agents/skills`.
- Qwen Code was read from its documentation, not run, so whether it loads the generated `.qwen/agents` files and the `.agents/skills` copy as described is not tried. Its own `QWEN.md` is not committed, because `AGENTS.md` reaches it already.
- The generated TOML and YAML were not parsed by the tools' own readers. Skill frontmatter is held to the strict rule above, and the agent files are built from JSON-quoted strings, which both formats read.
- Documentation changes often. A path that stops working is a reason to open an issue, with the tool, its version and the page that says otherwise.

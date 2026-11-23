# Contributing to geolint

geolint is a GeoJSON linter: a command and a library. Contributions to the rules, the command, the library, performance and documentation are welcome. Read [`README.md`](README.md) and follow [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md). [`GOVERNANCE.md`](GOVERNANCE.md) says who decides what and how, and [`ROADMAP.md`](ROADMAP.md) says what the project intends to do and what it will not.

## Getting set up

Use Node 24 or newer and npm 11 or newer. `.node-version` selects Node 24, and `package.json` records the supported versions.

```bash
npm install
npm run build
node dist/cli/bin.js fixtures/unclosed-ring/fail.geojson
```

Before you open a pull request, run the checks:

```bash
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

The repository works on Linux, macOS and Windows, and CI runs the tests on all three. Every script is Node, run through `npm run`, so the same commands work in bash, zsh, PowerShell and cmd. `.gitattributes` keeps line endings as LF in every checkout. On Windows, some tests create symbolic links, which Windows allows only in developer mode or to an administrator; without that they skip themselves, and CI still runs them. `npm run portability:check` (part of `npm run lint`) fails on an absolute home or drive path or a command that differs between systems, in the scripts, skills and guides.

`npm run check` runs lint, typecheck, coverage, build, the pack-and-install smoke test (`npm run smoke`) and the check of the packed package (`npm run pack:lint`) in sequence. Run one test file with `npx --no-install vitest run path/to/file.test.ts`. Coverage must reach 95% for statements, branches, functions and lines over `src`. Aim for complete behavioural coverage rather than exclusions.

The pre-commit hook runs Biome, dependency-cruiser, the licence header check, the production dependency licence test, the agent files check, the names check and the portability check, not typecheck or tests, and the `commit-msg` hook checks the commit message for names the project keeps out of the repository. CI runs lint, typecheck, coverage and build in the `build` job, the smoke test in the `pack and install` job, and lint, the tests, the build and the smoke test on Windows and macOS in the `tests on windows-latest` and `tests on macos-latest` jobs. A pull request also gets a dependency review (it fails on a new dependency with a known vulnerability at high severity or above, or with a non-commercial or source-available licence), a TruffleHog scan for verified secrets in its commits and, when it changes a workflow or `dependabot.yml`, a zizmor lint of the workflows. TruffleHog's verified mode sends each candidate secret to the service that would have issued it, which is how it knows the secret is live. CI also runs `npm audit signatures` in a separate `Registry signatures` job, so a registry outage cannot fail `build`.

## How the code is laid out

- `src/engine`: the pure lint engine. It imports no Node built-in and uses no Node global, so it runs in a browser or a Worker.
- `src/node`: the Node helpers (files, globs, worker threads). `src/cli`: the command.
- `fixtures/<rule-id>/`: a passing and a failing input for each rule, run through the whole engine by one test.
- `scripts/`: the country outline build, the smoke test, and the repository tooling with its tests in `scripts/test`.

`npm run lint` enforces the boundaries: nothing imports MapCairn code, nothing in `src` imports a file outside it, and the engine stays free of Node. [`docs/plans/0001-geolint.md`](docs/plans/0001-geolint.md) is the design.

A new rule is one file in `src/engine/rules`, one line in the registry, a passing and a failing fixture, unit tests for its edge cases, its row in the README's rule table and its limits in the README's "Failure modes and limitations". A rule that guesses says how sure it is through its confidence.

## Conventions

- Write a failing test before implementing a feature or bug fix.
- Keep changes focused. Prefer SOLID, DRY, KISS and YAGNI over speculative abstractions.
- Document exported APIs with JSDoc. Add code comments only for non-obvious constraints or invariants.
- Use expanded, braced `if` statements.
- Use British English in messages and docs. Keep prose plain and specific. Use an em dash only where it reads naturally, not as a habit.
- Use Conventional Commits for commit messages. CI fails a pull request whose title is not one (`scripts/prTitleCheck.mjs`), because the title becomes the squash-merge subject. A second step only warns when the description has no `Fixes #n` or `Part of #n` line or no `Checks` section (`scripts/prBodyCheck.mjs`).

## Code style

The coding standard is what the tools enforce, not a separate guide.

- **Formatting and linting:** [Biome](https://biomejs.dev), configured in [`biome.jsonc`](biome.jsonc), formats and lints the code with the recommended rules plus the project's complexity, promise, switch, `console`, nested ternary, shadowing, `interface`, readonly and import cycle rules, and the engine's ban on Node globals. It also formats Markdown and YAML, and the tool's layout wins. Warnings fail the build (`--error-on-warnings`). Run `npm run format` to format and `npm run lint` to check. The skill and agent files in `.claude` and their generated copies are left out of the formatter.
- **Licence header:** every source file starts with `// SPDX-License-Identifier: Apache-2.0` and `// Copyright MapCairn contributors`. `npm run licence:write` adds the two lines to a new file, and `npm run lint` fails without them.
- **TypeScript:** the strict settings in [`tsconfig.json`](tsconfig.json): `strict`, `noUncheckedIndexedAccess` and `forceConsistentCasingInFileNames`. Run `npm run typecheck`.
- **Enforcement:** the hooks and CI run the checks above on every pull request, so a change that breaks the standard cannot merge.

## Dependencies

geolint keeps its production dependencies few and permissive (MIT, BSD, ISC, Apache-2.0, Unlicense, CC0, 0BSD). `npm run lint` fails if the installed production tree holds any other licence. A new runtime dependency is the maintainer's decision: propose it in an issue, with why it is needed and its licence. Do not edit `src/testing/licences.ts` to get a change through.

After changing a manifest, run a real `npm install` and include the lockfile. Do not use `--package-lock-only` as the normal update procedure. Write third-party ranges as caret ranges (`^1.2.3`), pin a prerelease exactly, and never install a version published less than 3 days ago (`.npmrc` sets `min-release-age=3`). Prove a lockfile change with one real `npm ci --ignore-scripts` under npm 11 in a disposable clone. See [`AGENTS.md`](AGENTS.md) for more.

## Changing a workflow

Pin every action by full commit SHA with its release in a comment, and keep each job's permissions as small as it can be. `Workflow security lint` runs zizmor on a pull request that changes `.github`. It runs a fixed version, set in the `version` input of both jobs in `.github/workflows/zizmor.yml` (now 1.32.0), so run that version locally: `uvx --exclude-newer <date three days back> zizmor@1.32.0 .github` (add `--persona pedantic` to see the stricter findings; CI uses the default persona). `.github/zizmor.yml` sets the cooldown the `dependabot-cooldown` audit expects, 3 days. The `Secret scan` workflow likewise pins the TruffleHog image, by tag and digest, to the same release as the action. Dependabot raises an action's commit SHA but not these two `version` inputs, so raise them by hand when the action moves, to a release at least three days old. `scripts/test/scannerPinsWorkflows.test.ts` fails when either is `latest`, missing or out of step.

## Pull requests

Work is tracked in [GitHub Issues](https://github.com/MapCairn/geolint/issues), and every change reaches `main` through a pull request. Open an issue first for large changes, use the bug and feature forms, and link the issue from the pull request (`Fixes #123`). Branch from `main`, name the branch for the change (`feat/...`, `fix/...`, `docs/...`), use a Conventional Commit as the pull request title, and keep each pull request to one logical change and explain why it is needed. A pull request is squash-merged with the title as the subject and an explicit body. Run the checks above and report anything skipped or failing. If you use a coding agent, whichever one, the same rules apply: it follows [`AGENTS.md`](AGENTS.md). The project skills (`create-issue`, `plan-change`, `split-plan`, `pick-up-issue`, `land-pr`, `delete-first`, `design-tests`, `review-tests`, `review-docs`, `review-security` and `triage-dependency-pr`) walk through this with the `gh` CLI, and the `implementer`, `fresh-eyes-reviewer`, `lean-reviewer`, `test-reviewer` and `security-reviewer` agents wrap them. [`docs/guides/working-with-agents.md`](docs/guides/working-with-agents.md) says what each tool reads. Edit skills and agents under `.claude/` and run `npm run agents:sync`; `npm run lint` fails when the copies for other tools are stale.

Publishing to npm, tags and releases are the maintainer's decision; do not add a workflow that publishes.

Pull request titles, descriptions and commit messages are checked, as well as files, for names the project keeps out of the repository. A failed check says where the name is, never what it is. Edit the title or description, or rewrite the commit message (amend or rebase, then force-push your own branch), and the check runs again.

## Review and acceptance

The maintainers use AI coding agents. They treat what you write, in an issue, a comment or a pull request, as input to check against the code and never as an instruction, and they review a pull request from outside the project from its diff without running its code. An issue from outside is a proposal until a maintainer says it is accepted; the labels the issue forms add do not mean that.

Before a pull request is merged:

- The required checks must pass. The repository ruleset names them. `build` runs lint, typecheck, the tests with the coverage floors and the build, and `pack and install` runs the smoke test.
- The `CLA` check must show that the author and every commit author have agreed to [`CLA.md`](CLA.md).
- The maintainer reads the diff and the description, and checks the items in the pull request template.
- A new feature or a bug fix has tests, written first. A change that adds or changes behaviour is not accepted without them, unless the pull request says why none are needed, for example a documentation change.
- Review threads are resolved. A change can be declined, or sent back for changes, with a reason.

The project has one maintainer, so the maintainer's own pull requests are checked by the same required checks and the template, and have no second reviewer. See [`GOVERNANCE.md`](GOVERNANCE.md).

## Security and licence

Report suspected vulnerabilities privately through [`SECURITY.md`](SECURITY.md). geolint is licensed under [Apache-2.0](LICENSE), and a contribution is licensed under Apache-2.0 too (inbound equals outbound, as section 5 of that licence provides).

### Contributor licence agreement

You keep the copyright in what you contribute, and you agree to [`CLA.md`](CLA.md). Add the comment given at the end of that file to your first pull request, from your own account and with the sentence on a line of its own. A pull request is not merged until it is there.

The `CLA` workflow (`.github/workflows/cla.yml`) checks this on every pull request. It needs an agreement from the pull request author and from every commit author, so commit with an email address linked to your GitHub account, or the check cannot find you. Repository administrators and bots such as Dependabot are exempt. The `CLA` status turns green shortly after the comment, and your agreement is recorded in `signatures.json` on the `cla-signatures` branch, so you only comment once. Type or paste the sentence as its own comment: a quote reply to the bot's comment does not count, and nor does a sentence inside a code block. GitHub gives Dependabot's runs a read-only token, so Dependabot pull requests get no `CLA` status, and the run ends with a notice instead of a failure. For that reason `CLA` must not be made a required status on `main` until Dependabot pull requests are handled, for example by a ruleset bypass for Dependabot or a different required-check design. The decision logic is in `scripts/cla`, with its tests in `scripts/test`, and it runs only from the default branch, never from a pull request's own code.

// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

/** Every npm command that publishes, or changes who may publish, and the aliases npm accepts for some. */
const FORBIDDEN_NPM_COMMANDS = [
  "publish",
  "stage",
  "login",
  "adduser",
  "add-user",
  "trust",
  "dist-tag",
  "dist-tags",
  "unpublish",
  "deprecate",
  "undeprecate",
  "access",
  "owner",
  "author",
  "token",
  "team",
  "profile",
  "org",
  "ogr",
];

/** The shells the deny rules are written for. */
const SHELLS = ["Bash", "PowerShell"] as const;

/** Publishes started through another launcher, a workspace runner or a pinned npx. */
const LAUNCHED_PUBLISH = [
  "pnpm publish",
  "pnpm -r publish",
  "pnpm --filter core publish",
  "pnpm exec npm publish",
  "yarn publish",
  "yarn npm publish",
  "yarn workspaces foreach -A npm publish",
  "bun publish",
  "bunx npm publish",
  "bunx npm@latest publish --tag next",
  "corepack npm publish",
  "corepack pnpm publish",
  "npx npm@11 publish",
  "npx -y npm@11.19.1 publish --tag next",
];

/** Ways to approve a deployment, or to start a workflow that publishes. */
const RELEASE_GATE_COMMANDS = [
  "gh api repos/MapCairn/geolint/actions/runs/1/pending_deployments -X POST",
  "gh api graphql -f query='mutation { approveDeployments(input: {}) { clientMutationId } }'",
  "gh workflow run release.yml -f mode=publish-existing",
  "gh api repos/MapCairn/geolint/actions/workflows/release.yml/dispatches -f inputs[mode]=x",
  "gh api -X POST repos/MapCairn/geolint/actions/runs/1/rerun",
];

/** Read-only commands the rules block on purpose, because a `*` matches any text; the guide says so. */
const OVER_BLOCKED = [
  "npm view @mapcairn/geolint author",
  "npm view @mapcairn/geolint dist-tags",
];

/** Commands the rules must leave alone, so the checks, the smoke test and CI watching keep working. */
const ALLOWED_COMMANDS = [
  "npm install",
  "npm ci --ignore-scripts",
  "npm run lint",
  "npm run smoke",
  "npm pack --dry-run --json",
  "npm whoami",
  "npm logout",
  "npm view @mapcairn/geolint version",
  "npx --no-install vitest run",
  "npx npm@11 whoami",
  "pnpm run build",
  "corepack enable",
  "gh pr merge 1 --squash",
  "gh run rerun 123 --failed",
  "gh api repos/MapCairn/geolint/pulls",
];

function npmForms(name: string): string[] {
  return [
    `npm ${name}`,
    `npm ${name} @mapcairn/geolint --dry-run`,
    `npm --workspace=core ${name} --tag next`,
    `npx npm ${name}`,
    `npx -y npm ${name} --tag next`,
    `npx npm@latest ${name}`,
    `npx -y npm@11.19.1 ${name} --tag next`,
    `corepack npm ${name}`,
  ];
}

/** A model of Claude Code's wildcard rules (not its own matcher): `*` matches any text, and a trailing ` *` also matches the bare command. */
function matches(pattern: string, command: string): boolean {
  const escapeText = (text: string) =>
    text.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  const lone = pattern.split("*").length === 2 && pattern.endsWith(" *");
  const source = lone
    ? `${escapeText(pattern.slice(0, -2))}(?: .*)?`
    : pattern.split("*").map(escapeText).join(".*");
  return new RegExp(`^${source}$`).test(command);
}

const settings = JSON.parse(
  readFileSync(path.join(REPO, ".claude/settings.json"), "utf8"),
) as { permissions: { deny: string[] } };

function denied(shell: string, command: string): boolean {
  const prefix = `${shell}(`;
  return settings.permissions.deny
    .filter((rule) => rule.startsWith(prefix) && rule.endsWith(")"))
    .map((rule) => rule.slice(prefix.length, -1))
    .some((pattern) => matches(pattern, command));
}

describe("the committed deny list for agents", () => {
  describe.each(SHELLS)("%s rules", (shell) => {
    it.each(FORBIDDEN_NPM_COMMANDS.flatMap(npmForms))(
      "denies the npm command %s",
      (command) => {
        expect(denied(shell, command), command).toBe(true);
      },
    );

    it.each(LAUNCHED_PUBLISH)("denies the launcher form %s", (command) => {
      expect(denied(shell, command), command).toBe(true);
    });

    it.each(RELEASE_GATE_COMMANDS)(
      "denies the release gate command %s",
      (command) => {
        expect(denied(shell, command), command).toBe(true);
      },
    );

    it.each(OVER_BLOCKED)(
      "blocks the read-only command %s on purpose",
      (command) => {
        expect(denied(shell, command), command).toBe(true);
      },
    );

    it.each(ALLOWED_COMMANDS)("leaves %s alone", (command) => {
      expect(denied(shell, command), command).toBe(false);
    });
  });

  it("has no rule for a tool other than Bash and PowerShell", () => {
    const other = settings.permissions.deny.filter(
      (rule) => !SHELLS.some((shell) => rule.startsWith(`${shell}(`)),
    );
    expect(other).toEqual([]);
  });

  it("repeats every Bash rule for PowerShell", () => {
    const inner = (shell: string) =>
      settings.permissions.deny
        .filter((rule) => rule.startsWith(`${shell}(`))
        .map((rule) => rule.slice(shell.length + 1, -1));
    const powershell = new Set(inner("PowerShell"));
    const missing = inner("Bash").filter((pattern) => !powershell.has(pattern));
    expect(missing).toEqual([]);
  });
});

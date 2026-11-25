# Releasing

How `@mapcairn/geolint` is released: what the `release` skill and the release workflow do, and the steps only the maintainer takes. Agents never publish, tag, create a release, remove `private` or approve a deployment (`AGENTS.md`, "Ask the maintainer first").

## How a release works

1. A **Release pull request** changes the version in `package.json` and `package-lock.json` and adds a `## <version>` section to `CHANGELOG.md`. The `release` skill prepares it; its title is `chore(release): v<version>`. The maintainer merges it.
2. The maintainer pushes the tag `v<version>` on the merge commit. A tag is the only thing that starts `.github/workflows/release.yml`: no merge, pull request or manual run does.
3. The workflow has three jobs:
   - `verify` reads the tag against `package.json` (`scripts/release/verifyRelease.mjs decide`), checks that the tagged commit is on `main` and that npm is 11.5.1 or later (trusted publishing needs it), runs `npm run check`, packs the tarball once, checks what it holds (name, version, `private`, files) and records its SHA-256 digest.
   - `npm` is the only job with the OIDC permission and the `npm` environment. It waits for a required reviewer, checks the tarball it downloaded against the recorded digest and publishes that file with provenance and no stored token. A version with a prerelease part (`1.3.0-rc.1`) goes to the `next` dist-tag, any other to `latest`.
   - `github-release` creates the GitHub release from the `## <version>` section of `CHANGELOG.md` and attaches the tarball.

The tag, the version in `package.json` and the heading in `CHANGELOG.md` must agree, or `verify` fails before anything is uploaded. While `package.json` sets `private`, `verify` fails at the tarball check, and `npm` and `github-release` do not run, so a tag pushed too early publishes nothing.

## The checks

`scripts/release/verifyRelease.mjs` holds the logic and `scripts/test/verifyRelease.test.ts` tests it. `scripts/test/releaseWorkflow.test.ts` pins the shape of the workflow: it starts only from a tag, holds no permission at the top, pins every action by commit SHA, keeps tokens out of shell text, and has the publish step, the OIDC permission and the environment in the `npm` job alone. To check a build by hand, run `npm run check`, pack into a scratch folder with `npm pack --ignore-scripts --pack-destination <folder>`, and run `node scripts/release/verifyRelease.mjs tarball <folder> <version>`.

## Steps only the maintainer takes

Once, before the first release:

- Remove `private` from `package.json`, in the first Release pull request.
- Make the first upload of the package by hand from the verified tarball, signed in with two-factor authentication. npm does not accept a trusted publisher for a package that does not exist yet.
- Link the trusted publisher: this repository, the workflow file `release.yml` and the environment `npm`.
- Create the `npm` environment with a required reviewer. If its deployment rule allows only `main`, a tag-triggered job can never deploy: allow `v*` tags too.
- Add a ruleset for `v*` tags, turn on immutable releases, and make the checks on `main` required.

For every release:

- Merge the Release pull request, after reading the notes and the checklist in it.
- Push the tag `v<version>` on the merge commit.
- Approve the `npm` deployment in the run's list of pending deployments.
- Look at the package on npm and the GitHub release when the run ends.

## When a release goes wrong

- If `verify` fails, nothing was published. Fix the cause in a pull request, then delete the tag and push it again on the new merge commit. Deleting a tag is the maintainer's step.
- If `npm` published and `github-release` failed, create the release by hand from the same `CHANGELOG.md` section. Do not publish the version again: npm does not allow it.
- A published version stays published. To retract one, publish a fixed version, and deprecate the bad one by hand.

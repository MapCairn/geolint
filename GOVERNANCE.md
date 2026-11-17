# Governance

_Last updated: 2026-11-17_

geolint is a small, volunteer-maintained project with one maintainer, the same as for [MapCairn](https://github.com/MapCairn/mapcairn), where it started. This document says who decides what, how decisions are made and recorded, how that can change, and what is not yet in place.

## Roles

**Maintainer.** There is one. The maintainer:

- decides what the project builds, accepts or declines, and what it will not do (see [`ROADMAP.md`](ROADMAP.md));
- reviews and merges every pull request, and may decline or close one with a reason;
- triages issues, applies labels and milestones, and keeps the plans in [`docs/plans/`](docs/plans/README.md) and their tracking issues current;
- handles private vulnerability reports and publishes advisories, following [`SECURITY.md`](SECURITY.md);
- holds the repository, and decides when and how the package is published;
- enforces the [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md);
- answers for the licence position: the repository is Apache-2.0, its dependencies are permissive only, and the terms contributors agree to are in [`CLA.md`](CLA.md).

**Contributor.** Anyone who opens an issue, comments, or sends a pull request. A contributor keeps the copyright in what they contribute and agrees to [`CLA.md`](CLA.md) before a pull request is merged. Contributors have no commit access. They propose, and the maintainer decides.

**Maintainers other than the first.** None exist yet. The way to become one is below.

## How decisions are made

The maintainer decides. The record of a decision is public and lives in four places.

- **Issues** track work. A bug, an enhancement or a question is an issue, with a label, and a milestone when one fits. [`ROADMAP.md`](ROADMAP.md) lists the milestones in order; the maintainer decides which milestones it lists and in what order. Larger decisions are written into the issue, with the date.
- **Plans** are the proposal mechanism for large changes that decide a public API or the rule model. Smaller work needs only an issue with its design notes and task list. A plan in [`docs/plans/`](docs/plans/README.md) states the goal, the ground rules, the design, the tests and the order of work, and has a tracking issue. A plan marked "proposed" is a proposal, not a commitment.
- **Pull requests** change the repository. [`.github/CODEOWNERS`](.github/CODEOWNERS) asks the `maintainers` team to review any change to [`ROADMAP.md`](ROADMAP.md), [`CLA.md`](CLA.md) and the files that steer agents, CI and what runs on a developer's machine; it requests a review and the ruleset does not require the code owner's approval. Every change reaches `main` through a pull request, and the repository ruleset requires the named checks to pass before it merges. What is checked is in the "Review and acceptance" section of [`CONTRIBUTING.md`](CONTRIBUTING.md).
- **The licence agreement** governs contributions. [`CLA.md`](CLA.md) is checked on every pull request by the `CLA` workflow. A contribution is not merged without it.

Some things are not open to a vote or a pull request: the licence, the rule that dependencies are permissive only, the independence from MapCairn's AGPL code, and the non-goals in [`ROADMAP.md`](ROADMAP.md). The maintainer can change them, in the open, with a plan and a tracking issue, but a pull request that quietly changes one will be declined.

A disagreement with a decision is raised on the issue or pull request in question. The maintainer gives a reason when declining. There is no separate appeals body. An unresolved disagreement can be taken up by forking the project, which the licence allows.

## Becoming a maintainer

The route the project will use is this:

1. A person sends several pull requests over some months that were accepted without needing the maintainer to rewrite them, covering code, tests and documentation, and keeps to the conventions in [`CONTRIBUTING.md`](CONTRIBUTING.md).
2. They take part in review and triage: answering issues, reading other people's pull requests, and noticing problems in them.
3. The maintainer asks them, or they ask the maintainer, in an issue titled for the proposal. The decision and its reason are recorded in that issue.
4. If they agree, they are given write access, and this document is updated in the same pull request to name the new role and its holder.

Publishing rights on npm, once publishing starts, are a separate step and are not implied by commit access.

## Continuity: not yet covered

If the only maintainer were unavailable, the project could not continue with minimal interruption: there is no named, trusted second person with administrator access. No such person is recorded here, and none will be invented to fill the gap. The same gap is tracked for MapCairn in [MapCairn/mapcairn#4](https://github.com/MapCairn/mapcairn/issues/4), and a person who takes that role there would be the natural choice here.

What reduces the risk today: the code, the plans and the decisions are public, the licence lets anyone fork and publish it, and the package has no server or data to migrate. Credentials are never recorded in the repository.

## Changing this document

A change to this document is a pull request like any other, reviewed and merged by the maintainer, with the reason in the description. A change to the maintainer role, the decision process or the becoming-a-maintainer route also needs a plan or an issue that stays open for at least a week before merging, so that contributors can comment. The date at the top is updated with every change.

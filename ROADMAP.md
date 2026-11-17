# Roadmap

_Last reviewed: 2026-11-17. Reviewed every year, and sooner when a decision below changes._

This is what geolint intends to do, and what it will not do. Everything here is a plan, not a promise and not a delivery date. The project has one volunteer maintainer (see [`GOVERNANCE.md`](GOVERNANCE.md)), so the order can change. The [open issues](https://github.com/MapCairn/geolint/issues) are the detailed plan and hold the current state of each item, and [`docs/plans/`](docs/plans/README.md) holds the written plans for large changes.

## Direction

geolint should be the linter people run on GeoJSON before it reaches a map: it catches the mistakes that are valid JSON and valid GeoJSON but wrong data, says how sure it is, repairs only what has one right answer, and is small, fast and free to use anywhere.

## Priorities

The order the work is done in, as GitHub milestones. A milestone is an outcome a release note could carry; the issues in it are the detail and are not listed here. Quality, process and performance work that is not a release outcome sits in the [Maintenance](https://github.com/MapCairn/geolint/milestone/2) milestone, which is never ranked. A milestone leaves this list in the pull request that closes its last issue, and the order is the maintainer's call.

1. **[First release](https://github.com/MapCairn/geolint/milestone/1).** `@mapcairn/geolint` is published to npm with a GitHub release, once the maintainer gives explicit permission and a person has checked the licences of what the package contains.

## Non-goals

The project does not intend to do these, and a pull request that does one will be declined.

- **Depending on MapCairn's code.** geolint stays Apache-2.0 and independent. MapCairn may depend on geolint; geolint never imports MapCairn.
- **Non-permissive dependencies.** Every production dependency is permissive (MIT, BSD, ISC, Apache-2.0, Unlicense, CC0, 0BSD).
- **Guessing fixes.** `--fix` repairs only what has one right answer. A swap, a projection or a country mismatch is reported, never rewritten.
- **Sending data anywhere.** geolint reads what it is given and writes only the fixed copy beside an input file. It makes no network request.
- **Becoming a general GIS tool.** Reprojection, format conversion and editing belong to other tools. Another input format is a `Reader`, not a converter.

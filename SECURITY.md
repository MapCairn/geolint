# Security policy

_Last updated: 2026-11-17_

## Scope

geolint is a command and a library that read GeoJSON and report what is wrong with it. It runs on the machine of whoever uses it. It has no server, no accounts and no network access of its own: it reads the files or the bytes it is given, and with `--fix` it writes a `.fixed.geojson` copy beside an input file. It sends nothing anywhere.

Because geolint is meant to read files from anyone, its input is untrusted. Reports are most useful when they concern:

- Input that makes the command or the library hang, use memory out of proportion to the input, or crash in a way the exit codes do not describe (`src/engine/reader`, `src/engine/json.ts`, the geometry code)
- `--fix` writing anywhere other than `<name>.fixed.geojson` beside the input, or changing the input file
- A glob or a path in the arguments that reaches files it should not
- Supply-chain issues in the production dependencies (`flatbush`, `flatqueue`, `robust-predicates`) or in what the published package would contain
- The repository's workflows (`.github/workflows`), for example a way for a pull request to run code with a write token

## Supported versions

geolint is not published yet. Only the `main` branch is supported. There are no release branches and no backports; fixes land on `main`. When releases start, this section will say which versions are supported.

## Reporting a vulnerability

Please **do not** open a public issue for a suspected vulnerability.

Report it privately through GitHub's private vulnerability reporting:
[github.com/MapCairn/geolint/security/advisories/new](https://github.com/MapCairn/geolint/security/advisories/new).
If you cannot use GitHub, email mapcairn@timothybrits.co.za instead.

Helpful reports include:

- The affected file, option or dependency
- A small input and the command that shows the problem, and what an attacker actually gains
- The Node version and operating system
- Any proof-of-concept you already have

## How a report is handled

This is a volunteer-maintained project with one maintainer, so these are targets, not guarantees.

1. **Acknowledgement.** The maintainer acknowledges a report within 7 days, from the private advisory or the email address above.
2. **Triage.** The maintainer reproduces the report and decides whether it is a vulnerability in this project, in a dependency or in a third party, and what it is worth: low, medium, high or critical, using the CVSS base score as a guide. You are told the outcome and the reason, including when it is not accepted. Questions go through the same private channel.
3. **Private fix.** A confirmed issue is fixed in the temporary private fork that GitHub provides for the advisory, with a test that fails before the fix and passes after it. It is not discussed in public issues or pull requests until a fix is ready.
4. **Target time.** For a confirmed issue of medium severity or higher, the aim is a fix or a mitigation merged to `main` within 60 days of the acknowledgement. A low-severity issue is fixed in the normal course of work. If a target cannot be met, the reporter is told why.
5. **Advisory and credit.** Once the fix is merged, the maintainer publishes a GitHub security advisory that describes the issue, the affected code and the fix, and requests a CVE where one applies. The reporter is credited in the advisory unless they ask otherwise.
6. **Disclosure.** Please do not disclose publicly until the fix is merged. If the fix is taking longer than the target, the maintainer says so and why, and agrees a disclosure date with the reporter.

A vulnerability in a dependency that reaches the published package is handled the same way, and the fix is usually an update that Dependabot or the maintainer makes.

## Out of scope

The following are not treated as vulnerabilities in this project:

- A heuristic rule that reports valid data as a mistake, or misses a mistake. These are bugs, and the README's "Failure modes and limitations" lists the known ones; open a public issue for a new one.
- Slow linting of an input built to be slow, where time and memory still grow in proportion to the input (the README describes the cases that do not, such as many edges meeting at one vertex)
- Reports generated solely by an automated scanner with no demonstrated impact
- Vulnerabilities in development dependencies that do not reach the published package or the workflows

## Handling data responsibly

Do not attach real personal or household-level data to an issue or a pull request, even to show a bug. Reduce it to the smallest made-up or public input that still shows the problem.

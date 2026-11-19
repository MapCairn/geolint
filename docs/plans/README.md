# Plans

Most work needs only a GitHub issue with its design notes and task list. A plan is for a large change that decides a public API, the rule model or the output formats, where the record should live with the code. Plans live here, one file each, numbered in the order they were written (`0001-short-name.md`). A plan states the goal, the ground rules, the design, the tests and the order of work, and it is short enough to read in a few minutes. Every plan has a tracking issue on GitHub, linked from its file and, while the plan is open, listed at the end of this page; the issue holds the task list and the plan file holds the design. Move its status from "proposed" to "in progress" to "done" as the work moves.

A plan gets its own pull request, reviewed before any code is written, only when the work will not start straight away. When it starts immediately, the plan file and its first step of implementation land in one pull request instead. The `plan-change` skill has the procedure.

Open plans:

- [0002: Stream findings out per feature, and share one view of each feature between rules](0002-streaming-findings-and-shared-feature-view.md), tracking issue [#12](https://github.com/MapCairn/geolint/issues/12), proposed.

Done plans, kept as the design record:

- [0001: geolint, a GeoJSON linter in its own Apache-2.0 package](0001-geolint.md), the design geolint was built to, tracking issue [#2](https://github.com/MapCairn/geolint/issues/2) (closed).

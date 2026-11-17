// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * Enforces geolint's independence and the purity of its lint engine. Run
 * through `npm run depcruise`, part of `npm run lint`.
 */
module.exports = {
  forbidden: [
    {
      name: "geolint-imports-no-mapcairn-package",
      severity: "error",
      comment:
        "geolint is Apache-2.0 and independent: it must never import AGPL MapCairn code. It imports no other @mapcairn package.",
      from: { path: "^src/" },
      to: { path: "(^|/)node_modules/@mapcairn/" },
    },
    {
      name: "geolint-imports-no-mapcairn-package-unresolved",
      severity: "error",
      comment:
        "The same rule for a MapCairn package name that is not installed and so does not resolve to a path.",
      from: { path: "^src/" },
      to: { path: "^@mapcairn/", couldNotResolve: true },
    },
    {
      name: "geolint-source-stays-in-src",
      severity: "error",
      comment:
        "The published files are built from src alone, so nothing in src may import a file outside it, such as the scripts, the benchmarks or the repository tooling.",
      from: { path: "^src/" },
      to: { path: "^(?!src/)", dependencyTypes: ["local"] },
    },
    {
      name: "geolint-engine-has-no-node-apis",
      severity: "error",
      comment:
        "The lint engine runs in a browser or a Worker as well as Node, so it imports no Node built-in. Only src/node and src/cli (the command line and its workers) may.",
      from: {
        path: "^src/",
        pathNot: "^src/(node|cli|testing)/",
      },
      to: { dependencyTypes: ["core"] },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    // The swc parser keeps `import type` edges and tags them `type-only`.
    // The default parser transpiles first and loses them.
    parser: "swc",
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};

// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * Runs dependency-cruiser and fails if it found violations or if it cruised no
 * modules. Without a TypeScript parser it reports success on zero modules,
 * which would silently switch the independence and engine rules off.
 */
import { spawnSync } from "node:child_process";

/** The directory cruised; it must yield at least one module. */
const ROOT = "src";

const result = spawnSync(
  process.execPath,
  [
    "node_modules/dependency-cruiser/bin/dependency-cruiser.mjs",
    ROOT,
    "--config",
    ".dependency-cruiser.cjs",
    "--output-type",
    "json",
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  process.stderr.write(`${result.stdout}\n${result.stderr}\n`);
  process.stderr.write("dependency-cruiser did not produce a report.\n");
  process.exit(1);
}

const errors = [];
const count = report.modules.filter((module) =>
  module.source.startsWith(`${ROOT}/`),
).length;
if (count === 0) {
  errors.push(
    `No modules were cruised for ${ROOT}. Check that a TypeScript parser (@swc/core) is installed.`,
  );
}

for (const violation of report.summary.violations) {
  errors.push(
    `${violation.rule.name}: ${violation.from}${violation.to === violation.from ? "" : ` -> ${violation.to}`}`,
  );
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(
  `dependency-cruiser: ${report.summary.totalCruised} modules, ${report.summary.totalDependenciesCruised} dependencies, no violations\n`,
);

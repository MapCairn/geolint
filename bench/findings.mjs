// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * Measures what findings cost. It generates a FeatureCollection in which every
 * polygon is wound the wrong way, so every feature has one finding, lints it,
 * and prints the heap the report keeps alive for each finding and the size of
 * the text, JSON and SARIF output. It builds nothing: run `npm run build`
 * first, and start it with `--expose-gc` so the heap figures are of live data:
 *
 *   node --expose-gc bench/findings.mjs [megabytes]
 */
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { writeCollection } from "./generate.mjs";

const MEGABYTE = 1024 * 1024;
const DEFAULT_MEGABYTES = 20;
const megabytes = Number(process.argv[2] ?? DEFAULT_MEGABYTES);

if (typeof globalThis.gc !== "function") {
  throw new Error(
    "Start with: node --expose-gc bench/findings.mjs [megabytes]",
  );
}
const collectGarbage = globalThis.gc;

const dist = (relative) =>
  import(pathToFileURL(path.resolve(import.meta.dirname, relative)).href);
const {
  lintBytes,
  formatText,
  formatJson,
  formatSarif,
  writeTextReport,
  writeJsonReport,
  writeSarifReport,
  rules,
} = await dist("../dist/index.js");
const { fileChunks } = await dist("../dist/node/index.js");

function liveHeapBytes() {
  collectGarbage();
  collectGarbage();
  return process.memoryUsage().heapUsed;
}

const directory = mkdtempSync(path.join(os.tmpdir(), "geolint-findings-"));
try {
  const file = path.join(directory, "wrong-winding.geojson");
  await writeCollection(file, megabytes * MEGABYTE, 1, { wrongWinding: true });

  const before = liveHeapBytes();
  const report = await lintBytes(fileChunks(file), { rules });
  const afterReport = liveHeapBytes();
  const findings = report.findings.length;
  process.stderr.write(
    `linted: ${findings} findings, report ${afterReport - before} bytes\n`,
  );
  const reports = [{ file, report }];

  const outputs = {};
  let previous = afterReport;
  for (const [name, format, stream] of [
    [
      "text",
      () => formatText(reports),
      (sink) => writeTextReport(reports, sink),
    ],
    [
      "json",
      () => formatJson(reports),
      (sink) => writeJsonReport(reports, sink),
    ],
    [
      "sarif",
      () => formatSarif(reports, rules),
      (sink) => writeSarifReport(reports, rules, sink),
    ],
  ]) {
    process.stderr.write(`formatting ${name}\n`);
    let streamed = 0;
    stream((piece) => {
      streamed += piece.length;
    });
    outputs[name] = { streamedCharacters: streamed };
    let output;
    try {
      output = format();
    } catch (error) {
      outputs[name].error = `${error.name}: ${error.message}`;
      continue;
    }
    const held = liveHeapBytes();
    outputs[name].characters = output.length;
    outputs[name].heapBytesHeld = held - previous;
    output = undefined;
    previous = liveHeapBytes();
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        node: process.version,
        inputMegabytes: megabytes,
        features: report.featureCount,
        findings,
        reportHeapBytes: afterReport - before,
        heapBytesPerFinding: Math.round((afterReport - before) / findings),
        outputs,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  rmSync(directory, { recursive: true, force: true });
}

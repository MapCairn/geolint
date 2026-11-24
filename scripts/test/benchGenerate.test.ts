// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { lintBytes } from "../../src/index.js";

const GENERATOR = pathToFileURL(
  path.resolve(import.meta.dirname, "../../bench/generate.mjs"),
).href;
const SMALL_COLLECTION_BYTES = 200_000;

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

async function generate(options?: { wrongWinding: boolean }) {
  const { writeCollection } = await import(GENERATOR);
  const folder = mkdtempSync(path.join(tmpdir(), "geolint-bench-"));
  folders.push(folder);
  const file = path.join(folder, "collection.geojson");
  const features: number = await writeCollection(
    file,
    SMALL_COLLECTION_BYTES,
    1,
    options,
  );
  return { features, bytes: readFileSync(file) };
}

describe("the benchmark generator", () => {
  it("writes a collection with no findings by default", async () => {
    const { features, bytes } = await generate();

    const report = await lintBytes([bytes]);

    expect(report.featureCount).toBe(features);
    expect(report.findings).toEqual([]);
  });

  it("writes a collection in which every polygon is wound the wrong way", async () => {
    const { features, bytes } = await generate({ wrongWinding: true });

    const report = await lintBytes([bytes]);

    expect(report.featureCount).toBe(features);
    expect(report.findings).toHaveLength(features);
    expect(new Set(report.findings.map((finding) => finding.ruleId))).toEqual(
      new Set(["winding-order"]),
    );
  });
});

// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { describe, expect, it } from "vitest";
import {
  type FileReport,
  formatJson,
  formatText,
  jsonReportPieces,
  textReportPieces,
} from "./report.js";
import { formatSarif, sarifReportPieces } from "./sarif.js";
import type { Finding, Rule } from "./types.js";

/** The longest string V8 allows, in characters (`buffer.constants.MAX_STRING_LENGTH` on Node 24). */
const MAX_STRING_LENGTH = 536_870_888;
const MORE_THAN_A_STRING_HOLDS = 700_000;
const SLOW_TEST_MS = 120_000;

const RULES: readonly Rule[] = [
  {
    id: "winding-order",
    severity: "warning",
    confidence: "high",
    summary: "The exterior ring is wound the wrong way.",
    fixable: true,
    needsRegion: false,
    check: () => [],
  },
];

function finding(index: number, ruleId = "winding-order"): Finding {
  return {
    ruleId,
    severity: "warning",
    confidence: "high",
    path: `/features/${index}/geometry/coordinates/0`,
    message: `Ring ${index} is wound clockwise; RFC 7946 wants counter-clockwise.`,
    fixable: true,
    data: index % 2 === 0 ? { index } : undefined,
  };
}

function reports(): FileReport[] {
  return [
    {
      file: "a.geojson",
      report: {
        featureCount: 3,
        findings: [finding(0), finding(1), finding(2, "unlisted-rule")],
        inputError: undefined,
      },
    },
    {
      file: "empty.geojson",
      report: { featureCount: 0, findings: [], inputError: undefined },
    },
    {
      file: "broken.geojson",
      report: {
        featureCount: 1,
        findings: [finding(7)],
        inputError: { offset: 42, message: "Unexpected token" },
      },
    },
  ];
}

describe("the pieces give the string forms, byte for byte", () => {
  it("for the JSON report, which is what JSON.stringify gives for its data", () => {
    const text = formatJson(reports());

    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
    expect([...jsonReportPieces(reports())].join("")).toBe(text);
  });

  it("for the SARIF log, which is what JSON.stringify gives for its data", () => {
    const text = formatSarif(reports(), RULES);

    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
    expect([...sarifReportPieces(reports(), RULES)].join("")).toBe(text);
  });

  it("for the text report", () => {
    const text = formatText(reports());

    expect([...textReportPieces(reports())].join("")).toBe(text);
    expect(text.split("\n")).toHaveLength(7);
  });
});

describe("a report with more findings than one string can hold", () => {
  const many: FileReport[] = [
    {
      file: "big.geojson",
      report: {
        featureCount: MORE_THAN_A_STRING_HOLDS,
        findings: Array.from({ length: MORE_THAN_A_STRING_HOLDS }, (_, index) =>
          finding(index),
        ),
        inputError: undefined,
      },
    },
  ];

  function lengthWritten(pieces: Iterable<string>): number {
    let characters = 0;
    for (const piece of pieces) {
      characters += piece.length;
    }
    return characters;
  }

  it(
    "is written as SARIF without building one string",
    () => {
      expect(lengthWritten(sarifReportPieces(many, RULES))).toBeGreaterThan(
        MAX_STRING_LENGTH,
      );
    },
    SLOW_TEST_MS,
  );

  it(
    "is written as JSON and as text",
    () => {
      expect(lengthWritten(jsonReportPieces(many))).toBeGreaterThan(
        MORE_THAN_A_STRING_HOLDS * 200,
      );
      expect(lengthWritten(textReportPieces(many))).toBeGreaterThan(
        MORE_THAN_A_STRING_HOLDS * 100,
      );
    },
    SLOW_TEST_MS,
  );
});

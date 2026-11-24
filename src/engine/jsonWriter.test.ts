// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { jsonPieces, LazyArray } from "./jsonWriter.js";

function written(value: unknown): { text: string; calls: number } {
  const pieces = [...jsonPieces(value)];
  return { text: pieces.join(""), calls: pieces.length };
}

function reference(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

describe("writeJson", () => {
  it.each([
    ["a number", 5],
    ["a string with an escape", 'say "hi"\n\u001b'],
    ["null", null],
    ["an empty array", []],
    ["an empty object", {}],
    ["nested empty containers", { a: [], b: {}, c: [[], {}] }],
    [
      "an object with an undefined member",
      { a: 1, b: undefined, c: [undefined] },
    ],
    ["a deep structure", { a: { b: { c: { d: { e: [1, { f: [2, 3] }] } } } } }],
    ["an array of objects", [{ a: 1 }, { b: [1, 2] }, []]],
    [
      "a Date and an object with toJSON",
      { when: new Date(0), custom: { toJSON: () => [1, 2] } },
    ],
    [
      "function and symbol members, which are left out",
      { a: () => 1, b: Symbol("x"), c: 1 },
    ],
    ["unicode", { 名前: "😀 naïve", list: ["é", " "] }],
  ])("writes %s exactly as JSON.stringify does", (_name, value) => {
    expect(written(value).text).toBe(reference(value));
  });

  it("writes any JSON value exactly as JSON.stringify does", () => {
    void fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        expect(written(value).text).toBe(reference(value));
      }),
      { numRuns: 300 },
    );
  });

  it("writes a lazy array as the array it stands for", () => {
    const items = function* () {
      for (let index = 0; index < 5; index++) {
        yield { index, tags: ["a", "b"] };
      }
    };
    const value = { before: 1, list: new LazyArray(items), after: [] };

    expect(written(value).text).toBe(
      reference({ before: 1, list: [...items()], after: [] }),
    );
  });

  it("writes a lazy array that sits too deep to expand as the array it stands for", () => {
    const items = () => [1, { a: 2 }];
    const value = { a: { b: { c: { d: { e: new LazyArray(items) } } } } };

    expect(written(value).text).toBe(
      reference({ a: { b: { c: { d: { e: [1, { a: 2 }] } } } } }),
    );
  });

  it("writes an empty lazy array as []", () => {
    const value = { list: new LazyArray(() => []) };
    expect(written(value).text).toBe(reference({ list: [] }));
  });

  it("gives pieces of about 64 KB, however long the document is", () => {
    const message = "x".repeat(1000);
    const value = {
      findings: Array.from({ length: 5000 }, () => ({ message })),
    };

    const { text, calls } = written(value);

    expect(text).toBe(reference(value));
    expect(calls).toBeGreaterThan(50);
    expect(calls).toBeLessThan(500);
  });
});

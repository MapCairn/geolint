// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { isObject } from "./json.js";

const INDENT = "  ";

/**
 * How many levels of arrays and objects are written one member at a time.
 * Everything below that is written with `JSON.stringify` in one piece. The
 * reports and SARIF logs list their findings at depth 3, so each finding is a
 * piece of its own.
 */
const EXPANDED_DEPTH = 4;

/** How much text is gathered before the sink is called, so it is not called for every member. */
const FLUSH_AT_CHARACTERS = 64 * 1024;

/**
 * An array whose members are produced as they are written, so a very long one
 * never exists in memory at once. It is written exactly like the array of the
 * same members.
 */
export class LazyArray {
  constructor(readonly members: () => Iterable<unknown>) {}

  /** Used when one sits too deep to be written a member at a time, so it is still the array it stands for. */
  toJSON(): unknown[] {
    return [...this.members()];
  }
}

/**
 * Joins small pieces into pieces of about 64 KB, so whatever receives them is
 * not called for every member. Nothing is held back at the end.
 */
export function* batched(pieces: Iterable<string>): Generator<string> {
  let pending = "";
  for (const piece of pieces) {
    pending += piece;
    if (pending.length >= FLUSH_AT_CHARACTERS) {
      yield pending;
      pending = "";
    }
  }
  if (pending !== "") {
    yield pending;
  }
}

function padding(level: number): string {
  return INDENT.repeat(level);
}

function wholeValue(value: unknown, level: number): string {
  const text = JSON.stringify(value, null, 2) ?? "null";
  return text.replaceAll("\n", `\n${padding(level)}`);
}

function* memberPieces(
  members: Iterable<unknown>,
  depth: number,
  level: number,
): Generator<string> {
  let first = true;
  for (const member of members) {
    yield first ? "[\n" : ",\n";
    yield padding(level + 1);
    yield* valuePieces(member, depth + 1, level + 1);
    first = false;
  }
  yield first ? "[]" : `\n${padding(level)}]`;
}

/** Whether `JSON.stringify` writes an object member with this value: it leaves out `undefined`, functions and symbols. */
function isWritten(value: unknown): boolean {
  return (
    value !== undefined &&
    typeof value !== "function" &&
    typeof value !== "symbol"
  );
}

function hasToJson(value: unknown): boolean {
  return isObject(value) && typeof value.toJSON === "function";
}

function* propertyPieces(
  object: Readonly<Record<string, unknown>>,
  depth: number,
  level: number,
): Generator<string> {
  let first = true;
  for (const [name, value] of Object.entries(object)) {
    if (!isWritten(value)) {
      continue;
    }
    yield first ? "{\n" : ",\n";
    yield `${padding(level + 1)}${JSON.stringify(name)}: `;
    yield* valuePieces(value, depth + 1, level + 1);
    first = false;
  }
  yield first ? "{}" : `\n${padding(level)}}`;
}

function* valuePieces(
  value: unknown,
  depth: number,
  level: number,
): Generator<string> {
  if (value instanceof LazyArray) {
    yield* memberPieces(value.members(), depth, level);
  } else if (hasToJson(value)) {
    yield wholeValue(value, level);
  } else if (depth < EXPANDED_DEPTH && Array.isArray(value)) {
    yield* memberPieces(value, depth, level);
  } else if (depth < EXPANDED_DEPTH && isObject(value)) {
    yield* propertyPieces(value, depth, level);
  } else {
    yield wholeValue(value, level);
  }
}

/**
 * The text of `JSON.stringify(value, null, 2)` followed by a newline, byte for
 * byte, as pieces of about 64 KB produced one at a time, so a document of
 * hundreds of megabytes never exists as one string (a string is limited to
 * about 536 million characters) and a caller that waits between pieces holds
 * only one. A `LazyArray` in the first levels is written as the array of its
 * members, one at a time. Values must be plain JSON data.
 */
export function* jsonPieces(value: unknown): Generator<string> {
  function* whole(): Generator<string> {
    yield* valuePieces(value, 0, 0);
    yield "\n";
  }
  yield* batched(whole());
}

/** Joins pieces into one string. */
export function joined(pieces: Iterable<string>): string {
  return [...pieces].join("");
}

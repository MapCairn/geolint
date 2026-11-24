// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { isObject } from "./json.js";

/** Receives the text of a document a piece at a time, in order. */
export type Sink = (text: string) => void;

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
}

/** Gathers text and hands it to a sink in pieces of about 64 KB. Call `flush` at the end. */
export class Gatherer {
  private pending = "";

  constructor(private readonly sink: Sink) {}

  add(text: string): void {
    this.pending += text;
    if (this.pending.length >= FLUSH_AT_CHARACTERS) {
      this.flush();
    }
  }

  flush(): void {
    if (this.pending !== "") {
      this.sink(this.pending);
      this.pending = "";
    }
  }
}

function padding(level: number): string {
  return INDENT.repeat(level);
}

function wholeValue(value: unknown, level: number): string {
  const text = JSON.stringify(value, null, 2) ?? "null";
  return text.replaceAll("\n", `\n${padding(level)}`);
}

function writeMembers(
  members: Iterable<unknown>,
  depth: number,
  level: number,
  out: Gatherer,
): void {
  let first = true;
  for (const member of members) {
    out.add(first ? "[\n" : ",\n");
    out.add(padding(level + 1));
    writeValue(member, depth + 1, level + 1, out);
    first = false;
  }
  out.add(first ? "[]" : `\n${padding(level)}]`);
}

function writeProperties(
  object: Readonly<Record<string, unknown>>,
  depth: number,
  level: number,
  out: Gatherer,
): void {
  let first = true;
  for (const [name, value] of Object.entries(object)) {
    if (value === undefined) {
      continue;
    }
    out.add(first ? "{\n" : ",\n");
    out.add(`${padding(level + 1)}${JSON.stringify(name)}: `);
    writeValue(value, depth + 1, level + 1, out);
    first = false;
  }
  out.add(first ? "{}" : `\n${padding(level)}}`);
}

function writeValue(
  value: unknown,
  depth: number,
  level: number,
  out: Gatherer,
): void {
  if (value instanceof LazyArray) {
    writeMembers(value.members(), depth, level, out);
  } else if (depth < EXPANDED_DEPTH && Array.isArray(value)) {
    writeMembers(value, depth, level, out);
  } else if (depth < EXPANDED_DEPTH && isObject(value)) {
    writeProperties(value, depth, level, out);
  } else {
    out.add(wholeValue(value, level));
  }
}

/**
 * Writes `value` to `write` as `JSON.stringify(value, null, 2)` followed by
 * a newline would give it, byte for byte, but a member at a time, so a
 * document of hundreds of megabytes never exists as one string (a string is
 * limited to about 536 million characters). A `LazyArray` anywhere in the
 * first levels is written as the array of its members, one at a time.
 *
 * `write` gets pieces of about 64 KB. Values must be plain JSON data.
 */
export function writeJson(value: unknown, write: Sink): void {
  const out = new Gatherer(write);
  writeValue(value, 0, 0, out);
  out.add("\n");
  out.flush();
}

/** Runs a writer into memory and returns what it wrote as one string. */
export function collected(writer: (write: Sink) => void): string {
  const pieces: string[] = [];
  writer((piece) => pieces.push(piece));
  return pieces.join("");
}

// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { type EventEmitter, once } from "node:events";

/**
 * Somewhere text can be written. A real stream is also an `EventEmitter`, which
 * is how a writer waits when `write` returns `false`; a plain object with a
 * `write` function is written to without waiting.
 */
export interface PieceOutput {
  write(text: string): boolean | undefined;
}

function canWait(output: PieceOutput): output is PieceOutput & EventEmitter {
  return typeof (output as Partial<EventEmitter>).once === "function";
}

/**
 * Writes the pieces in order, and waits for the stream to drain whenever it says
 * it is full, so the next piece is not even produced until the reader has taken
 * the last. Without that the whole output waits in memory behind a slow reader.
 * Rejects with the stream's error if it fails while this waits.
 */
export async function writePieces(
  pieces: Iterable<string>,
  output: PieceOutput,
): Promise<void> {
  for (const piece of pieces) {
    if (output.write(piece) === false && canWait(output)) {
      await once(output, "drain");
    }
  }
}

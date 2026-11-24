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
 *
 * Rejects with the stream's error if it fails at any point of the call, and with
 * an error of its own if it closes without one (a destroyed stream never drains),
 * so a closed pipe ends the command instead of hanging it.
 */
export async function writePieces(
  pieces: Iterable<string>,
  output: PieceOutput,
): Promise<void> {
  if (!canWait(output)) {
    for (const piece of pieces) {
      output.write(piece);
    }
    return;
  }
  const stopWaiting = new AbortController();
  let failure: Error | undefined;
  const fail = (error: Error): void => {
    failure ??= error;
    stopWaiting.abort();
  };
  const onError = (error: Error): void => fail(error);
  const onClose = (): void => fail(new Error("the output was closed"));
  output.on("error", onError);
  output.on("close", onClose);
  try {
    for (const piece of pieces) {
      if (failure) {
        throw failure;
      }
      if (output.write(piece) === false && !failure) {
        await once(output, "drain", { signal: stopWaiting.signal }).catch(
          (error: unknown) => {
            throw failure ?? error;
          },
        );
      }
    }
    if (failure) {
      throw failure;
    }
  } finally {
    output.removeListener("error", onError);
    output.removeListener("close", onClose);
  }
}

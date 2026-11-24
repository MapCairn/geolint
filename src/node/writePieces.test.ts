// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { writePieces } from "./writePieces.js";

/** A stream that refuses more text (`write` returns false) until `drain()` is called. */
class SlowStream extends EventEmitter {
  readonly received: string[] = [];
  private full = false;

  write(text: string): boolean {
    this.received.push(text);
    this.full = this.received.length % 2 === 0;
    return !this.full;
  }

  drain(): void {
    this.full = false;
    this.emit("drain");
  }
}

function* counted(
  pieces: readonly string[],
  produced: string[],
): Generator<string> {
  for (const piece of pieces) {
    produced.push(piece);
    yield piece;
  }
}

describe("writePieces", () => {
  it("writes every piece in order to a stream that never fills up", async () => {
    const received: string[] = [];

    await writePieces(["a", "b", "c"], {
      write: (text) => {
        received.push(text);
        return true;
      },
    });

    expect(received).toEqual(["a", "b", "c"]);
  });

  it("writes to an output that has no way to wait, whatever write returns", async () => {
    const received: string[] = [];

    await writePieces(["a", "b"], {
      write: (text) => {
        received.push(text);
        return false;
      },
    });

    expect(received).toEqual(["a", "b"]);
  });

  it("writes to an output whose write returns nothing", async () => {
    const received: string[] = [];

    await writePieces(["a", "b"], {
      write: (text) => {
        received.push(text);
      },
    });

    expect(received).toEqual(["a", "b"]);
  });

  it("neither writes nor produces another piece until a full stream drains", async () => {
    const stream = new SlowStream();
    const produced: string[] = [];

    const done = writePieces(counted(["1", "2", "3", "4"], produced), stream);
    await new Promise((resolve) => setImmediate(resolve));

    expect(stream.received).toEqual(["1", "2"]);
    expect(produced).toEqual(["1", "2"]);

    stream.drain();
    await new Promise((resolve) => setImmediate(resolve));

    expect(stream.received).toEqual(["1", "2", "3", "4"]);

    stream.drain();
    await done;
    expect(produced).toEqual(["1", "2", "3", "4"]);
  });

  it("gives up, with the stream's error, when the stream fails while it waits", async () => {
    const stream = new SlowStream();
    const produced: string[] = [];

    const done = writePieces(counted(["1", "2", "3"], produced), stream);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit("error", new Error("EPIPE"));

    await expect(done).rejects.toThrow("EPIPE");
    expect(produced).toEqual(["1", "2"]);
  });

  it("gives up when the stream closes without an error while it waits", async () => {
    const stream = new SlowStream();
    const produced: string[] = [];

    const done = writePieces(counted(["1", "2", "3"], produced), stream);
    await new Promise((resolve) => setImmediate(resolve));
    stream.emit("close");

    await expect(done).rejects.toThrow("closed");
    expect(produced).toEqual(["1", "2"]);
  });

  it("gives up with the stream's error when it fails between waits", async () => {
    const stream = new SlowStream();
    stream.write = (text: string): boolean => {
      stream.received.push(text);
      stream.emit("error", new Error("EPIPE"));
      return true;
    };
    const produced: string[] = [];

    await expect(
      writePieces(counted(["1", "2", "3"], produced), stream),
    ).rejects.toThrow("EPIPE");
    expect(produced).toEqual(["1", "2"]);
  });

  it("leaves no listener behind", async () => {
    const stream = new SlowStream();

    const done = writePieces(["1", "2", "3"], stream);
    await new Promise((resolve) => setImmediate(resolve));
    stream.drain();
    stream.drain();
    await done;

    expect(stream.listenerCount("error")).toBe(0);
    expect(stream.listenerCount("close")).toBe(0);
    expect(stream.listenerCount("drain")).toBe(0);
  });
});

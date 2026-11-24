// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { describe, expect, it } from "vitest";
import { orientation, type Position } from "./predicates.js";

/** Multiplying by a power of two is exact, so it moves a triangle without changing its shape. */
const POWER_OF_TWO_SCALE = 2 ** 600;

function scaled(
  triangle: readonly [Position, Position, Position],
  factor: number,
): readonly [Position, Position, Position] {
  const [a, b, c] = triangle.map((point) =>
    point.map((value) => value * factor),
  );
  return [a as Position, b as Position, c as Position];
}

describe("orientation", () => {
  it("turns counter-clockwise, clockwise and collinear as documented", () => {
    expect(orientation([0, 0], [1, 0], [0, 1])).toBe(1);
    expect(orientation([0, 0], [0, 1], [1, 0])).toBe(-1);
    expect(orientation([0, 0], [1, 1], [2, 2])).toBe(0);
  });

  describe("outside the range of about 1e-150 to 1e150", () => {
    it("returns 0 for a clearly non-collinear triangle below about 1e-160", () => {
      const triangle: readonly [Position, Position, Position] = [
        [0, 0],
        [1e-165, 0],
        [0, 1e-165],
      ];

      expect(orientation(...scaled(triangle, POWER_OF_TWO_SCALE))).toBe(1);
      expect(orientation(...triangle)).toBe(0);
    });

    it("returns 0 for a non-collinear triangle above about 1e160", () => {
      const triangle: readonly [Position, Position, Position] = [
        [0, 0],
        [3e200, 1e200],
        [1e200, 3e200],
      ];

      expect(orientation(...scaled(triangle, 2 ** -600))).toBe(1);
      expect(orientation(...triangle)).toBe(0);
    });
  });
});

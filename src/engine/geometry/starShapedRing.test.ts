// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { Position } from "./predicates.js";
import { orientation } from "./predicates.js";
import { isProvablySimpleRing } from "./starShapedRing.js";
import { findSegmentIntersections } from "./sweep.js";

const NUMBER_OF_RUNS = 600;
const COORDINATE_LIMIT = 6;
const MAX_VERTICES = 9;
const STAR_VERTICES = 5;
const STAR_STEP = 2;
const FULL_TURN = 2 * Math.PI;
const DECIMALS = 6;

function closed(vertices: readonly Position[]): Position[] {
  return [...vertices, vertices[0] as Position];
}

/** Whether any two edges of the ring meet other than at the vertex consecutive edges share, by the sweep with no shortcut. */
function meetsItself(ring: readonly Position[]): boolean {
  const edges = ring.slice(0, -1).map((start, index) => ({
    start,
    end: ring[index + 1] as Position,
  }));
  const last = edges.length - 1;
  const result = findSegmentIntersections(edges, {
    ignore: (first, second, kind) =>
      kind === "touch" &&
      (second === first + 1 || (first === 0 && second === last)),
  });
  return result.intersections.length > 0;
}

const point = fc.tuple(
  fc.integer({ min: -COORDINATE_LIMIT, max: COORDINATE_LIMIT }),
  fc.integer({ min: -COORDINATE_LIMIT, max: COORDINATE_LIMIT }),
);

describe("isProvablySimpleRing", () => {
  it("accepts a square, whichever way it winds", () => {
    const square: Position[] = [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
      [0, 0],
    ];
    expect(isProvablySimpleRing(square)).toBe(true);
    expect(isProvablySimpleRing([...square].reverse())).toBe(true);
  });

  it("accepts a ring that is star-shaped but not convex", () => {
    const notched: Position[] = [
      [-3, -3],
      [3, -3],
      [1, 0],
      [3, 3],
      [-3, 3],
      [-3, -3],
    ];
    expect(isProvablySimpleRing(notched)).toBe(true);
  });

  it("does not accept a simple ring that is not star-shaped about the mean of its vertices", () => {
    const horseshoe: Position[] = [
      [0, 0],
      [9, 0],
      [9, 9],
      [6, 9],
      [6, 3],
      [3, 3],
      [3, 9],
      [0, 9],
      [0, 0],
    ];
    expect(isProvablySimpleRing(horseshoe)).toBe(false);
  });

  it("does not accept a pentagram, which turns the same way at every vertex but goes round twice", () => {
    const pentagram = Array.from({ length: STAR_VERTICES }, (_, index) => {
      const angle = (index * STAR_STEP * FULL_TURN) / STAR_VERTICES;
      return [
        +Math.cos(angle).toFixed(DECIMALS),
        +Math.sin(angle).toFixed(DECIMALS),
      ];
    });
    expect(isProvablySimpleRing(closed(pentagram))).toBe(false);
  });

  it("does not accept a bow-tie, a ring that is not closed, or one with too few positions", () => {
    expect(
      isProvablySimpleRing([
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ]),
    ).toBe(false);
    expect(
      isProvablySimpleRing([
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ]),
    ).toBe(false);
    expect(
      isProvablySimpleRing([
        [0, 0],
        [4, 0],
        [0, 0],
      ]),
    ).toBe(false);
    expect(isProvablySimpleRing([])).toBe(false);
  });

  it("does not accept a repeated vertex, a spike or a vertex straight on the way to the next", () => {
    expect(
      isProvablySimpleRing([
        [0, 0],
        [4, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ]),
    ).toBe(false);
    expect(
      isProvablySimpleRing([
        [0, 0],
        [4, 0],
        [2, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ]),
    ).toBe(false);
  });

  it("does not accept a ring whose mean is not finite", () => {
    const big = Number.MAX_VALUE;
    const ring: Position[] = [
      [big, 0],
      [big, 1],
      [big, 2],
      [big, 3],
      [big, 0],
    ];
    expect(isProvablySimpleRing(ring)).toBe(false);
  });

  it("only accepts rings in which no two edges meet", () => {
    fc.assert(
      fc.property(
        fc.array(point, { minLength: 3, maxLength: MAX_VERTICES }),
        (vertices) => {
          const ring = closed(vertices);
          if (isProvablySimpleRing(ring)) {
            expect(meetsItself(ring)).toBe(false);
          }
        },
      ),
      { numRuns: NUMBER_OF_RUNS * 10 },
    );
  });

  it("accepts a ring of vertices in angular order about a point, with any radii", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0.5, max: 2, noNaN: true }), {
          minLength: 3,
          maxLength: MAX_VERTICES,
        }),
        (radii) => {
          const vertices = radii.map((radius, index) => {
            const angle = (index / radii.length) * FULL_TURN;
            return [
              +(radius * Math.cos(angle)).toFixed(DECIMALS),
              +(radius * Math.sin(angle)).toFixed(DECIMALS),
            ];
          });
          const ring = closed(vertices);
          expect(meetsItself(ring)).toBe(false);
          const mean = [0, 1].map(
            (axis) =>
              vertices.reduce((sum, v) => sum + (v[axis] as number), 0) /
              vertices.length,
          );
          const aroundMean = vertices.every(
            (v, i) =>
              orientation(
                mean,
                v,
                vertices[(i + 1) % vertices.length] as Position,
              ) === 1,
          );
          expect(isProvablySimpleRing(ring)).toBe(aroundMean);
        },
      ),
      { numRuns: NUMBER_OF_RUNS },
    );
  });
});

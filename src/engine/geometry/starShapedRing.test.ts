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
const WIDE_LIMIT = 40;
const WIDE_VERTICES = 16;
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

/** The orientation of three integer points, by exact integer arithmetic. */
function cross(a: Position, b: Position, c: Position): number {
  const value =
    ((b[0] as number) - (a[0] as number)) *
      ((c[1] as number) - (a[1] as number)) -
    ((b[1] as number) - (a[1] as number)) *
      ((c[0] as number) - (a[0] as number));
  return Math.sign(value);
}

function inBox(a: Position, b: Position, p: Position): boolean {
  return [0, 1].every(
    (axis) =>
      Math.min(a[axis] as number, b[axis] as number) <= (p[axis] as number) &&
      (p[axis] as number) <= Math.max(a[axis] as number, b[axis] as number),
  );
}

function segmentsMeet(
  a: Position,
  b: Position,
  c: Position,
  d: Position,
): boolean {
  const abc = cross(a, b, c);
  const abd = cross(a, b, d);
  const cda = cross(c, d, a);
  const cdb = cross(c, d, b);
  if (abc * abd < 0 && cda * cdb < 0) {
    return true;
  }
  return (
    (abc === 0 && inBox(a, b, c)) ||
    (abd === 0 && inBox(a, b, d)) ||
    (cda === 0 && inBox(c, d, a)) ||
    (cdb === 0 && inBox(c, d, b))
  );
}

/**
 * Whether two edges of a closed ring meet other than at a shared vertex, by
 * pairs of edges and integer arithmetic, with nothing from the sweep. Edges
 * that share a vertex also meet when they run back over each other.
 */
function meetsItselfPairwise(ring: readonly Position[]): boolean {
  const edges = ring.length - 1;
  for (let i = 0; i < edges; i++) {
    for (let j = i + 1; j < edges; j++) {
      const a = ring[i] as Position;
      const b = ring[i + 1] as Position;
      const c = ring[j] as Position;
      const d = ring[j + 1] as Position;
      const next = j === i + 1;
      const wraps = i === 0 && j === edges - 1;
      if (!next && !wraps) {
        if (segmentsMeet(a, b, c, d)) {
          return true;
        }
        continue;
      }
      const shared = next ? b : a;
      const far1 = next ? a : b;
      const far2 = next ? d : c;
      const alongSame =
        cross(shared, far1, far2) === 0 &&
        ((far1[0] as number) - (shared[0] as number)) *
          ((far2[0] as number) - (shared[0] as number)) +
          ((far1[1] as number) - (shared[1] as number)) *
            ((far2[1] as number) - (shared[1] as number)) >
          0;
      if (alongSame) {
        return true;
      }
    }
  }
  return false;
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

  it("accepts vertices exactly level with the mean, going either way round", () => {
    const diamond: Position[] = [
      [0, -2],
      [2, 0],
      [0, 2],
      [-2, 0],
      [0, -2],
    ];
    expect(isProvablySimpleRing(diamond)).toBe(true);
    expect(isProvablySimpleRing([...diamond].reverse())).toBe(true);
    const shifted = diamond.slice(1, -1).concat(diamond.slice(1, 2));
    expect(isProvablySimpleRing(shifted)).toBe(true);
    expect(isProvablySimpleRing([...shifted].reverse())).toBe(true);
  });

  it("does not accept a ring that goes twice round, with more than five vertices", () => {
    const twice = Array.from({ length: 14 }, (_, index) => {
      const angle = (index / 7) * FULL_TURN + (index >= 7 ? 0.1 : 0);
      const radius = index >= 7 ? 2 : 1;
      return [
        +(radius * Math.cos(angle)).toFixed(DECIMALS),
        +(radius * Math.sin(angle)).toFixed(DECIMALS),
      ];
    });
    expect(isProvablySimpleRing(closed(twice))).toBe(false);
    expect(isProvablySimpleRing(closed(twice).reverse())).toBe(false);
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

  it("never accepts a ring that meets itself, on a wider grid with points ordered by angle", () => {
    let accepted = 0;
    const wide = fc.tuple(
      fc.integer({ min: -WIDE_LIMIT, max: WIDE_LIMIT }),
      fc.integer({ min: -WIDE_LIMIT, max: WIDE_LIMIT }),
    );
    fc.assert(
      fc.property(
        fc.array(wide, { minLength: 3, maxLength: WIDE_VERTICES }),
        fc.boolean(),
        (points, shuffle) => {
          const meanX =
            points.reduce((sum, p) => sum + p[0], 0) / points.length;
          const meanY =
            points.reduce((sum, p) => sum + p[1], 0) / points.length;
          const ordered = shuffle
            ? points
            : [...points].sort(
                (a, b) =>
                  Math.atan2(a[1] - meanY, a[0] - meanX) -
                  Math.atan2(b[1] - meanY, b[0] - meanX),
              );
          const ring = closed(ordered);
          if (isProvablySimpleRing(ring)) {
            accepted += 1;
            expect(meetsItselfPairwise(ring)).toBe(false);
          }
        },
      ),
      { numRuns: NUMBER_OF_RUNS * 10 },
    );
    expect(accepted).toBeGreaterThan(NUMBER_OF_RUNS);
  });

  it("has a pairwise check that sees a bow-tie, a shared stretch and a touch", () => {
    expect(
      meetsItselfPairwise([
        [0, 0],
        [10, 10],
        [10, 0],
        [0, 10],
        [0, 0],
      ]),
    ).toBe(true);
    expect(
      meetsItselfPairwise([
        [0, 0],
        [4, 0],
        [2, 0],
        [4, 4],
        [0, 0],
      ]),
    ).toBe(true);
    expect(
      meetsItselfPairwise([
        [0, 0],
        [4, 0],
        [2, 2],
        [4, 4],
        [0, 4],
        [2, 2],
        [0, 0],
      ]),
    ).toBe(true);
    expect(
      meetsItselfPairwise([
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
        [0, 0],
      ]),
    ).toBe(false);
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

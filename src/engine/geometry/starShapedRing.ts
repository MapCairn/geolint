// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import type { Position } from "./predicates.js";
import { orientation } from "./predicates.js";

function x(position: Position): number {
  return position[0] ?? 0;
}

function y(position: Position): number {
  return position[1] ?? 0;
}

/**
 * Whether `position` is below `centre`, which puts its direction in the lower
 * half of the turn (angles above half a turn, up to a full one). The test is
 * exact, as it only compares coordinates.
 */
function isBelow(centre: Position, position: Position): boolean {
  return y(position) < y(centre);
}

/** The mean of the vertices, or undefined when it is not a finite position. */
function centreOf(
  ring: readonly Position[],
  vertices: number,
): Position | undefined {
  let sumX = 0;
  let sumY = 0;
  for (let index = 0; index < vertices; index++) {
    sumX += x(ring[index] as Position);
    sumY += y(ring[index] as Position);
  }
  const centre = [sumX / vertices, sumY / vertices] as const;
  return Number.isFinite(centre[0]) && Number.isFinite(centre[1])
    ? centre
    : undefined;
}

/**
 * Proves, where that is cheap, that a closed ring does not meet itself.
 *
 * It looks for a point from which the ring is star-shaped: every edge turns the
 * same way about the point by less than half a turn, and the ring goes round
 * the point exactly once. The turns are counted by the edges that step from
 * below the point to level with it or above it, which is one for each turn
 * whichever way the ring goes. Then the vertices are in strict angular order,
 * each edge covers an angular range of its own and consecutive edges share only
 * their common vertex, so no two edges meet anywhere else. The point tried is
 * the mean of the vertices. Every test is an exact orientation or a comparison
 * of coordinates, so a ring is accepted only when it is truly simple.
 *
 * A ring that is simple but not star-shaped about that point is not accepted,
 * and neither is one with a repeated vertex, a collinear vertex pair with the
 * point, a spike or a ring that is not closed: the caller sweeps those. The
 * answer `false` therefore means "not proved", never "crosses itself".
 */
export function isProvablySimpleRing(ring: readonly Position[]): boolean {
  const last = ring[ring.length - 1];
  const first = ring[0];
  if (
    first === undefined ||
    last === undefined ||
    x(first) !== x(last) ||
    y(first) !== y(last)
  ) {
    return false;
  }
  const edges = ring.length - 1;
  const centre = centreOf(ring, edges);
  if (centre === undefined) {
    return false;
  }
  const turn = orientation(centre, first, ring[1] as Position);
  if (turn === 0) {
    return false;
  }
  let halfTurns = 0;
  for (let index = 0; index < edges; index++) {
    const from = ring[index] as Position;
    const to = ring[index + 1] as Position;
    if (orientation(centre, from, to) !== turn) {
      return false;
    }
    if (isBelow(centre, from) && !isBelow(centre, to)) {
      halfTurns += 1;
    }
  }
  return halfTurns === 1;
}

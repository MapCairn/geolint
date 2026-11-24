// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { isObject, isPosition, pointer } from "../json.js";
import type { Position } from "./predicates.js";

/** The geometry types that hold coordinates. A `GeometryCollection` holds others. */
export type LeafType =
  | "Point"
  | "MultiPoint"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon";

const LEAF_TYPES: ReadonlySet<string> = new Set([
  "Point",
  "MultiPoint",
  "LineString",
  "MultiLineString",
  "Polygon",
  "MultiPolygon",
]);

/** How deep nested `GeometryCollection`s are followed, so hostile input cannot exhaust the stack. */
export const MAX_COLLECTION_DEPTH = 32;

/** A geometry that holds coordinates, found anywhere in a feature. */
export interface LeafGeometry {
  readonly type: LeafType;
  /** The `coordinates` member as parsed. It may be malformed; use the helpers below. */
  readonly coordinates: unknown;
  /** Feature-relative JSON pointer of the geometry object, such as `/geometry` or `/geometry/geometries/1`. */
  readonly pointer: string;
}

/**
 * What has been worked out for the feature read last. The rules run one feature
 * at a time, so remembering a single feature gives every rule after the first a
 * free read, and holds on to one feature at most, however large the file is.
 */
interface FeatureView {
  readonly feature: object;
  readonly leaves: readonly LeafGeometry[];
  lines?: Map<LeafGeometry, readonly RunRef[]>;
  rings?: Map<LeafGeometry, readonly RingRef[]>;
}

let lastView: FeatureView | undefined;

function isLeafType(value: unknown): value is LeafType {
  return typeof value === "string" && LEAF_TYPES.has(value);
}

function collect(
  geometry: unknown,
  at: string,
  depth: number,
  out: LeafGeometry[],
): void {
  if (!isObject(geometry)) {
    return;
  }
  if (isLeafType(geometry.type)) {
    out.push({
      type: geometry.type,
      coordinates: geometry.coordinates,
      pointer: at,
    });
    return;
  }
  if (
    geometry.type === "GeometryCollection" &&
    Array.isArray(geometry.geometries) &&
    depth < MAX_COLLECTION_DEPTH
  ) {
    geometry.geometries.forEach((child: unknown, index: number) => {
      collect(child, pointer(at, "geometries", index), depth + 1, out);
    });
  }
}

/**
 * The geometry objects that hold coordinates in a feature, in document order,
 * with `GeometryCollection`s flattened to their members. Anything that is not a
 * readable geometry (a null geometry, an unknown type) is skipped, so a rule can
 * call this on any JSON value.
 *
 * Accepts a `Feature` (reads `geometry`) or a bare geometry object.
 *
 * The result for the feature asked about last is kept and shared by every
 * caller, which is why it is `readonly`: the rules never change a feature and
 * run one feature at a time, so the first rule to ask pays and the others reuse
 * it. A different feature replaces the entry, so one feature is held at most.
 * A value that is not an object is not cached. A feature must not be changed
 * between reads: a changed feature has to be a new object (as `fixLeaves`
 * returns), or the old result is served.
 */
export function leafGeometries(feature: unknown): readonly LeafGeometry[] {
  if (!isObject(feature)) {
    return [];
  }
  if (lastView?.feature === feature) {
    return lastView.leaves;
  }
  const out: LeafGeometry[] = [];
  const geometry = feature.type === "Feature" ? feature.geometry : feature;
  collect(geometry, geometryPointer(feature), 0, out);
  lastView = { feature, leaves: out };
  return out;
}

/**
 * The feature-relative pointer of the geometry of a feature: `/geometry` for a
 * `Feature`, and the empty pointer for a bare geometry, which is its own geometry.
 */
export function geometryPointer(feature: unknown): string {
  return isObject(feature) && feature.type === "Feature" ? "/geometry" : "";
}

/** A readable position and where it is. */
export interface PositionRef {
  readonly position: Position;
  /** Feature-relative pointer of the position. */
  readonly pointer: string;
}

/** A line or ring: a run of readable positions and where it is. */
export interface RunRef {
  readonly positions: readonly Position[];
  /** Feature-relative pointer of the array of positions. */
  readonly pointer: string;
}

/** A polygon ring. */
export interface RingRef extends RunRef {
  /** Whether this is the first ring of its polygon, the exterior. */
  readonly isExterior: boolean;
  /** Feature-relative pointer of the polygon's array of rings. */
  readonly polygonPointer: string;
}

function readRun(value: unknown): Position[] | undefined {
  if (!Array.isArray(value) || !value.every(isPosition)) {
    return undefined;
  }
  return value as Position[];
}

function readLines(leaf: LeafGeometry): RunRef[] {
  const base = pointer(leaf.pointer, "coordinates");
  if (leaf.type === "LineString") {
    const positions = readRun(leaf.coordinates);
    return positions ? [{ positions, pointer: base }] : [];
  }
  if (leaf.type !== "MultiLineString" || !Array.isArray(leaf.coordinates)) {
    return [];
  }
  return leaf.coordinates.flatMap((line: unknown, index: number) => {
    const positions = readRun(line);
    return positions ? [{ positions, pointer: pointer(base, index) }] : [];
  });
}

/**
 * The lines of a `LineString` or `MultiLineString`; malformed lines are
 * skipped. Shared like `leafGeometries`, for the leaves of the feature read last.
 */
export function linesOf(leaf: LeafGeometry): readonly RunRef[] {
  const view = lastView;
  const known = view?.lines?.get(leaf);
  if (known !== undefined) {
    return known;
  }
  const lines = readLines(leaf);
  if (view) {
    view.lines ??= new Map();
    view.lines.set(leaf, lines);
  }
  return lines;
}

function ringsOfPolygon(value: unknown, base: string): RingRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((ring: unknown, index: number) => {
    const positions = readRun(ring);
    return positions
      ? [
          {
            positions,
            pointer: pointer(base, index),
            isExterior: index === 0,
            polygonPointer: base,
          },
        ]
      : [];
  });
}

function readRings(leaf: LeafGeometry): RingRef[] {
  const base = pointer(leaf.pointer, "coordinates");
  if (leaf.type === "Polygon") {
    return ringsOfPolygon(leaf.coordinates, base);
  }
  if (leaf.type !== "MultiPolygon" || !Array.isArray(leaf.coordinates)) {
    return [];
  }
  return leaf.coordinates.flatMap((polygon: unknown, index: number) =>
    ringsOfPolygon(polygon, pointer(base, index)),
  );
}

/**
 * The rings of a `Polygon` or `MultiPolygon`; malformed rings are skipped.
 * Shared like `leafGeometries`, for the leaves of the feature read last.
 */
export function ringsOf(leaf: LeafGeometry): readonly RingRef[] {
  const view = lastView;
  const known = view?.rings?.get(leaf);
  if (known !== undefined) {
    return known;
  }
  const rings = readRings(leaf);
  if (view) {
    view.rings ??= new Map();
    view.rings.set(leaf, rings);
  }
  return rings;
}

/** The readable positions of a leaf geometry that pass a test, and where the first is. */
export interface PositionMatches {
  readonly positions: readonly Position[];
  /** The first match and its feature-relative pointer; undefined when nothing matched. */
  readonly first: PositionRef | undefined;
}

/**
 * Tests every readable position of a leaf geometry, in document order, the ones
 * a line or ring that is wholly readable holds and the readable members of a
 * `Point` or `MultiPoint`. It builds a JSON pointer only for the first match,
 * because a rule reports one finding for a geometry and a pointer for every
 * position costs more than the test.
 */
export function matchingPositions(
  leaf: LeafGeometry,
  test: (position: Position) => boolean,
): PositionMatches {
  const base = pointer(leaf.pointer, "coordinates");
  const positions: Position[] = [];
  let first: PositionRef | undefined;
  const scan = (
    items: readonly unknown[],
    pointerAt: (index: number) => string,
  ): void => {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (isPosition(item) && test(item)) {
        if (first === undefined) {
          first = { position: item, pointer: pointerAt(index) };
        }
        positions.push(item);
      }
    }
  };
  if (leaf.type === "Point") {
    scan([leaf.coordinates], () => base);
  } else if (leaf.type === "MultiPoint") {
    if (Array.isArray(leaf.coordinates)) {
      scan(leaf.coordinates, (index) => pointer(base, index));
    }
  } else {
    const runs: readonly RunRef[] =
      leaf.type === "LineString" || leaf.type === "MultiLineString"
        ? linesOf(leaf)
        : ringsOf(leaf);
    for (const run of runs) {
      scan(run.positions, (index) => pointer(run.pointer, index));
    }
  }
  return { positions, first };
}

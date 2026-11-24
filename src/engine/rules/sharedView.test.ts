// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { describe, expect, it } from "vitest";
import {
  type LeafGeometry,
  leafGeometries,
  linesOf,
  ringsOf,
} from "../geometry/walk.js";
import type { RuleContext } from "../types.js";
import { fixLeaves } from "./fixSupport.js";
import { rules } from "./index.js";

/** The rules that read geometry through the shared view; the others read `geometry` themselves. */
const VIEW_RULE_IDS: ReadonlySet<string> = new Set([
  "winding-order",
  "unclosed-ring",
  "self-intersection",
  "duplicate-vertices",
  "coordinate-order",
  "projected-coords",
  "precision",
  "antimeridian",
  "null-island",
]);

const CONTEXT: RuleContext = { regions: [], countries: undefined };

const CLOCKWISE_RING = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
  [0, 0],
];

function polygonFeature(): Record<string, unknown> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [CLOCKWISE_RING] },
  };
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const member of Object.values(value)) {
      deepFreeze(member);
    }
    Object.freeze(value);
  }
  return value;
}

describe("the shared view of a feature", () => {
  it("reads a feature's geometry once however many rules walk it", () => {
    let reads = 0;
    const feature = {
      type: "Feature",
      properties: {},
      get geometry() {
        reads += 1;
        return { type: "Polygon", coordinates: [CLOCKWISE_RING] };
      },
    };

    const viewRules = rules.filter((rule) => VIEW_RULE_IDS.has(rule.id));
    for (const rule of viewRules) {
      rule.check(feature, CONTEXT);
    }

    expect(viewRules).toHaveLength(VIEW_RULE_IDS.size);
    expect(reads).toBe(1);
  });

  it("gives every caller the same leaves, rings and lines of a feature", () => {
    const feature = polygonFeature();
    const [leaf] = leafGeometries(feature);

    expect(leafGeometries(feature)).toBe(leafGeometries(feature));
    expect(ringsOf(leaf as LeafGeometry)).toBe(ringsOf(leaf as LeafGeometry));
    expect(linesOf(leaf as LeafGeometry)).toBe(linesOf(leaf as LeafGeometry));
  });

  it("does not serve a repaired feature from the entry of the original", () => {
    const original = polygonFeature();
    leafGeometries(original);

    const repaired = fixLeaves(original, (leaf) =>
      leaf.type === "Polygon"
        ? [[...CLOCKWISE_RING].reverse()]
        : leaf.coordinates,
    );

    expect(repaired).not.toBe(original);
    expect(leafGeometries(repaired)[0]?.coordinates).toEqual([
      [...CLOCKWISE_RING].reverse(),
    ]);
    expect(leafGeometries(original)[0]?.coordinates).toEqual([CLOCKWISE_RING]);
  });

  it("gives the right rings for a leaf of a feature that is not the one read last", () => {
    const first = polygonFeature();
    const second = polygonFeature();
    const [leafOfFirst] = leafGeometries(first);
    leafGeometries(second);

    const rings = ringsOf(leafOfFirst as LeafGeometry);

    expect(rings.map((ring) => ring.positions)).toEqual([CLOCKWISE_RING]);
    expect(ringsOf(leafOfFirst as LeafGeometry)).toEqual(rings);
  });

  it("shares the view of a collection with many leaves", () => {
    const geometries = Array.from({ length: 2000 }, () => ({
      type: "Polygon",
      coordinates: [CLOCKWISE_RING],
    }));
    const feature = {
      type: "Feature",
      properties: {},
      geometry: { type: "GeometryCollection", geometries },
    };

    const leaves = leafGeometries(feature);

    expect(leaves).toHaveLength(2000);
    expect(leafGeometries(feature)).toBe(leaves);
    for (const leaf of leaves) {
      expect(ringsOf(leaf)).toBe(ringsOf(leaf));
    }
  });

  it("lets every rule read a feature that is frozen all the way down", () => {
    const feature = deepFreeze({
      type: "Feature",
      properties: { name: "x" },
      geometry: {
        type: "GeometryCollection",
        geometries: [
          { type: "Polygon", coordinates: [CLOCKWISE_RING] },
          {
            type: "MultiLineString",
            coordinates: [
              [
                [0, 0],
                [0, 0],
                [1, 1],
              ],
            ],
          },
          { type: "Point", coordinates: [0, 0] },
        ],
      },
    });

    for (const rule of rules) {
      expect(() => rule.check(feature, CONTEXT)).not.toThrow();
    }
  });

  it("leaves a value that is not an object uncached", () => {
    expect(leafGeometries(null)).toEqual([]);
    expect(leafGeometries(5)).toEqual([]);
    expect(leafGeometries("x")).toEqual([]);
  });
});

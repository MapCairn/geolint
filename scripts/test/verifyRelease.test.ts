// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { createHash } from "node:crypto";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ALLOWED_FILES,
  changelogSection,
  checkDigest,
  checkNpmVersion,
  checkTarball,
  decideRelease,
  digestOf,
  run,
  // @ts-expect-error The scripts are dependency-free JavaScript with JSDoc types.
} from "../release/verifyRelease.mjs";

const PACKAGE_NAME = "@mapcairn/geolint";

const MANIFEST = {
  name: PACKAGE_NAME,
  version: "1.2.3",
  files: ["dist", "LICENSE", "NOTICE", "README.md", "ATTRIBUTIONS.md"],
};

describe("decideRelease", () => {
  it("accepts a tag that names the manifest's version", () => {
    expect(decideRelease("v1.2.3", MANIFEST)).toEqual({
      version: "1.2.3",
      distTag: "latest",
      prerelease: false,
      private: false,
    });
  });

  it("publishes a prerelease under the next tag, never latest", () => {
    const result = decideRelease("v1.3.0-rc.1", {
      ...MANIFEST,
      version: "1.3.0-rc.1",
    });
    expect(result.distTag).toBe("next");
    expect(result.prerelease).toBe(true);
  });

  it("reports that the manifest is still private", () => {
    expect(
      decideRelease("v1.2.3", { ...MANIFEST, private: true }).private,
    ).toBe(true);
  });

  it.each([
    "1.2.3",
    "v1.2",
    "v1.2.3 ",
    "v1.2.3;echo",
    "v01.2.3",
    "v1.2.3-",
    "",
  ])("rejects the malformed tag %j", (tag) => {
    expect(() => decideRelease(tag, MANIFEST)).toThrow(/tag/i);
  });

  it("rejects a tag that differs from the manifest's version", () => {
    expect(() => decideRelease("v1.2.4", MANIFEST)).toThrow(/1\.2\.3/);
  });
});

describe("checkTarball", () => {
  const files = [
    "package/package.json",
    "package/LICENSE",
    "package/README.md",
    "package/dist/index.js",
    "package/dist/cli/bin.js",
  ];

  it("accepts the expected package", () => {
    expect(() => checkTarball(MANIFEST, files, "1.2.3")).not.toThrow();
  });

  it("rejects another package's name", () => {
    expect(() =>
      checkTarball({ ...MANIFEST, name: "geolint" }, files, "1.2.3"),
    ).toThrow(/name/);
  });

  it("rejects a version that is not the tag's", () => {
    expect(() => checkTarball(MANIFEST, files, "9.9.9")).toThrow(/version/);
  });

  it("rejects a tarball whose manifest is still private", () => {
    expect(() =>
      checkTarball({ ...MANIFEST, private: true }, files, "1.2.3"),
    ).toThrow(/private/);
  });

  it.each([
    "package/.env",
    "package/src/index.ts",
    "package/node_modules/x/index.js",
    "package/dist/../secret",
    "other/package.json",
  ])("rejects the unexpected file %s", (file) => {
    expect(() => checkTarball(MANIFEST, [...files, file], "1.2.3")).toThrow(
      /unexpected file/,
    );
  });

  it("allows exactly the files the manifest ships", () => {
    expect(ALLOWED_FILES).toEqual([
      "package.json",
      "LICENSE",
      "NOTICE",
      "README.md",
      "ATTRIBUTIONS.md",
    ]);
  });
});

describe("digests", () => {
  const bytes = Buffer.from("tarball bytes");
  const expected = createHash("sha256").update(bytes).digest("hex");

  it("computes a SHA-256 digest", () => {
    expect(digestOf(bytes)).toBe(expected);
  });

  it("accepts bytes that match the recorded digest", () => {
    expect(() => checkDigest(bytes, expected)).not.toThrow();
  });

  it("rejects bytes that changed after the digest was recorded", () => {
    expect(() => checkDigest(Buffer.from("other bytes"), expected)).toThrow(
      /digest/,
    );
  });

  it("rejects a missing digest", () => {
    expect(() => checkDigest(bytes, "")).toThrow(/digest/);
  });
});

describe("changelogSection", () => {
  const text = [
    "# Changelog",
    "",
    "## 1.2.3",
    "",
    "- Fixed a thing.",
    "",
    "## 1.2.2",
    "",
    "- Older.",
    "",
  ].join("\n");

  it("returns the section of the version, without its heading", () => {
    expect(changelogSection(text, "1.2.3")).toBe("- Fixed a thing.");
  });

  it("does not match a version that only starts the same way", () => {
    expect(() => changelogSection(text, "1.2")).toThrow(/CHANGELOG/);
  });

  it("fails when the version has no section", () => {
    expect(() => changelogSection(text, "2.0.0")).toThrow(/CHANGELOG/);
  });

  it("fails when the section is empty", () => {
    expect(() =>
      changelogSection("## 1.2.3\n\n## 1.2.2\n\n- x\n", "1.2.3"),
    ).toThrow(/empty/);
  });
});

describe("run", () => {
  const bytes = Buffer.from("packed once");

  function folderWithTarball(): string {
    const folder = mkdtempSync(path.join(tmpdir(), "release-"));
    writeFileSync(path.join(folder, "geolint-1.2.3.tgz"), bytes);
    return folder;
  }

  it("records the tarball's name and digest as output lines", () => {
    const lines: string[] = [];
    run(["record", folderWithTarball()], {}, (line: string) =>
      lines.push(line),
    );
    expect(lines).toEqual([
      "tarball=geolint-1.2.3.tgz",
      `digest=${digestOf(bytes)}`,
    ]);
  });

  it("checks the tarball against the digest in the environment", () => {
    const folder = folderWithTarball();
    expect(() =>
      run(["check", folder], { DIGEST: digestOf(bytes) }, () => undefined),
    ).not.toThrow();
    expect(() =>
      run(["check", folder], { DIGEST: "0".repeat(64) }, () => undefined),
    ).toThrow(/digest/);
  });

  it("needs exactly one tarball in the folder", () => {
    const folder = mkdtempSync(path.join(tmpdir(), "release-"));
    expect(() => run(["record", folder], {}, () => undefined)).toThrow(
      /exactly one/,
    );
  });

  it("explains its usage for an unknown command", () => {
    expect(() => run(["publish"], {}, () => undefined)).toThrow(/Usage/);
  });
});

describe("checkNpmVersion", () => {
  it.each(["11.5.1", "11.19.1", "12.0.0", "11.5.2"])("accepts npm %s", (v) => {
    expect(() => checkNpmVersion(v)).not.toThrow();
  });

  it.each(["11.5.0", "10.9.2", "11.4.9", "", "not a version"])(
    "rejects npm %j, which cannot publish with trusted publishing",
    (v) => {
      expect(() => checkNpmVersion(v)).toThrow(/11\.5\.1/);
    },
  );
});

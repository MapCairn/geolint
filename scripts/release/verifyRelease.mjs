// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
/**
 * The checks of the release workflow (`.github/workflows/release.yml`), as one
 * small command. Nothing here publishes, tags or talks to npm.
 *
 *   TAG=v1.2.3 node scripts/release/verifyRelease.mjs decide
 *   node scripts/release/verifyRelease.mjs tarball <folder> <version>
 *   node scripts/release/verifyRelease.mjs record <folder>
 *   DIGEST=<sha256> node scripts/release/verifyRelease.mjs check <folder>
 *   node scripts/release/verifyRelease.mjs notes <version>
 *   node scripts/release/verifyRelease.mjs npm-version
 *
 * `decide` and `record` print `name=value` lines for `$GITHUB_OUTPUT`. The tag
 * and the digest reach the script through the environment, never through the
 * text of a shell line. The folder holds one `.tgz`, the tarball that `npm pack`
 * made once in the `verify` job and that the `npm` job publishes unchanged.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { isEntryPoint } from "../entryPoint.mjs";

/** The package a release publishes. */
const PACKAGE_NAME = "@mapcairn/geolint";

/** A release tag: `v` and a semantic version with no leading zeros. */
const TAG =
  /^v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(-[0-9A-Za-z.-]+)?)$/;

/** A digest as `sha256sum` writes it. */
const DIGEST = /^[0-9a-f]{64}$/;

/** The files the tarball may hold at its top level, besides the `dist` folder. */
export const ALLOWED_FILES = [
  "package.json",
  "LICENSE",
  "NOTICE",
  "README.md",
  "ATTRIBUTIONS.md",
];

/** The folder `npm pack` puts every file under. */
const TARBALL_ROOT = "package/";

/** The folder of built files the manifest ships. */
const DIST_PREFIX = `${TARBALL_ROOT}dist/`;

/**
 * Reads a pushed tag against the manifest.
 *
 * @param {string} tag The pushed tag, such as `v1.2.3`.
 * @param {{ version: string, private?: unknown }} manifest The `package.json` at the tagged commit.
 * @returns {{ version: string, distTag: string, prerelease: boolean, private: boolean }}
 * @throws {Error} When the tag is malformed or names another version.
 */
export function decideRelease(tag, manifest) {
  const match = TAG.exec(tag);
  if (match === null) {
    throw new Error(
      `The tag ${JSON.stringify(tag)} is not v<major>.<minor>.<patch>[-prerelease].`,
    );
  }
  const version = match[1];
  if (version !== manifest.version) {
    throw new Error(
      `The tag names ${version}, but package.json says ${manifest.version}.`,
    );
  }
  const prerelease = match[2] !== undefined;
  return {
    version,
    distTag: prerelease ? "next" : "latest",
    prerelease,
    private: manifest.private === true,
  };
}

/**
 * Checks what a tarball holds against the tag's version.
 *
 * @param {{ name: string, version: string, private?: unknown }} manifest The `package.json` inside the tarball.
 * @param {string[]} files The paths in the tarball.
 * @param {string} version The version the tag names.
 * @throws {Error} On another name or version, a private manifest or a file the package does not ship.
 */
export function checkTarball(manifest, files, version) {
  if (manifest.name !== PACKAGE_NAME) {
    throw new Error(
      `The tarball's name is ${manifest.name}, not ${PACKAGE_NAME}.`,
    );
  }
  if (manifest.version !== version) {
    throw new Error(
      `The tarball's version is ${manifest.version}, not ${version}.`,
    );
  }
  if (manifest.private === true) {
    throw new Error("The tarball's manifest is private, so npm would skip it.");
  }
  for (const file of files) {
    if (!isShipped(file)) {
      throw new Error(`The tarball holds an unexpected file: ${file}`);
    }
  }
}

/**
 * @param {string} file A path in the tarball.
 * @returns {boolean} Whether the package ships it.
 */
function isShipped(file) {
  if (!file.startsWith(TARBALL_ROOT) || file.split("/").includes("..")) {
    return false;
  }
  if (file.startsWith(DIST_PREFIX)) {
    return true;
  }
  return ALLOWED_FILES.includes(file.slice(TARBALL_ROOT.length));
}

/** The first npm that can publish with trusted publishing. */
const MINIMUM_NPM = [11, 5, 1];

/**
 * Checks the npm on the runner, so a release fails in `verify`, before anyone
 * is asked to approve a deployment, and not at the publish.
 *
 * @param {string} version What `npm --version` printed.
 * @throws {Error} When npm is older than 11.5.1 or the version cannot be read.
 */
export function checkNpmVersion(version) {
  const parts = version.trim().split(".").map(Number);
  const ok =
    parts.length === 3 &&
    parts.every(Number.isInteger) &&
    isAtLeast(parts, MINIMUM_NPM);
  if (!ok) {
    throw new Error(
      `npm ${JSON.stringify(version)} cannot publish with trusted publishing; it needs ${MINIMUM_NPM.join(".")} or later.`,
    );
  }
}

/**
 * @param {number[]} parts
 * @param {number[]} minimum
 * @returns {boolean} Whether `parts` is the same as or later than `minimum`.
 */
function isAtLeast(parts, minimum) {
  for (let i = 0; i < minimum.length; i += 1) {
    if (parts[i] !== minimum[i]) {
      return (parts[i] ?? 0) > (minimum[i] ?? 0);
    }
  }
  return true;
}

/**
 * @param {Uint8Array} bytes
 * @returns {string} The SHA-256 digest in lower-case hexadecimal.
 */
export function digestOf(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * @param {Uint8Array} bytes The tarball as downloaded.
 * @param {string} expected The digest recorded when it was packed.
 * @throws {Error} When the digest is missing or the bytes changed.
 */
export function checkDigest(bytes, expected) {
  if (!DIGEST.test(expected)) {
    throw new Error("The recorded digest is missing or malformed.");
  }
  if (digestOf(bytes) !== expected) {
    throw new Error("The tarball's digest differs from the one recorded.");
  }
}

/**
 * The release notes of one version.
 *
 * @param {string} text The text of `CHANGELOG.md`.
 * @param {string} version
 * @returns {string} The section under `## <version>`, trimmed.
 * @throws {Error} When the version has no section or the section is empty.
 */
export function changelogSection(text, version) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${version}`);
  if (start === -1) {
    throw new Error(`CHANGELOG.md has no section for ${version}.`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  const body = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  if (body === "") {
    throw new Error(`The CHANGELOG.md section for ${version} is empty.`);
  }
  return body;
}

/**
 * @param {string} folder
 * @returns {string} The path of the one tarball in the folder.
 */
function tarballIn(folder) {
  const found = readdirSync(folder).filter((name) => name.endsWith(".tgz"));
  if (found.length !== 1) {
    throw new Error(
      `${folder} must hold exactly one .tgz, found ${found.length}.`,
    );
  }
  return path.join(folder, found[0] ?? "");
}

/**
 * @param {string[]} argv The arguments after the script's name.
 * @param {Record<string, string | undefined>} env
 * @param {(line: string) => void} out Where output lines go.
 */
export function run(argv, env, out) {
  const [command, first, second] = argv;
  if (command === "decide") {
    const manifest = JSON.parse(readFileSync("package.json", "utf8"));
    const result = decideRelease(env.TAG ?? "", manifest);
    out(`version=${result.version}`);
    out(`dist-tag=${result.distTag}`);
    out(`private=${result.private}`);
    return;
  }
  if (command === "tarball") {
    const file = tarballIn(first ?? "");
    const manifest = JSON.parse(
      execFileSync("tar", ["-xzOf", file, `${TARBALL_ROOT}package.json`], {
        encoding: "utf8",
      }),
    );
    const files = execFileSync("tar", ["-tzf", file], { encoding: "utf8" })
      .split("\n")
      .filter((line) => line !== "" && !line.endsWith("/"));
    checkTarball(manifest, files, second ?? "");
    return;
  }
  if (command === "record") {
    const file = tarballIn(first ?? "");
    out(`tarball=${path.basename(file)}`);
    out(`digest=${digestOf(readFileSync(file))}`);
    return;
  }
  if (command === "check") {
    checkDigest(readFileSync(tarballIn(first ?? "")), env.DIGEST ?? "");
    return;
  }
  if (command === "npm-version") {
    checkNpmVersion(execFileSync("npm", ["--version"], { encoding: "utf8" }));
    return;
  }
  if (command === "notes") {
    out(changelogSection(readFileSync("CHANGELOG.md", "utf8"), first ?? ""));
    return;
  }
  throw new Error(
    "Usage: verifyRelease.mjs decide | tarball <folder> <version> | record <folder> | check <folder> | notes <version> | npm-version",
  );
}

if (isEntryPoint(import.meta.url)) {
  try {
    run(process.argv.slice(2), process.env, console.log);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

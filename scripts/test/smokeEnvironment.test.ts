// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { describe, expect, it } from "vitest";
import {
  withoutAllowScripts,
  // @ts-expect-error The scripts are dependency-free JavaScript with JSDoc types.
} from "../smokeEnvironment.mjs";

describe("withoutAllowScripts", () => {
  it("drops the allow-scripts setting that npm run passes on, and nothing else", () => {
    expect(
      withoutAllowScripts({
        npm_config_allow_scripts: "workerd",
        npm_config_userconfig: "user.npmrc",
        PATH: "/bin",
      }),
    ).toEqual({ npm_config_userconfig: "user.npmrc", PATH: "/bin" });
  });

  it("matches the name in any case, as Windows variable names are not case sensitive", () => {
    expect(
      withoutAllowScripts({ NPM_CONFIG_ALLOW_SCRIPTS: "x", Path: "/bin" }),
    ).toEqual({ Path: "/bin" });
  });

  it("returns a copy and leaves its argument alone", () => {
    const original = { npm_config_allow_scripts: "x" };
    withoutAllowScripts(original);
    expect(original).toEqual({ npm_config_allow_scripts: "x" });
  });
});

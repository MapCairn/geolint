// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors

/**
 * The environment without npm's `allow-scripts` setting. `npm run` passes the
 * user's settings on to the scripts it starts as `npm_config_*` variables, and
 * npm 11 refuses `allow-scripts` from there in the smoke test's project-scoped
 * install. The name is matched in any case because Windows variable names are
 * not case sensitive.
 *
 * @param {NodeJS.ProcessEnv} environment
 * @returns {NodeJS.ProcessEnv}
 */
export function withoutAllowScripts(environment) {
  return Object.fromEntries(
    Object.entries(environment).filter(
      ([name]) => name.toLowerCase() !== "npm_config_allow_scripts",
    ),
  );
}

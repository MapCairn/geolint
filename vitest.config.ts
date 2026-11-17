// SPDX-License-Identifier: Apache-2.0
// Copyright MapCairn contributors
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // The package's own code. The repository tooling in scripts/ has tests
      // too, which run with the rest, but it is not part of the package.
      include: ["src/**"],
      exclude: ["**/*.test.ts"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
    },
  },
});

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      react: {
        // ESLint 10 removed context.getFilename(); explicit version avoids plugin crash.
        version: "19",
      },
    },
    rules: {
      // Fetch / sync on mount remains idiomatic here; the rule is too strict for this app.
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-page-custom-font": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "commitlint.config.mjs",
    "postcss.config.js",
    "release.config.cjs",
    "scripts/**",
    "server.js",
  ]),
]);

export default eslintConfig;

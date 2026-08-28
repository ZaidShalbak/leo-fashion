import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored chart components pulled in via the shadcn CLI's Bklit UI
    // registry (npx shadcn add @bklit/...) — third-party source we don't
    // hand-maintain, same reasoning as excluding .next/build output. Our
    // own usage of these components (e.g. the analytics page) still gets
    // linted normally; only this directory's own internals are excluded.
    "src/components/charts/**",
  ]),
]);

export default eslintConfig;

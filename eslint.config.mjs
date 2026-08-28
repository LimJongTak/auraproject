import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These React Compiler rules flag the standard "subscribe to an
      // external store (Firebase listeners, react-hook-form) in useEffect"
      // pattern used throughout this app's data layer, which is correct and
      // intentional here (not accidental cascading renders).
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored pdf.js worker bundle, not source we own/lint.
    "public/pdf.worker.min.mjs",
    // Compiled Cloud Functions output (gitignored build artifact).
    "functions/lib/**",
    // Firebase Data Connect codegen, not hand-authored.
    "src/dataconnect-generated/**",
  ]),
]);

export default eslintConfig;

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

const tsFilePattern = ["**/*.{ts,tsx,cts,mts}"];

const withTsFiles = (config) =>
  config.files ? config : { ...config, files: tsFilePattern };

import { defineConfig } from "eslint/config";
export default defineConfig([
  {
    ignores: ["eslint.config.js", "dist/**"],
  },
  {
    files: ["**/*.{js,jsx,cjs,mjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommendedTypeChecked.map(withTsFiles),
  ...tseslint.configs.stylisticTypeChecked.map(withTsFiles),
  {
    files: tsFilePattern,
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
]);

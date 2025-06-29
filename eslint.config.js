import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Global ignores
  { 
    ignores: [
      'dist/**',
      'node_modules/**',
      'backend/dist/**',
      'ui/dist/**',
      'ui/src/lib/api-client/**', // Generated API client
      '**/*.generated.*',
      'coverage/**'
    ] 
  },
  
  // Root level config for shared files
  {
    files: ['*.{js,ts,mjs}'], // Root level config files
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },

  // Backend specific config
  {
    files: ['backend/**/*.{js,ts}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
    rules: {
      "no-console": "off", // Allow console in backend
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    },
  },

  // UI workspace should use its own eslint.config.js
  // So we don't need UI-specific rules here
)

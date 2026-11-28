import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '.claude',
      'dist',
      'node_modules',
      'runs',
      'tests/golden/baseline.json',
      'tests/shots',
      'art/vex',
      'tools/vex',
      'test-results',
      'playwright-report',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    /* the browser checks get the empty stand-in for the hosted database only through the test in helpers.ts */
    files: ['tests/e2e/**/*.{ts,js,mjs}'],
    ignores: ['tests/e2e/helpers.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@playwright/test',
              importNames: ['test'],
              message: 'Import test from ./helpers.ts, so the check never reaches the hosted database.',
            },
          ],
        },
      ],
    },
  },
  prettier,
);

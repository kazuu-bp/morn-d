const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');

module.exports = [
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      tseslint
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    settings: {
    },
    rules: {
    },
  }),
];

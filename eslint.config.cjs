const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const react = require('eslint-plugin-react');

module.exports = [
  {
    ignores: ['.react-router/**'],
  },
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
    ],
    plugins: {
      react,
    },
    languageOptions: {
      parser: tseslint.parser,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
    },
  }),
];

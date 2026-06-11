import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Vite uses the automatic JSX runtime — React need not be in scope.
      'react/react-in-jsx-scope': 'off',
      // No TypeScript / PropTypes in this project.
      'react/prop-types': 'off',
      // Lots of prose copy in JSX; entity escaping is noise here.
      'react/no-unescaped-entities': 'off',
    },
  },
];

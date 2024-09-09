import jest from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  ...compat.extends('eslint:recommended', 'plugin:react/recommended'),
  {
    plugins: {
      react,
      '@typescript-eslint': typescriptEslint
    },

    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest
      },

      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module'
    },

    settings: {
      react: {
        version: 'detect'
      }
    },

    rules: {
      'no-unused-vars': 'off',
      'no-useless-escape': 'warn',

      'no-constant-condition': [
        'error',
        {
          checkLoops: false
        }
      ],

      'no-var': 'error',
      'prefer-const': 'error',
      'no-console': 'off',
      'no-empty-pattern': 'off',

      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: "Don't declare enums"
        }
      ],

      'react/prop-types': 'off',
      'react/display-name': 'off'
    }
  },
  {
    files: ['**/*.test.ts'],

    plugins: {
      jest
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],

    rules: {
      'no-undef': 'off'
    }
  },
  {
    files: ['packages/circus-web-ui/src/**/*.{js,ts,tsx}'],

    plugins: {
      'react-hooks': reactHooks
    },

    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react/jsx-closing-bracket-location': ['error', 'line-aligned']
    }
  }
];

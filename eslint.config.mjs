import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
        ...globals.node
      },

      parser: tsParser,
      ecmaVersion: 2021,
      sourceType: 'module'
    },

    settings: {
      react: {
        version: '17.0.2'
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
    // Relative imports must have an explicit extension (e.g., './foo.ts')
    // so that the sources can be run directly by Node (type stripping).
    files: ['packages/*/src/**/*.{js,ts,tsx}'],

    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: "Don't declare enums"
        },
        ...[
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
          'ImportExpression'
        ].map(node => ({
          // `?raw` imports (text files such as GLSL shaders) are allowed
          selector: `${node}[source.value=/^\\.(?!.*\\.(tsx?|jsx?|json|less|css)$)(?!.*\\?raw$)/]`,
          message: 'Relative imports must have an explicit extension (.ts)'
        }))
      ]
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

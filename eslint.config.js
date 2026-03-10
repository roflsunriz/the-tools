// ESLint v9 Flat Config
const js = require('@eslint/js');
const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const globals = require('globals');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
	{
		ignores: [
			'node_modules/',
			'server-dist/',
			'frontend-dist/'
		]
	},
	js.configs.recommended,
	// Node.js 用（サーバや設定ファイル）
	{
		files: ['eslint.config.js'],
		languageOptions: {
			ecmaVersion: 2021,
			sourceType: 'commonjs',
			globals: globals.node
		}
	},
	// TypeScript 用（将来の移行も見据える）
	{
		files: ['**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: { ecmaVersion: 2021, sourceType: 'module' }
		},
		plugins: { '@typescript-eslint': tsPlugin },
		rules: {
			...tsPlugin.configs.recommended.rules,
			'no-undef': 'off',
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	// 型定義ファイルは lint 対象外
	{ ignores: ['**/*.d.ts'] }
];


// import eslintJs		from "@eslint/js";
import { defineConfig }	from 'eslint/config';
import tseslint			from "typescript-eslint";
import stylistic		from "@stylistic/eslint-plugin";

const config = {
	console:	false,
	restrictedTypes:	{
		"Buffer": {
			"message": "Use Uint8Array instead.",
			"suggest": [
				"Uint8Array"
			]
		}
	},
	restrictedGlobals:	[
		{
			"name": "Buffer",
			"message": "Use Uint8Array instead."
		}
	],
	restrictedImportPaths:	[
		{
			"name": "buffer",
			"message": "Use Uint8Array instead."
		},
		{
			"name": "node:buffer",
			"message": "Use Uint8Array instead."
		},
	],
	restrictedImportPatterns:	[
	],
};

// returns multiple configs
const myTseLint	= defineConfig({
	name:	"my-typescript",
	extends:	[
		/*
		extends clauses are copied in front of this config with files and included taken from this config

		@see https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/typescript-eslint/src/index.ts
		@see https://github.com/typescript-eslint/typescript-eslint/blob/main/packages/typescript-eslint/src/config-helper.ts
		@see https://github.com/typescript-eslint/typescript-eslint/tree/main/packages/typescript-eslint/src/configs

		// this is included automatically
		eslintJs.configs.recommended,

		// this is included automatically
		tseslint.configs.eslintRecommended,
		*/

		...tseslint.configs.recommendedTypeChecked,
		// NOTE we did not have this originally
		...tseslint.configs.stylisticTypeChecked,
	],
	languageOptions: {
		// NOTE this is probably already set
		parser:	tseslint.parser,
		parserOptions: {
			projectService: true,
		},
	},
	linterOptions: {
		reportUnusedDisableDirectives:	"error",
	},
	rules: {
		//-----------------------------------------------------------------------------
		//## eslint

		"no-multi-spaces": "error",
		"no-control-regex": "error",
		"no-useless-escape": "error",
		"no-restricted-globals": [
			"error",
			...config.restrictedGlobals
		],
		"no-restricted-imports": [
			"error",
			{
				"paths": config.restrictedImportPaths,
				"patterns": [
					"**//**",
					"./**",
					"../**",
					"**/src/ts/**",
					"**/*.js",
					...config.restrictedImportPatterns,
				]
			}
		],
		"eqeqeq": "error",
		"no-param-reassign": "error",
		"prefer-arrow-callback": "error",
		"no-duplicate-imports": "error",
		"init-declarations": [
			"error",
			"always"
		],
		"no-alert": "error",
		"no-console": config.console ? "off" : "error",
		"no-caller": "error",
		"no-eval": "error",
		"no-implicit-coercion": "error",
		"no-multi-assign": "error",
		"no-prototype-builtins": "off",
		"no-return-assign": "error",
		"no-sequences": "error",
		"no-var": "error",
		"prefer-const": "error",
		"prefer-object-spread": "error",
		"prefer-rest-params": "error",
		"curly": [
			"error",
			"multi-line"
		],
		"func-style": [
			"error",
			"expression"
		],
		"no-inline-comments": "error",
		"no-useless-call": "error",
		"prefer-spread": "error",
		"yoda": "error",
		"unicode-bom": [
			"error",
			"never"
		],
		"require-await": "off",

		//-----------------------------------------------------------------------------
		//## typescript-eslint

		"@typescript-eslint/no-namespace":	"off",
		"@typescript-eslint/require-await":	[
			"error"
		],
		"@typescript-eslint/consistent-type-assertions": [
			"error",
			{
				"assertionStyle": "as"
			}
		],
		"@typescript-eslint/consistent-type-definitions": [
			"error",
			"type"
		],
		"@typescript-eslint/explicit-module-boundary-types": [
			"error",
			{}
		],
		"@typescript-eslint/method-signature-style": [
			"error",
			"property"
		],
		"@typescript-eslint/no-inferrable-types": "off",
		"@typescript-eslint/no-misused-new": "error",
		"@typescript-eslint/no-confusing-non-null-assertion": "error",
		"@typescript-eslint/no-non-null-asserted-nullish-coalescing": "error",
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-call": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-return": "off",
		"@typescript-eslint/no-empty-object-type": "off",
		"@typescript-eslint/no-unsafe-function-type": "error",
		"@typescript-eslint/no-wrapper-object-types": "error",
		"@typescript-eslint/no-redundant-type-constituents": "error",
		"@typescript-eslint/no-restricted-types": [
			"error",
			{
				"types": config.restrictedTypes,
			}
		],
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				"args": "all",
				"caughtErrors": "all",
				"argsIgnorePattern": "^_(?!_)",
				"varsIgnorePattern": "^_(?!_)",
				"caughtErrorsIgnorePattern": "^_(?!_)",
				"reportUsedIgnorePattern": true
			}
		],
		"@typescript-eslint/prefer-as-const": "error",
		"@typescript-eslint/prefer-for-of": "error",

		"@typescript-eslint/no-base-to-string": "error",
		"@typescript-eslint/no-misused-promises": "error",
		"@typescript-eslint/no-invalid-void-type": "error",
		"@typescript-eslint/no-meaningless-void-operator": "error",
		"@typescript-eslint/no-confusing-void-expression": [
			"error",
			{
				"ignoreArrowShorthand": true
			}
		],
		"@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
		"@typescript-eslint/no-unnecessary-type-assertion": "error",
		"@typescript-eslint/no-floating-promises": "error",
		"@typescript-eslint/only-throw-error": "error",
		"@typescript-eslint/prefer-nullish-coalescing": "off",
		"@typescript-eslint/prefer-includes": "error",
		"@typescript-eslint/strict-void-return": "error",
		"@typescript-eslint/strict-boolean-expressions": [
			"error",
			{
				"allowString": false,
				"allowNumber": false,
				"allowNullableObject": false
			}
		],
		"@typescript-eslint/restrict-plus-operands": "error",
		"@typescript-eslint/restrict-template-expressions": [
			"error",
			{
				"allowNumber":	true,
				"allowBoolean":	true,
				"allowAny":		false,
				"allowNullish":	false,
				"allowRegExp":	false
			}
		],
		"@typescript-eslint/require-array-sort-compare": "error",
		"@typescript-eslint/switch-exhaustiveness-check":  [
			"error",
			{
				"considerDefaultExhaustiveForUnions":	true,
			}
		],
		"@typescript-eslint/unbound-method": [
			"error",
			{
				"ignoreStatic":	true
			}
		],
		// stylistic
		"@typescript-eslint/array-type": [
			"error",
			{
				"default": "generic"
			}
		],
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/consistent-generic-constructors": "off",
		"@typescript-eslint/prefer-optional-chain": "off",
		"@typescript-eslint/non-nullable-type-assertion-style": "off",
		"@typescript-eslint/prefer-string-starts-ends-with": "off",
		"@typescript-eslint/dot-notation": "off",
	}
});

const myStylistic	= {
	name:	"my-stylistic",
	plugins: {
		"@stylistic": stylistic,
		// TODO we used this, originally
		// @stylistic/disable-legacy
		// stylistic.configs["disable-legacy"],
	},
	rules: {
		"@stylistic/no-mixed-spaces-and-tabs": [
			"error"
		],
		"@stylistic/quotes": [
			"error",
			"double",
			{ "avoidEscape": true }
		],
		"@stylistic/quote-props": [
			"error",
			"consistent-as-needed"
		],
		"@stylistic/object-curly-spacing": [
			"error",
			"always"
		],
		"@stylistic/array-bracket-spacing": [
			"error",
			"always"
		],
		"@stylistic/keyword-spacing": [
			"error",
			{
				"before": true,
				"after": true
			}
		],
		"@stylistic/function-call-spacing": [
			"error",
			"never"
		],
		"@stylistic/spaced-comment": [
			"error",
			"always",
			{
				"exceptions": [
					"-",
					"="
				],
				"markers": [
					"#",
					"##",
					"###",
					"/"
				]
			}
		],
		"@stylistic/eol-last": [
			"error",
			"always"
		],
		"@stylistic/linebreak-style": [
			"error",
			"unix"
		],
		"@stylistic/semi": [
			"error",
			"always"
		],
		"@stylistic/arrow-spacing": [
			"error"
		],
		"@stylistic/block-spacing": [
			"error"
		],
		"@stylistic/comma-dangle": [
			"error",
			{
				"arrays": "always-multiline",
				"objects": "always-multiline",
				"imports": "always-multiline",
				"exports": "always-multiline",
				"functions": "only-multiline",
				"tuples": "always-multiline",
				"enums": "always-multiline",
				"generics": "ignore"
			}
		],
		"@stylistic/comma-style": [
			"error",
			"last"
		],
		"@stylistic/comma-spacing": [
			"error"
		],
		"@stylistic/space-before-function-paren": [
			"error",
			{
				"anonymous": "never",
				"named": "never",
				"asyncArrow": "always"
			}
		],
		"@stylistic/member-delimiter-style": [
			"error",
			{
				"multiline": {
					"delimiter": "comma"
				},
				"singleline": {
					"delimiter": "comma"
				}
			}
		],
	},
};

export default defineConfig({
	files:	[
		"**/*.{ts,tsx}"
	],
	extends: [
		...myTseLint,
		myStylistic,
	]
});

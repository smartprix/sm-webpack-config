const postcssPresetEnv = require('postcss-preset-env');
const simpleVars = require('postcss-simple-vars');
const nested = require('postcss-nested');
const mixins = require('postcss-mixins');
const atExtend = require('postcss-extend');
const cssImport = require('postcss-import');
const atVariables = require('postcss-at-rules-variables');
const utilities = require('postcss-utilities');
const atIf = require('postcss-conditionals');
const atFor = require('postcss-for');
const atEach = require('postcss-each');
const bem = require('saladcss-bem');
const postcssRem = require('postcss-rem');
const combineMediaQuery = require('postcss-combine-media-query');

const postcssConfig = JSON.parse(process.env._SM_WEBPACK_POSTCSS_CONFIG_ || '{}');
const remBaseline = postcssConfig.remBaseline || 14;
const variables = postcssConfig.variables || {};

module.exports = {
	plugins: [
		cssImport(),
		simpleVars({
			variables,
		}),
		atVariables({
			atRules: ['for', 'if', 'else', 'each', 'media', 'custom-media', 'import', 'supports'],
		}),
		atEach(),
		atFor(),
		atIf(),
		bem({
			shortcuts: {
				component: 'b',
				modifier: 'm',
				descendent: 'e',
			},
			separators: {
				descendent: '__',
				modifier: '--',
			},
		}),
		postcssPresetEnv({
			browsers: '> 1%, last 2 versions, Firefox ESR, not dead',
			stage: 0,
			features: {
				// we are already using postcss-nested
				'nesting-rules': false,
			},
		}),
		mixins(),
		atExtend(),
		nested(),
		utilities(),
		simpleVars({
			variables,
		}),
		postcssRem({
			baseline: remBaseline,
			precision: 4,
		}),
		combineMediaQuery(),
	],
};

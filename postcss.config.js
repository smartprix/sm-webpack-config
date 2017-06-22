const cssnext = require('postcss-cssnext');
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
const mqPacker = require('css-mqpacker');

module.exports = {
	plugins: [
		cssImport(),
		simpleVars(),
		atVariables({
			atRules: ['for', 'if', 'else', 'each', 'media', 'custom-media', 'import', 'supports']
		}),
		atEach(),
		atFor(),
		atIf(),
		bem({
			shortcuts: {
				component: 'b',
				modifier: 'm',
				descendent: 'e'
			},
			separators: {
				descendent: '__',
				modifier: '--',
			},
		}),
		cssnext({
			browsers: ['ie > 8', 'last 2 versions', '> 2%'],
			features: {
				calc: {
					mediaQueries: true,
					selectors: true,
				},
			},
			warnForDuplicates: false,
		}),
		mixins(),
		atExtend(),
		nested(),
		utilities(),
		simpleVars(),
		mqPacker(),
	],
};

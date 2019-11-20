const r = require.resolve;

const defaultEnvOptions = {
	loose: true,
	modules: false,
	useBuiltIns: 'usage',
	corejs: 3,
	debug: false,
	targets: {
		// modules support
		// NOTE: safari 10.1 does support modules, but other features support is broken
		chrome: '61',
		firefox: '60',
		safari: '11.1',
	},
	exclude: [
		// this is included on safari even though safari supports it
		'@babel/plugin-transform-template-literals',
		// this will not be needed in most cases
		'@babel/plugin-transform-dotall-regex',
		// this is included in safari for some edge case
		'@babel/plugin-transform-unicode-regex',
		// these are unnecessary (not sure why corejs includes these)
		'es.array.iterator',
		'es.promise',
		'web.dom-collections.iterator',
		'es.string.replace',
		'es.string.trim',
		'es.symbol.description',
	],
	shippedProposals: true,
};

function getBabelConfig(config = {}) {
	const options = config.babel || {};

	const envOverrides = {};
	let envOptions = options.envOptions || {};
	if (envOptions.targets) {
		// targets is different from ours, remove exclude and let user deal with them
		envOverrides.exclude = [];
	}
	envOptions = Object.assign({}, defaultEnvOptions, envOverrides, envOptions);

	if (options.debug) {
		envOptions.debug = true;
	}

	const includePresets = options.includePresets || [];
	const excludePresets = options.excludePresets || [];
	const includePlugins = options.includePlugins || [];
	const excludePlugins = options.excludePlugins || [];
	const includeModules = options.includeModules || [];

	const presets = [];
	const addPreset = (preset, opts) => {
		if (!excludePresets.includes(preset)) {
			presets.push([r(preset), opts]);
		}
	};

	addPreset('@babel/preset-env', envOptions);
	presets.push(...includePresets);

	const plugins = [];
	const addPlugin = (plugin, opts) => {
		if (!excludePlugins.includes(plugin)) {
			plugins.push([r(plugin), opts]);
		}
	};

	// stage 3
	addPlugin('@babel/plugin-syntax-import-meta');
	addPlugin('@babel/plugin-proposal-class-properties', {loose: true});
	addPlugin('@babel/plugin-proposal-optional-chaining', {loose: true});
	addPlugin('@babel/plugin-proposal-nullish-coalescing-operator', {loose: true});
	addPlugin('@babel/plugin-proposal-numeric-separator');

	// vue-jsx
	addPreset('@vue/babel-preset-jsx');

	// transform-imports to reduce code size, config needs to be given
	addPlugin('babel-plugin-transform-imports', options.transformImports || {});

	// transform runtime, but only for helpers
	// requires common babel helpers instead of inlining them
	addPlugin('@babel/plugin-transform-runtime', {
		helpers: true,
		corejs: false,
		regenerator: false,
		useESModules: true,
	});

	plugins.push(...includePlugins);

	return {
		options: {
			debug: envOptions.debug,
			includeModules,
		},
		babelrc: false,
		presets,
		plugins,
	};
}

module.exports = {
	getBabelConfig,
};

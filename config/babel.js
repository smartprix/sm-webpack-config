const r = require.resolve;

const defaultEnvOptions = {
	loose: true,
	modules: false,
	useBuiltIns: 'usage',
	corejs: 2,
	targets: {
		chrome: '55',
	},
	shippedProposals: true,
};

function getBabelConfig(config = {}) {
	const options = config.babel || {};

	let envOptions = options.envOptions || {};
	envOptions = Object.assign({}, defaultEnvOptions, envOptions);

	if (options.debug) {
		envOptions.debug = true;
	}

	const includePresets = options.includePresets || [];
	const excludePresets = options.excludePresets || [];
	const includePlugins = options.includePlugins || [];
	const excludePlugins = options.excludePlugins || [];

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
	addPlugin('@babel/plugin-syntax-dynamic-import');
	addPlugin('@babel/plugin-syntax-import-meta');
	addPlugin('@babel/plugin-proposal-class-properties', {loose: true});

	// vue-jsx
	addPlugin('@babel/plugin-syntax-jsx');
	addPlugin('babel-plugin-transform-vue-jsx');
	// addPlugin('babel-plugin-jsx-v-model');
	// addPlugin('babel-plugin-jsx-event-modifiers');

	// esnext
	// unstable plugins, disabling
	addPlugin('@babel/plugin-proposal-optional-chaining', {loose: true});
	addPlugin('@babel/plugin-proposal-nullish-coalescing-operator', {loose: true});

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
		debug: envOptions.debug,
		babelrc: false,
		presets,
		plugins,
	};
}

module.exports = {
	getBabelConfig,
};

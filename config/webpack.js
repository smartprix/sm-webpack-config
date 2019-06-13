/* eslint-disable global-require */
const _ = require('lodash');
const path = require('path');
const merge = require('webpack-merge');

const {getConfig} = require('./default');
const {getOptimizationConfig} = require('./optimization');
const {getPlugins} = require('./plugins');
const {getLoaders} = require('./loaders');
const getNodeConfig = require('./node');

function getDevTool(config) {
	if (config.isSSR && config.ssr.sourceMap) return '#cheap-source-map';
	if (!config.sourceMap) return false;
	if (config.isProduction) return '#source-map';
	return '#eval-source-map';
}

function getFileName(config) {
	if (config.library || !config.appendHash) return '[name].js';
	// webpack does not support base62 encoding in contenthash yet
	if (config.isProduction) return 'js/[name].[contenthash:7].js';
	return 'js/[name].js';
}

/**
 * @param options it is {env, config, webpackConfig}
 * env can be developement or production
 * config gets merged into our default config
 * webpackConfig gets merged into final webpack config
 */
function getWebpackConfig(options = {}) {
	const env = options.env || process.env.NODE_ENV || 'development';

	const config = getConfig(options.config, env);
	options.config._final = config;
	const webpackConfig = options.webpackConfig || {};

	const isProduction = config.isProduction;

	// correct NODE_ENV is important for vue-loader to correctly minify files
	process.env.NODE_ENV = isProduction ? 'production' : 'development';

	const cwd = config.cwd;

	config.sourcePath = path.resolve(cwd, config.sourcePath);
	config.destPath = path.resolve(cwd, config.destPath);

	const entry = {};
	_.forEach(config.entry, (value, key) => {
		if (!Array.isArray(value)) {
			value = [value];
		}
		entry[key] = value.map(val => path.resolve(config.sourcePath, val));
	});

	const baseConfig = {
		target: 'web',
		mode: isProduction ? 'production' : 'development',
		context: cwd,
		entry,
		output: {
			path: config.destPath,
			publicPath: config.publicUrl,
			filename: getFileName(config),
			chunkFilename: getFileName(config),
		},
		resolve: {
			extensions: ['.wasm', '.mjs', '.js', '.mjsx', '.jsx', '.vue', '.json'],
			modules: [
				path.join(cwd, 'node_modules'),
				path.join(__dirname, '../node_modules'),
			],
			alias: {
				'@': config.sourcePath,
				res: config.sourcePath,
				js: path.join(config.sourcePath, 'js'),
				assets: path.join(config.sourcePath, 'assets'),
				components: path.join(config.sourcePath, 'js', 'components'),
				css: path.join(config.sourcePath, 'css'),
				img: path.join(config.sourcePath, 'img'),
			},
		},
		resolveLoader: {
			modules: [
				path.join(cwd, 'node_modules'),
				path.join(__dirname, '../node_modules'),
			],
		},
		module: {
			// don't parse these modules to speed up things
			noParse: /node_modules(.*)\/(firepad|jquery)\//,
			rules: getLoaders(config),
		},
		node: getNodeConfig(config),
		optimization: getOptimizationConfig(config),
		plugins: getPlugins(config),
		devtool: getDevTool(config),
	};

	if (config.isSSR) {
		const nodeExternals = require('webpack-node-externals');

		// entry should be app's server entry file
		baseConfig.entry = path.join(config.sourcePath, config.ssr.entry);

		// output filename for server bundle
		baseConfig.output.filename = 'server-bundle.js';

		// This allows webpack to handle dynamic imports in a Node-appropriate
		// fashion, and also tells `vue-loader` to emit server-oriented code when
		// compiling Vue components.
		baseConfig.target = 'node';

		// This tells the server bundle to use Node-style exports
		baseConfig.output.libraryTarget = 'commonjs2';

		// https://webpack.js.org/configuration/externals/#function
		// https://github.com/liady/webpack-node-externals
		// Externalize app dependencies. This makes the server build much faster
		// and generates a smaller bundle file.
		baseConfig.externals = nodeExternals({
			// do not externalize dependencies that need to be processed by webpack.
			// you can add more file types here e.g. raw *.vue files
			// you should also whitelist deps that modifies `global` (e.g. polyfills)
			whitelist: [
				/\.(postcss|pcss|sass|scss|less|css|vue|jsx)$/,
				/\?vue&type=style/,
			],
		});
	}

	if (config.library) {
		baseConfig.output.libraryTarget = config.libraryFormat || 'umd';
		baseConfig.output.umdNamedDefine = true;
		baseConfig.output.library = config.library === true ? 'Lib' : config.library;
	}

	if (!isProduction) {
		// for working with hmr in web workers
		// https://github.com/webpack/webpack/issues/6642
		baseConfig.output.globalObject = 'this';

		// disable performace hints
		baseConfig.performance = {hints: false};
	}

	return merge(baseConfig, webpackConfig);
}

module.exports = {
	getWebpackConfig,
};

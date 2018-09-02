/* eslint-disable global-require */
const _ = require('lodash');
const path = require('path');
const webpack = require('webpack');
const merge = require('webpack-merge');
const openBrowser = require('opn');

const {getConfig, getRollupConfig} = require('./config/default');
const {getOptimizationConfig} = require('./config/optimization');
const {getPlugins} = require('./config/plugins');
const {getLoaders} = require('./config/loaders');
const getNodeConfig = require('./config/node');
const {getDevServerConfig} = require('./config/devServer');

function getDevTool(config) {
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

// options is {env, config, webpackConfig}
// env can be developement or production
// config gets merged into our default config
// webpackConfig gets merged into final webpack config
function getWebpackConfig(options = {}) {
	const env = options.env || process.env.NODE_ENV || 'development';

	const config = getConfig(options.config, env);
	options.config._final = config;
	const webpackConfig = options.webpackConfig || {};

	const isProduction = config.isProduction;

	// correct NODE_ENV is important for vue-loader to correctly minify files
	process.env.NODE_ENV = isProduction ? 'production' : 'development';

	const cwd = config.cwd;

	config.sourcePath = path.join(cwd, config.sourcePath);
	config.destPath = path.join(cwd, config.destPath);

	const entry = {};
	_.forEach(config.entry, (value, key) => {
		entry[key] = path.join(config.sourcePath, value);
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
				path.join(__dirname, 'node_modules'),
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
				path.join(__dirname, 'node_modules'),
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

function getProdConfig({config, webpackConfig}) {
	return getConfig({env: 'production', config, webpackConfig});
}

function getDevConfig({config, webpackConfig}) {
	return getConfig({env: 'development', config, webpackConfig});
}

function runWebpack({env, config, webpackConfig}) {
	const formatStats = require('./util/formatStats');
	return new Promise((resolve, reject) => {
		const finalWebpackConfig = getWebpackConfig({env, config, webpackConfig});

		// run webpack
		webpack(finalWebpackConfig, (err, stats) => {
			if (err) {
				reject(err);
				return;
			}

			console.log(formatStats(stats, config.destPath));
			// give time to webpack bundle analyzer to output stats
			setImmediate(resolve);
		});
	});
}

function runDevWebpack({config = {}, webpackConfig = {}} = {}) {
	return runWebpack({env: 'development', config, webpackConfig});
}

function runProdWebpack({config = {}, webpackConfig = {}} = {}) {
	return runWebpack({env: 'production', config, webpackConfig});
}

function runDevServer({config = {}, webpackConfig = {}} = {}) {
	// eslint-disable-next-line
	const WebpackDevServer = require('webpack-dev-server');

	const finalConfig = getConfig(config, 'development');
	finalConfig.isDevServer = true;
	finalConfig.destPath = '.';
	finalConfig.publicUrl = '/';

	const devServerConfig = getDevServerConfig(finalConfig);
	const finalWebpackConfig = getWebpackConfig({
		env: 'development',
		devServer: true,
		config: finalConfig,
		webpackConfig,
	});

	// add hot-reload related code to entry chunks
	WebpackDevServer.addDevServerEntrypoints(finalWebpackConfig, {
		contentBase: devServerConfig.contentBase,
		hot: true,
		host: 'localhost',
	});

	let isFirstCompile = true;
	const compiler = webpack(finalWebpackConfig);
	compiler.hooks.done.tap('sm-webpack-dev-server', (stats) => {
		if (stats.hasErrors()) return;

		if (isFirstCompile) {
			isFirstCompile = false;
			if (finalConfig.openBrowser) {
				const port = devServerConfig.port;
				const protocol = devServerConfig.https ? 'https' : 'http';
				openBrowser(`${protocol}://localhost:${port}`);
			}
		}
	});

	// Start a webpack-dev-server
	const server = new WebpackDevServer(compiler, devServerConfig);

	return new Promise((resolve, reject) => {
		server.listen(devServerConfig.port, devServerConfig.host, (err) => {
			if (err) {
				reject(err);
				return;
			}

			resolve();
		});
	});
}

function runRollup(options = {}) {
	const rollup = require('rollup');

	const env = process.env.NODE_ENV || 'production';
	const config = getRollupConfig(options.config || {}, env);
	const cwd = config.cwd;

	config.entry = path.resolve(cwd, config.entry);
	config.dest = path.resolve(cwd, config.dest);

	const {getBabelConfig} = require('./config/babel');
	const plugins = [
		require('rollup-plugin-babel')({
			exclude: 'node_modules/**',
			...getBabelConfig(config),
		}),
	];

	if (config.minify) {
		plugins.push(
			require('rollup-plugin-uglify')()
		);
	}

	return rollup.rollup({
		entry: config.entry,
		plugins,
	}).then((bundle) => {
		bundle.write({
			format: config.libraryFormat || 'umd',
			moduleName: config.library === true ? 'Lib' : config.library,
			dest: config.dest,
			sourceMap: config.sourceMap,
		});
	});
}

module.exports = {
	getWebpackConfig,
	getProdConfig,
	getDevConfig,
	runWebpack,
	runDevWebpack,
	runProdWebpack,
	runDevServer,
	runRollup,
};

/* eslint-disable global-require */
const path = require('path');
const webpack = require('webpack');
const chalk = require('chalk');

const {getWebpackConfig} = require('./config/webpack');
const {getConfig, getRollupConfig} = require('./config/default');
const {getDevServerConfig} = require('./config/devServer');
const {getCompiler} = require('./config/devCompiler');

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

			if (!config.isSSR) {
				console.log(formatStats(stats, config.destPath));
			}

			// give time to webpack bundle analyzer to output stats
			setImmediate(resolve);
		});
	});
}

function runDevWebpack({config = {}, webpackConfig = {}} = {}) {
	const promises = [
		runWebpack({env: 'development', config, webpackConfig}),
	];
	if (config.ssr) {
		config = Object.assign({}, config, {isSSR: true});
		promises.push(
			runWebpack({env: 'development', config, webpackConfig}),
		);
	}
	return Promise.all(promises);
}

async function runProdWebpack({config = {}, webpackConfig = {}} = {}) {
	await runWebpack({env: 'production', config, webpackConfig});
	if (config.ssr) {
		console.log(chalk.bold.blue('\n\n▶ Compiling for server (SSR)'));
		config = Object.assign({}, config, {isSSR: true});
		await runWebpack({env: 'production', config, webpackConfig});
	}
}

function runDevServer({config = {}, webpackConfig = {}} = {}) {
	// eslint-disable-next-line
	const WebpackDevServer = require('webpack-dev-server');

	const {
		compiler,
		config: finalConfig,
		webpackConfig: finalWebpackConfig,
	} = getCompiler({config, webpackConfig});

	const devServerConfig = getDevServerConfig(finalConfig);

	// add hot-reload related code to entry chunks
	WebpackDevServer.addDevServerEntrypoints(finalWebpackConfig, {
		contentBase: devServerConfig.contentBase,
		hot: true,
		host: 'localhost',
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

function koaDevServer(options) {
	const _koaDevServer = require('./koaDevServer');
	return _koaDevServer(options);
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
	koaDevServer,
	runRollup,
};

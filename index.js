/* eslint-disable global-require */
const path = require('path');
const webpack = require('webpack');
const openBrowser = require('opn');
const chalk = require('chalk');
const fs = require('fs');
const makeDir = require('make-dir');

const {getWebpackConfig} = require('./config/webpack');
const {getConfig, getRollupConfig} = require('./config/default');
const {getDevServerConfig} = require('./config/devServer');

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

	const finalConfig = getConfig(config, 'development');
	const originalDestPath = finalConfig.destPath;
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

	const compileSSR = finalConfig.hasSSR && finalConfig.devServer.buildSSR;
	const devServerSSRPath = path.join(originalDestPath, 'dev_server');
	if (compileSSR) {
		// make directory to keep compiled ssr bundle and client manifest
		makeDir(devServerSSRPath)
			.then(() => {})
			.catch(err => console.error(err));
	}

	let isFirstCompile = true;
	const compiler = webpack(finalWebpackConfig);
	compiler.hooks.emit.tapAsync('sm-webpack-dev-server', (compilation, callback) => {
		const assets = compilation.assets;
		if (compileSSR) {
			// write vue-ssr-client-manifest.json
			const fileName = 'vue-ssr-client-manifest.json';
			if (assets[fileName]) {
				fs.writeFileSync(
					path.join(devServerSSRPath, fileName),
					assets[fileName].source(),
				);
			}
		}
		callback();
	});
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

	if (compileSSR) {
		const finalSSRConfig = getConfig(config, 'development');
		finalSSRConfig.destPath = devServerSSRPath;
		finalSSRConfig.publicUrl = '/';
		finalSSRConfig.isSSR = true;

		const finalSSRWebpackConfig = getWebpackConfig({
			env: 'development',
			config: finalSSRConfig,
			webpackConfig,
		});

		const ssrCompiler = webpack(finalSSRWebpackConfig);
		ssrCompiler.watch({}, (err, stats) => {
			if (err) {
				console.error(err);
				return;
			}

			if (stats.hasErrors()) {
				// ignore
			}
		});
	}

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

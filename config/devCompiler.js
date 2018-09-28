const path = require('path');
const webpack = require('webpack');
const makeDir = require('make-dir');
const openBrowser = require('opn');

const {getWebpackConfig} = require('./webpack');
const {getConfig} = require('./default');

function emitVueSSR(ctx) {
	if (!ctx.emitter) return;
	setImmediate(() => {
		if (!ctx.serverCompiling && !ctx.clientCompiling) {
			ctx.emitter.emit('vue-ssr', {
				serverBundle: ctx.serverBundle,
				clientManifest: ctx.clientManifest,
			});
		}
	});
}

function emitVueSSRClientManifest(ctx, assets) {
	if (!ctx.emitter) return;

	const fileName = 'vue-ssr-client-manifest.json';
	if (!assets[fileName]) return;

	ctx.clientManifest = JSON.parse(assets[fileName].source());
	ctx.emitter.emit(
		'vue-ssr-client-manifest',
		ctx.clientManifest,
	);
	emitVueSSR(ctx);
}

function emitVueSSRServerBundle(ctx, assets) {
	if (!ctx.emitter) return;

	const fileName = 'vue-ssr-server-bundle.json';
	if (!assets[fileName]) return;

	ctx.serverBundle = JSON.parse(assets[fileName].source());
	ctx.emitter.emit(
		'vue-ssr-server-bundle',
		ctx.serverBundle,
	);
	emitVueSSR(ctx);
}

function initSSRCompiler(options = {}, ctx) {
	const config = options.config || {};
	const webpackConfig = options.webpackConfig || {};

	const finalSSRConfig = getConfig(config, 'development');
	finalSSRConfig.destPath = ctx.devServerSSRPath;
	finalSSRConfig.publicUrl = '/';
	finalSSRConfig.isSSR = true;
	finalSSRConfig.isSSRDevServer = true;

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

	ssrCompiler.hooks.done.tap('beforeCompile', () => {
		ctx.serverCompiling = true;
	});

	ssrCompiler.hooks.emit.tapAsync('sm-webpack-dev-server', (compilation, callback) => {
		emitVueSSRServerBundle(ctx, compilation.assets);
		ctx.serverCompiling = false;
		compilation.assets = {};
		callback();
	});

	return ssrCompiler;
}

function getDevServerSSRPath(config, originalDestPath) {
	const compileSSR = config.hasSSR && config.devServer.buildSSR;
	const devServerSSRPath = path.join(originalDestPath, 'dev_server');
	if (compileSSR) {
		// make directory to keep compiled ssr bundle and client manifest
		makeDir(devServerSSRPath)
			.then(() => {})
			.catch(err => console.error(err));
	}

	return devServerSSRPath;
}

function getCompiler(options = {}) {
	const config = options.config || {};
	const webpackConfig = options.webpackConfig || {};
	const emitter = options.emitter;

	const finalConfig = getConfig(config, 'development');
	const originalDestPath = finalConfig.destPath;
	finalConfig.isDevServer = true;
	finalConfig.hasHotClient = true;
	finalConfig.destPath = '.';
	finalConfig.publicUrl = '/';

	const compileSSR = finalConfig.hasSSR && finalConfig.devServer.buildSSR;

	// server bundle and client manifest for vue ssr
	const ctx = {
		emitter,
		devServerSSRPath: getDevServerSSRPath(finalConfig, originalDestPath),
		serverBundle: null,
		clientManifest: null,
		clientCompiling: false,
		serverCompiling: false,
	};

	const finalWebpackConfig = getWebpackConfig({
		env: 'development',
		devServer: true,
		config: finalConfig,
		webpackConfig,
	});

	let isFirstCompile = true;
	const compiler = webpack(finalWebpackConfig);

	compiler.hooks.done.tap('beforeCompile', () => {
		ctx.clientCompiling = true;
	});

	compiler.hooks.emit.tapAsync('sm-webpack-dev-server', (compilation, callback) => {
		if (compileSSR) {
			emitVueSSRClientManifest(ctx, compilation.assets);
		}

		ctx.clientCompiling = false;
		callback();
	});

	const devServerOpts = finalConfig.devServer || {};
	compiler.hooks.done.tap('sm-webpack-dev-server', (stats) => {
		if (stats.hasErrors()) return;

		if (isFirstCompile) {
			isFirstCompile = false;
			if (finalConfig.openBrowser) {
				const port = devServerOpts.port || 3001;
				const protocol = devServerOpts.https ? 'https' : 'http';
				openBrowser(`${protocol}://localhost:${port}`);
			}
		}
	});

	if (compileSSR) {
		initSSRCompiler(options, ctx);
	}

	return {
		compiler,
		config: finalConfig,
		webpackConfig: finalWebpackConfig,
	};
}

module.exports = {
	getCompiler,
};

/* eslint-disable global-require */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const hash = require('hash-sum');
const notifier = require('node-notifier');
const webpack = require('webpack');
const FriendlyErrors = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const {GhostProgressPlugin} = require('ghost-progress-webpack-plugin');
const {VueLoaderPlugin} = require('vue-loader');

const getDevServerUrls = require('../util/getDevServerUrls');

/**
 * Generate dist index.html with correct asset hash for caching.
 * you can customize output by editing /index.html
 * @see https://github.com/ampedandwired/html-webpack-plugin
 */
function getHtmlWebpackPlugin(config = {}) {
	// eslint-disable-next-line
	const HtmlWebpackPlugin = require('html-webpack-plugin');

	let minify = false;
	if (config.minify) {
		minify = {
			removeComments: true,
			collapseWhitespace: true,
			collapseBooleanAttributes: true,
			removeScriptTypeAttributes: true,
			collapseInlineTagWhitespace: true,
			minifyCSS: true,
			minifyJS: true,
			// more options:
			// https://github.com/kangax/html-minifier#options-quick-reference
		};
	}

	const filename = config.isDevServer ? 'index.html' : config.entryHtml;
	return new HtmlWebpackPlugin({
		filename,
		template: path.join(config.sourcePath, config.entryHtml),
		inject: true,
		minify,
		// necessary to consistently work with multiple chunks via CommonsChunkPlugin
		chunksSortMode: 'dependency',
	});
}

function getCompressionPlugin() {
	const CompressionWebpackPlugin = require('compression-webpack-plugin');

	const ext = ['js', 'css', 'xml', 'json', 'ttf', 'svg'];
	const regex = new RegExp(`\\.(?:${ext.join('|')})$`);
	return new CompressionWebpackPlugin({
		asset: '[path].gz[query]',
		algorithm: 'gzip',
		test: regex,
		threshold: 4096,
		minRatio: 0.8,
		cache: true,
	});
}

/**
 * generate bundle size stats so we can analyze them
 * to see which dependecies are the heaviest
 */
function getBundleAnalyzerPlugin(config) {
	const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

	const options = {
		analyzerMode: 'static',
		reportFilename: 'webpack.report.html',
		generateStatsFile: false,
		statsFilename: 'webpack.stats.json',
		openAnalyzer: false,
	};

	if (_.isPlainObject(config.analyzeBundle)) {
		Object.assign(options, config.analyzeBundle);
	}
	return new BundleAnalyzerPlugin(options);
}

function getDevelopmentPlugins(config) {
	const plugins = [];
	if (!config.hasHotClient && !config.isSSR) {
		plugins.push(
			// Hot Module Replacement
			new webpack.HotModuleReplacementPlugin(),
		);
	}

	return plugins;
}

/**
 * Keep chunk ids stable so async chunks have consistent hash (#1916)
 * @see https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/config/app.js
 */
function getNamedChunksPlugin() {
	return new webpack.NamedChunksPlugin((chunk) => {
		if (chunk.name) {
			return chunk.name;
		}

		const joinedHash = hash(
			Array.from(chunk.modulesIterable, m => m.id).join('_')
		);
		return 'chunk-' + joinedHash;
	});
}

function getCSSFileName(config) {
	if (!config.appendHash) return 'css/[name].js';
	// webpack does not support base62 encoding in contenthash yet
	if (config.isProduction) return 'css/[name].[contenthash:7].css';
	return 'css/[name].js';
}

function getProductionPlugins(config) {
	const plugins = [];

	plugins.push(
		// extract css into its own file
		// MiniCssExtractPlugin does not support base62 hash yet
		new MiniCssExtractPlugin({
			filename: getCSSFileName(config),
			chunkFilename: getCSSFileName(config),
		}),
	);

	plugins.push(
		// keep module.id stable when vendor modules does not change
		new webpack.HashedModuleIdsPlugin(),
	);

	if (!config.isSSR) {
		plugins.push(
			// remove all momentjs locale except for the en-gb locale
			// this helps in reducing momentjs size by quite a bit
			new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en-gb/),
		);
	}

	return plugins;
}

function getDevServerMessages(config) {
	if (!config.isDevServer) return undefined;

	const urls = getDevServerUrls(config);
	return {
		messages: [
			`${chalk.bold('Local')}: ${urls.local}`,
			`${chalk.bold('Network')}: ${urls.network}`,
		],
	};
}

function getFriendlyErrorsPlugin(config) {
	if (config.isSSRDevServer) return null;

	let onErrors;
	if (config.isDevServer && config.devServer.notifyOnError) {
		onErrors = (severity, errors) => {
			if (severity !== 'error') {
				return;
			}

			const error = errors[0];
			notifier.notify({
				title: 'Webpack Error',
				message: `${error.name}\nin ${error.file || ''}`,
				subtitle: error.file || '',
				icon: null,
			});
		};
	}

	// friendly error plugin displays very confusing errors when webpack
	// fails to resolve a loader, so we provide custom handlers to improve it
	const {transformer, formatter} = require('../util/resolveLoaderError'); // eslint-disable-line
	return new FriendlyErrors({
		compilationSuccessInfo: getDevServerMessages(config),
		onErrors,
		additionalTransformers: [transformer],
		additionalFormatters: [formatter],
	});
}

function getCopyPlugin(config) {
	const from = path.join(config.sourcePath, 'public');
	// don't use plugin if source folder does not exist
	if (!fs.existsSync(from)) {
		return null;
	}

	return new CopyWebpackPlugin([
		{
			from,
			to: path.join(config.destPath, 'public'),
			toType: 'dir',
		},
	]);
}

function getProgressPlugin() {
	if (process.stdout.isTTY) {
		return new GhostProgressPlugin();
	}

	// simple progress for non-tty environments
	const SimpleProgressPlugin = require('../util/simpleProgress');
	return SimpleProgressPlugin();
}

function getDefinePlugin(config) {
	const env = config.isProduction ? 'production' : 'development';
	const vars = {
		'process.env.NODE_ENV': JSON.stringify(env),
		'process.env.VUE_ENV': JSON.stringify(config.isSSR ? 'server' : 'client'),
	};
	if (config.isSSR) {
		vars.window = 'undefined';
	}
	return new webpack.DefinePlugin(vars);
}

function getSSRPlugins() {
	const VueSSRServerPlugin = require('vue-server-renderer/server-plugin');
	return [
		// This is the plugin that turns the entire output of the server build
		// into a single JSON file.
		new VueSSRServerPlugin({
			filename: 'vue-ssr-server-bundle.json',
		}),
	];
}

function getPlugins(config = {}) {
	const plugins = [];

	plugins.push(
		// vue loader plugin is required for vue files
		new VueLoaderPlugin(),

		// named chunks for consistant hasing of async chunks
		getNamedChunksPlugin(config),

		// better errors
		getFriendlyErrorsPlugin(config),

		// progress
		getProgressPlugin(config),
	);

	// these plugins are not needed for SSR
	if (!config.isSSR) {
		// copy public assets if not dev server
		if (!config.isDevServer) {
			plugins.push(getCopyPlugin(config));
		}

		if (!config.library && config.entryHtml) {
			plugins.push(getHtmlWebpackPlugin(config));
		}

		if (config.gzip) {
			plugins.push(getCompressionPlugin(config));
		}

		if (config.analyzeBundle) {
			plugins.push(getBundleAnalyzerPlugin(config));
		}
	}

	// set global vars
	plugins.push(getDefinePlugin(config));

	if (config.isSSR) {
		plugins.push(...getSSRPlugins(config));
	}

	// if we are given ssr config, we would want to inject the plugin into client bundle
	if (config.hasSSR && !config.isSSR) {
		// This plugins generates `vue-ssr-client-manifest.json` in the
		// output directory.
		// With the client manifest and the server bundle,
		// the renderer now has information of both the server and client builds,
		// so it can automatically infer and inject
		// preload / prefetch directives and css links / script tags
		// into the rendered HTML.
		const VueSSRClientPlugin = require('vue-server-renderer/client-plugin');
		plugins.push(new VueSSRClientPlugin({
			filename: 'vue-ssr-client-manifest.json',
		}));
	}

	if (!config.isSSR && !config.isDevServer && config.clean) {
		// clean the dist folder
		new CleanWebpackPlugin({
			// perform clean just before files are emitted to the output dir
			cleanAfterEveryBuildPatterns: [
				// don't remove the ssr server bundle
				'!vue-ssr-server-bundle.json',
				'!server-bundle.json',
				'!server-bundle.js',
				'!vue-ssr-client-manifest.json',
				'!client-manifest.json',
			],
		})
	}

	if (config.isProduction) {
		plugins.push(...getProductionPlugins(config));
	}
	else {
		plugins.push(...getDevelopmentPlugins(config));
	}

	return plugins.filter(Boolean);
}

module.exports = {
	getPlugins,
};

const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const notifier = require('node-notifier');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const FriendlyErrors = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const {GhostProgressPlugin} = require('ghost-progress-webpack-plugin');
const {VueLoaderPlugin} = require('vue-loader');

const getDevServerUrls = require('../util/getDevServerUrls');

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

	// generate dist index.html with correct asset hash for caching.
	// you can customize output by editing /index.html
	// see https://github.com/ampedandwired/html-webpack-plugin
	return new HtmlWebpackPlugin({
		filename: `${config.entryHtml}`,
		template: path.join(config.sourcePath, config.entryHtml),
		inject: true,
		minify,
		// necessary to consistently work with multiple chunks via CommonsChunkPlugin
		chunksSortMode: 'dependency',
	});
}

function getCompressionPlugin() {
	// eslint-disable-next-line
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

function getBundleAnalyzerPlugin(config) {
	// eslint-disable-next-line
	const {BundleAnalyzerPlugin} = require('webpack-bundle-analyzer');

	// generate bundle size stats so we can analyze them
	// to see which dependecies are the heaviest
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

function getDevelopmentPlugins() {
	return [
		// Hot Module Replacement
		new webpack.HotModuleReplacementPlugin(),
	];
}

function getNamedChunksPlugin() {
	// keep chunk ids stable so async chunks have consistent hash (#1916)
	// Taken from: https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/config/app.js
	const seen = new Set();
	const nameLength = 4;
	return new webpack.NamedChunksPlugin((chunk) => {
		if (chunk.name) return chunk.name;

		const modules = Array.from(chunk.modulesIterable);
		if (modules.length <= 1) return modules[0].id;

		const hash = require('hash-sum'); // eslint-disable-line
		const joinedHash = hash(modules.map(m => m.id).join('_'));
		let len = nameLength;
		while (seen.has(joinedHash.substr(0, len))) len++;
		seen.add(joinedHash.substr(0, len));
		return `chunk-${joinedHash.substr(0, len)}`;
	});
}

function getCSSFileName(config) {
	if (!config.appendHash) return 'css/[name].js';
	// webpack does not support base62 encoding in contenthash yet
	if (config.isProduction) return 'css/[name].[contenthash:7].css';
	return 'css/[name].js';
}

function getProductionPlugins(config) {
	return [
		// clean the dist folder
		new CleanWebpackPlugin(config.destPath, {
			root: process.cwd(),
			// perform clean just before files are emitted to the output dir
			beforeEmit: true,
		}),

		// remove all momentjs locale except for the en-gb locale
		// this helps in reducing momentjs size by quite a bit
		new webpack.ContextReplacementPlugin(/moment[/\\]locale$/, /en-gb/),

		// extract css into its own file
		// MiniCssExtractPlugin does not support base62 hash yet
		new MiniCssExtractPlugin({
			filename: getCSSFileName(config),
			chunkFilename: getCSSFileName(config),
		}),

		// keep module.id stable when vendor modules does not change
		new webpack.HashedModuleIdsPlugin(),
	];
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
	return new CopyWebpackPlugin([
		{
			from: path.join(config.sourcePath, 'public'),
			to: path.join(config.destPath, 'public'),
			toType: 'dir',
		},
	]);
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
	);

	// Display progress in tty environments
	if (process.stdout.isTTY) {
		plugins.push(new GhostProgressPlugin({format: 'compact'}));
	}

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

	if (config.isProduction) {
		plugins.push(...getProductionPlugins(config));
	}
	else {
		plugins.push(...getDevelopmentPlugins(config));
	}

	return plugins;
}

module.exports = {
	getPlugins,
};

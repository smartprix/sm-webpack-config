/* eslint-disable */
var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var FriendlyErrors = require('friendly-errors-webpack-plugin');
var OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
var BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
var opn = require("opn");
const { VueLoaderPlugin } = require('vue-loader');
const merge = require('webpack-merge');

const WebpackDevServer = require('./dev-server');
const utils = require('./utils');
const postcssOptions = require('./postcss.config.js');

const configDev = {
	sourcePath: 'res',
	destPath: '.',
	publicUrl: '/',
	sourceMap: true,
	devServerPort: 3001,
	appPort: 3000,
	eslint: true,
	openBrowser: true,
	entry: {
		app: 'js/index.js',
	},
	entryHtml: 'index.html',
	appendHash: true,
	library: false,
	uglify: false,
	rollup: false,
	quiet: true,
};

const configProd = _.assign({}, configDev, {
	sourceMap: false,
	destPath: 'static/dist',
	publicUrl: '/static/dist',
	uglify: true,
});

const configRollup = {
	entry: 'src/index.js',
	dest: 'dist/index.js',
	library: 'lib',
	libraryFormat: 'umd',
	uglify: false,
	sourceMap: false,
};

const cwd = process.cwd();

// polyfills required, object.assign, promise
const babelOptions = {
	presets: [
		[
			require.resolve("@babel/preset-env"),
			{ "loose": true, "modules": false },
		],
		[
			require.resolve("@babel/preset-stage-3"),
			{ "loose": true },
		],
	],
	plugins: [
		require.resolve("babel-plugin-transform-vue-jsx"),
		require.resolve("babel-plugin-jsx-v-model"),
		require.resolve("@babel/plugin-proposal-optional-catch-binding"),
		[
        	require.resolve("@babel/plugin-proposal-class-properties"),
        	{ "loose": true },
		],
		[
			require.resolve("@babel/plugin-proposal-optional-chaining"),
			{ "loose": true },
		],
		[
			require.resolve("@babel/plugin-proposal-nullish-coalescing-operator"),
			{ "loose": true },
		],
	],
};

// object is {env, config, webpackConfig}
// env can be developement or production
// config gets merged into our configuration (configDev or configProd)
// webpackConfig gets merged into final webpack config
function getWebpackConfig(object) {
	const env = object.env || process.env.NODE_ENV || 'development';

	const isProduction = env === 'production';

	// correct NODE_ENV is important for vue-loader to correctly minify files
	process.env.NODE_ENV = isProduction ? 'production' : env;

	let config = isProduction ? configProd : configDev;
	if (object.config) {
		config = _.assign({}, config, object.config);
	}

	const webpackConfig = object.webpackConfig || {};

	config.sourcePath = path.join(cwd, config.sourcePath);
	config.destPath = path.join(cwd, config.destPath);

	const entry = {};
	_.forEach(config.entry, function(value, key) {
		entry[key] = path.join(config.sourcePath, value);
	});

	const styleLoaders = utils.styleLoaders({
		sourceMap: config.sourceMap,
		extract: isProduction ? true : false,
		minify: isProduction ? true : false,
	});

	const vueLoaders = utils.cssLoaders({
		sourceMap: config.sourceMap,
		extract: isProduction ? true : false,
		minify: isProduction ? true : false,
	});

	vueLoaders.js = 'babel-loader?' + JSON.stringify(babelOptions);

	let jsLoader = {
		test: /\.jsx?$/,
		loader: 'babel-loader',
		exclude: function (path) {
			if (path.includes('.vue')) return false;
			if (path.includes('node_modules')) return true;
			return false;
		},
		options: babelOptions,
	};

	if (config.rollup) {
		jsLoader = {
			test: /\.jsx?$/,
			loader: 'rollup-loader',
			include: config.sourcePath,
			exclude: [/node_modules/],
			options: {
				plugins: [
					require('rollup-plugin-babel')({
						exclude: 'node_modules/**',
						babelrc: false,
						presets: babelOptions.presets,
						plugins: babelOptions.plugins,
					}),
				],
			},
		};
	}

	const baseConfig = {
		mode: isProduction ? 'production' : 'development',
		entry: entry,

		output: {
			path: config.destPath,
			publicPath: config.publicUrl,
			filename: (config.library || !config.appendHash) ? '[name].js' : 'js/[name].js'
		},

		resolve: {
			extensions: ['.js', '.jsx', '.vue', '.json'],
			modules: [path.join(cwd, 'node_modules'), path.join(__dirname, 'node_modules')],
			alias: {
				'res': config.sourcePath,
				'js': path.join(config.sourcePath, 'js'),
				'assets': path.join(config.sourcePath, 'assets'),
				'components': path.join(config.sourcePath, 'js', 'components'),
				'css': path.join(config.sourcePath, 'css'),
				'img': path.join(config.sourcePath, 'img'),
			},
		},

		resolveLoader: {
			modules: [path.join(cwd, 'node_modules'), path.join(__dirname, 'node_modules')],
		},

		module: {
			rules: [
				{
					test: /\.vue$/,
					loader: 'vue-loader',
					options: {},
				},

				jsLoader,

				{
					test: /\.json$/,
					loader: 'json-loader',
				},

				{
					test: /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/,
					use: [{
						loader: 'url-loader',
						options: {
							limit: 3000,
							// this is because file-loader just concats it to the path
							// instead of treating it as a path
							outputPath: config.devServer ? 'img/' : '/img/',
							name: '[name].[hash:base64:5].[ext]',
						}
					}],
				},

				{
					test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
					use: [{
						loader: 'url-loader',
						options: {
							limit: 3000,
							// this is because file-loader just concats it to the path
							// instead of treating it as a path
							outputPath: config.devServer ? 'font/' : '/fonts/',
							name: '[name].[hash:base64:5].[ext]',
						}
					}],
				},
			]
		},

		node: {
			console: false,
			global: true,
			process: false,
			Buffer: false,
			__filename: "mock",
			__dirname: "mock",
			setImmediate: false,
		},

		optimization: {
			minimize: false,
			runtimeChunk: 'single',
			splitChunks: {
				cacheGroups: {
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						name: 'vendor',
						enforce: true,
						chunks: 'all',
					},
				},
			},
		},

		plugins: [
			new webpack.DefinePlugin({
				'process.env': {
					NODE_ENV: JSON.stringify(isProduction ? 'production' : 'development'),
				},
			}),

			// vue loader plugin is required for vue files
			new VueLoaderPlugin(),
		],
	}

	if (config.library) {
		baseConfig.output.libraryTarget = config.libraryFormat || "umd";
		baseConfig.output.umdNamedDefine = true;
		baseConfig.output.library = config.library === true ? 'Lib' : config.library;
	}

	if (config.eslint) {
		baseConfig.module.rules.push({
			test: /\.(vue|js)$/,
			loader: 'eslint-loader',
			include: config.sourcePath,
			exclude: /node_modules/,
			enforce: 'pre',
			options: {
				formatter: require('eslint-friendly-formatter'),
			}
		});
	}

	if (config.uglify) {
		baseConfig.optimization.minimize = true;
	}

	if (config.gzip) {
		var CompressionWebpackPlugin = require('compression-webpack-plugin');

		baseConfig.plugins.push(
			new CompressionWebpackPlugin({
				asset: '[path].gz[query]',
				algorithm: 'gzip',
				test: new RegExp(
					'\\.(' +
					['js', 'css'].join('|') +
					')$'
				),
				threshold: 10240,
				minRatio: 0.8
			})
		);
	}

	if (!isProduction) {
		// add hot-reload related code to entry chunks
		Object.keys(baseConfig.entry).forEach(function (name) {
			baseConfig.entry[name] = [path.join(__dirname, 'dev-client')].concat(baseConfig.entry[name]);
		});

		const devWebpackConfig = {
			devServer: {
				inline: true,
			},
			performance: {
				hints: false,
			},
			module: {
				rules: _.values(styleLoaders),
			},
			// eval-source-map is faster for development
			devtool: config.sourceMap ? '#eval-source-map' : false,
			plugins: [
				// all plugins are required for hot module replacement
				// https://github.com/glenjamin/webpack-hot-middleware#installation--usage
				new webpack.optimize.OccurrenceOrderPlugin(),
				new webpack.HotModuleReplacementPlugin(),

				new webpack.ProvidePlugin({
					// Automtically detect jQuery and $ as free var in modules
					// and inject the jquery library
					// This is required by many jquery plugins
					jQuery: "jquery",
					$: "jquery"
				}),

				// Friendly Errors
				new FriendlyErrors(),
			],
		};

		if (!config.library && config.entryHtml) {
			devWebpackConfig.plugins.push(
				// https://github.com/ampedandwired/html-webpack-plugin
				new HtmlWebpackPlugin({
					filename: config.entryHtml,
					template: path.join(config.sourcePath, config.entryHtml),
					inject: true,
				})
			);
		}

		// Developement Config
		return merge(baseConfig, devWebpackConfig, webpackConfig);
	}

	const prodWebpackConfig = {
		module: {
			rules: _.values(styleLoaders),
		},

		devtool: config.sourceMap ? '#source-map' : false,
		output: {
			filename: (config.library || !config.appendHash) ? '[name].js' : 'js/[name].[chunkhash:7].js',
			chunkFilename: (config.library || !config.appendHash) ? '[name].[id].js' : 'js/[name].[id].[chunkhash:7].js',
		},

		plugins: [
		],
	};

	if (!config.library) {
		if (config.entryHtml) {
			prodWebpackConfig.plugins.push(
				// generate dist index.html with correct asset hash for caching.
				// you can customize output by editing /index.html
				// see https://github.com/ampedandwired/html-webpack-plugin
				new HtmlWebpackPlugin({
					filename: 'index.html',
					template: path.join(config.sourcePath, 'index.html'),
					inject: true,
					minify: {
						removeComments: true,
						collapseWhitespace: true,
						// more options:
						// https://github.com/kangax/html-minifier#options-quick-reference
					},
					// necessary to consistently work with multiple chunks via CommonsChunkPlugin
					chunksSortMode: 'dependency'
				})
			);
		}

		prodWebpackConfig.plugins = prodWebpackConfig.plugins.concat([
			// remove all momentjs locale except for the en-gb locale
			// this helps in reducing momentjs size by quite a bit
			new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en-gb/),

			new webpack.optimize.OccurrenceOrderPlugin(),

			// extract css into its own file
			new ExtractTextPlugin({
				filename: 'css/[name].[contenthash:base64:5].css',
				allChunks: true,
			}),

			// minify extracted css
			new OptimizeCssAssetsPlugin({
				cssProcessorOptions: {
					discardComments: {
						removeAll: true,
					},
				},
				canPrint: true,
			}),

			// generate bundle size stats so we can analyze them
			// to see which dependecies are the heaviest
			new BundleAnalyzerPlugin({
				analyzerMode: 'static',
				reportFilename: 'webpack.report.html',
				generateStatsFile: true,
				statsFilename: 'webpack.stats.json',
				openAnalyzer: false,
			}),
		]);
	}

	// Production Config
	return merge(baseConfig, prodWebpackConfig, webpackConfig);
}

function getProdConfig({config, webpackConfig}) {
	return getConfig({env: 'production', config, webpackConfig});
}

function getDevConfig({config, webpackConfig}) {
	return getConfig({env: 'development', config, webpackConfig});
}

function runWebpack({env, config, webpackConfig}) {
	return new Promise(function(resolve, reject) {
		const finalWebpackConfig = getWebpackConfig({env, config, webpackConfig});

		// run webpack
		webpack(finalWebpackConfig, function(err, stats) {
			if(err) throw new Error(err);
			console.log(stats.toString({
				colors: true,
				chunks: false,
				chunkModules: false,
				modules: false,
				children: false,
			}));

			resolve();
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
	return new Promise(function(resolve, reject) {
		const devConfig = _.assign({}, configDev, config);

		// destPath will always be . & publicUrl will always be / in case of dev server
		devConfig.destPath = '.';
		devConfig.publicUrl = '/';
		devConfig.devServer = true;

		const finalWebpackConfig = getWebpackConfig({
			env: 'development',
			config: devConfig,
			webpackConfig
		});

		const devServerConfig = {
			webpackConfig: finalWebpackConfig,
			publicUrl: devConfig.publicUrl,
			proxy: {
				"/api": "http://localhost:" + devConfig.appPort,
				"/static": "http://localhost:" + devConfig.appPort,
				"/uploads": "http://localhost:" + devConfig.appPort,
			},
			quiet: devConfig.quiet,
		};

		if (configDev.proxy) {
			devServerConfig['proxy'] = devConfig.proxy;
		}

		const url = "http://localhost:" + devConfig.devServerPort;

		// Start a webpack-dev-server
		WebpackDevServer(devServerConfig, () => console.log("[webpack-dev-server]", url))
			.listen(devConfig.devServerPort, "0.0.0.0", function(err) {
				if(err) throw new Error(err);

				if (devConfig.openBrowser) {
					opn(url);
				}

				resolve();
			});
	});
}

function runRollup({config = {}, rollupConfig = {}} = {}) {
	const rollup = require('rollup');
	config = _.assign({}, configRollup, config);

	config.entry = path.resolve(cwd, config.entry);
	config.dest = path.resolve(cwd, config.dest);

	const plugins = [
		require('rollup-plugin-babel')({
			exclude: 'node_modules/**',
			babelrc: false,
			presets: babelOptions.presets,
			plugins: babelOptions.plugins,
		}),
	];

	if (config.uglify) {
		plugins.push(
			require('rollup-plugin-uglify')()
		);
	}

	return rollup.rollup({
		entry: config.entry,
		plugins: plugins,
	}).then(function (bundle) {
		bundle.write({
			format: config.libraryFormat || "umd",
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
}

var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var FriendlyErrors = require('friendly-errors-webpack-plugin')
var gutil = require("gulp-util");
var opn = require("opn");
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
			require.resolve("babel-preset-es2015"),
			{ "loose": true, "modules": false }
		],
		require.resolve("babel-preset-es2016"),
		require.resolve("babel-preset-es2017"),
		require.resolve("babel-preset-stage-3"),
	],
	plugins: [
		require.resolve("babel-plugin-transform-vue-jsx"),
		require.resolve("babel-plugin-transform-class-properties"),
	],
};

// object is {env, config, webpackConfig}
// env can be developement or production
// config gets merged into our configuration (configDev or configProd)
// webpackConfig gets merged into final webpack config
function getWebpackConfig(object) {
	const env = object.env || process.env.NODE_ENV || 'development';

	const isProduction = env === 'production';
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

	const vueLoaders = utils.cssLoaders({
		sourceMap: config.sourceMap,
		extract: isProduction ? true : false,
	});
	vueLoaders.js = 'babel-loader?' + JSON.stringify(babelOptions);

	let jsLoader = {
		test: /\.jsx?$/,
		loader: 'babel-loader',
		include: config.sourcePath,
		exclude: /node_modules/,
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
		entry: entry,
		output: {
			path: config.destPath,
			publicPath: config.publicUrl,
			filename: config.library ? '[name].js' : 'js/[name].js'
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
					options: {
						loaders: vueLoaders,
						postcss: postcssOptions,
						autoprefixer: false,
					},
				},
				jsLoader,
				{
					test: /\.json$/,
					loader: 'json-loader',
				},
				{
					test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
					loader: 'url-loader',
					query: {
						limit: 3000,
						name: 'img/[name].[hash:base64:7].[ext]',
					},
				},
				{
					test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
					loader: 'url-loader',
					query: {
						limit: 3000,
						name: 'fonts/[name].[hash:base64:7].[ext]',
					},
				}
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
		plugins: []
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
		baseConfig.plugins.push(
			new webpack.optimize.UglifyJsPlugin({
				compress: {
					warnings: false
				}
			})
		);
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
				rules: _.values(utils.styleLoaders({sourceMap: config.sourceMap})),
			},
			// eval-source-map is faster for development
			devtool: config.sourceMap ? '#eval-source-map' : false,
			plugins: [
				new webpack.DefinePlugin({
					'process.env': {
						NODE_ENV: "'development'"
					}
				}),

				// all plugins are required for hot module replacement
				// https://github.com/glenjamin/webpack-hot-middleware#installation--usage
				new webpack.optimize.OccurrenceOrderPlugin(),
				new webpack.HotModuleReplacementPlugin(),
				new webpack.NoEmitOnErrorsPlugin(),

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

		if (!config.library, config.entryHtml) {
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
			rules: _.values(utils.styleLoaders({sourceMap: config.sourceMap, extract: true})),
		},

		devtool: config.sourceMap ? '#source-map' : false,
		output: {
			filename: config.library ? '[name].js' : 'js/[name].[chunkhash:7].js',
			chunkFilename: config.library ? '[id].js' : 'js/[id].[chunkhash:7].js',
		},
		plugins: [
			// http://vuejs.github.io/vue-loader/workflow/production.html
			new webpack.DefinePlugin({
				'process.env': {
					NODE_ENV: 'production'
				}
			}),
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
			new webpack.optimize.OccurrenceOrderPlugin(),
			// extract css into its own file
			new ExtractTextPlugin({
				filename: 'css/[name].[contenthash:7].css',
				allChunks: true,
			}),
			// split vendor js into its own file
			new webpack.optimize.CommonsChunkPlugin({
				name: 'vendor',
				minChunks: function (module, count) {
					// any required modules inside node_modules are extracted to vendor
					return (
						module.resource &&
						/\.js$/.test(module.resource) &&
						module.resource.indexOf(
							path.join(cwd, 'node_modules')
						) === 0
					)
				}
			}),
			// extract webpack runtime and module manifest to its own file in order to
			// prevent vendor hash from being updated whenever app bundle is updated
			new webpack.optimize.CommonsChunkPlugin({
				name: 'manifest',
				chunks: ['vendor']
			})
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
			if(err) throw new gutil.PluginError('webpack:build', err);
			gutil.log('[webpack:build]', stats.toString({
				colors: true
			}));

			resolve();
		});
	});
}

function runDevWebpack({config, webpackConfig}) {
	return runWebpack({env: 'development', config, webpackConfig});
}

function runProdWebpack({config, webpackConfig}) {
	return runWebpack({env: 'production', config, webpackConfig});
}

function runDevServer({config, webpackConfig}) {
	return new Promise(function(resolve, reject) {
		const devConfig = _.assign({}, configDev, config);

		// destPath will always be . & publicUrl will always be / in case of dev server
		devConfig.destPath = '.';
		devConfig.publicUrl = '/';

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
		WebpackDevServer(devServerConfig, () => gutil.log("[webpack-dev-server]", url))
			.listen(devConfig.devServerPort, "0.0.0.0", function(err) {
				if(err) throw new gutil.PluginError("webpack-dev-server", err);

				if (devConfig.openBrowser) {
					opn(url);
				}

				resolve();
			});
	});
}

function runRollup({config, rollupConfig}) {
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

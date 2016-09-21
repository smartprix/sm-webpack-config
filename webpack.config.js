var _ = require('lodash');
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var gutil = require("gulp-util");
const WebpackDevServer = require('./dev-server');
const merge = require('webpack-merge')

const precss = require('precss');
const cssnext = require('postcss-cssnext');

var utils = require('./utils');

const configDev = {
	sourcePath: 'res',
	destPath: '.',
	publicUrl: '/',
	sourceMap: true,
	devServerPort: 3001,
	appPort: 3000,
	eslint: true,
	entry: {
		app: 'js/index.js',
	},
}

const configProd = _.assign({}, configDev, {
	sourceMap: false,
	destPath: 'static/dist',
	publicUrl: '/static/dist',
});

function getConfig(env) {
	const cwd = process.cwd();

	env = env || process.env.NODE_ENV;

	const isProduction = env === 'production';
	const config = isProduction ? configProd : configDev;

	config.sourcePath = path.join(cwd, config.sourcePath);
	config.destPath = path.join(cwd, config.destPath);

	const entry = {};
	_.forEach(config.entry, function(value, key) {
		entry[key] = path.join(config.sourcePath, value);
	});

	const baseConfig = {
		entry: entry,
		devServer: {
			inline: true,
		},
		output: {
			path: config.destPath,
			publicPath: config.publicUrl,
			filename: 'js/[name].js'
		},
		resolve: {
			extensions: ['', '.js', '.vue'],
			modules: [path.join(cwd, 'node_modules'), path.join(__dirname, 'node_modules')],
			alias: {
				'src': path.join(config.sourcePath, 'js'),
				'js': path.join(config.sourcePath, 'js'),
				'assets': path.join(config.sourcePath),
				'components': path.join(config.sourcePath, 'js', 'components'),
				'css': path.join(config.sourcePath, 'css'),
				'img': path.join(config.sourcePath, 'img')
			},
		},
		resolveLoader: {
			modules: [path.join(__dirname, 'node_modules'), path.join(cwd, 'node_modules')],
		},
		module: {
			preLoaders: [
			],
			loaders: [
				{
					test: /\.vue$/,
					loader: 'vue'
				},
				{
					test: /\.js$/,
					loader: 'babel',
					include: config.sourcePath,
					exclude: /node_modules/
				},
				{
					test: /\.json$/,
					loader: 'json'
				},
				{
					test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
					loader: 'url',
					query: {
						limit: 3000,
						name: path.join(config.destPath, 'img/[name].[hash:base64:7].[ext]')
					}
				},
				{
					test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
					loader: 'url',
					query: {
						limit: 3000,
						name: path.join(config.destPath, 'fonts/[name].[hash:base64:7].[ext]')
					}
				}
			]
		},
		babel: {
			presets: [
				[
					require.resolve("babel-preset-es2015"),
					{ "loose": true, "modules": false }
				],
			],
			plugins: [
				require.resolve("babel-plugin-transform-vue-jsx"),
			],
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
		eslint: {
			formatter: require('eslint-friendly-formatter')
		},
		postcss: [
			precss(),
			cssnext(),
		],
		vue: {
			loaders: utils.cssLoaders({
				sourceMap: config.sourceMap
			}),
			postcss: [
				precss(),
				cssnext(),
			],
			autoprefixer: false
		},
		plugins: []
	}

	if (config.eslint) {
		baseConfig.module.preLoaders.push({
			test: /\.(vue|js)$/,
			loader: 'eslint',
			include: config.sourcePath,
			exclude: /node_modules/
		});
	}

	if (config.gzip) {
		var CompressionWebpackPlugin = require('compression-webpack-plugin')

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
		)
	}

	if (!isProduction) {
		// add hot-reload related code to entry chunks
		Object.keys(baseConfig.entry).forEach(function (name) {
			baseConfig.entry[name] = [path.join(__dirname, 'dev-client')].concat(baseConfig.entry[name]);
		});

		// Developement Config
		return merge(baseConfig, {
			devServer: {
				inline: true,
			},
			module: {
				loaders: utils.styleLoaders({ sourceMap: config.sourceMap })
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
				new webpack.NoErrorsPlugin(),

				new webpack.ProvidePlugin({
					// Automtically detect jQuery and $ as free var in modules
					// and inject the jquery library
					// This is required by many jquery plugins
					jQuery: "jquery",
					$: "jquery"
				}),

				// https://github.com/ampedandwired/html-webpack-plugin
				new HtmlWebpackPlugin({
					filename: 'index.html',
					template: path.join(config.sourcePath, 'index.html'),
					inject: true
				})
			]
		})
	}

	// Production Config
	return merge(baseConfig, {
		module: {
			loaders: utils.styleLoaders({ sourceMap: config.sourceMap, extract: true })
		},

		devtool: config.sourceMap ? '#source-map' : false,
		output: {
			filename: 'js/[name].[chunkhash:7].js',
			chunkFilename: 'js/[id].[chunkhash:7].js',
		},
		vue: {
			loaders: utils.cssLoaders({
				sourceMap: config.sourceMap,
				extract: true
			})
		},
		plugins: [
			// http://vuejs.github.io/vue-loader/workflow/production.html
			new webpack.DefinePlugin({
				'process.env': {
					NODE_ENV: 'production'
				}
			}),
			new webpack.optimize.DedupePlugin(),
			new webpack.optimize.UglifyJsPlugin({
				compress: {
					warnings: false
				}
			}),
			new webpack.optimize.OccurrenceOrderPlugin(),
			// extract css into its own file
			new ExtractTextPlugin({
				filename: path.join(config.destPath, 'css/[name].[contenthash:7].css'),
				allChunks: true,
			}),
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
							path.join(__dirname, '../node_modules')
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
		]
	})
}

function getProdConfig() {
	return getConfig('production');
}

function getDevConfig() {
	return getConfig('development');
}

function setProdConfig() {
	return _.assign(configProd, object);
}

function setDevConfig() {
	return _.assign(configDev, object);
}

function runWebpack(env, callback) {
	if (_.isFunction(env)) {
		callback = env;
		env = undefined;
	}

	const webpackConfig = getConfig(env);

	// run webpack
	webpack(webpackConfig, function(err, stats) {
		if(err) throw new gutil.PluginError('webpack:build', err);
		gutil.log('[webpack:build]', stats.toString({
			colors: true
		}));

		if (callback) {
			callback();
		}
	});
}

function runDevWebpack(callback) {
	runWebpack('development', callback);
}

function runProdWebpack(callback) {
	runWebpack('production', callback);
}

function runDevServer(callback) {
	const webpackConfig = getConfig('development');
	const devServerConfig = {
		webpackConfig,
		publicUrl: configDev.publicUrl,
		proxy: {
			"/api": "http://localhost:" + configDev.appPort,
			"/static": "http://localhost:" + configDev.appPort,
		},
	};

	if (configDev.proxy) {
		devServerConfig['proxy'] = configDev.proxy;
	}

	// Start a webpack-dev-server
	WebpackDevServer(devServerConfig)
		.listen(configDev.devServerPort, "0.0.0.0", function(err) {
			if(err) throw new gutil.PluginError("webpack-dev-server", err);
			gutil.log("[webpack-dev-server]", "http://localhost:" + configDev.devServerPort);
		});
}

module.exports = {
	getConfig,
	getProdConfig,
	getDevConfig,
	setProdConfig,
	setDevConfig,
	runWebpack,
	runDevWebpack,
	runProdWebpack,
	runDevServer,
}

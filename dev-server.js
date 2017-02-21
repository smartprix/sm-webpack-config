var path = require('path');
var express = require('express');
var webpack = require('webpack');
var proxyMiddleware = require('http-proxy-middleware');
var webpackDevMiddleware = require('webpack-dev-middleware');
var webpackHotMiddleware = require('webpack-hot-middleware');
var historyApiFallback = require('connect-history-api-fallback');

function devServer(config, callback) {
	// default port where dev server listens for incoming traffic
	var port = config.port || 3001;

	// default port for app API
	var appPort = config.appPort || 3000;

	// Define HTTP proxies to your custom API backend
	// https://github.com/chimurai/http-proxy-middleware
	var proxyTable = config.proxy;

	if (!proxyTable) {
		proxyTable = {
			"/api": "http://localhost:" + appPort,
			"/static": "http://localhost:" + appPort,
		};
	}

	var app = express();
	var compiler = webpack(config.webpackConfig);

	// proxy api requests
	Object.keys(proxyTable).forEach(function (context) {
		var options = proxyTable[context];
		if (typeof options === 'string') {
			options = { target: options };
		}
		app.use(proxyMiddleware(context, options));
	});

	var devMiddleware = webpackDevMiddleware(compiler, {
		publicPath: config.publicUrl || config.publicPath,
		noInfo: config.quiet ? true : false,
		quiet: config.quiet ? true : false,
	});

	var hotMiddleware = webpackHotMiddleware(compiler, {
		log: () => {}
	});

	// force page reload when html-webpack-plugin template changes
	compiler.plugin('compilation', function (compilation) {
		compilation.plugin('html-webpack-plugin-after-emit', function (data, cb) {
			hotMiddleware.publish({ action: 'reload' });
			cb();
		})
	});

	// handle fallback for HTML5 history API
	app.use(historyApiFallback());

	// serve webpack bundle output
	app.use(devMiddleware);

	// enable hot-reload and state-preserving
	// compilation error display
	app.use(hotMiddleware);

	// execute callback after the bundle is valid
	if (callback) {
		devMiddleware.waitUntilValid(callback);
	}

	// serve pure static assets
	// var staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory)
	// app.use(staticPath, express.static('./static'))

	return app;
}

module.exports = devServer;

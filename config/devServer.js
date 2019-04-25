const path = require('path');
const launchEditorMiddleware = require('launch-editor-middleware');

function getDevServerConfig(config) {
	const isSSR = config.hasSSR && config.devServer.buildSSR;
	const devServerOpts = Object.assign({}, config.devServer || {});

	const before = devServerOpts.before;
	const after = devServerOpts.after;

	const ssrOpts = isSSR ? {
		index: '',
		historyApiFallback: false,
		proxy: {
			context: () => true,
			target: `http://${devServerOpts.appHost}:${devServerOpts.appPort}`,
			ws: true,
			changeOrigin: true,
		},
	} : {};

	delete devServerOpts.before;
	delete devServerOpts.after;
	delete devServerOpts.wwwHost;
	delete devServerOpts.appHost;
	delete devServerOpts.appPort;
	delete devServerOpts.notifyOnError;
	delete devServerOpts.open;
	delete devServerOpts.buildSSR;

	return Object.assign({
		host: '0.0.0.0',
		port: 3001,
		clientLogLevel: 'none',
		historyApiFallback: true,
		contentBase: path.join(config.sourcePath, 'public'),
		watchContentBase: true,
		hot: true,
		quiet: true,
		compress: true,
		publicPath: config.publicUrl,
		overlay: {warnings: false, errors: true},
		https: false,
		proxy: {},
		index: 'index.html',
		inline: true,
		open: false,
		progress: false,
		before(app, server) {
			// launch editor support.
			// this works with vue-devtools & @vue/cli-overlay
			app.use('/__open-in-editor', launchEditorMiddleware('code'));

			// apply in project middlewares
			if (before) {
				before(app, server);
			}
		},
		after(app, server) {
			// apply in project middlewares
			if (after) {
				after(app, server);
			}
		},
	}, devServerOpts, ssrOpts);
}

module.exports = {
	getDevServerConfig,
};

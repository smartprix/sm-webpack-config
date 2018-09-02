const path = require('path');
const launchEditorMiddleware = require('launch-editor-middleware');

function getDevServerConfig(config) {
	const devServerOpts = config.devServer || {};

	const before = devServerOpts.before;
	const after = devServerOpts.after;

	delete devServerOpts.before;
	delete devServerOpts.after;
	delete devServerOpts.appPort;
	delete devServerOpts.notifyOnError;
	delete devServerOpts.open;

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
	}, devServerOpts);
}

module.exports = {
	getDevServerConfig,
};

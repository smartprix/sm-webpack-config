const buildConfig = {
	sourcePath: 'res',
	destPath: 'static/dist',
	publicUrl: '/static/dist',
	entry: {
		app: 'js/index-client.js',
	},
	devServer: {
		port: 3001,
		appPort: 3000,
	},
	ssr: {
		entry: 'js/index-server.js',
		sourceMap: true,
	},
};

function installDevServer(app, createRenderer) {
	// eslint-disable-next-line global-require
	const {koaDevServer} = require('sm-webpack-config');

	const devServer = koaDevServer({
		config: buildConfig,
	});

	let renderer;
	devServer.on('vue-ssr', ({serverBundle, clientManifest}) => {
		renderer = createRenderer(serverBundle, clientManifest);
	});

	app.use(devServer.middleware());
	const renderToString = (...args) => {
		if (!renderer) return 'Waiting to generate renderer...';
		return renderer.renderToString(...args);
	};

	return renderToString;
}

module.exports = installDevServer;

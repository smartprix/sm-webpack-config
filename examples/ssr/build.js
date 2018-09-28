const smWebpack = require('sm-webpack-config');

const command = process.argv[2] || 'default';
const env = process.env.NODE_ENV || 'development';

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

if (command === 'build') {
	smWebpack.runProdWebpack({config: buildConfig});
}

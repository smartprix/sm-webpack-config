const smWebpack = require('../webpack.config.js');

const command = process.argv[2] || 'default';

const config = {
	sourcePath: 'test/basic',
	destPath: 'test/dist/basic',
	publicUrl: '/test/dist/basic',
	devServerPort: 2001,
	appPort: 2000,
};

if (command === 'default') {
	smWebpack.runDevServer({config}).then(() => {
		console.log('Running Dev Server (Basic)!');
	});
}
else if (command === 'build') {
	Promise.all([
		smWebpack.runProdWebpack({config}),
	]).then(() => {
		console.log('Done!');
	});
}

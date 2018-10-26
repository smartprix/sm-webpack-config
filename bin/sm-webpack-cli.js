#! /usr/bin/env node
const _ = require('lodash');
const program = require('commander');
const {version} = require('../package.json');
const smWebpack = require('../index');

const confFile = `${process.cwd()}/sm-webpack`;

program
	.version(version)
	.option('-s, --src [dir]', 'Specify Source Directory (default: res)')
	.option('-d, --dest [dir]', 'Specify Destination Directory (default: static/dist)')
	.option('-c, --config [config]', 'Which key to read from sm-webpack.js if object with multiple confs is being exported', '')
	.option('--public-url [path]', 'Specify public url path where this will be served from (default: `/{dest}`)')
	.option('--dev-port [port]', 'Start dev server on port (default: 3001)')
	.option('--app-port [port]', 'Port for api request (default: 3000)')
	.option('--prod', 'Bundle for production')
	.parse(process.argv);

const devPort = Number(program.devPort);
const appPort = Number(program.appPort);

const options = {
	sourcePath: program.src,
	destPath: program.dest,
	publicUrl: program.publicUrl,
	devServer: {
		port: Number.isSafeInteger(devPort) ? devPort : undefined,
		appPort: Number.isSafeInteger(appPort) ? appPort : undefined,
	},
};

async function runAndExit() {
	let conf = {};
	const extraConf = {};
	const config = (String(program.config) || '').trim();

	try {
		conf = require(confFile); // eslint-disable-line
	}
	catch (err) {
		console.log('[smWebpack] Conf not found or error in config', err);
		conf = {};
	}

	if (!_.isEmpty(conf)) {
		if (config && conf[config]) {
			_.merge(extraConf, conf[config]);
		}
		else if (!config) {
			_.merge(extraConf, conf);
		}
	}
	_.defaultsDeep(extraConf, options, {
		sourcePath: 'res',
		destPath: 'static/dist',
		devServer: {
			port: 3001,
			appPort: 3000,
		},
	});
	if (!extraConf.publicUrl) {
		extraConf.publicUrl = `/${extraConf.destPath}`;
	}
	try {
		if (program.prod) {
			console.time('Built', config || '');
			await smWebpack.runProdWebpack({config: extraConf});
			console.timeEnd('Built', config || '');
			process.exit(0);
		}
		else {
			if (!Number.isSafeInteger(extraConf.devServer.port)) {
				throw new Error('Invalid port');
			}
			await smWebpack.runDevServer({config: extraConf});
			console.log(`[smWebpack] Running Dev Server${config ? ' ' + config : ''}!`);
		}
	}
	catch (err) {
		console.error('[smWebpack]', err);
		process.exit(1);
	}
}

runAndExit();

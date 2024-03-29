#! /usr/bin/env node
const _ = require('lodash');
const program = require('commander');
const {version} = require('../package.json');
const smWebpack = require('../index');

const confFile = `${process.cwd()}/sm-webpack`;
// One config for all Smartprix packages
const smartprixConfFile = `${process.cwd()}/sm-config`;
const packageFile = `${process.cwd()}/package.json`;

program
	.version(version, '-v, --version')
	.usage('[serve | build] [options]')
	.description(`
Use it to either serve the files on a dev server:
	$ sm-webpack serve -s res
Or build for production:
	$ sm-webpack build -s res -d static/dist
Default option is 'build':
	$ sm-webpack -s res -d static/dist
	`)
	.option('-s, --src [dir]', 'Specify Source Directory (default: res)')
	.option('-d, --dest [dir]', 'Specify Destination Directory (default: static/dist)')
	.option('-c, --config [config]', 'Which key to read from sm-webpack.js if object with multiple confs is being exported', '')
	.option('--public-url [path]', 'Specify public url path where this will be served from (default: `/{dest}`)')
	.option('--dev-port [port]', 'Start dev server on port (default: 3001)')
	.option('--app-port [port]', 'Port for api request (default: 3000)')
	.option('--dev', 'Build for development', false)
	.parse(process.argv);

const devPort = Number(program.devPort);
const appPort = Number(program.appPort);
const isDev = Boolean(program.dev);

const options = {
	sourcePath: program.src,
	destPath: program.dest,
	publicUrl: program.publicUrl,
	devServer: {
		port: Number.isSafeInteger(devPort) ? devPort : undefined,
		appPort: Number.isSafeInteger(appPort) ? appPort : undefined,
	},
};

function getConfig() {
	let conf = {};
	try {
		conf = require(confFile); // eslint-disable-line
	}
	catch (e) {
		try {
			conf = require(smartprixConfFile)['sm-webpack']; // eslint-disable-line
			if (!conf || _.isEmpty(conf)) throw new Error('No config in common \'sm-config\' file');
		}
		catch (e2) {
			try {
				conf = require(packageFile)['sm-webpack']; // eslint-disable-line
				if (!conf || _.isEmpty(conf)) throw new Error('No config in package.json');
			}
			catch (e3) {
				console.log('[smWebpack] Conf not found or error in config', e.message, e2.message, e3.message);
				conf = {};
			}
		}
	}
	return conf;
}

async function runAndExit() {
	const conf = getConfig();
	const extraConf = {};
	const config = (String(program.config) || '').trim();
	let build = true;

	if (program.args && program.args.length > 0) {
		if (program.args[0] === 'serve') {
			build = false;
		}
	}

	if (!_.isEmpty(conf)) {
		if (config && conf[config]) {
			_.merge(extraConf, conf[config]);
		}
		else if (!config) {
			_.merge(extraConf, conf);
		}
		else throw new Error(`Invalid config option: ${config}`);
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
	const webpackConfig = extraConf.webpackConfig || {};
	try {
		if (build) {
			console.time('Built', config || '');
			if (isDev) {
				await smWebpack.runDevWebpack({config: extraConf, webpackConfig});
			}
			else {
				await smWebpack.runProdWebpack({config: extraConf, webpackConfig});
			}
			console.timeEnd('Built', config || '');
			process.exit(0);
		}
		else {
			if (!Number.isSafeInteger(extraConf.devServer.port)) {
				throw new Error('Invalid port');
			}
			await smWebpack.runDevServer({config: extraConf, webpackConfig});
			console.log(`[smWebpack] Running Dev Server${config ? ' ' + config : ''}!`);
		}
	}
	catch (err) {
		console.error('[smWebpack]', err);
		process.exit(1);
	}
}

runAndExit().catch((err) => {
	console.error(err);
});

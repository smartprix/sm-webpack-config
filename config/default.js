const configWebpack = {
	sourcePath: 'res',
	destPath: 'static/dist/dev',
	publicUrl: '/static/dist/dev',
	sourceMap: true,
	eslint: true,
	entry: {
		app: 'js/index.js',
	},
	entryHtml: 'index.html',
	appendHash: true,
	library: false,
	minify: false,
	quiet: true,
	babel: {},
	analyzeBundle: false,
	ssr: false,
	cwd: process.cwd(),
	cssModules: false,
	devServer: {},

	$env_production: {
		sourceMap: false,
		eslint: false,
		destPath: 'static/dist',
		publicUrl: '/static/dist',
		minify: true,
		analyzeBundle: true,
	},

	$env_development: {},
};

const devServer = {
	host: '0.0.0.0',
	port: 3001,
	https: false,
	open: true,
	appPort: 3000,
	proxy: {
		'/api': 'http://localhost:<appPort>',
		'/static': 'http://localhost:<appPort>',
		'/uploads': 'http://localhost:<appPort>',
	},
	notifyOnError: true,
	buildSSR: true,
};

const ssr = {
	entry: 'js/index-server.js',
	sourceMap: true,
};

const configRollup = {
	entry: 'src/index.js',
	dest: 'dist/index.js',
	library: 'lib',
	libraryFormat: 'umd',
	minify: false,
	sourceMap: false,
	$env_production: {},
	$env_development: {},
};

function getConfig(config, env) {
	const envKey = (env === 'production') ? 'production' : 'development';
	const finalConfig = Object.assign({},
		configWebpack,
		configWebpack[`$env_${envKey}`],
		config,
		config[`$env_${envKey}`],
	);

	finalConfig.isProduction = (env === 'production');

	// append / to the end of publicUrl, webpack outputs wrong urls otherwise
	if (!finalConfig.publicUrl.endsWith('/')) {
		finalConfig.publicUrl += '/';
	}

	// dev server config needs to be merged separately
	finalConfig.devServer = Object.assign({}, devServer, config.devServer);

	// replace appPort in proxy config
	const appPort = finalConfig.devServer.appPort;
	const proxy = finalConfig.devServer.proxy;
	Object.keys(proxy).forEach((item) => {
		const val = proxy[item];
		if (typeof val === 'string') {
			proxy[item] = val.replace('<appPort>', appPort);
		}
	});

	// save open as openBrowser, as open will get changed
	finalConfig.openBrowser = finalConfig.devServer.open;

	// ssr
	if (config.ssr) {
		let ssrConfig = config.ssr;
		if (ssrConfig === true) {
			ssrConfig = ssr;
		}

		// ssr config needs to be merged separately
		finalConfig.ssr = Object.assign({}, ssr, ssrConfig);
		finalConfig.hasSSR = true;
	}

	return finalConfig;
}

function getRollupConfig(config, env) {
	const envKey = (env === 'production') ? 'production' : 'development';
	const finalConfig = Object.assign({},
		configRollup,
		configRollup[`$env_${envKey}`],
		config,
		config[`$env_${envKey}`],
	);

	finalConfig.isProduction = (env === 'production');
	if (finalConfig.isProduction) {
		Object.assign(finalConfig, finalConfig.$env_production);
	}
	else {
		Object.assign(finalConfig, finalConfig.$env_development);
	}
	return finalConfig;
}

module.exports = {
	getConfig,
	getRollupConfig,
};

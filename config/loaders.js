const path = require('path');
const hash = require('hash-sum');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const {getBabelConfig} = require('./babel');

function getCacheConfig(config, id, options = {}) {
	let cacheDirectory = path.join(
		config.cwd,
		'node_modules',
		'.cache',
		'sm-webpack',
		id
	);

	if (config.isSSR) {
		cacheDirectory = path.join(cacheDirectory, 'ssr');
	}

	const modules = options.modules || [];
	modules.push('cache-loader');

	const versions = {};
	modules.forEach((mod) => {
		versions[mod] = require(`${mod}/package.json`).version; // eslint-disable-line
	});

	return {
		cacheDirectory,
		cacheIdentifier: hash({
			versions,
			vars: options.vars,
		}),
	};
}

function getJsLoader(config) {
	const babelConfig = getBabelConfig(config);
	const cacheConfig = getCacheConfig(config, 'babel-loader', {
		modules: [
			'@babel/core',
			'@babel/preset-env',
			'babel-loader',
		],
		vars: {babelConfig},
	});

	const cacheLoader = {
		loader: 'cache-loader',
		options: cacheConfig,
	};

	const babelLoader = {
		loader: 'babel-loader',
		options: babelConfig,
	};

	// TODO: maybe use thread-loader here

	return {
		test: /\.m?jsx?$/,
		exclude: (filePath) => {
			if (filePath.includes('.vue')) return false;
			if (filePath.includes('.jsx')) return false;
			if (filePath.includes('.mjs')) return false;
			if (filePath.includes('node_modules')) return true;
			return false;
		},
		use: [
			cacheLoader,
			babelLoader,
		],
	};
}

function getVueLoader(config) {
	const cacheConfig = getCacheConfig(config, 'vue-loader', {
		modules: [
			'vue-loader',
			'@vue/component-compiler-utils',
			'vue-template-compiler',
		],
	});

	const cacheLoader = {
		loader: 'cache-loader',
		options: cacheConfig,
	};

	const vueLoader = {
		loader: 'vue-loader',
		options: {
			compilerOptions: {
				preserveWhitespace: false,
			},
			...cacheConfig,
		},
	};

	return {
		test: /\.vue$/,
		use: [
			cacheLoader,
			vueLoader,
		],
	};
}

function getJsonLoader() {
	return {
		test: /\.json$/,
		loader: 'json-loader',
	};
}

function getEslintLoader(config) {
	return {
		test: /\.(vue|m?jsx?)$/,
		loader: 'eslint-loader',
		include: config.sourcePath,
		exclude: /node_modules/,
		enforce: 'pre',
		options: {
			cache: true,
			// eslint-disable-next-line
			formatter: require('eslint-friendly-formatter'),
		},
	};
}

function getFileHash(config, options) {
	if (!config.appendHash || options.appendHash === false) {
		return '';
	}

	// hash is basically contenthash here, file-loader does not have contenthash
	return '.[hash:base62:5]';
}

function getUrlFileLoader(config, options = {}) {
	return {
		test: options.test,
		use: [{
			loader: 'url-loader',
			options: {
				limit: 3000,
				fallback: 'file-loader',
				outputPath: options.outputPath,
				name: `[name]${getFileHash(config, options)}.[ext]`,
				emitFile: !config.isSSR,
			},
		}],
	};
}

function getFileLoader(config, options = {}) {
	return {
		test: options.test,
		loader: 'file-loader',
		options: {
			outputPath: options.outputPath,
			name: `[name]${getFileHash(config, options)}.[ext]`,
			emitFile: !config.isSSR,
		},
	};
}

function getImageLoader(config) {
	return getUrlFileLoader(config, {
		test: /\.(png|jpe?g|webp|gif|ico)(\?.*)?$/,
		outputPath: 'img/',
	});
}

function getSvgLoader(config) {
	// do not base64-inline SVGs.
	// https://github.com/facebookincubator/create-react-app/pull/1180
	return getFileLoader(config, {
		test: /\.(svg)(\?.*)?$/,
		outputPath: 'img/',
	});
}

function getFaviconIcoLoader(config) {
	// do not base64-inline SVGs.
	// https://github.com/facebookincubator/create-react-app/pull/1180
	return getFileLoader(config, {
		test: /\favicon\.ico(\?.*)?$/,
		outputPath: '/',
		appendHash: false,
	});
}

function getFontLoader(config) {
	return getUrlFileLoader(config, {
		test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
		outputPath: 'fonts/',
	});
}

function getMediaLoader(config) {
	return getUrlFileLoader(config, {
		test: /\.(mp4|webm|ogg|mp3|wav|flac|aac|av1)(\?.*)?$/,
		outputPath: 'media/',
	});
}

function getStyleLoader(loaders, options = {}, config) {
	const cssLoader = ['css', {importLoaders: 2}];
	// enable module support
	if (options.modules) {
		cssLoader[1].modules = true;
		let localIdentName = '[hash:base64:6]';
		if (!config.isProduction) {
			localIdentName = `[name]_[local]_${localIdentName}`;
		}
		cssLoader[1].localIdentName = localIdentName;
	}

	loaders = [cssLoader].concat(loaders);
	const sourceLoaders = loaders.map((loader) => {
		let loaderName = '';
		let loaderOptions = {};

		if (Array.isArray(loader)) {
			loaderName = loader[0] + '-loader';
			loaderOptions = loader[1];
		}
		else {
			loaderName = loader + '-loader';
		}

		const loaderObj = {
			loader: loaderName,
			options: loaderOptions,
		};

		if (config.sourceMap) {
			loaderObj.options.sourceMap = true;
		}

		return loaderObj;
	});

	if (config.isProduction) {
		return [MiniCssExtractPlugin.loader].concat(sourceLoaders);
	}

	return [{
		loader: 'vue-style-loader',
		options: {
			hmr: config.isProduction,
			sourceMap: Boolean(config.sourceMap),
		},
	}].concat(sourceLoaders);
}

function getSSRStyleLoaders() {
	return [{
		test: /\.(styl(us)?|(post|p|s)?css|less|sass)$/,
		loader: 'null-loader',
	}];
}

function getStyleLoaders(config) {
	if (config.isSSR) {
		return getSSRStyleLoaders();
	}

	const loaders = {
		'css|postcss|pcss': [['postcss', {
			config: {path: __dirname},
		}]],
		less: ['less'],
		sass: [['sass', {indentedSyntax: true}]],
		scss: ['sass'],
		'stylus|styl': ['stylus'],
	};

	return Object.keys(loaders).map((extension) => {
		const loader = loaders[extension];
		return {
			test: new RegExp(`\\.(${extension})$`),
			oneOf: [
				// enable support of css modules conditionally
				{resourceQuery: /module/, use: getStyleLoader(loader, {modules: true}, config)},
				{resourceQuery: /\?vue/, use: getStyleLoader(loader, {}, config)},
				{test: /\.module\.\w+$/, use: getStyleLoader(loader, {modules: true}, config)},
				{use: getStyleLoader(loader, {modules: config.cssModules}, config)},
			],
		};
	});
}

function getLoaders(config) {
	const loaders = [
		getVueLoader(config),
		getJsLoader(config),
		getJsonLoader(config),
		getImageLoader(config),
		getSvgLoader(config),
		getFaviconIcoLoader(config),
		getFontLoader(config),
		getMediaLoader(config),
		...getStyleLoaders(config),
	];

	if (config.eslint) {
		loaders.push(getEslintLoader(config));
	}

	return loaders;
}

module.exports = {
	getLoaders,
};

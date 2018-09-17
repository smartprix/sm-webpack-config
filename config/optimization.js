const TerserPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const splitChunks = require('./splitChunks');
const uglifyOptions = require('./uglify');

function getSSROptimizationConfig() {
	// ssr does not need any kind of optimization
	return {
		minimize: false,
		noEmitOnErrors: true,
		mangleWasmImports: false,
		splitChunks: false,
	};
}

function getOptimizationConfig(config = {}) {
	if (config.isSSR) {
		return getSSROptimizationConfig();
	}

	const optimization = {
		minimize: config.minify || false,
		minimizer: [
			// use terser instead of uglify js for better es6 support
			new TerserPlugin(uglifyOptions(config)),

			// css minify
			new OptimizeCSSAssetsPlugin({
				cssProcessorOptions: {
					discardComments: {
						removeAll: true,
					},
				},
				canPrint: true,
			}),
		],
		noEmitOnErrors: true,
		mangleWasmImports: config.minify || false,
		nodeEnv: 'development',
	};

	if (config.isProduction) {
		Object.assign(optimization, {
			runtimeChunk: 'single',
			noEmitOnErrors: false,
			nodeEnv: 'production',
			splitChunks,
		});
	}

	return optimization;
}

module.exports = {
	getOptimizationConfig,
};

/* eslint-disable global-require */
// Do not require this file directly, it is meant to be used by parallel-webpack
const {getWebpackConfig} = require('./config/webpack');

if (!process.env.SM_WEBPACK_CONFIGS) {
	console.error('process.env.SM_WEBPACK_CONFIGS is not defined.');
}

let configs;
try {
	configs = JSON.parse(process.env.SM_WEBPACK_CONFIGS);
}
catch (e) {
	console.error('process.env.SM_WEBPACK_CONFIGS is not valid JSON Array.');
}

if (!Array.isArray(configs)) {
	console.error('process.env.SM_WEBPACK_CONFIGS must be a JSON Array.');
}

const env = process.env.SM_WEBPACK_ENV || process.env.NODE_ENV || 'development';

const finalWebpackConfigs = configs.map(
	config => getWebpackConfig({env, config, webpackConfig: {}}),
);

module.exports = finalWebpackConfigs;

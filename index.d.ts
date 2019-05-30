import {Configuration as devServerConf} from 'webpack-dev-server'
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import {Configuration as webpackConfiguration} from 'webpack';
import {RollupBuild} from 'rollup';
import {EventEmitter} from 'events';

interface BabelConfig {
	/**
	 * @see https://babeljs.io/docs/en/babel-preset-env#options
	 */
	envOptions?: {
		loose?: boolean;
		modules?: string | boolean;
		useBuiltIns?: false | 'entry' | 'usage';
		corejs?: number;
		targets: {
			esmodules?: boolean;
			chrome?: string;
			browsers?: string[];
		},
		shippedProposals?: boolean;
		exclude?: string | string[] | RegExp;
		debug?: boolean;
	}
	/**
	 * @see https://www.npmjs.com/package/babel-plugin-transform-imports#options
	 */
	transformImports?: {
		[module: string]: {
			transform: string | ((importName: string, matches) => string);
			preventFullImport?: boolean;
			camelCase?: boolean;
			kebabCase?: boolean;
			snakeCase?: boolean;
			skipDefaultConversion?: boolean;
		}
	};
	includePresets?: (string | [string, any])[];
	/**
	 * '@babel/preset-env' is added by default
	 */
	excludePresets?: string[];
	includePlugins?: (string | [string, any])[];
	/**
	 * #### These are added by default:
	 * - @babel/plugin-syntax-dynamic-import
	 * - @babel/plugin-syntax-import-meta
	 * - @babel/plugin-proposal-class-properties
	 * - @babel/plugin-syntax-jsx
	 * - babel-plugin-transform-vue-jsx
	 * - @babel/plugin-proposal-optional-chaining
	 * - @babel/plugin-proposal-nullish-coalescing-operator
	 * - babel-plugin-transform-imports
	 * - @babel/plugin-transform-runtime
	 */
	excludePlugins?: string[];
	/**
	 * Mention node_modules that need to be compiled by babel
	 * Or a regex pattern that matches modules
	 */
	includeModules?: string[] | RegExp;
	debug?: boolean;
}

interface DevServerConf extends devServerConf {
	wwwHost?: string;
	appHost?: string;
	appPort?: number;
	notifyOnError?: boolean;
	open?: boolean;
	buildSSR?: boolean;
}

interface BaseConfig {
	/**
	 * @default 'res'
	 */
	sourcePath?: string;
	/**
	 * @default 'static/dist/dev'
	 * 'static/dist' in production
	 */
	destPath?: string;
	/**
	 * @default '/static/dist/dev'
	 */
	publicUrl?: string;
	sourceMap?: boolean;
	eslint?: boolean;
	entry?: {
		[app: string]: string;
	},
	/**
	 * Generate dist index.html with correct asset hash for caching.
	 * you can customize output by editing /index.html
	 * @see https://github.com/ampedandwired/html-webpack-plugin
	 * @default index.html
	 */
	entryHtml?: boolean | string;
	appendHash?: boolean;
	library?: boolean;
	minify?: boolean;
	gzip?: boolean;
	quiet?: boolean;
	/**
	 * Generate bundle size stats so we can analyze them
	 * to see which dependecies are the heaviest
	 * @see https://www.npmjs.com/package/webpack-bundle-analyzer
	 */
	analyzeBundle?: boolean | BundleAnalyzerPlugin.Options;
	ssr?: boolean | {
		entry?: string;
		sourceMap?: boolean;
	};
	cwd?: string;
	cssModules?: boolean;
	/**
	 * @see https://github.com/webpack/webpack-dev-server
	 */
	devServer?: Partial<DevServerConf>
	/**
	 * Open dev server url after starting it
	 * Default: true
	 */
	openBrowser?: boolean;
	/**
	 * 'babel-loader' options
	 */
	babel?: BabelConfig;
}

export interface Config extends BaseConfig {
	/**
	 * NOTE: This is only used when called through CLI, it is ignored when called through function
	 */
	webpackConfig: Partial<webpackConfig>;
	$env_development?: Partial<BaseConfig>;
	$env_production?: Partial<BaseConfig>;
}

interface RollupBaseConfig {
	entry?: string;
	dest?: string;
	library?: string;
	libraryFormat?: string;
	minify?: boolean;
	sourceMap?: boolean;
	/**
	 * 'rollup-plugin-babel' options
	 */
	babel?: BabelConfig;
}

export interface RollupConfig extends RollupBaseConfig {
	$env_development?: Partial<RollupBaseConfig>;
	$env_production?: Partial<RollupBaseConfig>;
}

export type webpackConfig = webpackConfiguration;

/**
 * @param options it is {env, config, webpackConfig}
 * env can be developement or production
 * config gets merged into our default config
 * webpackConfig gets merged into final webpack config
 * @returns merged webpack config
 */
export function getWebpackConfig(options?: {env?: string, config?: Config, webpackConfig?: webpackConfig}): webpackConfig;
/**
 * Same as getWebpackConfig but sets environment to production
 */
export function getProdConfig(options?: {config?: Config, webpackConfig?: webpackConfig}): webpackConfig;
/**
 * Same as getWebpackConfig but sets environment to developement
 */
export function getDevConfig(options?: {config?: Config, webpackConfig?: webpackConfig}): webpackConfig;
/**
 * Run webpack with config provided
 */
export function runWebpack(options?: {env?: string, config?: Config, webpackConfig?: webpackConfig}): Promise<void>;
/**
 * Same as runWebpack but sets environment to developement
 */
export function runDevWebpack(options?: {config?: Config, webpackConfig?: webpackConfig}): Promise<void>;
/**
 * Same as runWebpack but sets environment to production
 */
export function runProdWebpack(options?: {config?: Config, webpackConfig?: webpackConfig}): Promise<void>;
/**
 * Starts dev server with hot reloading
 * @see https://github.com/webpack/webpack-dev-server
 */
export function runDevServer(options?: {config?: Config, webpackConfig?: webpackConfig}): Promise<void>;
/**
 * @see https://github.com/webpack/webpack-dev-middleware
 */
export function koaDevServer(options?: {config?: Config, webpackConfig?: webpackConfig}): {middleware: () => (ctx, nxt) => Promise<void>, on: EventEmitter};

/**
 * Run rollup build
 * env is taken from NODE_ENV
 */
export function runRollup(options?: {config?: RollupBaseConfig}): Promise<RollupBuild>;

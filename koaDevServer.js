const EventEmitter = require('events');
const devMiddleware = require('webpack-dev-middleware');
const hotClient = require('webpack-hot-client');

const {getCompiler} = require('./config/devCompiler');

function getClient(compiler) {
	return new Promise((resolve) => {
		const client = hotClient(compiler, {
			allEntries: true,
			logLevel: 'warn',
		});

		const {server} = client;
		server.on('listening', () => resolve(client));
	});
}

function getMiddleware(compiler, devWare) {
	return async (ctx, next) => {
		if (!ctx.webpack) ctx.webpack = {};

		// wait for webpack-dev-middleware to signal that the build is ready
		await Promise.all([
			new Promise((resolve, reject) => {
				for (const comp of [].concat(compiler.compilers || compiler)) {
					comp.hooks.failed.tap('KoaWebpack', (error) => {
						reject(error);
					});
				}

				devWare.waitUntilValid(() => {
					resolve(true);
				});
			}),

			// tell webpack-dev-middleware to handle the request
			new Promise((resolve) => {
				devWare(
					ctx.req,
					{
						end: (content) => {
							// eslint-disable-next-line no-param-reassign
							ctx.body = content;
							resolve();
						},
						setHeader: ctx.set.bind(ctx),
						locals: ctx.webpack,
					},
					() => resolve(next()),
				);
			}),
		]);
	};
}

function getDevMiddleware(compiler, config) {
	const options = {
		publicPath: config.publicUrl,
		index: '',
		logLevel: 'warn',
		stats: false,
		lazy: false,
	};

	return devMiddleware(compiler, options);
}

async function getKoaMiddleware(compiler, config) {
	const client = await getClient(compiler);
	const devWare = getDevMiddleware(compiler, config);
	const koaMiddleware = getMiddleware(compiler, devWare);
	const close = (callback) => {
		const nxt = client ? () => client.close(callback) : callback;
		devWare.close(nxt);
	};

	return Object.assign(koaMiddleware, {
		hotClient: client,
		devMiddleware: devWare,
		close,
	});
}

function middleware(opts, emitter) {
	const options = Object.assign({}, opts);

	const {compiler, config} = getCompiler({
		config: options.config || {},
		webpackConfig: options.webpackConfig || {},
		emitter,
	});

	const koaMiddlewarePromise = getKoaMiddleware(compiler, config);

	let koaMiddleware;
	return async (ctx, next) => {
		if (!koaMiddleware) {
			koaMiddleware = await koaMiddlewarePromise;
		}

		return koaMiddleware(ctx, next);
	};
}

module.exports = (options) => {
	const emitter = new EventEmitter();
	return {
		middleware: () => middleware(options, emitter),
		on: emitter.on.bind(emitter),
	};
};

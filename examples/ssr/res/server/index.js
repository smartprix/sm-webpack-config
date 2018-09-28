const {createBundleRenderer} = require('vue-server-renderer');
const LRUCache = require('lru-cache');
const fs = require('fs');
const Koa = require('koa');

const app = new Koa();

const template = fs.readFileSync('./res/index.html', 'utf-8');
const bundleName = 'vue-ssr-server-bundle.json';
const clientManifestName = 'vue-ssr-client-manifest.json';

function createRenderer(bundle, clientManifest, options = {}) {
	const defaults = {
		clientManifest,
		template,
		cache: LRUCache({
			max: 1000,
			maxAge: 1000 * 60 * 15,
		}),
		runInNewContext: false,
	};

	return createBundleRenderer(bundle, Object.assign(defaults, options));
}

let renderToString;
if (cfg.isProduction()) {
	const staticDir = './static/dist';
	const bundle = JSON.parse(fs.readFileSync(`${staticDir}/${bundleName}`));
	const clientManifest = JSON.parse(fs.readFileSync(`${staticDir}/${clientManifestName}`));
	const renderer = createRenderer(bundle, clientManifest);
	renderToString = renderer.renderToString;
}
else {
	// eslint-disable-next-line global-require
	const installDevServer = require('./devServer');
	renderToString = installDevServer(app, createRenderer);
}

async function middleware(ctx) {
	const meta = {
		title: 'Webpack',
		description: 'Webpack Rocks!',
	};

	const ssrContext = {
		url: ctx.url,
		meta,
	};

	ctx.body = await renderToString(ssrContext);
}

app.use(middleware);

app.listen(3001, () => {
	const address = server.address();
	const url = `http://${address.address}:${address.port}`;
	console.log(`Server listening on ${url}`);
});

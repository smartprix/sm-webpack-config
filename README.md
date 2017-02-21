# Webpack Configuration
Webpack configuration with following features:
* Hot Reloading in Development
* Production Optimized Build
* JSX and Vue
* Babel
* Eslint
* Sane Project Structure


## How To Use

Install this package
```bash
npm install sm-webpack-config --save-dev
```

## How to Use
```js
const smWebpack = require('sm-webpack-config');

// Set Configuration [Optional]
const config = {
	sourcePath: 'res',
	destPath: 'static/dist',
	publicUrl: '/static/dist',
	sourceMap: true,
	devServerPort: 3001,
	appPort: 3000,
};

// Run Developement Server With Hot Reloading
smWebpack.runDevServer({config});

// Build For Production
smWebpack.runProdWebpack({config});

// If you want to go advanced and override some webpack configuration
const webpackConfig = {
	plugins: [
		new webpack.optimize.UglifyJsPlugin({
			compress: {
				warnings: true
			}
		}),
	],
};

// Run Developement Server With Hot Reloading
smWebpack.runDevServer({config, webpackConfig});

// Build For Production
smWebpack.runProdWebpack({config, webpackConfig});

// NOTE: Both config & webpackConfig are optional
```

## Using with Gulp
You can also use it in gulp using the following gulpfile
```js
const smWebpack = require('sm-webpack-config');
const gulp = require('gulp');

// The development server (the recommended option for development)
gulp.task('default', function(callback) {
	smWebpack.runDevServer().then(callback);
});

// Build files for production
gulp.task('build', function(callback) {
	smWebpack.runProdWebpack().then(callback);
});
```

Now you can use `gulp` to run dev-server and `gulp build` to build for production.


## Default Project Structure
* Keep all your client side code in `res`
  * all javascript in `js`
    * vue components in `components`
	* 3rd party scripts in `vendor` (though they should generally be installed from npm)
  * css / scss in `css`
  * images in `img`
  * other assests in `assests`
    * eg. fonts can be kept in `assests/fonts`
  * `index.html` as entry point (no need to include js/css, they will automatically be injected by webpack).

* all the compiled code will be put in `static/dist`
* point your static server to `static` directory
* use public path as `/static`
* api endpoints should start with `/api`
* Keep your server running at port `3000`
* Dev server will run at port `3001`

## Webpack Aliases
The following aliases are defined
```js
// by default config.sourcePath points to `res`, you can override it in your config
{
	'res': config.sourcePath,
	'js': path.join(config.sourcePath, 'js'),
	'assets': path.join(config.sourcePath, 'assets'),
	'components': path.join(config.sourcePath, 'js', 'components'),
	'css': path.join(config.sourcePath, 'css'),
	'img': path.join(config.sourcePath, 'img'),
}
```

So you can write `import Hello from 'components/Hello.vue'` from anywhere
If you want to use images in your vue templates use them as `~img/logo.png` (append a ~)
See https://github.com/vuejs/vue-loader/issues/193

## Configuration Options
```js
const config = {
	// folder containing source files
	sourcePath: 'res',

	// where to put the compiled files
	destPath: 'static/dist',

	// at what url are these files accessible
	// eg. if using a CDN, you can give http://static.smartprix.com/dist
	publicUrl: '/static/dist',

	// whether to generate source maps or not
	sourceMap: true,

	// what port to run the dev-server (with hot reloading)
	devServerPort: 3001,

	// what port the app server is running
	appPort: 3000,

	// whether to enable eslint or not
	eslint: true,

	// the paths to proxy on the dev-server
	// only valid while running dev server, otherwise ignored
	proxy: {
		'/api': 'http://localhost:3000',
		'/static': 'http://localhost:3000',
		'/uploads': 'http://localhost:3000',
	},

	// entry points for webpack (relative to sourcePath)
	entry: {
		app: 'js/index.js',
	},

	// whether to open the browser automatically
	// only valid while running dev server, otherwise ignored
	openBrowser: true,

	// html entry file, generated files will be auto-injected into this
	entryHtml: 'index.html',

	// whether the exported file should be a library
	library: false,

	// whether to uglify the output or not
	// false in developement, true in production
	uglify: false,

	// whether to not display much info while running dev server
	quiet: true,
};
```

# Rollup
sm-webpack-config also includes rollup. You can use it as:
```js
const smWebpack = require('sm-webpack-config');

const config = {
	entry: 'src/index.js',
	dest: 'dest/index.js',
	library: 'vutils',
	libraryFormat: 'es',
	uglify: false,
	sourceMap: false,
};

smWebpack.runRollup({config}).then(() => {
	console.log("Done!");
});
```

#### Configuration Options
```js
const config = {
	// entry point of the script (source)
	entry: 'src/index.js',

	// where to put compiled file
	dest: 'dist/index.js',

	// library name to give to the module
	library: 'lib',

	// what format should the compiled file be in
	// this can be umd, amd, cjs (node like format), es (import / export), iife (for using in <script>)
	libraryFormat: 'umd',

	// whether to uglify the output
	uglify: false,

	// whether to generate a sourcemap or not
	sourceMap: false,
};
```

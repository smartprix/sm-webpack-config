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
npm install sm-webpack-config --save
```

Set Configuration [Optional]
```js
const smWebpack = require('sm-webpack-config');

const config = {
	sourcePath: 'res',
	destPath: 'static/dist',
	publicUrl: '/static/dist',
	sourceMap: true,
	devServerPort: 3001,
	appPort: 3000,
};

// Set Development and Production Configuration
smWebpack.setDevConfig(config);
smWebpack.setProdConfig(config);
```

Run Webpack
```js
// Run Developement Server With Hot Reloading
smWebpack.runDevServer();

// Build For Production
smWebpack.runProdWebpack();
```

You can also use it in gulp using the following gulpfile
```js
const smWebpack = require('sm-webpack-config');
const gulp = require('gulp');

// The development server (the recommended option for development)
gulp.task('default', function(callback) {
	smWebpack.runDevServer(callback);
});

// Build files for production
gulp.task('build', function(callback) {
	smWebpack.runProdWebpack(callback);
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
  * `index.html` as entry point (no need to include js/css, they will automatically be injected by webpack).

* all the compiled code will be put in `static/dist`
* point your static server to `static` directory
* use public path as `/static`
* api endpoints should start with `/api`
* Keep your server running at port `3000`
* Dev server will run at port `3001`

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
	proxy: {
		'/api': 'http://localhost:3000',
		'/static': 'http://localhost:3000',
	},

	// entry points for webpack (relative to sourcePath)
	entry: {
		app: 'js/index.js',
	},
};
```

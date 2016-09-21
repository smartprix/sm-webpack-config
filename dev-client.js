/* eslint-disable */
import 'eventsource-polyfill';
import hotClient from 'webpack-hot-middleware/client?path=/__webpack_hmr&noInfo=true&reload=true';

hotClient.subscribe(function(event) {
	if (event.action === 'reload') {
		window.location.reload();
	}
});

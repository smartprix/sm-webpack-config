const address = require('address');
const chalk = require('chalk');

function isPrivateIp(ip) {
	// Check if the address is a private ip
	// https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
	return /^10[.]|^172[.](1[6-9]|2[0-9]|3[0-1])[.]|^192[.]168[.]/.test(ip);
}

function getDevServerUrls(config) {
	const devServer = config.devServer || {};
	const host = devServer.host;
	const port = devServer.port;
	const protocol = devServer.https ? 'https' : 'http';

	const localIp = 'localhost';
	const localUrl = chalk.cyan(`${protocol}://${localIp}:${chalk.bold(port)}`);

	let networkUrl;
	try {
		const networkIp = address.ip();
		if (networkIp) {
			// Check if the address is a private ip
			// https://en.wikipedia.org/wiki/Private_network#Private_IPv4_address_spaces
			if (isPrivateIp(networkIp)) {
				// Address is private, format it for later use
				networkUrl = chalk.cyan(`${protocol}://${networkIp}:${chalk.bold(port)}`);
			}
		}
	}
	catch (e) {
		// Ignore
		console.error(e);
	}

	if (!networkUrl || ['localhost', '127.0.0.1'].includes(host)) {
		networkUrl = chalk.gray('unavailable');
	}

	return {
		local: localUrl,
		network: networkUrl,
	};
}

module.exports = getDevServerUrls;

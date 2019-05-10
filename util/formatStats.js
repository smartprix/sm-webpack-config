/* eslint-disable */
/**
 * @see https://github.com/vuejs/vue-cli/blob/dev/packages/%40vue/cli-service/lib/commands/build/formatStats.js
 */
module.exports = function formatStats (stats, dir) {
	const fs = require('fs')
	const path = require('path')
	const zlib = require('zlib')
	const chalk = require('chalk')
	const ui = require('cliui')({ width: 80 })

	const json = stats.toJson({
	  hash: false,
	  modules: false,
	  chunks: false
	})

	let assets = json.assets
	  ? json.assets
	  : json.children.reduce((acc, child) => acc.concat(child.assets), [])

	const seenNames = new Map()
	const isJS = val => /\.js$/.test(val)
	const isCSS = val => /\.css$/.test(val)
	const isMinJS = val => /\.min\.js$/.test(val)
	assets = assets
	  .filter(a => {
		if (seenNames.has(a.name)) {
		  return false
		}
		seenNames.set(a.name, true)
		return isJS(a.name) || isCSS(a.name)
	  })
	  .sort((a, b) => {
		if (isJS(a.name) && isCSS(b.name)) return -1
		if (isCSS(a.name) && isJS(b.name)) return 1
		if (isMinJS(a.name) && !isMinJS(b.name)) return -1
		if (!isMinJS(a.name) && isMinJS(b.name)) return 1
		return b.size - a.size
	  })

	function formatSize (size) {
	  if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB'
	  return (size / 1024).toFixed(2) + ' KB'
	}

	function getGzippedSize (asset) {
	  const filepath = path.join(dir, asset.name)
	  const buffer = fs.readFileSync(filepath)
	  return zlib.gzipSync(buffer).length;
	}

	function makeRow (a, b, c, bold) {
	  return `  ${a}\t    ${b}\t ${c}`;
	}

	function getRow(ast) {
		const maxSize = 50 * 1024;
		let row = [];
		if (/js$/.test(ast.name)) {
			row.push(chalk.green(ast.name));
		}
		else {
			row.push(chalk.blue(ast.name));
		}

		row.push(formatSize(ast.size));
		const gzipSize = getGzippedSize(ast);
		row.push(formatSize(gzipSize));

		if (gzipSize >= maxSize) {
			row[0] = chalk.bold(row[0]);
			row[1] = chalk.yellow(chalk.bold(row[1]));
			row[2] = chalk.yellow(chalk.bold(row[2]));
		}

		return makeRow(...row);
	}

	ui.div(
	  makeRow(
		chalk.cyan.bold(`File`),
		chalk.cyan.bold(`Size`),
		chalk.cyan.bold(`Gzipped`)
	  ) + `\n\n` +
	  assets.map(getRow).join(`\n`)
	)

	return `${ui.toString()}\n\n  ${chalk.gray(`Images and other types of assets omitted.`)}\n`
  }

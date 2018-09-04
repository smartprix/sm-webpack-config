const chalk = require('chalk');
const webpack = require('webpack');

function SimpleProgressPlugin() {
	process.stdout.write(chalk.yellow(chalk.bold('Webpack: Starting ...')));
	const startTime = Date.now();

	let nextStep = 1;
	let shown = new Set();

	return new webpack.ProgressPlugin((progress) => {
		const rounded = Math.ceil(progress * 100);
		const showRegular = () => {
			if (rounded % 5 === 0 && !shown.has(rounded)) {
				shown.add(rounded);
				process.stdout.write(`  ${chalk.gray(`${rounded}%`)}`);
			}
		};

		// STEP 1: COMPILATION
		if (progress >= 0 && progress < 0.1) {
			if (nextStep === 1) {
				process.stdout.write(chalk.blue.bold('\n  ▶ Compile modules '));
				nextStep = 2;
			}
			else {
				showRegular();
			}
		}

		// STEP 2: BUILDING
		if (progress >= 0.1 && progress < 0.7) {
			if (nextStep === 2) {
				process.stdout.write(chalk.blue.bold('\n  ▶ Build modules   '));
				nextStep = 3;
			}
			else {
				showRegular();
			}
		}

		// STEP 3: OPTIMIZATION
		if (progress >= 0.7 && progress < 0.95) {
			if (nextStep === 3) {
				process.stdout.write(chalk.blue.bold('\n  ▶ Optimize modules'));
				nextStep = 4;
			}
			else {
				showRegular();
			}
		}

		// STEP 4: EMIT
		if (progress >= 0.95 && progress < 1) {
			if (nextStep === 4) {
				process.stdout.write(chalk.blue.bold('\n  ▶ Emit files      '));
				nextStep = 5;
			}
			else {
				showRegular();
			}
		}

		// STEP 5: FOOTER
		if (progress >= 1) {
			if (nextStep === 5) {
				const timeTaken = ((Date.now() - startTime) / 1000).toFixed(2);
				process.stdout.write(chalk.green(chalk.bold(`▶ Webpack: Finished after ${timeTaken} seconds.\n\n`)));
			}

			nextStep = 1;
			shown = new Set();
		}
	});
}

module.exports = SimpleProgressPlugin;

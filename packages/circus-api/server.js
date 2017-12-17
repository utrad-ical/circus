// This imports babel-register, which makes all subsequent 'require's
// parsed by babel using the settings specified by ".babelrc".
require('babel-register');

// Similarly, this enalbes direct import of TypeScript files.
// We register ts-node, which enables requiring *.ts files directly from Node.js.
// Consider removing this after the stable release of Babel 7.x,
// which includes "typescript" preset.
const compilerOptions = {
	module: 'CommonJS',
	target: 'es2017',
	strictNullChecks: true,
};

require('ts-node').register({
	compilerOptions,
	disableWarnings: true,
	ignore: false
});

// Run the main script
require('./src/main');
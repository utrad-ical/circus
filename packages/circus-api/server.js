// This imports babel-register, which makes all subsequent 'require's
// parsed by babel using the settings specified by ".babelrc".
require('babel-register');

// Run the main script
require('./src/main');
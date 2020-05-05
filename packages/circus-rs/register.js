// This imports babel-register, which makes all subsequent 'require's
// parsed by babel using the settings specified by "babel.config.js".

const path = require('path');

require('@babel/register')({
  rootMode: 'upward',
  extensions: ['.js', '.jsx', '.ts']
});

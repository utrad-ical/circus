// This imports babel-register, which makes all subsequent 'require's
// parsed by babel using the settings specified by "babel.config.js".

const path = require('path');

require('@babel/register')({
  rootMode: 'upward',
  ignore: [
    filePath => {
      // We will transpile TypeScript files
      // in circus-rs and circus-cs-core modules
      const rel = path.relative(__dirname, filePath).replace(/\\/g, '/');
      if (/^node_modules\/@utrad-ical\/circus-lib\/src/.test(rel)) {
        return false;
      }
      if (/node_modules/.test(rel)) return true;
      return false;
    }
  ],
  extensions: ['.js', '.jsx', '.ts']
});

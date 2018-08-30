// This imports babel-register, which makes all subsequent 'require's
// parsed by babel using the settings specified by "babel.config.js".

const path = require('path');

require('@babel/register')({
  ignore: [
    filePath => {
      const rel = path.relative(__dirname, filePath).replace(/\\/g, '/');
      if (
        /^node_modules\/@utrad-ical\/(circus-rs|circus-cs-core)\/src/.test(rel)
      ) {
        return false;
      }
      if (/^node_modules/.test(rel)) return true;
      return false;
    }
  ],
  extensions: ['.js', '.jsx', '.ts']
});

/**
 * CIRCUS CS Core
 */
var tsOptions = require('./tsconfig').compilerOptions;
require('ts-node').register({
  compilerOptions: tsOptions,
  disableWarnings: true
});
module.exports = require('./src/index');

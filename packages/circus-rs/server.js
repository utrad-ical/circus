/**
 * CIRCUS RS
 */

// We register ts-node, which enables requiring *.ts
// files directly from Node.js
var tsOptions = require('./tsconfig').compilerOptions;
require('ts-node').register({
  compilerOptions: tsOptions,
  disableWarnings: true
});

require('./src/server/main');

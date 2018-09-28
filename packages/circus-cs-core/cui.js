#!/usr/bin/env node

var tsOptions = require('./tsconfig').compilerOptions;
require('ts-node').register({
  compilerOptions: tsOptions,
  disableWarnings: true
});

require('./src/cui/');
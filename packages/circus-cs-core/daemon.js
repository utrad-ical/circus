var tsOptions = require('./tsconfig').compilerOptions;
require('ts-node').register({
  compilerOptions: tsOptions,
  ignoreDiagnostics : true,
  ignore: /\/node_modules\/(?!@utrad-ical\/circus-cs-core)/
});

require('./src/daemon');

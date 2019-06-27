#!/usr/bin/env node

require('@babel/register')({
  extensions: ['.es6', '.es', '.jsx', '.js', '.mjs', '.ts']
});
require('./src/daemon');

// Transpiles TypeScript sources with Babel while running tests with node:test.
// Temporary: this goes away once the packages are migrated to ESM
// and run directly by Node.js.
require('@babel/register')({
  rootMode: 'upward',
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  ignore: [/node_modules/]
});

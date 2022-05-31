const createBaseOptions = require('./webpack.config');

module.exports = (env, argv) => {
  const config = createBaseOptions(env, argv);
  delete config.cache;
  config.entry = {
    ...config.entry,
    'ws/config': './src/demo/ws/config.ts',
    'ws/index': './src/demo/ws/index.ts',
    'ws/volume-loader': './src/demo/ws/volume-loader.ts',
  };

  return config;
};
const createBaseOptions = require('../webpack.config');

module.exports = (env, argv) => {
  const config = createBaseOptions(env, argv);
  delete config.cache;
  config.entry = {
    ...config.entry,
    'ws/config': './demo/ws/config.ts',
    'ws/index': './demo/ws/index.ts',
    'ws/volume-loader': './demo/ws/volume-loader.ts',
  };

  return config;
};
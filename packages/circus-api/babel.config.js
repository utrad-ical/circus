module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '8' } }],
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread',
    '@babel/plugin-syntax-dynamic-import',
    'babel-plugin-dynamic-import-node'
  ],
  sourceMaps: 'inline'
};

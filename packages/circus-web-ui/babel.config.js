module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { chrome: '58' } }],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  sourceMaps: 'inline'
};

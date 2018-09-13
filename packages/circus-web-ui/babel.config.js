module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { chrome: '58' } }],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-proposal-class-properties',
    '@babel/plugin-proposal-object-rest-spread'
  ],
  sourceMaps: 'inline'
};

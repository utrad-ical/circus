const ReactCompilerConfig = {
  target: '17' // '17' | '18' | '19'
};

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: '10' } }],
    '@babel/preset-typescript'
  ],
  sourceMaps: true,
  plugins: [['babel-plugin-react-compiler', ReactCompilerConfig]]
};

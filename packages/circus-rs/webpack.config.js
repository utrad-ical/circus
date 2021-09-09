const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => ({
  entry: {
    'circus-rs-client': './src/browser/index.ts'
  },
  output: {
    path: path.join(__dirname, 'dist'),
    library: 'circusrs',
    libraryTarget: 'umd',
    filename: '[name].js'
  },
  resolve: {
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.ts']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'babel-loader',
        options: { rootMode: 'upward' }
      },
      { test: /\.less$/, use: ['style-loader', 'css-loader', 'less-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
      { test: /\.woff$/, type: 'asset/inline' },
      { test: /\.frag|\.vert$/, use: ['webpack-glsl-loader'] }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(
        argv.mode === 'production' ? 'production' : 'development'
      )
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'demo'),
    disableHostCheck: true,
    injectClient: false
  },
  ...(argv.mode !== 'production' ? { devtool: 'source-map' } : {}),
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  }
});

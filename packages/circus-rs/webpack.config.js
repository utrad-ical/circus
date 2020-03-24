const webpack = require('webpack');
const path = require('path');

module.exports = {
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
        use: ['ts-loader']
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.woff$/,
        use: ['url-loader']
      },
      {
        test: /\.frag|\.vert$/,
        use: ['webpack-glsl-loader']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'demo'),
    disableHostCheck: true
  },
  devtool: '#sourcemap'
};

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins.push(
    new webpack.optimize.UglifyJsPlugin({ minimize: true })
  );
  delete module.exports.devtool;
}

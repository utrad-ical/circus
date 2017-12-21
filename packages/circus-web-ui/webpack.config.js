const webpack = require('webpack');
const path = require('path');

module.exports = {
  entry: {
    application: './src/index.js'
  },
  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].js'
  },
  resolve: {
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    alias: {
      rb: '@smikitky/rb-components/lib',
      'circus-rs': path.resolve(
        __dirname,
        'node_modules/@utrad-ical/circus-rs/src/browser'
      )
    },
    extensions: ['.js', '.jsx', '.ts']
  },
  module: {
    rules: [
      {
        test: t =>
          /\.jsx?/.test(t) &&
          (/rb-components/.test(t) || !/node_modules/.test(t)),
        use: ['babel-loader']
      },
      {
        test: /\.ts$/,
        use: ['ts-loader']
      },
      {
        test: /\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
        use: [
          {
            loader: 'url-loader',
            options: { limit: 1000000 }
          }
        ]
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.css/,
        use: ['style-laoder', 'css-loader']
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ],
  devServer: {
    contentBase: path.join(__dirname, 'public'),
    historyApiFallback: true
  },
  devtool: '#sourcemap'
};

if (process.env.NODE_ENV === 'production') {
  module.exports.plugins.push(
    new webpack.optimize.UglifyJsPlugin({ minimize: true })
  );
  delete module.exports.devtool;
}

const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: process.env.NODE_ENV === 'productoin' ? 'productoin' : 'development',
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
          /\.(jsx?|tsx?)/.test(t) &&
          (/(circus-rs|rb-components)/.test(t) || !/node_modules/.test(t)),
        use: ['babel-loader']
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
      },
      {
        test: /\.(frag|vert)$/,
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
    port: process.env.CIRCUS_PORT || 8081,
    contentBase: path.join(__dirname, 'public'),
    historyApiFallback: { disableDotRule: true },
    proxy: {
      '/api': 'http://localhost:8080',
      '/login': 'http://localhost:8080',
      '/rs': 'http://localhost:8080'
    }
  },
  devtool: 'source-map'
};

const webpack = require('webpack');
const path = require('path');

const nodeEnv =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';

const rsPath = path.dirname(
  require.resolve('@utrad-ical/circus-rs/package.json')
);

module.exports = {
  mode: nodeEnv,
  entry: {
    application: './src/index.tsx'
  },
  output: {
    path: path.join(__dirname, 'public'),
    filename: '[name].js'
  },
  resolve: {
    modules: [path.join(__dirname, 'src'), 'node_modules'],
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    fallback: {
      querystring: require.resolve('querystring-es3')
    }
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
        type: 'asset/inline'
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
      },
      {
        test: /\.m?js/,
        resolve: {
          // fullySpecified: false
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(nodeEnv)
    }),
    new webpack.container.ModuleFederationPlugin({
      shared: [
        { react: { singleton: true, eager: true, requiredVersion: '^17.0.2' } },
        {
          'react-dom': {
            singleton: true,
            eager: true,
            requiredVersion: '^17.0.2'
          }
        },
        { '@utrad-ical/circus-ui-kit': { singleton: true, eager: true } }
      ]
    })
  ],
  devServer: {
    port: process.env.CIRCUS_PORT || 8081,
    static: { directory: path.join(__dirname, 'public') },
    historyApiFallback: { disableDotRule: true },
    proxy: [
      {
        context: ['/api', '/login', '/rs'],
        target: process.env.DEV_PROXY || 'http://localhost:8080'
      },
      {
        context: ['/rs/ws'],
        target: process.env.DEV_PROXY || 'http://localhost:8080',
        ws: true,
        changeOrigin: true
      }
    ]
  },
  devtool: 'source-map',
  cache: {
    type: 'filesystem',
    buildDependencies: { config: [__filename] }
  }
};

const HtmlWebpackPlugin = require('html-webpack-plugin');
const ModuleFederationPlugin =
  require('webpack').container.ModuleFederationPlugin;
const fs = require('fs');
const path = require('path');
const deps = require('./package.json').dependencies;

const dataDir = path.join(__dirname, 'data');

module.exports = {
  entry: './src/index',
  mode: 'production',
  devServer: {
    static: [
      { directory: path.join(__dirname, 'dist') },
      // Plug-in output files for the local preview (see `src/App.tsx`)
      { directory: dataDir, publicPath: '/data' }
    ],
    port: 3002,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers':
        'Origin, X-Requested-With, Content-Type, Accept',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
    },
    // Returns the file list of a directory under `data/` as JSON,
    // which emulates `loadAttachment.list()`
    setupMiddlewares: (middlewares, devServer) => {
      devServer.app.get('/data-list{/*dir}', (req, res) => {
        const dir = path.join(dataDir, ...(req.params.dir ?? []));
        // Reject paths outside `data/` (a string prefix check is not enough,
        // e.g., a sibling directory named `database`)
        const relative = path.relative(dataDir, dir);
        if (relative.startsWith('..') || path.isAbsolute(relative)) {
          return res.status(400).end();
        }
        fs.readdir(dir, (err, files) =>
          err ? res.status(404).end() : res.json(files)
        );
      });
      return middlewares;
    }
  },

  output: {
    publicPath: 'http://localhost:3002/',
    clean: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        loader: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'CircusCsModule',
      library: {
        name: 'CircusCsModule', // library name must be "CircusCsModule"
        type: 'window'
      },
      filename: 'remoteEntry.js',
      exposes: {
        './SampleViewer': './src/components/SampleViewer'
      },
      // Only the modules provided by CIRCUS are shared
      shared: {
        react: { singleton: true, eager: true, requiredVersion: deps['react'] },
        'react-dom': {
          singleton: true,
          requiredVersion: deps['react-dom']
        },
        'styled-components': {
          singleton: true
        },
        '@utrad-ical/circus-ui-kit': {
          // Required to receive CAD results
          singleton: true
        }
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html'
    })
  ],
  performance: { hints: false }
};

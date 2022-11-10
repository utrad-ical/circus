const HtmlWebpackPlugin = require("html-webpack-plugin");
const ModuleFederationPlugin =
  require("webpack").container.ModuleFederationPlugin;
const path = require("path");
const deps = require("./package.json").dependencies;

module.exports = {
  entry: "./src/index",
  mode: "production",
  devServer: {
    static: {
      directory: path.join(__dirname, "dist"),
    },
    port: 3002,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Origin, X-Requested-With, Content-Type, Accept",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    },
  },

  output: {
    publicPath: "http://localhost:3002/",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|tsx|ts)$/,
        loader: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "CircusCsModule",
      library: {
        name: "CircusCsModule", //library name must be "CircusCsModule"
        type: "window",
      },
      filename: "remoteEntry.js",
      exposes: {
        "./SampleViewer": "./src/components/SampleViewer",
      },
      shared: {
        ...deps,
        react: { singleton: true, eager: true, requiredVersion: deps["react"] },
        "react-dom": {
          singleton: true,
          requiredVersion: deps["react-dom"],
        },
        "styled-components": {
          singleton: true,
        },
        "@utrad-ical/circus-ui-kit": {
          // Required to receive CAD results
          singleton: true,
        },
      },
    }),
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],
  performance: { hints: false },
};

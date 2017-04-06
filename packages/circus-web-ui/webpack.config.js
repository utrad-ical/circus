var webpack = require("webpack");
var path = require('path');

module.exports = {
	entry: {
		application: './app/front-ui/index.jsx'
	},
	output: {
		path: path.join(__dirname, 'public'),
		filename: '[name].js'
	},
	resolve: {
		root: path.join(__dirname, 'app/front-ui'),
		alias: {
			'circus-rs': path.resolve(__dirname, 'vendor/utrad-ical/circus-rs/lib/browser'),
			'circus-rs-font.woff': path.resolve(__dirname, 'vendor/utrad-ical/circus-rs/dist/css/circus-rs-font.woff')
		},
		extensions: ['', '.js', '.jsx']
	},
	module: {
		loaders: [
			{
				test: /\.jsx?$/,
				exclude: /node_modules/,
				loader: 'babel',
				query: {
					presets: ['es2015', 'react'],
					plugins: [
						'transform-object-rest-spread',
						'transform-regenerator',
						'transform-async-functions'
					]
				}
			},
			{
				test: /circus-rs-font\.woff$/,
				loader: 'url',
				qyery: {
					limit: 65000,
					mimetype: 'application/font-woff',
					name: 'circus-rs-font.woff'
				},

			},
			{
				test: /regular\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'file',
				query: {
					name: '[name].[ext]'
				}
			},
			{
				test: /\.less$/,
				loader: 'style!css!less'
			},
			{
				test: /\.css/,
				loader: 'style!css'
			}
		]
	},
	plugins: [
		new webpack.DefinePlugin({
		  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
		})
	],
	devtool: '#sourcemap'
};

if (process.env.NODE_ENV === 'production') {
	module.exports.plugins.push(
		new webpack.optimize.UglifyJsPlugin({minimize: true})
	);
	delete module.exports.devtool;
}

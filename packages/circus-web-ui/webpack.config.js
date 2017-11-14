const webpack = require('webpack');
const path = require('path');

module.exports = {
	entry: {
		application: './app/front-ui/index.js'
	},
	output: {
		path: path.join(__dirname, 'public'),
		filename: '[name].js'
	},
	resolve: {
		modules: [
			path.join(__dirname, 'app/front-ui'),
			'node_modules'
		],
		alias: {
			'rb': '@smikitky/rb-components/lib',
			'circus-rs': path.resolve(__dirname, 'vendor/utrad-ical/circus-rs/lib/browser'),
			'circus-rs-font.woff': path.resolve(__dirname, 'vendor/utrad-ical/circus-rs/dist/css/circus-rs-font.woff')
		},
		extensions: ['.js', '.jsx']
	},
	module: {
		rules: [
			{
				test: t => (/\.jsx?/.test(t) && (/rb-components/.test(t) || !/node_modules/.test(t))),
				use: [{
					loader: 'babel-loader',
					options: {
						presets: ['es2015', 'react'],
						plugins: [
							'transform-object-rest-spread',
							'transform-regenerator',
							'transform-async-functions'
						]
					}
				}]
			},
			{
				test: /circus-rs-font\.woff$/,
				use: [{
					loader: 'url-loader',
					options: {
						limit: 65000,
						mimetype: 'application/font-woff',
						name: 'circus-rs-font.woff'
					}
				}]
			},
			{
				test: /regular\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				use: [{
					loader: 'file-loader',
					options: {
						name: '[name].[ext]'
					}
				}]
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
	devtool: '#sourcemap'
};

if (process.env.NODE_ENV === 'production') {
	module.exports.plugins.push(
		new webpack.optimize.UglifyJsPlugin({minimize: true})
	);
	delete module.exports.devtool;
}

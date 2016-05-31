var webpack = require("webpack");

module.exports = {
	entry: {
		index: './app/front-ui/index.js',
		'js-app/browse': './app/front-ui/browse.jsx'
	},
	output: {
		path: __dirname + '/public',
		filename: '[name].js'
	},
	resolve: ['', '.js', '.jsx'],
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
				test: /\.(woff|woff2|ttf|eot|svg)(\?v=\d+\.\d+\.\d+)?$/,
				loader: 'file',
				query: {
					name: '[name].[ext]'
				}
			},
			{
				test: /\.less$/,
				loader: 'less'
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

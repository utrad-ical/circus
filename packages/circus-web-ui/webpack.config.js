var webpack = require("webpack");

module.exports = {
	entry: './app/front-ui/index.js',
	output: {
		path: __dirname + '/public',
		filename: 'index.js'
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
					plugins: ['transform-object-rest-spread']
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
			},
			{
				test: /fonts\.js/,
				loader: 'style!css!fontgen?fileName=[fontname][ext]'
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

'use strict';

var gulp = require('gulp');
var iconfont = require('gulp-iconfont');
var less = require('gulp-less');

gulp.task('iconfont', function() {
	return gulp.src(['app/assets/icons/*.svg'])
		.pipe(iconfont({
			fontName: 'circus-db-font',
			appendUnicode: true,
			formats: ['woff'],
			startUnicode: 0xE600,
			fontHeight: 512,
			timestamp: Math.round(Date.now() / 1000) // required for consistent build
		}))
		.on('glyphs', function (glyphs, options) {
			console.log(glyphs);
		})
		.pipe(gulp.dest('public/css/fonts'));
});

/*
 * Compile all LESS files and compress them
 */
gulp.task('less', function() {
	return gulp.src('./app/assets/less/style.less')
		.pipe(less({ compress: true }))
		.pipe(gulp.dest('public/css/'));
});

gulp.task('watch', function() {
	return gulp.watch('./app/assets/less/*', ['less']);
});

gulp.task('default', ['iconfont', 'less']);

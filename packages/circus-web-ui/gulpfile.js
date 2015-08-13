var gulp = require('gulp');
var iconfont = require('gulp-iconfont');

gulp.task('iconfont', function () {
	return gulp.src(['app/assets/icons/*.svg'])
		.pipe(iconfont({
			fontName: 'circus-db-font',
			appendUnicode: true,
			formats: ['woff'],
			startUnicode: 0xE600,
			fontHeight: 80,
			timestamp: Math.round(Date.now() / 1000) // required for consistent build
		}))
		.on('glyphs', function (glyphs, options) {
			console.log(glyphs);
		})
		.pipe(gulp.dest('public/css/fonts'));
});

gulp.task('default', ['iconfont']);
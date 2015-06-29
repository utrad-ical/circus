var gulp = require('gulp');
var typescript = require('gulp-typescript');
var concat = require('gulp-concat');

gulp.task('default', ['typescript', 'build-browser']);

gulp.task('typescript', function() {
	gulp.src('src/**/*.ts')
		.pipe(typescript({
			module: 'commonjs',
			target: 'es5'
		}))
		.pipe(gulp.dest('build'));
});

gulp.task('build-browser', function() {
	gulp.src('src/browser/*.{js,css}')
		.pipe(gulp.dest('build/browser'));
});

gulp.task('watch', ['typescript'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
});
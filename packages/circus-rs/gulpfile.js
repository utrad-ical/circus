var gulp = require('gulp');
var typescript = require('gulp-typescript');
var less = require('gulp-less');
var concat = require('gulp-concat');

gulp.task('default', ['typescript', 'less', 'build-browser']);

gulp.task('typescript', function() {
	gulp.src('src/**/*.ts')
		.pipe(typescript({
			module: 'commonjs',
			target: 'es5'
		}))
		.pipe(gulp.dest('build'));
});

gulp.task('less', function() {
	gulp.src('src/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('build'));
});

gulp.task('build-browser', ['less'], function() {
	gulp.src('src/browser/*.js')
		.pipe(gulp.dest('build/browser'));
});

gulp.task('watch', ['typescript', 'less'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch('src/**/*.less', ['less']);
});
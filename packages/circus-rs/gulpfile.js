var gulp = require('gulp');
var typescript = require('gulp-typescript');
var concat = require('gulp-concat');

gulp.task('default', ['typescript']);

gulp.task('typescript', function() {
	gulp.src('src/**/*.ts')
		.pipe(typescript({
			module: 'commonjs',
			target: 'es5'
		}))
		.pipe(gulp.dest('build'));
});

gulp.task('watch', ['typescript'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
});
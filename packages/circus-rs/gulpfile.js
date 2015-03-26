var gulp = require('gulp');
var typescript = require('gulp-typescript');
var concat = require('gulp-concat');

gulp.task('default', ['typescript']);

gulp.task('typescript', function() {
	gulp.src('src/*.ts')
		.pipe(typescript({
			sortOutput: true
		}))
		.pipe(concat('circus-rs.js'))
		.pipe(gulp.dest('.'));
});
var gulp = require('gulp');
var typescript = require('gulp-typescript');
var less = require('gulp-less');
var concat = require('gulp-concat');
var rimraf = require('rimraf');

gulp.task('default', ['typescript', 'less', 'build-browser']);

gulp.task('typescript', function() {
	var project = typescript.createProject('src/tsconfig.json');
	return gulp.src('src/**/*.ts')
		.pipe(typescript(project))
		.pipe(gulp.dest('build'));
});

gulp.task('less', function() {
	return gulp.src('src/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('build'));
});

gulp.task('build-browser', ['less'], function() {
	return gulp.src('src/browser/*.{js,png,gif}')
		.pipe(gulp.dest('build/browser'));
});

gulp.task('clean', function(done) {
	rimraf('./build/*', done);
});

gulp.task('watch', ['typescript', 'less'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch('src/**/*.less', ['less']);
});

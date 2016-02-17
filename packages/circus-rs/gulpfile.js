var gulp = require('gulp');
var typescript = require('gulp-typescript');
var less = require('gulp-less');
var iconfont = require('gulp-iconfont');
var concat = require('gulp-concat');
var rimraf = require('rimraf');

// var markdown = require('gulp-markdown');
var jade = require('gulp-jade');
var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
// var runSequence = require('run-sequence');
var tslint = require('gulp-tslint');


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

gulp.task('build-browser', ['less', 'iconfont'], function() {
	return gulp.src('src/browser/*.{js,png,gif}')
		.pipe(gulp.dest('build/browser'));
});

gulp.task('iconfont', function() {
	return gulp.src('src/browser/assets/icons/*.svg')
		.pipe(iconfont({
			fontName: 'circus-rs-font',
			appendUnicode: true,
			formats: ['woff'],
			startUnicode: 0xE600,
			fontHeight: 512,
			timestamp: Math.round(Date.now() / 1000) // required for consistent build
		}))
		.on('glyphs', function (glyphs, options) {
			// console.log(glyphs);
		})
		.pipe(gulp.dest('build/browser/'));
});

gulp.task('clean', function(done) {
	rimraf('./build/*', done);
});

gulp.task('watch', ['typescript', 'less'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch('src/**/*.less', ['less']);
});
/**
 * Build demo sources
 */
gulp.task('demo',['demo-html','demo-js']);
gulp.task('demo-html',['demo-css'], function() {
	var LOCALS = {};
	return gulp.src('./demo/**/*.jade')
		.pipe(jade({
			locals: LOCALS,
			pretty: true
		}))
		.pipe( gulp.dest('build/demo') );
});
gulp.task('demo-css', function() {
	return gulp.src('demo/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('build/demo'));
});
gulp.task('demo-js', ['dist'], function() {
	return gulp.src('demo/**/*.js')
		.pipe(gulp.dest('build/demo'));
});

/**
 * Build distribution package
 */
gulp.task('dist', ['typescript'], function() {
	// The 'standalone' option will create `window.circusrs.Viewer`
	// on the browser.
	return browserify({
			entries: ['build/browser/index.js'],
			standalone: 'circusrs'
		})
		.bundle()
		.pipe(source('circus-rs.js'))
		.pipe(buffer())
		.pipe(gulp.dest('build'))
		.pipe(uglify())
		.pipe(concat('circus-rs.min.js'))
		.pipe(gulp.dest('build'));
});

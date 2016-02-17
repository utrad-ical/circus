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

gulp.task('default', ['typescript', 'less', 'dist-browser']);

gulp.task('watch', ['typescript', 'less'], function() {
	gulp.watch('src/**/*.ts', ['typescript']);
	gulp.watch('src/**/*.less', ['less']);
});

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

/**
 * Clean up
 */
gulp.task('clean', ['clean-build','clean-pubdocs','clean-dist']);
gulp.task('clean-build', function(done) {
	rimraf('build', done);
});
gulp.task('clean-pubdocs', function(done) {
	rimraf('pubdocs', done);
});
gulp.task('clean-dist', function(done) {
	rimraf('dist', done);
});


/**
 * Create dts
 */
gulp.task('declaration', function() {
	var project = typescript.createProject({
		"module": "commonjs",
		"target": "es5",
		"outDir": "../build",
		"declaration": true,
		"noExternalResolve": true
	});
	return gulp.src('src/**/*.ts')
		.pipe(typescript(project))
		.dts
		.pipe(gulp.dest('build/typings/circusrs'))
});

/**
 * Source code check
 */
gulp.task('tslint', function() {
 	return gulp.src('src/browser/**/*.ts')
		.pipe(tslint({
			configration: 'src/tslint.json'
		}))
 		.pipe(tslint.report('verbose'));
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
		.pipe( gulp.dest('pubdocs') );
});
gulp.task('demo-css', function() {
	return gulp.src('demo/**/*.less')
		.pipe(less())
		.pipe(gulp.dest('pubdocs'));
});
gulp.task('demo-js', ['copy-dist-browser'], function() {
	return gulp.src('demo/**/*.js')
		.pipe(gulp.dest('pubdocs'));
});
gulp.task('copy-dist-browser', ['dist-browser'], function() {
	return gulp.src('dist/**/*')
		.pipe(gulp.dest('pubdocs/dist'));
});


/**
 * Build distribution package
 */
gulp.task('dist-browser', ['typescript','dist-browser-iconfont'], function() {
	// The 'standalone' option will create `window.circusrs.Viewer`
	// on the browser.
	return browserify({
			entries: ['build/browser/index.js'],
			standalone: 'circusrs'
		})
		.bundle()
		.pipe(source('circus-rs-client.js'))
		.pipe(buffer())
		.pipe(gulp.dest('dist'))
		.pipe(uglify())
		.pipe(concat('circus-rs-client.min.js'))
		.pipe(gulp.dest('dist'));
});
gulp.task('dist-browser-iconfont', function() {
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
		.pipe(gulp.dest('dist/css'));
});

/**
 * Expired task
 */
gulp.task('expired-build-browser', ['less', 'expired-iconfont'], function() {
	return gulp.src('src/browser/*.{js,png,gif}')
		.pipe(gulp.dest('build/browser'));
});

gulp.task('expired-iconfont', function() {
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

var gulp = require('gulp');
var typescript = require('gulp-typescript');
var less = require('gulp-less');
var iconfont = require('gulp-iconfont');
var concat = require('gulp-concat');
var rimraf = require('rimraf');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var uglify = require('gulp-uglify');
var tslint = require('gulp-tslint');

gulp.task('default', ['typescript', 'dist-browser']);

gulp.task('watch', ['browserify', 'dist-browser-css'], function() {
	gulp.watch('src/**/*.ts', ['browserify']);
	gulp.watch('src/**/*.less', ['dist-browser-css']);
});

gulp.task('typescript', function() {
	var project = typescript.createProject(
		'src/tsconfig.json',
		{ typescript: require('typescript') } // uses TypeScript 2.0
	);
	return gulp.src('src/**/*.ts')
		.pipe(typescript(project))
		.pipe(gulp.dest('lib'));
});

/*
 * Clean up
 */
gulp.task('clean', ['clean-build','clean-dist']);
gulp.task('clean-build', function(done) {
	rimraf('lib', done);
});
gulp.task('clean-dist', function(done) {
	rimraf('dist', done);
});


/*
 * Create dts
 */
gulp.task('declaration', function() {
	var project = typescript.createProject({
		"module": "commonjs",
		"target": "es5",
		"outDir": "../lib",
		"declaration": true,
		"noExternalResolve": true
	});
	return gulp.src('src/**/*.ts')
		.pipe(typescript(project))
		.dts
		.pipe(gulp.dest('lib/typings/circusrs'))
});

/*
 * Source code check
 */
gulp.task('tslint', function() {
 	return gulp.src('src/browser/**/*.ts')
		.pipe(tslint({
			configration: 'src/tslint.json'
		}))
 		.pipe(tslint.report('verbose'));
});

/*
 * Build distribution package
 */
gulp.task('dist-browser', ['browserify', 'dist-browser-iconfont', 'dist-browser-css']);

gulp.task('browserify', ['typescript'], function() {
	// The 'standalone' option will create `window.circusrs.Viewer`
	// on the browser.
	return browserify({
			entries: ['lib/browser/index.js'],
			standalone: 'circusrs'
		})
		.bundle()
		.pipe(source('circus-rs-client.js'))
		.pipe(buffer())
		.pipe(gulp.dest('dist'))
});

gulp.task('dist-browser-css', function() {
	return gulp.src('src/browser/circus-rs.less')
		.pipe(less())
		.pipe(gulp.dest('dist/css'));
});

gulp.task('dist-browser-iconfont', function() {
	return gulp.src('src/browser/assets/icons/*.svg')
		.pipe(iconfont({
			fontName: 'circus-rs-font',
			appendUnicode: true,
			formats: ['woff'],
			startUnicode: 0xE600,
			fontHeight: 512,
			descent: 73,
			timestamp: Math.round(Date.now() / 1000) // required for consistent build
		}))
		.on('glyphs', function (glyphs, options) {
			// console.log(glyphs);
		})
		.pipe(gulp.dest('dist/css'));
});

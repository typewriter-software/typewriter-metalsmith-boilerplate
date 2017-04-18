var gulp = require('gulp');
var browserSync = require('browser-sync');
var browserify = require('gulp-browserify');
var reload = browserSync.reload;
var sass = require('gulp-sass');
var sourcemaps = require('gulp-sourcemaps');
var minifyCss = require('gulp-minify-css');
var cp = require('child_process');
var runSequence = require('run-sequence');
var uglify = require('gulp-uglify');
var gulpif = require('gulp-if');
var util = require('gulp-util');
var notifier = require('node-notifier');
var neat = require('node-neat').includePaths;
var debowerify = require("debowerify");
var fs = require("fs");
var rsync = require('gulp-rsync');


var paths = {
  styles: ['src/styles/**/*.scss'],
  scripts: ['src/scripts/**/*.js'],
  images: ['src/images/**/*'],
  fonts: ['src/fonts/**/*'],
  docs: ['src/**/*.html', 'src/**/*.md', 'src/templates/*.html', 'src/templates/**/*.jade']
};

// Standard error handler
function standardHandler(err) {
  // Notification
  notifier.notify({
    message: 'Error: ' + err.message
  });
  // Log to console
  util.log(util.colors.red('Error'), err.message);
}

function sassErrorHandler(err) {
  standardHandler({
    message: err
  });
}

gulp.task('styles', function() {
  browserSync.notify('<span style="color: grey">Running:</span> styles');
  var production = util.env.type === 'production';

  gulp.src('./src/styles/main.scss')
    .pipe(sourcemaps.init())
    .pipe(sass({
      onError: sassErrorHandler,
      includePaths: ['styles'].concat(neat)
    }))
    .pipe(gulpif(production, minifyCss())) // only minify if production
    .pipe(gulpif(!production, sourcemaps.write()))
    .pipe(gulp.dest('./build/css'))
    .pipe(browserSync.reload({stream:true}));
});

// Handler for browserify
function browserifyHandler(err) {
  standardHandler(err);
  this.end();
}

gulp.task('images', function() {
  gulp.src(['src/images/**/*.png', 'src/images/**/*.jpg', 'src/images/**/*.jpeg', 'src/images/**/*.gif', 'src/images/**/*.svg'])
    // .pipe(imagemin())
    .pipe(gulp.dest('build/images/'));
});

gulp.task('favicon', function() {
  gulp.src(['src/images/favicon*'])
    .pipe(gulp.dest('build/'));
});

gulp.task('fonts', function() {
  gulp.src(['src/fonts/**/*'])
    .pipe(gulp.dest('build/fonts/'));
});

gulp.task('scripts', function() {
  var production = util.env.type === 'production';

  return gulp.src(['./src/scripts/app.js'])
    .pipe(browserify({
      debug: !production,
      paths: ['./node_modules','./app'],
      transform: [debowerify]
    }))
    .on('error', browserifyHandler)
    .pipe(gulpif(production, uglify())) // only minify if production
    .pipe(gulp.dest('./build/scripts/'));
});

gulp.task('scripts-watch', ['scripts'], browserSync.reload);

gulp.task('browser-sync', function(){
  browserSync({
    host: '*',
    port: 9000,
    open: false,
    notify: false,
    ghostMode: false,
    server: {
      baseDir: './build'
    }
  });
});

gulp.task('browser-sync:reload', function(){
  browserSync.notify('<span style="color: grey">Running:</span> rebuild');
  browserSync.reload();
});

gulp.task('sync', function() {
  runSequence('build', 'styles', 'images', 'favicon', 'fonts', 'scripts', 'browser-sync');
});

gulp.task('watch', function() {
  gulp.watch(paths.docs, ['rebuild']);
  gulp.watch(paths.styles, ['styles']);
  gulp.watch(paths.fonts, ['fonts']);
  gulp.watch(paths.images, ['images']);
  gulp.watch(paths.scripts, ['scripts-watch']);
});

gulp.task('serve', function() {
  gulp.start('sync', 'watch');
});

gulp.task('rebuild', function() {
  runSequence('build', 'styles', 'images', 'fonts', 'favicon', 'scripts', 'browser-sync:reload');
});

// Compiles for production
gulp.task('compile', function() {
  util.env.type = 'production';
  return runSequence('build', 'styles', 'images', 'favicon', 'fonts', 'scripts');
});

gulp.task('rsync', function() {
  gulp.src('build/**')
    .pipe(rsync({
      hostname: '104.131.44.26',
      username: 'root',
      destination: '/var/www/tmp',
      root: 'build',
      verbose: true
    }));
});

gulp.task('build', function(done){
  var args = [
    'run',
    'build'
  ];

  return cp.spawn('npm', args, {stdio: 'inherit'})
    .on('close', done);
});

gulp.task('deploy', function() {
  // NOTE: Can't just runSequence('compile', 'aws') because of weird async issues
  util.env.type = 'production';
  runSequence('build', 'styles', 'images', 'fonts', 'scripts', 'rsync');
});

gulp.task('default', ['serve']);

var source = require('vinyl-source-stream');
var gulp = require('gulp');
var gutil = require('gulp-util');
var browserify = require('browserify');
var babelify = require('babelify');
var watchify = require('watchify');
var notify = require('gulp-notify');
var combineCSS = require('combine-css');

var stylus = require('gulp-stylus');
var autoprefixer = require('gulp-autoprefixer');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var buffer = require('vinyl-buffer');

var browserSync = require('browser-sync');
var reload = browserSync.reload;
var historyApiFallback = require('connect-history-api-fallback')
const imagemin = require('gulp-imagemin');
var ghPages = require('gulp-gh-pages');
var minifyHTML = require('gulp-minify-html');
//const pngquant = require('imagemin-pngquant');


/*
  Styles Task
*/

gulp.task('combine', function() {
    gulp.src('./src/css/*.css')
        .pipe(combineCSS({
            lengthLimit: 256,//2KB
            prefix: '_m-',
            selectorLimit: 4080
        }))
        .pipe(gulp.dest('dist/css'));
});

gulp.task('minify-html', function() {
  var opts = {
    conditionals: true,
    spare:true
  };

  return gulp.src('./src/html/*.html')
    .pipe(minifyHTML(opts))
    .pipe(gulp.dest('./dist/'));
});

gulp.task('styles',function() {

  gulp.src('node_modules/bootstrap/dist/fonts/**.*')
    .pipe(gulp.dest('dist/fonts'))

  gulp.src('node_modules/bootstrap/dist/js/bootstrap.min.js')
    .pipe(gulp.dest('./src/scripts/lib'))

  // Compiles CSS
  /* gulp.src('css/style.styl')
    .pipe(stylus())
    .pipe(autoprefixer())
    .pipe(gulp.dest('./dist/css/'))
    .pipe(reload({stream:true})) */
});

/*
  Images
*/
gulp.task('images',function(){
  gulp.src('src/img/**/*')
        .pipe(imagemin({
            progressive: true,
            //optimizationLevel: 5,
            svgoPlugins: [{removeViewBox: false}],
            //use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/img'));
});

/*
  Browser Sync
*/
gulp.task('browser-sync', function() {
    browserSync({
        // we need to disable clicks and forms for when we test multiple rooms
        server : {},
        middleware : [ historyApiFallback() ],
        ghostMode: false
    });
});

function handleErrors() {
  var args = Array.prototype.slice.call(arguments);
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args);
  this.emit('end'); // Keep gulp from hanging on this task
}

function buildScript(file, watch) {

  var props = {
    entries: ['./src/scripts/' + file],
    debug : true,
    transform:  [babelify.configure({stage : 0 })]
  };

  // watchify() if watch requested, otherwise run browserify() once
  var bundler = watch ? watchify(browserify(props)) : browserify(props);

  function rebundle() {
    var stream = bundler.bundle();
    return stream
      .on('error', handleErrors)
      .pipe(source(file))
      .pipe(gulp.dest('./dist/'))
      // If you also want to uglify it
      .pipe(buffer())
      .pipe(uglify())
      .pipe(rename('app.min.js'))
      .pipe(gulp.dest('./dist'))
      .pipe(reload({stream:true}))
  }

  // listen for an update and run rebundle
  bundler.on('update', function() {
    rebundle();
    gutil.log('Rebundle...');
  });

  // run it once the first time buildScript is called
  return rebundle();
}

gulp.task('scripts', function() {
  return buildScript('main.js', false); // this will once run once because we set watch to false
});

gulp.task('deploy', function() {
  return gulp.src('./dist/**/*')
    .pipe(ghPages({force: true}));
});

// run 'scripts' task first, then watch for future changes
gulp.task('default', ['images','combine','styles','scripts','browser-sync'], function() {
  gulp.watch('src/css/*.css', ['combine']);
  gulp.watch('src/css/**/*', ['styles']); // gulp watch for stylus changes
  return buildScript('main.js', true); // browserify watch for JS changes
});

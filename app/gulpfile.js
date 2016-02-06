var _ = require('lodash'),
    gulp = require('gulp'),
    path = require('path'),
    less = require('gulp-less'),
    minifyCss = require('gulp-minify-css'),
    rename = require('gulp-rename'),
    order = require('gulp-order'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify'),
    linker = require('gulp-linker'),
    mocha = require('gulp-mocha'),
    karma = require('karma').server,
    argv = require('yargs').argv,
    assets = require('./assets')

gulp.task('default', ['css', 'js', 'link', 'test'], function () {
  // place code for your default task here
});

gulp.task('css', function () {
  return gulp.src(assets.staticDir + '/less/application.less')
      .pipe(less())
      .pipe(gulp.dest(assets.staticDir + '/css'))
      .pipe(minifyCss())
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(assets.staticDir + '/css'))
});

gulp.task('js', function () {
  return gulp.src(assets.jsFiles)
      .pipe(concat('application.js'))
      .pipe(gulp.dest(assets.staticDir + '/js'))
      .pipe(uglify())
      .pipe(rename({suffix: '.min'}))
      .pipe(gulp.dest(assets.staticDir + '/js'))
});

gulp.task('link', function () {
  return gulp.src(assets.resourcesDir + '/templates/**/*.html')
    // Link the JavaScript
      .pipe(linker({
        scripts: argv.production ? assets.staticDir + '/js/application.min.js' : assets.jsFiles,
        startTag: '<!--SCRIPTS-->',
        endTag: '<!--SCRIPTS END-->',
        fileTmpl: '<script src="%s"></script>',
        appRoot: assets.staticDir
      }))
      .pipe(gulp.dest(assets.resourcesDir + '/templates'));
});


gulp.task('test', function (done) {
  console.log(assets.testFiles);
  karma.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done);
});

//gulp.task('watch', ['css', 'js', 'link'], function () {
//  gulp.watch('assets/less/**/*.less', ['css']);
//  gulp.watch(manifest.client, ['js', 'link']);
//});

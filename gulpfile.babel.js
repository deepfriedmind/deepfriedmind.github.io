// --------------------------------------------------------------------------------------------------------------------
//
// Requirements
//
// --------------------------------------------------------------------------------------------------------------------

import gulp from 'gulp';
import gulpLoadPlugins from 'gulp-load-plugins';
import runSequence from 'run-sequence'
import browserSync from 'browser-sync';
import {spawn as cp} from 'child_process'

const $         = gulpLoadPlugins();
const reload    = browserSync.reload;
const separator = $.util.colors.black.bold('‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧‧');


// --------------------------------------------------------------------------------------------------------------------
//
// Configuration
//
// --------------------------------------------------------------------------------------------------------------------

const config = {
    dev:  $.util.env.dev,
    src:  {
        jekyll:  ['_config.yml', '*.{md,xml}', '{index,404}.html', '{_includes,_layouts,_posts}/*.*', '!_site'],
        scripts: {
            main: './_src/scripts/main.js',
            all:  './_src/scripts/**/*.js',
        },
        styles:  {
            main: './_src/styles/main.scss',
            all:  './_src/styles/**/*.scss',
        },
    },
    dest: 'public',
};


// --------------------------------------------------------------------------------------------------------------------
//
// Styles
//
// --------------------------------------------------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// SCSS linting
// ----------------------------------------------------------------------------

gulp.task('styles:lint', () => {
    function scssLintReporter(file) {
        if (file.scsslint.success) {
            return false;
        }

        const issueCount   = file.scsslint.issues.length;
        const relativePath = file.path.replace(file.cwd, '');
        const logMessage   = `${issueCount} ${issueCount > 1 ? 'issues' : 'issue'} found in:\n➡️ ${relativePath}`;

        $.util.beep();
        $.notify().write({message: logMessage});
        $.util.log(logMessage);

        // Loop through the warnings/errors and spit them out
        return file.scsslint.issues.forEach((result) => {
            const msg =
                      $.util.colors.cyan('\n' + relativePath) + ':' +
                      $.util.colors.red(result.line) + '\n' +
                      (result.severity === 'error' ? $.util.colors.red('❌ [Error]') : $.util.colors.yellow('⚠️ [Warning]')) + ' ' +
                      result.reason;
            return $.util.log(msg);
        });
    }

    // log a separator to more easily distinguish old warnings/errors from new ones in console output
    console.log(separator);

    return gulp.src([config.src.styles.all, '!**/lanyon/*.scss', '!**/*.scss___jb_bak___', '!**/*_scsslint_tmp*.scss']) // exclude Poole/Lanyon files + temp files
        .pipe($.cached('scsslint'))
        .pipe($.scssLint({
            customReport: scssLintReporter,
        }));
});


// ----------------------------------------------------------------------------
// Compiling
// ----------------------------------------------------------------------------

gulp.task('styles:compile', () => {
    const autoprefixerBrowsers = [
        'ie >= 9',
        'ie_mob >= 10',
        'ff >= 30',
        'chrome >= 34',
        'safari >= 7',
        'opera >= 23',
        'ios >= 7',
        'android >= 4.4',
        'bb >= 10',
    ];

    return gulp.src(config.src.styles.main)
        .pipe($.if(config.dev, $.sourcemaps.init()))
        .pipe($.sass({
            outputStyle: 'expanded',
        })
            .on('error', $.sass.logError))
        .pipe($.autoprefixer(autoprefixerBrowsers))
        .pipe($.if(config.dev, $.sourcemaps.write()))
        .pipe($.if(config.dev, gulp.dest('_site/public/css'))) // during development, also output the css directly to the '_site' folder so there's no need for a Jekyll build
        .pipe($.if(config.dev, reload({stream: true})))
        .pipe($.if(!config.dev, $.csso()))
        .pipe(gulp.dest(config.dest + '/css'));
});


// ----------------------------------------------------------------------------
// Combined task
// ----------------------------------------------------------------------------

gulp.task('styles', (cb) => runSequence('styles:lint', 'styles:compile', cb));


// --------------------------------------------------------------------------------------------------------------------
//
// Jekyll
//
// --------------------------------------------------------------------------------------------------------------------

gulp.task('jekyll', function(cb) {
    const jekyll = cp('jekyll', ['build', '--quiet'], {stdio: 'inherit'});

    jekyll.on('exit', function(code) {
        if (browserSync.active) {
            reload();
        }
        cb(code === 0 ? null : 'Jekyll process exited with code: ' + code);
    });
});


// --------------------------------------------------------------------------------------------------------------------
//
// Browsersync server + watch tasks
//
// --------------------------------------------------------------------------------------------------------------------

gulp.task('serve', function() {
    browserSync({
        open:   !$.util.env.noopen, // don't open a new browser window if run with `gulp --noopen`
        server: {
            baseDir: '_site'
        },
        host:   'localhost'
    });

    gulp.watch([config.src.styles.all, '!**/*.scss___jb_bak___', '!**/*_scsslint_tmp*.scss'], ['styles']);
    gulp.watch(config.src.jekyll, ['jekyll']);

});


// --------------------------------------------------------------------------------------------------------------------
//
// Default task
//
// --------------------------------------------------------------------------------------------------------------------

gulp.task('default', () => {
    // run build
    runSequence(
        [
            'jekyll',
            'styles',
        ],
        () => {
            if (config.dev) {
                gulp.start('serve');
            }
        });
});

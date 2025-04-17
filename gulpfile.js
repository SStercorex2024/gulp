const {src, dest, watch, series, parallel} = require('gulp');

const browserSync = require('browser-sync').create();
const scss = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const autoprefixer = require('gulp-autoprefixer');
const clean = require('gulp-clean');

function styles() {
    return src('app/scss/style.scss')
        .pipe(autoprefixer())
        .pipe(concat('style.min.css'))
        .pipe(scss({
            style: 'compressed'
        }))
        .pipe(dest('app/css'))
        .pipe(browserSync.stream());
}

function scripts() {
    return src(['app/js/main.js'])
        .pipe(concat("main.min.js"))
        .pipe(uglify())
        .pipe(dest('app/js'))
        .pipe(browserSync.stream());
}

function watching() {
    browserSync.init({
        server: {
            baseDir: 'app/',
        }
    })
    watch(["app/scss/style.scss"], styles);
    watch(["app/*.html"]).on("change", browserSync.reload);
}

function bilding() {
    return src([
        "app/css/style.min.css",
        "app/images/*.*",
        "app/fonts/*.*",
        "app/js/main.min.js",
        'app/index.html'
    ], {base: "app"})
        .pipe(dest("dist"))
}

function cleanDist() {
    return src("dist")
        .pipe(clean())
}

exports.styles = styles;
exports.scripts = scripts;
exports.watching = watching;
exports.bilding = bilding;
exports.cleanDist = cleanDist;

exports.bild = series(cleanDist, bilding);
exports.default = parallel(styles, scripts, watching);

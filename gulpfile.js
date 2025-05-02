const {src, dest, watch, series, parallel} = require('gulp');

const browserSync = require('browser-sync').create();
const scss = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const autoprefixer = require('gulp-autoprefixer');
const clean = require('gulp-clean');
const imagemin = require('gulp-imagemin');
const webp = require('gulp-webp');
const avif = require('gulp-avif');
const newer = require('gulp-newer');
const ttf2woff2 = require('gulp-ttf2woff2');
const include = require('gulp-include');
const svgstore = require('gulp-svgstore');

function sprites() {
    return src('app/images/src/sprite/*.svg')
        .pipe(svgstore({
            inlineSvg: true,
            fileName: 'sprite.svg'
        }))
        .pipe(dest('app/images'))
}

function pages() {
    return src('app/pages/*.html')
        .pipe(include({
            includePaths: 'app/components'
        }))
        .pipe(dest('app'))
        .pipe(browserSync.stream());
}

function fonts() {
    return src('app/fonts/*.ttf')
        .pipe(ttf2woff2())
        .pipe(dest('app/fonts'))

}

function images() {
    return src(['app/images/src/*.*', '!app/images/src/*.svg'])
        .pipe(newer('app/images'))
        .pipe(avif({quality: 50}))

        .pipe(src('app/images/**/*'))
        .pipe(newer('app/images'))
        .pipe(webp())

        .pipe(src('app/images/**/*'))
        .pipe(newer('app/images'))
        .pipe(imagemin())

        .pipe(dest('app/images'))
}

function styles() {
    return src('app/scss/*.scss')
        .pipe(scss({outputStyle: 'compressed'})) // Сначала компиляция SCSS в CSS
        .pipe(autoprefixer({overrideBrowserslist: ['last 10 versions'], grid: true})) // Потом автопрефиксер
        .pipe(concat('style.min.css')) // Потом объединение
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
    watch(["app/scss/**/*.scss"], styles);
    watch(["app/js/main.js"], scripts);
    watch(["app/images/sprite/*.svg"], sprites);
    watch(["app/images/src"], images);
    watch(["app/components/*", "app/pages/*"], pages);
    watch(["app/*.html"]).on("change", browserSync.reload);
}

function bilding() {
    return src(["app/css/style.min.css", "app/images/*.*", "app/fonts/*.woff2", "app/js/main.min.js", 'app/index.html'], {base: "app"})
        .pipe(dest("dist"))
}

function cleanDist() {
    return src("dist")
        .pipe(clean())
}

exports.fonts = fonts
exports.styles = styles;
exports.scripts = scripts;
exports.watching = watching;
exports.images = images;
exports.sprites = sprites;
exports.pages = pages;
exports.bilding = bilding;
exports.cleanDist = cleanDist;

exports.bild = series(cleanDist, bilding);
exports.default = parallel(styles, scripts, images, sprites, pages, watching);

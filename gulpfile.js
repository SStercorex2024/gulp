const {src, dest, watch, series, parallel} = require('gulp');

const scss = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es');
const autoprefixer = require('gulp-autoprefixer');
const cleanCSS = require('gulp-clean-css');
const browserSync = require('browser-sync').create();
const fileInclude = require('gulp-file-include');
const del = require('del');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const image = require('gulp-image');
const webp = require('gulp-webp');
const webpHtml = require('gulp-webp-html');
const webpCss = require('gulp-webp-css');
const data = require('gulp-data');
const newer = require('gulp-newer');
const changed = require('gulp-changed');
const sassGlob = require('gulp-sass-glob');
const svgSprite = require('gulp-svg-sprite');

// Пути
const paths = {
    html: {
        src: 'app/html/index.html',
        watch: 'app/html/**/*.html',
        json: 'app/html/data/maps.json',
        dest: 'dist'
    },
    styles: {
        src: 'app/scss/style.scss',
        dest: 'app/css'
    },
    scripts: {
        src: 'app/js/main.js',
        dest: 'app/js'
    },
    images: {
        src: 'app/images/**/*',
        dest: 'dist/img',
        webpDest: 'dist/img/webp'
    },
    fonts: {
        src: 'app/fonts/**/*',
        dest: 'dist/fonts'
    },
    files: {
        src: 'app/files/**/*',
        dest: 'dist/files'
    }
};

// Обработка ошибок
const plumberNotify = (title) => plumber({
    errorHandler: notify.onError({
        title,
        message: "<%= error.message %>",
        sound: false
    })
});

// SCSS → CSS
function styles() {
    return src(paths.styles.src)
        .pipe(plumberNotify("SCSS Error"))
        .pipe(sassGlob())
        .pipe(scss())
        .pipe(webpCss())
        .pipe(autoprefixer())
        .pipe(concat('style.min.css'))
        .pipe(cleanCSS({level: 2}))
        .pipe(dest(paths.styles.dest))
        .pipe(browserSync.stream());
}

// JS
function scripts() {
    return src(paths.scripts.src)
        .pipe(plumberNotify("JS Error"))
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(dest(paths.scripts.dest))
        .pipe(browserSync.stream());
}

// HTML
function html() {
    return src(paths.html.src)
        .pipe(fileInclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(data(() => require(`./${paths.html.json}`)))
        .pipe(webpHtml())
        .pipe(dest(paths.html.dest))
        .pipe(browserSync.stream());
}

// Оптимизация изображений (только новые)
function optimizeImages() {
    return src(paths.images.src)
        .pipe(newer(paths.images.dest))  // Это для новых изображений
        .pipe(image())
        .pipe(dest(paths.images.dest));
}

// WebP (только новые)
function webpConversion() {
    return src(paths.images.src)
        .pipe(newer({
            dest: paths.images.webpDest,
            ext: '.webp'
        }))  // Только новые изображения для конвертации в WebP
        .pipe(webp())
        .pipe(dest(paths.images.webpDest));
}

function svgSprite() {
    return src('app/images/icons/*.svg')
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: 'sprite.svg', // теперь просто имя файла
                    example: false
                }
            },
            shape: {
                transform: [
                    {
                        svgo: {
                            plugins: [
                                {removeAttrs: {attrs: '(fill|stroke|style)'}}
                            ]

                        }
                    }
                ]
            }
        }))
        .pipe(dest('dist/img/icons')); // логичный путь
}

function processJsonData() {
    return src('app/data/**/*.json')
        .pipe(changed('dist/data', {hasChanged: changed.compareContents}))  // Проверка изменения содержимого
        .pipe(dest('dist/data'));
}

// Копирование
const copy = {
    images: () => src(paths.images.src).pipe(dest(paths.images.dest)),
    fonts: () => src(paths.fonts.src).pipe(dest(paths.fonts.dest)),
    files: () => src(paths.files.src).pipe(dest(paths.files.dest))
};

// Очистка
function cleanDist() {
    return del(['dist']);
}

// Watch + Server
function watching() {
    browserSync.init({
        server: {baseDir: 'app/'}
    });
    watch(paths.styles.src, styles);
    watch(paths.html.watch, html);
    watch('app/images/icons/*.svg', svgSprite);
    watch('app/*.html').on('change', browserSync.reload);
    watch(paths.images.src, series(optimizeImages, webpConversion));  // Слежка за изображениями
    watch('app/data/**/*.json', processJsonData);  // Пример слежки за другими файлами (JSON)
}

// Сборка
const build = series(
    cleanDist,
    parallel(styles, scripts, html, optimizeImages, webpConversion, svgSprite, processJsonData, copy.fonts, copy.files)
);


// CLI
exports.styles = styles;
exports.scripts = scripts;
exports.html = html;
exports.optimizeImages = optimizeImages;
exports.webpConversion = webpConversion;
exports.processJsonData = processJsonData;
exports.cleanDist = cleanDist;
exports.images = copy.images;
exports.fonts = copy.fonts;
exports.files = copy.files;
exports.build = build;

exports.default = series(
    parallel(styles, scripts, html),
    watching
);

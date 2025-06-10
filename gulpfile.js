const { src, dest, watch, series, parallel } = require("gulp");

const browserSync = require("browser-sync").create();
const scss = require("gulp-sass")(require("sass"));
const concat = require("gulp-concat");
const uglify = require("gulp-uglify-es").default;
const autoprefixer = require("gulp-autoprefixer");
const clean = require("gulp-clean");
const imagemin = require("gulp-imagemin");
const webp = require("gulp-webp");
const avif = require("gulp-avif");
const newer = require("gulp-newer");
const ttf2woff2 = require("gulp-ttf2woff2");
const include = require("gulp-include");
const svgstore = require("gulp-svgstore");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const merge = require("merge-stream");
const nunjucksRender = require("gulp-nunjucks-render");
const gulpData = require("gulp-data");
const fs = require("fs");
const path = require("path");
const postcss = require("gulp-postcss");
const pxtorem = require("postcss-pxtorem");

function nunjucks(done) {
  const njkFolder = "app/njk-pages/";
  if (!fs.existsSync(njkFolder)) {
    return done();
  }

  return src(`${njkFolder}/*.njk`)
    .pipe(plumber())
    .pipe(
      gulpData((file) => {
        const fileName = path.basename(file.path, ".njk");
        const globalDataPath = "app/data/global.json";
        const pageDataPath = `app/data/${fileName}.json`;

        const globalData = fs.existsSync(globalDataPath)
          ? JSON.parse(fs.readFileSync(globalDataPath))
          : {};
        const pageData = fs.existsSync(pageDataPath)
          ? JSON.parse(fs.readFileSync(pageDataPath))
          : {};

        return Object.assign({}, globalData, pageData);
      })
    )
    .pipe(
      nunjucksRender({
        path: ["app/templates"],
      })
    )
    .pipe(dest("app/components/rendered"))
    .pipe(browserSync.stream());
}

function sprites() {
  return src("app/img/src/sprite/*.svg")
    .pipe(
      svgstore({
        inlineSvg: true,
        fileName: "sprite.svg",
      })
    )
    .pipe(dest("app/img"));
}

function pages() {
  return src("app/pages/*.html")
    .pipe(
      include({
        includePaths: "app/components",
      })
    )
    .pipe(dest("app"))
    .pipe(browserSync.stream());
}

function fonts() {
  return src("app/fonts/*.ttf").pipe(ttf2woff2()).pipe(dest("app/fonts"));
}

function images() {
  const source = "app/img/src/**/*.{jpg,jpeg,png}";
  const destination = "app/img";

  const jpegOutput = src(source, { base: "app/img/src" })
    .pipe(plumber())
    .pipe(newer({ dest: destination, ext: ".jpg" }))
    .pipe(imagemin([imagemin.mozjpeg({ quality: 85, progressive: true })]))
    .pipe(rename({ extname: ".jpg" }))
    .pipe(dest(destination));

  const avifOutput = src(source, { base: "app/img/src" })
    .pipe(plumber())
    .pipe(newer({ dest: destination, ext: ".avif" }))
    .pipe(avif({ quality: 75 }))
    .pipe(dest(destination));

  const webpOutput = src(source, { base: "app/img/src" })
    .pipe(plumber())
    .pipe(newer({ dest: destination, ext: ".webp" }))
    .pipe(webp({ quality: 85 }))
    .pipe(dest(destination));

  return merge(jpegOutput, avifOutput, webpOutput);
}

function styles() {
  return src("app/scss/*.scss")
    .pipe(scss({ outputStyle: "compressed" }))
    .pipe(
      autoprefixer({ overrideBrowserslist: ["last 10 versions"], grid: true })
    ) 
    .pipe(
      postcss([
        pxtorem({
          rootValue: 16, 
          unitPrecision: 5,
          propList: ["*"], 
          selectorBlackList: [], 
          replace: true,
          mediaQuery: false,
          minPixelValue: 0,
        }),
      ])
    )
    .pipe(concat("style.min.css"))
    .pipe(dest("app/css"))
    .pipe(browserSync.stream());
}

function scripts() {
  return src([
    "node_modules/bootstrap/dist/js/bootstrap.bundle.min.js",
    "node_modules/swiper/swiper-bundle.js",
    "app/js/main.js",
  ])
    .pipe(plumber())
    .pipe(include())
    .on("error", console.log)
    .pipe(concat("main.min.js"))
    .pipe(uglify())
    .pipe(dest("app/js"))
    .pipe(browserSync.stream());
}

function watching() {
  browserSync.init({
    server: {
      baseDir: "app/",
    },
  });
  watch(["app/scss/**/*.scss"], styles);
  watch(["app/js/main.js"], scripts);
  watch(["app/img/sprite/*.svg"], sprites);
  watch("app/img/src/**/*.{jpg,jpeg,png}", images);
  watch(["app/components/*", "app/pages/*"], pages);
  watch(["app/*.html"]).on("change", browserSync.reload);
  watch(
    ["app/njk-pages/**/*.njk", "app/templates/**/*.njk", "app/data/**/*.json"],
    nunjucks
  );
}

function building() {
  return src(
    [
      "app/css/style.min.css",
      "app/img/*.*",
      "app/img/**/*.*",
      "!app/img/src/**",
      "app/fonts/*.woff2",
      "app/js/main.min.js",
      "app/index.html",
    ],
    { base: "app" }
  ).pipe(dest("dist"));
}

function cleanDist() {
  return src("dist").pipe(clean());
}

exports.fonts = fonts;
exports.styles = styles;
exports.scripts = scripts;
exports.watching = watching;
exports.images = images;
exports.sprites = sprites;
exports.pages = pages;
exports.building = building;
exports.cleanDist = cleanDist;
exports.nunjucks = nunjucks;

exports.build = series(cleanDist, building);
exports.default = parallel(
  styles,
  scripts,
  sprites,
  pages,
  nunjucks,
  watching,
  images
);

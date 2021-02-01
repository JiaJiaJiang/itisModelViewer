var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var fs=require('fs').promises;

var dist='./dist';
//css
function transcss(name){
	var sass = require("gulp-sass");

	return gulp.src(`./src/${name}`)
		// .pipe(changed(dist))
		.pipe(sourcemaps.init({ loadMaps: true }))
		.pipe(sass({
			outputStyle: 'compressed'
		}).on('error', sass.logError))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(dist));
}

gulp.task('css',function(){
	return transcss('');
});


//js
function transjs(name,cover=90){
	var browserify = require('browserify'),
		buffer = require('vinyl-buffer'),
		source = require('vinyl-source-stream'),
		rename = require('gulp-rename');

	console.log(`compiling ${name} covers ${cover}% browsers`);
	return browserify({
		entries: name,
		basedir:'./src',
		debug: true,
		plugin: [
			[ require('esmify') ],
		]
	}).transform(
		"babelify",{ 
			presets: [
				[
					"@babel/preset-env",{
						"targets":{ 
							"browsers":`cover ${cover}%`,
						},
						"debug": false,
						"useBuiltIns": 'usage',
						"corejs":3,
					},
				],
				// ["minify",{}],
			],
			plugins:[
				"@babel/plugin-proposal-export-default-from",
				/* [
					"@babel/plugin-transform-runtime",
					{
					  "absoluteRuntime": false,
					  "corejs": 3,
					  "helpers": false,
					  "regenerator": true,
					  "useESModules": false,
					}
				], */
				'@babel/plugin-proposal-class-properties',
				//以下为cover依赖，不要从package.json里删除
				// "@babel/plugin-transform-modules-commonjs",
				// "regenerator-runtime",
			]
		}
	)
	.bundle()
	.pipe(source(`./${name}`))
	// .pipe(rename({extname:`.${cover}.js`}))
	.pipe(buffer())
	.pipe(sourcemaps.init({ loadMaps: true }))
	.pipe(sourcemaps.write('./'))
	.pipe(gulp.dest(dist));
}
gulp.task('js',function(){
	return transjs('itisModelViewer.js',90);
});

gulp.task('clean',async function(){
	let files=await fs.readdir('./dist');
	let tasks=[];
	for(let file of files){
		tasks.push(fs.unlink(`./dist/${file}`)
					.then(()=>console.log(`deleted: ${file}`))
		);
	}
	return Promise.all(tasks);
});


gulp.task('build',gulp.parallel('js','css'));
gulp.task('default',gulp.series('build'));
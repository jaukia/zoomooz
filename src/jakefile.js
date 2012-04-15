/* run the build with "jake" command */

if (typeof global.system !== 'undefined') {
    print('Narwhal Jake not supported (use node-jake instead)');
    return;
}

var path = require('path');
var fs = require('fs');
var util = require('util');

var uglify = require("uglify-js");
var jsp = uglify.parser;
var pro = uglify.uglify;

var spawn = require('child_process').spawn;

var withLibsMergedFileName = "../jquery.zoomooz.js";
var withLibsMinifiedFileName = "../jquery.zoomooz.min.js";

desc('Concatenates javascript files');
task('concat', [], function() {
  util.puts('### [jake concat]');
  
  path.exists("build",function(exists) {
     if(!exists) {
 	 	util.puts('setting up build dir');
  	    fs.mkdirSync("build",0744);
  	 }
  
	 var ownfiles = ['js/purecssmatrix.js','js/jquery.zoomooz-helpers.js','js/jquery.zoomooz-anim.js','js/jquery.zoomooz-core.js', 'js/jquery.zoomooz-zoomTarget.js','js/jquery.zoomooz-zoomContainer.js'],
		 extrafiles = ['js/sylvester.src.stripped.js'],
		 pathName = '.';
	 
	 var concatFiles = function(files, outFileName) {
		util.puts('Creating \"'+outFileName+'\" from:');
		outFile = fs.openSync(outFileName, 'w+');
		files.forEach(function(fileName) {
		   var contents = fs.readFileSync(fileName);
		   var writeStatus = fs.writeSync(outFile, contents.toString()+'\n');
		   util.puts('  '+fileName);
		});
		fs.closeSync(outFile); 
	 }
	 
	 var withLibs = ownfiles.concat(extrafiles);
	 
	 /*concatFiles(ownfiles, ownFilesMergedFileName);*/
	 concatFiles(withLibs, withLibsMergedFileName);
	 
     complete();
  });
}, true);

desc('Minifies js files');
task('minify', [], function() {
  var minifyFile = function(originalFileName,outFileName) {
    var contents = fs.readFileSync(originalFileName);
    var ast = jsp.parse(contents.toString());
    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);
    var final_code = pro.gen_code(ast);
    outFile = fs.openSync(outFileName, 'w+');
    var writeStatus = fs.writeSync(outFile, final_code);
    fs.closeSync(outFile);
  }
  
  /*minifyFile(ownFilesMergedFileName, ownFilesMinifiedFileName);*/
  minifyFile(withLibsMergedFileName, withLibsMinifiedFileName);
  
});

/*
desc('Creates Docco documentation');
task('docs', [], function() {
  var tsk = spawn('docco',['js/purecssmatrix.js','js/jquery.zoomooz.js']);
  tsk.stdout.on('data', function (data) {
    util.print('stdout: ' + data);
  });

  tsk.stderr.on('data', function (data) {
    util.print('stderr: ' + data);
  });
});
*/

desc('Main build task');
task('build', ['concat','minify'/*,'docs'*/], function() {});

desc('Default task');
task('default', ['build'], function() {});
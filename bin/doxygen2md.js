#!/usr/bin/env node
'use strict';

var fs = require('fs');
var temp = require('temp');
var handlebars = require('handlebars');
var log = require('winston');
var path = require('path');
var pjson = require('../package.json');
var program = require('commander');
var doxygen2md = require('../index.js');
var assign = require('object-assign');

program.version(pjson.version)
  .usage('[options] <doxygen directory>')
  .option('-v, --verbose', 'verbose mode', false)
  .option('-a, --anchors', 'add anchors for internal links', false)
  .parse(process.argv);

if (program.verbose) {
  log.level = 'verbose';
}

if (program.args.length == 0) {

  log.verbose('Checking for Doxyfile in the working directory...');
  var doxyfile = path.join(process.cwd(), 'Doxyfile');
  if (fs.existsSync(doxyfile)) {

    temp.track(); // Automatically track and cleanup files at exit

    // Output directory for doxygen
    var ouputDirectory = temp.mkdirSync('doxygen');

    // Loading the doxygen configuration and overwrite some options
    log.verbose('Found: ' + doxyfile);
    var config = fs.readFileSync(doxyfile, 'utf8');
    config += [
      'OUTPUT_DIRECTORY = ' + ouputDirectory,
      'GENERATE_XML     = YES'
    ].join('\n');

    // Run doxygen
    var spawnSync = require('child_process').spawnSync;
    var doxygen = spawnSync('doxygen', ['-'], {
      input: config,
      encoding: 'utf-8'
    });

    process.stderr.write(doxygen.stderr);

    log.verbose(doxygen.stdout);

    var options = assign({}, doxygen2md.defaultOptions, {
      directory: path.join(ouputDirectory, 'xml'),
      anchors: program.anchors
    });

    doxygen2md.render(options);
  }
  else {
    program.help();
  }
}
else {
  var options = doxygen2md.defaultOptions;
  options.directory = program.args[0];
  doxygen2md.render(options);
}

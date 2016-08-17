/**
 * Copyright (c) 2016 Philippe FERDINAND
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 **/
'use strict';

/**
  Debugging: devtool index.js --watch --break -- ../libpqmxx/dist/help/xml/
**/

var fs = require('fs');
var handlebars = require('handlebars');
var log = require('winston');
var path = require('path');
var xml2js = require('xml2js');

var Compound = require('./src/compound');
var doxyparser = require('./src/parser');

module.exports = {

  /**
   * Default values for the options.
   **/
  defaultOptions: {

    lang: 'cpp',                /** Programming language **/
    directory: null,            /** location of the doxygen files **/
    anchors: true,              /** generate anchors for internal links **/

    'compound': {
      'members': {
        'filter': [
          'public-attrib',
          'public-func',
          'protected-attrib',
          'protected-func'
        ]
      },
      'compounds': {
        'filter': [
          'namespace',
          'class',
          'struct',
          'union',
          'typedef'
        ]
      }
    }
  },

  render: function (options) {

    //
    // handlebar initialization
    //

    // Escape the code for a table cell.
    handlebars.registerHelper('cell', function(code) {
      return code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    });

    // Escape the code for a titles.
    handlebars.registerHelper('title', function(code) {
      return code.replace(/\n/g, '<br/>');
    });

    // Generate an anchor for internal links
    handlebars.registerHelper('anchor', function(name) {
      if (options.anchors) {
        return '{#' + name + '}';
      }
      else {
        return '';
      }
    });

    //
    // Load the templates
    //
    var contents = [];
    var templates = {};
    var templatesDirectory = path.join(__dirname, 'templates', options.lang);
    fs.readdirSync(templatesDirectory).forEach(function (filename) {
      var fullname = path.join(templatesDirectory, filename);
      var template = handlebars.compile(fs.readFileSync(fullname, 'utf8'), {
        noEscape: true,
        strict: true
      });
      templates[filename.match(/(.*)\.md$/)[1]] = template;
    });

    //
    // parsing files
    //
    log.verbose('Parsing ' + path.join(options.directory, 'index.xml'));
    fs.readFile(path.join(options.directory, 'index.xml'), 'utf8', function(err, data) {
      var parser = new xml2js.Parser();
      parser.parseString(data, function (err, result) {
        var root = new Compound();
        doxyparser.parseIndex(root, result.doxygenindex.compound, options);
        var compounds = root.getAll('compounds', true);
        var contents = compounds.map(function (compound) {
          return compound.toMarkdown(templates);
        });
        contents.forEach(function (content) {
          if (content) {
            process.stdout.write(content);
          }
        });
      });
    });
  }

}

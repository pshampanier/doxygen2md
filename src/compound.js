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
var log = require('winston');

function Compound(name) {
  this.name = name;
  this.compounds = {};
  this.members = [];
  this.basecompoundref = [];
  this.filtered = {};
}

Compound.prototype.find = function (fullname, create) {
  
  var name = fullname[0];
  var compound = this.compounds[name];
  
  if (!compound && create) {
    compound = this.compounds[name] = new Compound(name);
  }
  
  if (compound && fullname.length > 1) {
    compound = compound.find(fullname.slice(1), true);
  }
  
  return compound;
}

Compound.prototype.toArray = function (type) {
  
  var arr = Object.keys(this[type]).map(function(key) {
    return this[key];
  }.bind(this[type]));
  
  if (type == "compounds") {
    var all = new Array();
    arr.forEach(function (compound) {
      all.push(compound);
      all = all.concat(compound.toArray(type));
    });
    arr = all;
  }
  
  return arr;
  
}

Compound.prototype.getAll = function (type, filtered) {
  
  var all = [];
  
  if (filtered) {
    (this.filtered[type] || []).forEach(function (item) {
      all.push(item);
      all = all.concat(item.getAll(type, filtered));
    });
  }
  
  return all;
  
}

Compound.prototype.filter = function (collection, key, filter) {
  
  var categories = {};
  var result = [];
  
  Object.keys(collection).forEach(function (name) {
    var item = collection[name];
    (categories[item[key]] || (categories[item[key]] = [])).push(item);
  });
  
  filter.forEach(function (category) {
    result = result.concat(categories[category] || []);
  });
  
  return result;
  
}

Compound.prototype.toMarkdown = function (templates) {
  
  var template;
  
  switch (this.kind) {
    case 'namespace':
      if (Object.keys(this.compounds).length === 1
        && this.compounds[Object.keys(this.compounds)[0]].kind == 'namespace') {
        return undefined;
      }
      template = 'namespace'; // no break intentionnaly
      
    case 'class':
    case 'struct':
      log.verbose('Rendering ' + this.kind + ' ' + this.fullname);
      return templates[template || 'class'](this);
      break;
    
    default:
      return undefined;
  }
  
  return;
}

module.exports = Compound;
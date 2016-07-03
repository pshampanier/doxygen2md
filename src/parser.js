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
var fs = require('fs');
var log = require('winston');
var path = require('path');
var xml2js = require('xml2js');
var markdown = require('./markdown');

var allIds = {};
var hrefs = {};

function trim(text) {
  return text.replace(/^[\s\t\r\n]+|[\s\t\r\n]+$/g, '');
}

function inline(code) {
  if (Array.isArray(code)) {
    var refs, s = '', isInline = false;
    code.forEach(function (e) {
      refs = e.split(/(\[.*\]\(.*\)|\n|\s{2}\n)/g);
      refs.forEach(function (f) {
        if (f.charAt(0) == '[') {
          // link
          var link = f.match(/\[(.*)\]\((.*)\)/);
          isInline ? (s += '`') && (isInline = false) : null;
          s += '[`' + link[1] + '`](' + link[2] + ')';
        }
        else if (f == '\n' || f == '  \n') {
          // line break
          isInline ? (s += '`') && (isInline = false) : null;
          s += f;
        }
        else if (f) {
          !isInline ? (s += '`') && (isInline = true) : null;
          s += f;
        }
      });
    });
    return s + (isInline ? '`' : '');
  }
  else {
    return '`' + code + '`';
  }
}

/** 
 *   `public `[`Connection`](classdb_1_1postgres_1_1_connection)` & connect(const char * connInfo)`
 *   #publicconnection-connectconst-char--conninfo
 * 
 *   `public `[`Connection`](classdb_1_1postgres_1_1_connection)` & close() noexcept`
 *   #publicconnection-close-noexcept
 * 
 *   `public template<typename... Args>`  <br/>`inline `[`Result`](classdb_1_1postgres_1_1_result)` & execute(const char * sql,Args... args)`
 *   #public-templatetypename-args--inlineresult-executeconst-char--sqlargs-args
 **/
function encodeRef(href) {
  var anchor = val.trim().toLowerCase().replace(/[^\w\- ]+/g, ' ').replace(/\s+/g, '-').replace(/\-+$/, '');
  if (usedLocalRefs.indexOf(anchor) !== -1) {
    var i = 1;
    while (usedLocalRefs.indexOf(anchor + '-' + i) !== -1 && i++<=10);
    anchor = anchor + '-' + i;
  }
  usedHeaders.push(anchor);
  return anchor;
}

function toMarkdown(element, context) {
  var s = '';
  context = context || [];  
  switch (typeof element) {
    case 'string':
      s = element;
      break;
      
    case 'object':
      if (Array.isArray(element)) {
        element.forEach(function (value, key) {
          s += toMarkdown(value, context);
        });
      }
      else {
        
        // opening the element
        switch (element['#name']) {
          case 'ref': return s + markdown.link(toMarkdown(element.$$), '#' + element.$.refid, true);            
          case '__text__': s = element._; break;
          case 'emphasis': s = '*'; break;
          case 'bold': s = '**'; break;
          case 'parametername':
          case 'computeroutput': s = '`'; break;
          case 'parameterlist': s = '\n#### Parameters\n'; break;
          case 'parameteritem': s = '* '; break;            
          case 'programlisting': s = '\n```cpp\n'; break;
          case 'itemizedlist': s = '\n\n'; break;
          case 'listitem': s = '* '; break;
          case 'sp': s = ' '; break;
          case 'simplesect':
            if (element.$.kind == 'attention') {
              s = '> ';
            }
            else if (element.$.kind == 'return') {
              s = '\n#### Returns\n'
            }
            else {
              console.assert(element.$.kind + ' not supported.');
            }
            break;
          
          case 'entry':
          case 'row':
          case 'ulink':
          case 'codeline':
          case 'highlight':
          case 'table':
          case 'para':
          case 'parameterdescription':
          case 'parameternamelist':
          case undefined:
            break;
            
          default:
            console.assert(false, element['#name'] + ': not yet supported.');
        }
        
        // recurse on children elements
        if (element.$$) {
          s += toMarkdown(element.$$, context);
        }
        
        // closing the element
        switch (element['#name']) {
          case 'parameterlist':
          case 'para': s += '\n\n'; break;
          case 'emphasis': s += '*'; break;
          case 'bold': s += '**'; break;
          case 'parameteritem': s += '\n'; break;
          case "computeroutput": s += '`'; break;
          case 'parametername': s += '` '; break;
          case 'entry': s = markdown.escape.cell(s) + '|'; break;
          case 'programlisting': s += '```\n'; break;
          case 'codeline': s += '\n'; break;
          case 'ulink': s = markdown.link(s, element.$.url); break;
          case 'itemizedlist': s += '\n'; break;
          case 'listitem': s += '\n'; break;
          case 'entry': s = ' | '; break;
          case 'row':
            s = '\n' + markdown.escape.row(s);
            if (element.$$ && element.$$[0].$.thead == "yes") {
              element.$$.forEach(function (th, i) {
                s += (i ? ' | ' : '\n') + '---------';
              });
            }
            break;
        }
        
      }
      break;

    default:
      console.assert(false);
  }
  
  return s;
}

function copy(dest, property, def) {
  dest[property] = trim(toMarkdown(def[property]));
}

module.exports = {
    
  parseMembers: function (compound, props, membersdef) {

    // Copy all properties.
    Object.keys(props).forEach(function(prop) {
      compound[prop] = props[prop];
    });
    
    allIds[compound.refid] = compound;
    
    if (membersdef) {
      membersdef.forEach(function (memberdef) {
        var member = { name: memberdef.name[0] };
        this.members.push(member);
        Object.keys(memberdef.$).forEach(function(prop) {
          member[prop] = memberdef.$[prop];
        });
        allIds[member.refid] = member;
      }.bind(compound));
    }
    
  },
  
  parseMember: function (member, section, memberdef) {
    log.verbose('Processing member ' + member.name);
    member.section = section;
    copy(member, 'briefdescription', memberdef);
    copy(member, 'detaileddescription', memberdef);
    
    var m = [];
    
    switch (member.kind) {
      case 'function':
        m = m.concat(memberdef.$.prot, ' '); // public, private, ...
        if (memberdef.templateparamlist) {
          m.push('template<');
          memberdef.templateparamlist[0].param.forEach(function (param, argn) {
            m = m.concat(argn == 0 ? [] : ',');
            m = m.concat([toMarkdown(param.type)]);
            m = m.concat(param.declname ? [' ', toMarkdown(param.declname)] : []); 
          });
          m.push('>  \n');
        }
        m = m.concat(memberdef.$.inline == 'yes' ? ['inline', ' '] : []);
        m = m.concat(memberdef.$.static == 'yes' ? ['static', ' '] : []);
        m = m.concat(memberdef.$.virt == 'virtual' ? ['virtual', ' '] : []);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        m = m.concat(memberdef.$.explicit  == 'yes' ? ['explicit', ' '] : []);
        m = m.concat(memberdef.name[0]._, '(');
        if (memberdef.param) {
          memberdef.param.forEach(function (param, argn) {
            m = m.concat(argn == 0 ? [] : ',');
            m = m.concat([toMarkdown(param.type)]);
            m = m.concat(param.declname ? [' ', toMarkdown(param.declname)] : []); 
          });
        }

        m = m.concat(')');
        m = m.concat(memberdef.$['const']  == 'yes' ? [' ', 'const'] : []);
        m = m.concat(memberdef.argsstring[0]._.match(/noexcept$/) ? ' noexcept' : '');
        m = m.concat(memberdef.argsstring[0]._.match(/=\s*delete$/) ? ' = delete' : '');
        m = m.concat(memberdef.argsstring[0]._.match(/=\s*default/) ? ' = default' : '');
        break;
        
      case 'variable':
        m = m.concat(memberdef.$.prot, ' '); // public, private, ...
        m = m.concat(memberdef.$.static == 'yes' ? ['static', ' '] : []);
        m = m.concat(memberdef.$.mutable == 'yes' ? ['mutable', ' '] : []);
        m = m.concat(toMarkdown(memberdef.type), ' ');
        m = m.concat(memberdef.name[0]._);
        break;
        
      default:
        m.push(member.name);
        break;
    }
    
    member.proto = inline(m);
  },
  
  parseCompound: function (compound, compounddef) {
    
    log.verbose('Processing compound ' + compound.name);
    Object.keys(compounddef.$).forEach(function(prop) {
      compound[prop] = compounddef.$[prop];
    });
    compound.fullname = compounddef.compoundname[0]._;
    copy(compound, 'briefdescription', compounddef);
    copy(compound, 'detaileddescription', compounddef);
    
    if (compounddef.basecompoundref) {
      compounddef.basecompoundref.forEach(function (basecompoundref) {
        compound.basecompoundref.push({
          prot: basecompoundref.$.prot,
          name: basecompoundref._,
        });
      });
    }
    
    if (compounddef.sectiondef) {
      compounddef.sectiondef.forEach(function (section) {
        switch (section.$['kind']) {
          case 'friend':
          case 'public-attrib':
          case 'public-func':
          case 'protected-attrib':
          case 'protected-func':
          case 'private-attrib':
          case 'private-func':
            section.memberdef.forEach(function (memberdef) {
              this.parseMember(allIds[memberdef.$.id], section.$['kind'], memberdef);
            }.bind(this));
            break;

          default:
            console.assert(true);
        }
      }.bind(this));
    }
    
    compound.proto = inline([compound.kind, ' ', markdown.link(inline(compound.name), '#' + compound.refid, true)]);
    
    /*
    (compounddef.innerclass || []).forEach(function (innerclass) {
      this.parseCompound(refIds[innerclass.$.refid], innerclass);
    }.bind(this));
    */
    
    return;
  },
  
  parseIndex: function (directory, root, index, options) {
    
    index.forEach(function (element) {
      var doxygen, compound = root.find(element.name[0].split('::'), true);
      var xmlParser = new xml2js.Parser({
        explicitChildren: true,
        preserveChildrenOrder: true,
        charsAsChildren: true
      });
      this.parseMembers(compound, element.$, element.member);
      log.verbose('Parsing ' + path.join(directory, compound.refid + '.xml'));
      doxygen = fs.readFileSync(path.join(directory, compound.refid + '.xml'), 'utf8');
      xmlParser.parseString(doxygen, function (err, data) {
        this.parseCompound(compound, data.doxygen.compounddef[0]);
      }.bind(this));
    }.bind(this));
    
    root.toArray('compounds').forEach(function (compound) {
      compound.filtered.members = compound.filter(compound.members, 'section', options.compound.members.filter);
      compound.filtered.compounds = compound.filter(compound.compounds, 'kind', options.compound.compounds.filter);
    })
    root.filtered.compounds = root.filter(root.compounds, 'kind', options.compound.compounds.filter);
  }
};
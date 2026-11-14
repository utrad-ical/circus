//
// The following code does NOT contain actual usage examples of CIRCUS RS.
// See examples.js for demo scripts.
//

import * as rs from '../src/browser/index.ts';
import '../src/browser/circus-rs.css';
import examplesSource from './examples.js?raw';
import { toPartialVolumeDescriptor } from './utils.js';

// The example scripts are evaluated with `new Function()`,
// so everything they use must be global
Object.assign(window, {
  rs,
  toPartialVolumeDescriptor,
  viewer: null,
  viewer2: null
});

const $ = id => document.getElementById(id);
const editor = $('example-script');
const examples = parseExamples(examplesSource);

function restoreConfig() {
  const cfg = JSON.parse(localStorage.getItem('rs-demo-save'));
  if (cfg) {
    $('seriesUid').value = cfg.seriesUid;
    $('partialVolumeDescriptor').value = cfg.partialVolumeDescriptor;
    $('server').value = cfg.server;
  }
}

function parseExamples(data) {
  const items = data.split(/\s(?=\/\*--)/);
  return items.map(item => {
    const res = {};
    item = item.replace(/\/\*--((.|\s)+?)--\*\//g, (m, line) => {
      line = line.replace(
        /^[ \t]*@([a-zA-Z]+)(?:[ \t]+(.*))?$/gm,
        (m, tag, content) => {
          res[tag] = !content ? true : content;
          return '';
        }
      );
      res.desc = line.trim();
      return '';
    });
    res.script = item.trim();
    return res;
  });
}

function buildExampleList() {
  const sel = $('example-select');
  sel.replaceChildren();
  examples.forEach(item => {
    if (item.hidden) return;
    const opt = document.createElement('option');
    opt.textContent = item.title;
    if (item.color) opt.style.backgroundColor = item.color;
    sel.append(opt);
  });
  sel.dispatchEvent(new Event('change'));
}

function processExampleScript(script) {
  return script.replace(/^\s*\/\/--\s*@include\s+(.+)$/gm, (m, title) => {
    title = title.trim();
    const item = examples.find(i => title === i.title);
    if (!item) return '';
    return '\n' + processExampleScript(item.script) + '\n';
  });
}

$('example-select').addEventListener('change', () => {
  const title = $('example-select').value;
  const item = examples.find(i => title === i.title);
  if (!item) return;
  $('example-desc').innerHTML = item.desc;
  const script = processExampleScript(item.script);
  editor.value = script;
  editor.rows = Math.max(15, script.split('\n').length + 1);
});

$('example-run').addEventListener('click', () => {
  try {
    const config = {
      seriesUid: $('seriesUid').value,
      partialVolumeDescriptor: $('partialVolumeDescriptor').value,
      server: $('server').value || location.origin + '/rs'
    };
    localStorage.setItem('rs-demo-save', JSON.stringify(config));

    const title = $('example-select').value;
    const item = examples.find(i => title === i.title);
    if (!item.viewerNotRequired && window.viewer === null) {
      alert('Please create a viewer first.');
      return;
    }

    config.sourceClass = rs[$('type').value]; // ImageSource class
    window.config = config;

    // eval the script
    new Function(editor.value)();
  } catch (err) {
    alert(err.message);
  }
});

restoreConfig();
buildExampleList();

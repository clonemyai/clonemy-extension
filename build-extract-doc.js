// Regenerates extract-doc.js from the canonical extraction document.
//
// Run with: node build-extract-doc.js
//
// extract-doc.js is a GENERATED file (the extraction document bundled
// as a JS string, so the injector can paste it inline with zero
// network). Never edit it by hand. Its source of truth is:
//
//   ~/workspace/goals/alignment-capsule-product/files/EXTRACTION-REQUEST.md
//
// (the same document served at https://clonemy.ai/extract). Whenever
// that file changes, rerun this script, or the bundled copy will
// silently drift from the page. This script proves the round trip:
// the string inside the generated file must equal the source file
// byte for byte, or the script fails without writing anything.
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const SOURCE = path.join(__dirname, '..', 'goals', 'alignment-capsule-product', 'files', 'EXTRACTION-REQUEST.md');
const OUT = path.join(__dirname, 'extract-doc.js');

const text = fs.readFileSync(SOURCE, 'utf8');

const header = [
  '// clonemy.ai extension: the full extraction document, bundled as text.',
  '//',
  '// GENERATED FILE. DO NOT EDIT BY HAND.',
  '// Source of truth: ~/workspace/goals/alignment-capsule-product/files/EXTRACTION-REQUEST.md',
  '// (the same document served at https://clonemy.ai/extract).',
  '// Regenerate with: node build-extract-doc.js',
  '// The bundled copy MUST be regenerated whenever the source file',
  '// changes, or the injector fallback will silently drift from the page.',
  '//',
  '// Why it is bundled: this extension makes no network requests, ever,',
  '// so the document the injector carries as a fallback travels inside',
  '// the package instead of being fetched.',
  ''
].join('\n');

const generated = header + 'var EXTRACT_DOC = ' + JSON.stringify(text) + ';\n';

// Round-trip proof: run the generated file in a sandbox and compare.
const sandbox = {};
vm.runInNewContext(generated, sandbox);
if (sandbox.EXTRACT_DOC !== text) {
  console.error('FAIL: generated EXTRACT_DOC does not match the source byte for byte. Nothing written.');
  process.exit(1);
}

fs.writeFileSync(OUT, generated);
console.log('Wrote extract-doc.js: ' + generated.length + ' bytes of JS carrying ' + text.length + ' characters of document, byte-identical to the source.');

const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
const html = read('web-pages/home/Home.webpage.copy.html');

test('standalone Power Pages template includes the deployed styles and script', () => {
  const template = read('web-templates/consultant-portal/Consultant-portal.webtemplate.source.html');
  assert.match(template, /^<!doctype html>/i);
  assert.ok(template.includes('name="viewport"'));
  assert.ok(template.includes("{% editable page 'adx_copy' type: 'html', liquid: true %}"));
  assert.ok(template.includes(read('web-pages/home/Home.webpage.custom_css.css')));
  assert.ok(template.includes(read('web-pages/home/Home.webpage.custom_javascript.js')));
  assert.ok(template.indexOf('id="consultant-portal-script"') > template.indexOf('</main>'));
  assert.ok(!template.includes('<!-- portal:'));
});

test('screen and accessibility references resolve to unique elements', () => {
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const match of html.matchAll(/\b(?:aria-controls|aria-labelledby|aria-describedby|for)="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) assert.ok(ids.includes(id), 'Missing reference: '+id);
  }
  const config = JSON.parse(read('src/portal/config.json'));
  assert.deepEqual([...html.matchAll(/data-view="([^"]+)"/g)].map(match => match[1]), config.views);
});

test('deployment preserves authentication and excludes preview activation', () => {
  assert.ok(html.includes('{% if user %}true{% else %}false{% endif %}'));
  assert.ok(!html.includes('data-preview='));
  assert.ok(!html.includes('Studio Vermeer Architects'));
  const preview = read('preview.html');
  assert.ok(preview.includes('data-preview="true"'));
  assert.ok(!/\{%|\{\{/.test(preview));
});

test('theme variables resolve and have no invalid suffixes', () => {
  const css = read('web-pages/home/Home.webpage.custom_css.css');
  const defined = [...css.matchAll(/(--portal-[a-z-]+):/g)].map(match => match[1]);
  for (const match of css.matchAll(/var\((--portal-[a-z-]+)\)/g)) assert.ok(defined.includes(match[1]));
  assert.ok(!/var\([^)]+\)[a-z0-9]/.test(css));
});

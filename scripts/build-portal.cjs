const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const source = file => read('src/portal/' + file);
const config = JSON.parse(source('config.json'));
config.formSchema = JSON.parse(source('form-schema.json'));
config.dataverseMap = JSON.parse(source('dataverse-map.json'));
const check = process.argv.includes('--check');
const scripts = ['start', 'rules', 'dataverse-mapping', 'services', 'navigation', 'confidentiality', 'signin', 'form-fields', 'profile', 'preview', 'end'];
const html = source('shell.html').replace(/<!-- view:([a-z]+) -->/g, (_, name) => {
  if (!config.views.includes(name)) throw new Error('Unknown view: ' + name);
  return source('views/' + name + '.html').trim();
});
const css = source('styles/theme.css') + '\n' + source('styles/portal.css');
const js = scripts.map(name => source('scripts/' + name + '.js')).join('\n')
  .replace("  'use strict';", "  'use strict';\n  var portalConfig = " + JSON.stringify(config) + ';');
new vm.Script(js, {filename:'portal.js'});
// New Liquid expressions require an explicit preview substitution.
const previewHtml = html
  .replace('{% if user %}true{% else %}false{% endif %}', 'false')
  .replace('{% if user %}{{ user.fullname | escape }}{% endif %}', 'Studio Vermeer Architects')
  .replaceAll('{{ website.sign_out_url_substitution | escape }}', '#signin')
  .replaceAll('{{ website.sign_in_url_substitution | escape }}', '#signin')
  .replaceAll("{{ settings['ConsultantPortal/ConfidentialityPdfUrl'] | escape }}", '')
  .replace('class="consultant-portal"', 'class="consultant-portal" data-preview="true"');
if (/\{%|\{\{/.test(previewHtml)) throw new Error('Add an explicit preview substitution for the new Liquid expression.');
if (html.includes('data-preview=')) throw new Error('Preview mode must never be enabled in deployment HTML.');
const toolbar = '<aside class="preview-toolbar" aria-label="Design preview">Design preview &middot; No data is sent <select aria-label="Preview screen" id="preview-screen"><option value="signin">Sign in</option><option value="confidentiality">Confidentiality</option><option value="profile">Update profile</option><option value="submit">Submit</option></select></aside>';
const preview = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ascentis &mdash; design preview</title><style>' + css + '</style></head><body>' + previewHtml + toolbar + '<script>' + js + '</script></body></html>\n';
const outputs = {'preview.html':preview};
// Header/footer are disabled on this page template, so it owns the full document.
// Embed the built assets explicitly instead of relying on the standard page wrapper.
outputs['web-templates/consultant-portal/Consultant-portal.webtemplate.source.html'] = source('document.html')
  .replace('<!-- portal:css -->', () => css)
  .replace('<!-- portal:js -->', () => js);
for (const [suffix, value] of Object.entries({'copy.html':html,'custom_css.css':css,'custom_javascript.js':js})) {
  outputs['web-pages/home/Home.webpage.' + suffix] = value;
  outputs['web-pages/home/content-pages/Home.en-US.webpage.' + suffix] = value;
}
for (const [file, value] of Object.entries(outputs)) {
  if (check) {
    if (!fs.existsSync(path.join(root,file)) || read(file) !== value) throw new Error(file + ' is stale. Run npm run build.');
  } else fs.writeFileSync(path.join(root,file), value);
}
console.log(check ? 'Generated files are current.' : 'Built Power Pages assets and preview.html.');

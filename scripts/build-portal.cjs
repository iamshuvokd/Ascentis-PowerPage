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
// The logo is inlined as a data URI so the standalone page and preview need no extra web file.
const logoDataUri = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'src/portal/assets/ascentis-logo.png')).toString('base64');
const html = source('shell.html').replace(/%%ASCENTIS_LOGO%%/g, () => logoDataUri).replace(/<!-- view:([a-z]+) -->/g, (_, name) => {
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
  .replace('{% if user %}{{ user.emailaddress1 | escape }}{% endif %}', 'contact@studiovermeer.com')
  .replace('{% if user %}{{ user.asc_consultantid.id | escape }}{% endif %}', '')
  .replaceAll('{{ website.sign_out_url_substitution | escape }}', '#signin')
  .replaceAll('{{ website.sign_in_url_substitution | escape }}', '#signin')
  .replaceAll("{{ settings['ConsultantPortal/AuditActorSystemUserId'] | escape }}", '')
  .replaceAll("{{ settings['ConsultantPortal/ConfidentialityPdfUrl'] | escape }}", '')
  .replaceAll("{{ settings['ConsultantPortal/ConfidentialityFlowId'] | escape }}", '')
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
// Branded standalone status documents (own page templates, no site header/footer): 404 and access denied.
const statusIcons = {
  notFound: '<svg viewBox="0 0 120 120" width="112" height="112" focusable="false"><circle cx="60" cy="60" r="56" fill="#ebf7e4" stroke="#99de80" stroke-width="2"/><path d="M38 34h30l14 14v38a4 4 0 0 1-4 4H38a4 4 0 0 1-4-4V38a4 4 0 0 1 4-4z" fill="#fff" stroke="#287d17" stroke-width="3" stroke-linejoin="round"/><path d="M68 34v14h14" fill="none" stroke="#287d17" stroke-width="3" stroke-linejoin="round"/><circle cx="56" cy="64" r="11" fill="none" stroke="#00143e" stroke-width="3"/><path d="M64 72l10 10" stroke="#00143e" stroke-width="3.5" stroke-linecap="round"/></svg>',
  locked: '<svg viewBox="0 0 120 120" width="112" height="112" focusable="false"><circle cx="60" cy="60" r="56" fill="#ebf7e4" stroke="#99de80" stroke-width="2"/><path d="M44 54V46a16 16 0 0 1 32 0v8" fill="none" stroke="#00143e" stroke-width="4" stroke-linecap="round"/><rect x="36" y="54" width="48" height="36" rx="6" fill="#fff" stroke="#287d17" stroke-width="3"/><circle cx="60" cy="70" r="5" fill="#00143e"/><path d="M60 74v8" stroke="#00143e" stroke-width="3.5" stroke-linecap="round"/></svg>'
};
const backScript = `  <script>
    (function () {
      var back = document.getElementById('status-back');
      if (!back) return;
      if (!window.history || window.history.length < 2) { back.hidden = true; return; }
      back.addEventListener('click', function () { window.history.back(); });
    }());
  </script>`;
const statusPages = {
  'ascentis-status-page/Ascentis-status-page': {
    title: 'Page not found', eyebrow: 'Error 404', heading: 'We can&rsquo;t find that page', icon: statusIcons.notFound, script: backScript,
    message: 'The page you are looking for may have moved, been renamed, or the link may be incorrect. Please check the address, or use one of the options below to continue.',
    actions: `          <a class="status-button status-button-primary" href="/">Go to the portal</a>
          <button class="status-button status-button-secondary" type="button" id="status-back">Go back</button>`,
    help: 'Need help? Contact your Ascentis representative and quote the address you tried to open.'
  },
  'ascentis-access-denied/Ascentis-access-denied': {
    title: 'Access denied', eyebrow: 'Error 403', heading: 'You don&rsquo;t have access to this page', icon: statusIcons.locked, script: backScript,
    message: 'Your account does not have permission to view this page. If you were invited to update a consultant profile, sign in with the email address that received the invitation.',
    actions: '          {% if user %}<a class="status-button status-button-primary" href="/">Go to the portal</a><a class="status-button status-button-secondary" href="{{ website.sign_out_url_substitution | escape }}">Sign out</a>{% else %}<a class="status-button status-button-primary" href="{{ website.sign_in_url_substitution | escape }}">Sign in</a><button class="status-button status-button-secondary" type="button" id="status-back">Go back</button>{% endif %}',
    help: 'Think this is a mistake? Contact your Ascentis representative and tell them which page you were trying to open.'
  }
};
for (const [file, page] of Object.entries(statusPages)) {
  outputs['web-templates/' + file + '.webtemplate.source.html'] = source('status-page.html')
    .replace('<!-- portal:css -->', () => source('styles/theme.css') + '\n' + source('styles/status-page.css'))
    .replace(/%%([A-Z_]+)%%/g, (match, key) => key === 'ASCENTIS_LOGO' ? logoDataUri : (page[key.toLowerCase()] !== undefined ? page[key.toLowerCase()] : match));
}
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

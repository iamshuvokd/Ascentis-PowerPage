// Uses installed Edge. Set ASCENTIS_PLAYWRIGHT_PATH to reuse a temporary Playwright install.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.ASCENTIS_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const previewUrl = pathToFileURL(path.join(root, 'preview.html')).href + '#profile';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'ascentis-ui-check-'));

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', dialog => dialog.accept());
    const reset = async () => {
      await page.goto('about:blank');
      await page.goto(previewUrl);
      await page.locator('[data-view="profile"]').waitFor({state:'visible'});
    };
    const tab = async index => page.locator('#tab-' + index).click();
    const field = (panel, key) => page.locator('#panel-' + panel + ' [data-field-key="' + key + '"]');
    await reset();
    for (let index = 0; index < 8; index++) {
      await tab(index);
      assert.ok(await page.locator('#panel-' + index).isVisible());
      await page.screenshot({path:path.join(output, 'desktop-' + index + '.png'),fullPage:true});
    }
    assert.deepEqual(errors, []);
    console.log('PASS: all eight profile tabs render without script errors.');

    await tab(1);
    await field(1, 'yearFormat').selectOption('YYYY/ZZ (Apr–Mar)');
    assert.match(await page.locator('#panel-1 label').allTextContents().then(x=>x.join(' ')), /2024\/25/);
    await field(1, 'revenue1').fill('0');
    assert.match(await page.locator('#backlog-ratio').textContent(), /Not available/);
    await field(1, 'revenue1').fill('5850000');
    assert.match(await page.locator('#backlog-ratio').textContent(), /71\.8%/);
    await field(1, 'region-0').fill('50');
    assert.match(await page.locator('#revenue-warning').textContent(), /86\.0%/);

    await tab(2);
    await field(2, 'indemnified').selectOption('Yes');
    assert.ok(await field(2, 'indemnityDetails').isVisible());
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    assert.ok(await page.locator('#profile-errors').isVisible());
    await page.locator('#profile-errors button').filter({hasText:'Indemnification details'}).click();
    assert.equal(await field(2, 'indemnityDetails').evaluate(el=>el===document.activeElement), true);
    await field(2, 'indemnityDetails').fill('Example details');
    await field(2, 'indemnified').selectOption('No');
    assert.ok(await field(2, 'indemnityDetails').isDisabled());
    await tab(6);
    await field(6, 'certified').selectOption('No');
    assert.ok(await field(6, 'certificationDetails').isDisabled());
    console.log('PASS: fiscal calculations, percentage warnings and conditional validation.');

    await reset();
    await tab(4);
    await page.getByRole('button',{name:'Lagoon Resort',exact:true}).click();
    let dialog = page.locator('dialog[open]');
    assert.ok(await dialog.isVisible());
    assert.ok(await dialog.locator('[data-field-key="keys"]').isVisible());
    assert.ok(await dialog.locator('[data-field-key="gfa"]').isDisabled());
    await dialog.locator('[data-field-key="type"]').selectOption('Commercial');
    assert.ok(await dialog.locator('[data-field-key="gfa"]').isVisible());
    await dialog.locator('[data-field-key="gfa"]').fill('24000');
    await dialog.locator('[data-field-key="completionYear"]').fill('2020');
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await page.locator('#profile-errors button').filter({hasText:'Completion year'}).click();
    assert.ok(await page.locator('dialog[open]').isVisible());
    await page.locator('dialog[open] [data-field-key="completionYear"]').fill('2024');
    await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    console.log('PASS: table editors, conditional project fields and error links into dialogs.');

    await tab(3);
    await page.getByRole('button',{name:'Edit office in Middle East',exact:true}).click();
    dialog = page.locator('dialog[open]');
    await dialog.locator('[data-field-key="status"]').selectOption('Inactive');
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    assert.match(await page.locator('#profile-errors').textContent(), /active office or three completed projects for: Middle East/);
    await tab(0);
    await page.getByRole('button',{name:'Remove Middle East',exact:true}).click();
    assert.ok(await page.locator('[data-tags="Regions"] option[value="Middle East"]').isDisabled());
    console.log('PASS: removing office eligibility blocks submission and region selection.');

    await reset();
    await tab(3);
    await page.getByRole('button',{name:'Edit office in Middle East',exact:true}).click();
    dialog = page.locator('dialog[open]');
    await dialog.getByRole('button',{name:'Add office leaders (up to 3)',exact:true}).click();
    // Selecting a value rebuilds the chip/menu list, so assert the canonical selection.
    await dialog.getByRole('checkbox',{name:'S. Iyer (Studio Head)',exact:true}).click();
    assert.equal(await dialog.locator('[data-field-key="leaders"]').evaluate(el=>el.selectedOptions.length), 3);
    assert.ok(await dialog.getByRole('checkbox',{name:'P. Rao',exact:true,includeHidden:true}).isDisabled());
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:'P. Rao',exact:true}).click();
    dialog = page.locator('dialog[open]');
    await dialog.locator('[data-field-key="email"]').fill('haddad@example.com');
    await dialog.getByRole('button',{name:'Done',exact:true}).click();
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    assert.match(await page.locator('#profile-errors').textContent(), /already used by another contact/);
    console.log('PASS: three-leader selection limit and duplicate contact email validation.');

    await reset();
    await tab(7);
    await page.locator('#profile-files').setInputFiles({name:'too-large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(25000001)});
    assert.match(await page.locator('#attachment-message').textContent(), /exceeds/);
    await page.locator('#profile-files').setInputFiles({name:'new.pdf',mimeType:'application/pdf',buffer:Buffer.from('example')});
    assert.ok(await page.getByRole('button',{name:'new.pdf',exact:true}).isVisible());
    await page.getByRole('button',{name:'Delete new.pdf',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'new.pdf',exact:true}).count(), 0);
    await tab(4);
    await page.getByRole('button',{name:'Lagoon Resort',exact:true}).click();
    await page.locator('dialog[open] input[type="file"]').setInputFiles({name:'project.pdf',mimeType:'application/pdf',buffer:Buffer.from('project')});
    await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    await tab(7);
    assert.ok(await page.getByRole('button',{name:'project.pdf',exact:true}).isVisible());
    console.log('PASS: file-size rejection, deletion and project attachment cross-listing.');

    await reset();
    await tab(4);
    for (let index = 2; index < 30; index++) {
      await page.locator('[data-add="projects"]').click();
      await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    }
    assert.ok(await page.locator('[data-add="projects"]').isDisabled());
    await tab(5);
    for (let index = 1; index < 10; index++) {
      await page.locator('[data-add="bimProjects"]').click();
      await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    }
    assert.ok(await page.locator('[data-add="bimProjects"]').isDisabled());
    console.log('PASS: 30-project and 10-BIM-project limits.');

    await reset();
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#profile-status').textContent.includes('in memory'));
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await page.locator('[data-view="submit"]').waitFor({state:'visible'});
    assert.ok(await page.locator('#submission-preview-note').isVisible());
    assert.match(await page.locator('#next-revalidation-date').textContent(), /Available after review/);
    console.log('PASS: clearly labelled preview draft and submission response flow.');

    await page.setViewportSize({width:390,height:844});
    await reset();
    for (let index = 0; index < 8; index++) {
      await tab(index);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth + 1), 'Page overflow on mobile tab ' + index);
      await page.screenshot({path:path.join(output, 'mobile-' + index + '.png'),fullPage:true});
    }
    console.log('PASS: all mobile tabs fit the viewport; wide tables scroll within their container.');

    // Exercise the actual generated standalone template, substituting only server-provided Liquid.
    let live = fs.readFileSync(path.join(root,'web-templates/consultant-portal/Consultant-portal.webtemplate.source.html'),'utf8');
    live = live.replace(/\{% editable[^%]+%\}/,()=>fs.readFileSync(path.join(root,'web-pages/home/Home.webpage.copy.html'),'utf8'))
      .replace('{% if user %}true{% else %}false{% endif %}', 'true')
      .replace('{% if user %}{{ user.fullname | escape }}{% endif %}', 'Test consultant')
      .replace(/\{\{[\s\S]*?\}\}/g, '');
    const liveFile=path.join(output,'live.html');fs.writeFileSync(liveFile,live);
    await page.goto(pathToFileURL(liveFile).href);
    await page.locator('#confidentiality-agreement').check();
    await page.getByRole('button',{name:'Acknowledge and continue',exact:true}).click();
    assert.ok(await page.locator('[data-view="profile"]').isVisible());
    assert.match(await page.locator('#acknowledged-date').textContent(), /recorded when your profile is saved/);
    assert.deepEqual(errors, []);
    console.log('PASS: live template initializes and does not bypass unconnected acknowledgement.');
    console.log('Screenshots: ' + output);
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

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
    for (let index = 0; index < 9; index++) {
      await tab(index);
      assert.ok(await page.locator('#panel-' + index).isVisible());
      await page.screenshot({path:path.join(output, 'desktop-' + index + '.png'),fullPage:true});
    }
    assert.deepEqual(errors, []);
    console.log('PASS: all nine profile tabs render without script errors.');

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
    await tab(7);
    await field(7, 'certified').selectOption('No');
    assert.ok(await field(7, 'certificationDetails').isDisabled());
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
    await tab(8);
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
    await tab(8);
    assert.ok(await page.getByRole('button',{name:'project.pdf',exact:true}).isVisible());
    console.log('PASS: file-size rejection, deletion and project attachment cross-listing.');

    await reset();
    await tab(4);
    for (let index = 2; index < 30; index++) {
      await page.locator('[data-add="projects"]').click();
      await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    }
    assert.ok(await page.locator('[data-add="projects"]').isDisabled());
    await tab(6);
    for (let index = 1; index < 10; index++) {
      await page.locator('[data-add="bimProjects"]').click();
      await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    }
    assert.ok(await page.locator('[data-add="bimProjects"]').isDisabled());
    console.log('PASS: 30-project and 10-BIM-project limits.');

    // Required-field coverage: clear every enabled required control and make sure a real submit rejects each one.
    await reset();
    const requiredCount = await page.evaluate(() => {
      const controls = Array.from(document.querySelectorAll('#profile-form input, #profile-form select, #profile-form textarea')).filter(c => c.required && !c.disabled && c.type !== 'file');
      controls.forEach(c => { c.value = ''; });
      return controls.length;
    });
    assert.ok(requiredCount >= 20, 'expected many required controls, found ' + requiredCount);
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await page.locator('#profile-errors').waitFor({state:'visible'});
    assert.equal(await page.locator('dialog.confirm-dialog[open]').count(), 0); // invalid form never reaches the confirmation
    const notRejected = await page.evaluate(() => Array.from(document.querySelectorAll('#profile-form input, #profile-form select, #profile-form textarea'))
      .filter(c => c.required && !c.disabled && c.type !== 'file' && c.value === '' && c.getAttribute('aria-invalid') !== 'true')
      .map(c => c.dataset.label || c.name || c.id));
    assert.deepEqual(notRejected, []);
    console.log('PASS: every empty required field blocks submission (' + requiredCount + ' controls checked).');

    // Conditional required fields: required only while their controlling answer applies.
    await reset();
    const conditionals = [['indemnified','Yes','indemnityDetails'],['litigation','Yes','litigationDetails'],['insured','Yes','perOccurrence'],['insured','Yes','aggregate'],
      ['capability','In-house','operators'],['certified','Yes','certificationDetails'],['reporting','Yes','frameworkDetails'],['qa','Yes','qaDetails']];
    for (const [controller, value, dependent] of conditionals) {
      const state = await page.evaluate(([controller, value, dependent]) => {
        const c = document.querySelector('#profile-form [data-field-key="' + controller + '"]');
        const d = document.querySelector('#profile-form [data-field-key="' + dependent + '"]');
        const set = v => { c.value = v; c.dispatchEvent(new Event('change', {bubbles:true})); };
        set(value);
        const whenApplies = {required: d.required, disabled: d.disabled};
        const other = Array.from(c.options).map(o => o.value).find(v => v && v !== value);
        set(other);
        return {whenApplies, whenNot: {required: d.required, disabled: d.disabled}};
      }, [controller, value, dependent]);
      assert.deepEqual(state.whenApplies, {required: true, disabled: false}, dependent + ' must be required when ' + controller + ' = ' + value);
      assert.deepEqual(state.whenNot, {required: false, disabled: true}, dependent + ' must not be required otherwise');
    }
    console.log('PASS: conditional required fields switch on and off with their controlling answer.');

    // A locked tab (Submitted/Accepted/Rejected) with an empty required field must not block submitting the rest.
    await reset();
    await page.evaluate(() => {
      document.getElementById('panel-2').dataset.locked = 'true';
      const legal = document.querySelector('#panel-2 [data-field-key="indemnified"]');
      legal.value = ''; // required and empty, but the tab is locked
    });
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await page.locator('dialog.confirm-dialog[open]').waitFor({state:'visible'});
    assert.equal(await page.locator('#profile-errors').isVisible(), false);
    await page.locator('dialog.confirm-dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
    console.log('PASS: empty required fields in a locked tab do not block submitting the other tabs.');

    // Locked-tab banner with a rounded status pill beside it, and no marker on the tab label.
    await reset();
    await page.evaluate(() => {
      const statuses = {Submitted:'panel-0', Accepted:'panel-1', Rejected:'panel-2'};
      Object.keys(statuses).forEach(status => {
        const text = {Submitted:'This section has been submitted', Accepted:'reviewed and accepted by Ascentis', Rejected:'Please contact Ascentis to have it reopened'}[status];
        const pill = {Submitted:'Pending', Accepted:'Accepted', Rejected:'Rejected'}[status];
        const banner = document.createElement('p');
        banner.className = 'pending-review-banner';
        banner.innerHTML = '<span class="banner-text">' + text + '</span><span class="status-pill status-pill-' + status.toLowerCase() + '">' + pill + '</span>';
        document.getElementById(statuses[status]).prepend(banner);
      });
    });
    for (const [index, pill] of [[0,'Pending'],[1,'Accepted'],[2,'Rejected']]) {
      await tab(index);
      const shown = page.locator('#panel-' + index + ' .status-pill');
      assert.equal((await shown.textContent()).trim(), pill);
      const radius = await shown.evaluate(el => getComputedStyle(el).borderRadius);
      assert.ok(parseFloat(radius) >= 100, 'pill must be fully rounded');
    }
    assert.equal(await page.locator('[role=tab] .status-pill').count(), 0);
    // The absolutely positioned "+ upload" button must not sit on top of the pill when Attachments is locked.
    await tab(8);
    assert.equal(await page.locator('#panel-8>.upload-button').isVisible(), true);
    await page.evaluate(() => {
      const panel = document.getElementById('panel-8');
      panel.classList.add('tab-locked');
      const banner = document.createElement('p');
      banner.className = 'pending-review-banner';
      banner.innerHTML = '<span class="banner-text">This section has been submitted and can no longer be edited.</span><span class="status-pill status-pill-submitted">Pending</span>';
      panel.prepend(banner);
    });
    assert.equal(await page.locator('#panel-8>.upload-button').isVisible(), false);
    console.log('PASS: locked-tab banner shows a rounded status pill; tab labels carry no marker.');

    await reset();
    await page.getByRole('button',{name:'Save draft',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('#profile-status').textContent.includes('in memory'));
    // Confirmation step: Cancel sends nothing and stays on the profile; "Yes, submit" completes the submission.
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    const confirmDialog = page.locator('dialog.confirm-dialog[open]');
    await confirmDialog.waitFor({state:'visible'});
    assert.match(await confirmDialog.textContent(), /Are you sure you want to submit/);
    assert.match(await confirmDialog.textContent(), /Once submitted, the data cannot be changed/);
    await confirmDialog.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await page.locator('[data-view="submit"]').isVisible(), false);
    await page.waitForFunction(()=>document.querySelector('#profile-status').textContent.includes('Submission cancelled'));
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await confirmDialog.getByRole('button',{name:'Yes, submit',exact:true}).click();
    await page.locator('[data-view="submit"]').waitFor({state:'visible'});
    assert.ok(await page.locator('#submission-preview-note').isVisible());
    assert.match(await page.locator('#next-revalidation-date').textContent(), /Available after review/);
    console.log('PASS: clearly labelled preview draft and submission response flow.');

    await reset();
    await tab(5);
    await page.locator('[data-add="operatorApprovals"]').click();
    await page.locator('dialog[open] [data-field-key="operator"]').selectOption('Hilton');
    await page.locator('dialog[open]').getByRole('button',{name:'Done',exact:true}).click();
    assert.ok(await page.locator('#panel-5').getByRole('button',{name:'Hilton',exact:true}).isVisible());
    console.log('PASS: operator approval can be added from the Operator approvals tab.');

    await page.setViewportSize({width:390,height:844});
    await reset();
    for (let index = 0; index < 9; index++) {
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

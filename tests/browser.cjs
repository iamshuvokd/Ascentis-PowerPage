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
    let nativeDialogs = 0;               // the browser's own confirm()/alert() must never be used any more
    page.on('dialog', dialog => { nativeDialogs++; dialog.accept(); });
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
    await dialog.locator('.close-editor').click();
    await page.getByRole('button',{name:'Submit for review',exact:true}).click();
    await page.locator('#profile-errors button').filter({hasText:'Completion year'}).click();
    assert.ok(await page.locator('dialog[open]').isVisible());
    await page.locator('dialog[open] [data-field-key="completionYear"]').fill('2024');
    await page.locator('dialog[open]').locator('.close-editor').click();
    console.log('PASS: table editors, conditional project fields and error links into dialogs.');

    await tab(3);
    await page.getByRole('button',{name:'Edit office in Middle East',exact:true}).click();
    dialog = page.locator('dialog[open]');
    await dialog.locator('[data-field-key="status"]').selectOption('Inactive');
    await dialog.locator('.close-editor').click();
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
    // In a popup the leaders are shown inline as checkboxes (no "+ add" button to open first).
    assert.equal(await dialog.getByRole('button',{name:'Add office leaders (up to 3)',exact:true}).isVisible(), false);
    // Selecting a value rebuilds the list, so assert the canonical selection.
    await dialog.getByRole('checkbox',{name:'S. Iyer (Studio Head)',exact:true}).click();
    assert.equal(await dialog.locator('[data-field-key="leaders"]').evaluate(el=>el.selectedOptions.length), 3);
    assert.ok(await dialog.getByRole('checkbox',{name:'P. Rao',exact:true,includeHidden:true}).isDisabled());
    await dialog.locator('.close-editor').click();
    await page.getByRole('button',{name:'P. Rao',exact:true}).click();
    dialog = page.locator('dialog[open]');
    await dialog.locator('[data-field-key="email"]').fill('haddad@example.com');
    await dialog.locator('.close-editor').click();
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
    assert.equal(await page.locator('dialog[open] input[type="file"]').evaluate(el=>el.multiple), true);
    await page.locator('dialog[open] input[type="file"]').setInputFiles([{name:'project.pdf',mimeType:'application/pdf',buffer:Buffer.from('project')},{name:'project-2.pdf',mimeType:'application/pdf',buffer:Buffer.from('project two')},{name:'project-big.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(25000001)}]);
    assert.equal(await page.locator('dialog[open] input[type="file"]').evaluate(el=>el.files.length), 2);
    assert.equal(await page.locator('dialog[open] .file-tile:not(.file-tile-saved)').count(), 2);
    await page.locator('dialog[open]').getByRole('button',{name:'Remove project-2.pdf',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .file-tile:not(.file-tile-saved)').count(), 1);
    await page.locator('dialog[open] input[type="file"]').setInputFiles([{name:'third.pdf',mimeType:'application/pdf',buffer:Buffer.from('third')}]);
    assert.equal(await page.locator('dialog[open] .file-tile:not(.file-tile-saved)').count(), 2);
    await page.locator('dialog[open]').getByRole('button',{name:'Remove third.pdf',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .file-tile:not(.file-tile-saved)').count(), 1);
    await page.locator('dialog[open] input[type="file"]').setInputFiles([{name:'project.pdf',mimeType:'application/pdf',buffer:Buffer.from('project')},{name:'project-2.pdf',mimeType:'application/pdf',buffer:Buffer.from('project two')}]);
    await page.locator('dialog[open]').locator('.close-editor').click();
    await tab(8);
    assert.ok(await page.getByRole('button',{name:'project.pdf',exact:true}).isVisible());
    assert.ok(await page.getByRole('button',{name:'project-2.pdf',exact:true}).isVisible());
    await page.getByRole('button',{name:'Delete project.pdf',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'project.pdf',exact:true}).count(), 0);
    assert.ok(await page.getByRole('button',{name:'project-2.pdf',exact:true}).isVisible());
    console.log('PASS: file-size rejection, deletion and project attachment cross-listing.');

    await reset();
    await tab(4);
    await page.getByRole('button',{name:'Lagoon Resort',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .file-tile-saved').count(), 3);
    assert.match(await page.locator('dialog[open] .file-tile-saved').allTextContents().then(x => x.join(' ')), /Lagoon-brochure.pdf/);
    console.log('PASS: project popup lists the files already saved for that project.');

    // Only Draft saved files can be removed; Submitted ones have no remove control.
    assert.equal(await page.locator('dialog[open] .file-tile-saved').count(), 3);
    assert.equal(await page.locator('dialog[open]').getByRole('button',{name:'Remove Lagoon-from-app.txt',exact:true}).count(), 1, 'files without a status (added from the app) can be removed');
    assert.equal(await page.locator('dialog[open]').getByRole('button',{name:'Remove Lagoon-brochure.pdf',exact:true}).count(), 0);
    await page.locator('dialog[open]').getByRole('button',{name:'Remove Lagoon-draft-plan.pdf',exact:true}).click();
    await page.locator('dialog.portal-dialog[open]').getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .file-tile-saved').count(), 3, 'Cancel keeps the file');
    await page.locator('dialog[open]').getByRole('button',{name:'Remove Lagoon-draft-plan.pdf',exact:true}).click();
    await page.locator('dialog.portal-dialog[open]').getByRole('button',{name:'Remove',exact:true}).click();
    await page.waitForFunction(() => document.querySelectorAll('dialog[open] .file-tile-saved').length === 2);
    await page.locator('dialog[open] .close-editor').click();
    await tab(8);
    assert.equal(await page.getByRole('button',{name:'Delete Lagoon-draft-plan.pdf',exact:true}).count(), 0);
    assert.equal(await page.getByRole('button',{name:'Delete Lagoon-brochure.pdf',exact:true}).count(), 0);
    console.log('PASS: saved Draft project files can be removed (with confirmation); Submitted ones cannot.');

    await reset();
    await tab(8);
    await page.getByRole('button',{name:'Delete Lagoon-draft-plan.pdf',exact:true}).click();
    await page.locator('dialog.portal-dialog[open]').getByRole('button',{name:'Remove',exact:true}).click();
    await page.waitForFunction(() => !document.getElementById('panel-8').textContent.includes('Lagoon-draft-plan.pdf'));
    console.log('PASS: saved Draft file can be removed from the Attachments tab.');

    await reset();
    await tab(3);
    await page.getByRole('button',{name:'A. Haddad',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .phone-control .dd-button').textContent().then(x=>x.trim()), 'AE +971');
    assert.equal(await page.locator('dialog[open] [data-field-key="phone"]').inputValue(), '4 555 0100');
    await page.locator('dialog[open] .phone-control select').selectOption('GB');
    await page.locator('dialog[open] [data-field-key="phone"]').fill('20 7946 0000');
    await page.locator('dialog[open] .close-editor').click();
    await page.getByRole('button',{name:'A. Haddad',exact:true}).click();
    assert.equal(await page.locator('dialog[open] .phone-control .dd-button').textContent().then(x=>x.trim()), 'GB +44');
    assert.equal(await page.locator('dialog[open] [data-field-key="phone"]').inputValue(), '20 7946 0000');
    await page.locator('dialog[open] .close-editor').click();
    console.log('PASS: contact phone has a country calling-code list and is stored as "+code number".');

    await reset();
    await tab(4);
    for (let index = 2; index < 30; index++) {
      await page.locator('[data-add="projects"]').click();
      await page.locator('dialog[open]').locator('.close-editor').click();
    }
    assert.ok(await page.locator('[data-add="projects"]').isDisabled());
    await tab(6);
    for (let index = 1; index < 10; index++) {
      await page.locator('[data-add="bimProjects"]').click();
      await page.locator('dialog[open]').locator('.close-editor').click();
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

    // Themed dropdowns (mouse + keyboard) must drive the hidden native select, which stays the source of truth.
    await reset();
    await tab(0);
    const firmSelect = page.locator('select[name="firmType"]');
    const firmDropdown = page.locator('#panel-0 .dd').first();
    const firmButton = firmDropdown.locator('.dd-button');
    assert.equal(await firmDropdown.count(), 1, 'Firm type is upgraded to the themed dropdown');
    await firmButton.click();
    assert.equal(await firmDropdown.locator('.dd-menu').isVisible(), true);
    assert.equal(await firmButton.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await firmDropdown.locator('.dd-option').allTextContents(), ['Select firm type', 'Private', 'Public', 'Partnership', 'Sole proprietor']);
    await firmDropdown.locator('.dd-option', {hasText: 'Partnership'}).click();
    assert.equal(await firmSelect.inputValue(), 'Partnership');
    assert.equal((await firmButton.textContent()).trim(), 'Partnership');
    assert.equal(await firmDropdown.locator('.dd-menu').isVisible(), false);
    await firmButton.focus();
    await page.keyboard.press('ArrowDown');                 // opens on the current value
    await page.keyboard.press('ArrowDown');                 // next option
    await page.keyboard.press('Enter');
    assert.equal(await firmSelect.inputValue(), 'Sole proprietor');
    await page.keyboard.press('ArrowUp');
    assert.equal(await firmDropdown.locator('.dd-menu').isVisible(), true);
    await page.keyboard.press('Escape');                    // closes without changing the value, focus stays on the button
    assert.equal(await firmDropdown.locator('.dd-menu').isVisible(), false);
    assert.equal(await firmSelect.inputValue(), 'Sole proprietor');
    assert.equal(await firmButton.evaluate(el => el === document.activeElement), true);
    await firmSelect.evaluate(el => { el.value = 'Public'; });  // programmatic changes are mirrored
    assert.equal((await firmButton.textContent()).trim(), 'Public');
    // "+ Add ..." pill pickers: disabled options cannot be picked, enabled ones add a chip.
    const regionPill = page.locator('#panel-0 .dd-pill').nth(2);
    const chipsBefore = await page.locator('#panel-0 [data-tags="Regions"] .tag').count();
    await regionPill.locator('.dd-button').click();
    const disabledOption = regionPill.locator('.dd-option[aria-disabled="true"]').first();
    assert.ok(await disabledOption.count(), 'ineligible regions are listed as disabled');
    await disabledOption.click({force: true});              // Playwright refuses aria-disabled targets; a real click still lands
    assert.equal(await page.locator('#panel-0 [data-tags="Regions"] .tag').count(), chipsBefore);
    assert.equal(await regionPill.locator('.dd-menu').isVisible(), true, 'a disabled option does not close the list');
    await page.keyboard.press('Escape');
    // Financial "+ add region" picker: same pill dropdown; picking an entry reveals that revenue-share row.
    await tab(1);
    const sharePill = page.locator('#panel-1 > .dd-pill');
    assert.equal(await sharePill.count(), 1, '"+ add region" is upgraded to the pill dropdown');
    const shareRowsBefore = await page.locator('#panel-1 .revenue-shares>.form-field:visible').count();
    await sharePill.locator('.dd-button').click();
    const shareOptions = await sharePill.locator('.dd-option').count();
    assert.ok(shareOptions >= 1);
    await sharePill.locator('.dd-option').first().click();
    assert.equal(await page.locator('#panel-1 .revenue-shares>.form-field:visible').count(), shareRowsBefore + 1);
    await sharePill.locator('.dd-button').click();           // reopening re-renders the list: the chosen region is gone
    assert.equal(await sharePill.locator('.dd-option').count(), shareOptions - 1);
    await page.keyboard.press('Escape');
    console.log('PASS: themed dropdowns work with mouse and keyboard and mirror the native select.');

    // Regression: a click on a label (text) or on a row of the themed list used to be forwarded by the <label> to the hidden
    // native <select>, which opened the browser's own list at the left edge of the field. Nothing may reach it now.
    await reset();
    await tab(0);
    assert.equal(await page.evaluate(() => !document.querySelector('select[name="firmType"]').closest('label')), true, 'Firm type is not wrapped by its label');
    await page.evaluate(() => { window.__nativeSelectClicks = 0; document.querySelectorAll('select[data-enhanced]').forEach(s => s.addEventListener('click', () => { window.__nativeSelectClicks++; })); });
    const firmDd = page.locator('#panel-0 .dd').first();
    await firmDd.locator('.dd-button').click();
    await firmDd.locator('.dd-option', {hasText: 'Public'}).click();
    await page.locator('#panel-0 label', {hasText: 'Firm type'}).click();          // the label opens the themed list instead
    assert.equal(await firmDd.locator('.dd-menu').isVisible(), true);
    await page.keyboard.press('Escape');
    // Every visible label on every tab (clicking text, as a person would):
    let labelsClicked = 0;
    for (let index = 0; index < 8; index++) {
      await tab(index);
      await page.evaluate(() => document.querySelectorAll('select[data-enhanced]').forEach(s => { if (!s.__watched) { s.__watched = true; s.addEventListener('click', () => { window.__nativeSelectClicks++; }); } }));
      const labels = await page.locator('#panel-' + index + ' label').all();
      for (const label of labels) {
        if (!(await label.isVisible())) continue;
        await label.click({position: {x: 3, y: 3}});
        await page.keyboard.press('Escape');
        labelsClicked++;
      }
    }
    assert.ok(labelsClicked > 20, 'many labels were exercised: ' + labelsClicked);
    assert.equal(await page.evaluate(() => window.__nativeSelectClicks), 0, 'no click reached a hidden native select');
    console.log('PASS: label clicks and list rows never open the browser\'s own dropdown.');

    // Floating menus must not be clipped by a popup (record dialog) or panel: every option is hit-testable and the
    // list stays inside the window, even in a short window where the dialog scrolls.
    const everyOptionReachable = async (menuLocator) => menuLocator.evaluate(menu => {
      const box = menu.getBoundingClientRect();
      const options = Array.from(menu.querySelectorAll('.dd-option, .multi-option'));
      const hits = options.map(option => {
        option.scrollIntoView({block: 'nearest'});
        const r = option.getBoundingClientRect();
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return Boolean(hit && menu.contains(hit));
      });
      return {inside: box.top >= 0 && box.bottom <= window.innerHeight && box.left >= 0 && box.right <= document.documentElement.clientWidth, hits, count: options.length};
    });
    await page.setViewportSize({width: 1100, height: 640});
    await reset();
    await tab(3);
    await page.getByRole('button',{name:'+ add contact',exact:true}).click();
    const contactDialog = page.locator('dialog[open]');
    await contactDialog.waitFor({state:'visible'});
    const contactTypeDropdown = contactDialog.locator('.dd').filter({has: page.locator('[data-field-key="contactType"]')});
    await contactTypeDropdown.locator('.dd-button').click();
    let reach = await everyOptionReachable(contactTypeDropdown.locator('.dd-menu'));
    assert.ok(reach.count >= 2 && reach.hits.every(Boolean), 'dropdown options inside a dialog are reachable (not clipped by the dialog)');
    assert.equal(reach.inside, true, 'dropdown list stays inside the window');
    const menuBox = await contactTypeDropdown.locator('.dd-menu').boundingBox();
    const dialogBox = await contactDialog.boundingBox();
    assert.ok(menuBox.y + menuBox.height <= dialogBox.y + dialogBox.height || menuBox.y >= dialogBox.y, 'list is placed relative to the window, not clipped to the dialog');
    await page.keyboard.press('Escape');
    await contactDialog.locator('.close-editor').click();
    await tab(6);
    const bimPicker = page.locator('#panel-6 .multi-picker').first();
    await bimPicker.locator('.text-button').click();
    reach = await everyOptionReachable(bimPicker.locator('.multi-options'));
    assert.ok(reach.count >= 1 && reach.hits.every(Boolean) && reach.inside, 'multi-picker checklist is reachable and inside the window');
    await page.setViewportSize({width: 1440, height: 1000});
    console.log('PASS: floating dropdown and checklist menus are not clipped by dialogs or panels.');

    // Record popups: x / Cancel discard a NEW record (asking first when something was typed), the primary button adds it,
    // an existing record reads Edit / Save and offers Remove behind the themed confirmation; the browser's own
    // confirm()/alert() is never used.
    await reset();
    await tab(3);
    const recordDialogs = () => page.locator('#panel-3 dialog.record-dialog').count();
    const recordsBefore = await recordDialogs();
    const popup = page.locator('dialog.record-popup[open]');
    const themed = page.locator('dialog.portal-dialog[open]');
    await page.getByRole('button',{name:'+ add contact',exact:true}).click();
    await popup.waitFor({state:'visible'});
    assert.equal(await recordDialogs(), recordsBefore + 1);
    assert.equal((await popup.locator('.record-title').textContent()).trim(), 'Add contact');
    assert.equal((await popup.locator('.close-editor').textContent()).trim(), 'Add contact');
    assert.equal(await popup.locator('.record-x').isVisible(), true, 'close (x) button');
    assert.equal(await popup.locator('.record-cancel').isVisible(), true);
    assert.equal(await popup.locator('.remove-record').isVisible(), false, 'a new record has nothing to remove yet');
    assert.equal(await popup.locator('[data-field-key="firstName"]').getAttribute('placeholder'), 'Enter text');
    // 1. x on an untouched new record discards it silently
    await popup.locator('.record-x').click();
    await page.waitForFunction(n => document.querySelectorAll('#panel-3 dialog.record-dialog').length === n, recordsBefore);
    assert.equal(await themed.count(), 0);
    // 2. x after typing asks first: Cancel keeps it, Discard removes it
    await page.getByRole('button',{name:'+ add contact',exact:true}).click();
    await popup.locator('[data-field-key="firstName"]').fill('Zed');
    await popup.locator('.record-x').click();
    await themed.waitFor({state:'visible'});
    assert.equal((await themed.locator('.confirm-title').textContent()).trim(), 'Discard this contact?');
    assert.equal(await themed.getByRole('button',{name:'Cancel',exact:true}).evaluate(el => el === document.activeElement), true, 'Cancel has the initial focus');
    await themed.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await recordDialogs(), recordsBefore + 1, 'Cancel keeps the new record');
    await popup.locator('.record-cancel').click();
    await themed.waitFor({state:'visible'});
    await page.keyboard.press('Escape');                                    // Esc on the question also keeps it
    assert.equal(await recordDialogs(), recordsBefore + 1);
    await popup.locator('.record-cancel').click();
    await themed.getByRole('button',{name:'Discard',exact:true}).click();
    await page.waitForFunction(n => document.querySelectorAll('#panel-3 dialog.record-dialog').length === n, recordsBefore);
    // 3. the primary button adds the record; reopening it reads Edit / Save with Remove behind the themed confirmation
    await page.getByRole('button',{name:'+ add contact',exact:true}).click();
    await popup.locator('[data-field-key="firstName"]').fill('Zed');
    await popup.locator('.close-editor').click();
    assert.equal(await recordDialogs(), recordsBefore + 1, 'Add keeps the record');
    await page.getByRole('button',{name:'Zed',exact:true}).click();
    assert.equal((await popup.locator('.record-title').textContent()).trim(), 'Edit contact — Zed');
    assert.equal((await popup.locator('.close-editor').textContent()).trim(), 'Save contact');
    assert.equal(await popup.locator('.record-cancel').isVisible(), false);
    await popup.locator('.record-x').click();                               // x only closes an existing record
    assert.equal(await recordDialogs(), recordsBefore + 1);
    await page.getByRole('button',{name:'Zed',exact:true}).click();
    await popup.locator('.remove-record').click();
    await themed.waitFor({state:'visible'});
    assert.equal((await themed.locator('.confirm-title').textContent()).trim(), 'Remove contact?');
    assert.match(await themed.textContent(), /all the details you entered/);
    await themed.getByRole('button',{name:'Cancel',exact:true}).click();
    assert.equal(await recordDialogs(), recordsBefore + 1, 'Cancel keeps the record');
    await popup.locator('.remove-record').click();
    await themed.getByRole('button',{name:'Remove',exact:true}).click();
    await page.waitForFunction(n => document.querySelectorAll('#panel-3 dialog.record-dialog').length === n, recordsBefore);
    assert.equal(nativeDialogs, 0, 'no native confirm()/alert() was raised');
    console.log('PASS: record popups add/discard/edit/remove through the themed popup and confirmations.');

    // Every record table has a delete (trash) icon per row, like Shareholders: Project references and BIM projects too.
    for (const [panel, deleteLabel, rowName] of [[4, /^Delete project /, 'Lagoon Resort'], [6, /^Delete BIM project /, 'Coral Bay Hotel']]) {
      await reset();
      await tab(panel);
      const trashButtons = page.locator('#panel-' + panel + ' .portal-table .icon-button');
      const tableRows = page.locator('#panel-' + panel + ' .portal-table tbody tr:not(:has(td.empty-state))');
      const rowsBefore = await tableRows.count();
      assert.ok(rowsBefore >= 1);
      assert.equal(await trashButtons.count(), rowsBefore, 'one delete icon per row (panel ' + panel + ')');
      assert.match(await trashButtons.first().getAttribute('aria-label'), deleteLabel);
      await trashButtons.first().click();
      const confirmDelete = page.locator('dialog.portal-dialog[open]');
      await confirmDelete.waitFor({state:'visible'});
      assert.match(await confirmDelete.locator('.confirm-title').textContent(), /^Remove /);
      await confirmDelete.getByRole('button',{name:'Cancel',exact:true}).click();
      assert.equal(await tableRows.count(), rowsBefore, 'Cancel keeps the row');
      await trashButtons.first().click();
      await page.locator('dialog.portal-dialog[open]').getByRole('button',{name:'Remove',exact:true}).click();
      await page.waitForFunction(([selector, n]) => document.querySelectorAll(selector).length === n, ['#panel-' + panel + ' .portal-table tbody tr:not(:has(td.empty-state))', rowsBefore - 1]);
      assert.equal(await page.getByRole('button',{name:rowName,exact:true}).count() <= 1, true);
    }
    // A locked tab cannot lose records: its delete icons are inert.
    await reset();
    await tab(4);
    await page.evaluate(() => {
      const panel = document.getElementById('panel-4');
      panel.dataset.locked = 'true';
      panel.querySelectorAll('.collection-section .form-field, .collection-section .add-record, .collection-section .remove-record, .collection-section .icon-button').forEach(node => node.setAttribute('inert', ''));
    });
    assert.equal(await page.locator('#panel-4 .portal-table .icon-button').first().getAttribute('inert') !== null, true);
    console.log('PASS: project references and BIM projects have a delete icon per row (themed confirmation); locked tabs keep records.');

    // Attachments: the "Document type" of an added file is the same themed dropdown (not the browser's native select).
    await reset();
    await tab(8);
    await page.locator('#profile-files').setInputFiles({name:'zz-upload-test.pdf', mimeType:'application/pdf', buffer:Buffer.alloc(2048)});
    const certificateRow = page.locator('#panel-8 .portal-table tbody tr', {hasText: 'zz-upload-test.pdf'});
    const docDd = certificateRow.locator('td .dd');
    await docDd.waitFor({state:'visible'});
    // The row action is a trash icon (like the other tables), not the word "Delete".
    assert.equal(await certificateRow.locator('.icon-button').count(), 1);
    assert.equal(await certificateRow.getByRole('button',{name:'Delete zz-upload-test.pdf',exact:true}).count(), 1);
    assert.equal((await certificateRow.locator('.icon-button').textContent()).trim(), '', 'icon only, no text');
    assert.equal((await docDd.locator('.dd-button').textContent()).trim(), 'Select document type');
    assert.equal(await page.locator('#panel-8 .portal-table select:not([data-enhanced])').count(), 0, 'no native document-type select is left');
    await docDd.locator('.dd-button').click();
    assert.equal(await docDd.locator('.dd-menu').isVisible(), true);
    const docOptions = await docDd.locator('.dd-option').allTextContents();
    assert.ok(docOptions.length >= 2, 'document types are listed');
    await docDd.locator('.dd-option').nth(1).click();
    assert.equal(await docDd.locator('select').inputValue(), docOptions[1], 'the choice reaches the native select');
    assert.equal((await docDd.locator('.dd-button').textContent()).trim(), docOptions[1]);
    console.log('PASS: attachment Document type uses the themed dropdown.');

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
    await page.locator('dialog[open]').locator('.close-editor').click();
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
    assert.match(await page.locator('#acknowledged-date').textContent(), /^Confidentiality acknowledged on /);
    assert.match(await page.locator('#acknowledged-date').getAttribute('title'), /recorded when your profile is saved/);
    assert.deepEqual(errors, []);
    console.log('PASS: live template initializes and does not bypass unconnected acknowledgement.');
    console.log('Screenshots: ' + output);
  } finally {
    await browser.close();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

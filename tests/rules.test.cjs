const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/portal/scripts/rules.js'), 'utf8'), context);
const rules = context.profileRules;

test('region eligibility requires an active office or three completed projects', () => {
  const offices = [{region:'Europe',status:'Inactive'}, {region:'South Asia',status:'Active'}];
  const projects = [{region:'Europe',status:'Completed'}, {region:'Europe',status:'Completed'}, {region:'Europe',status:'In progress'}];
  assert.deepEqual(Array.from(rules.eligibleRegions(offices, projects)), ['South Asia']);
  projects[2].status = 'Completed';
  assert.deepEqual(Array.from(rules.eligibleRegions(offices, projects)), ['South Asia','Europe']);
});

test('fiscal labels roll over centuries and ratio handles zero/missing revenue', () => {
  assert.equal(rules.fiscalLabel('2000', true, 1), '1999/00');
  assert.equal(rules.fiscalLabel('2026', false, 3), '2023');
  assert.equal(rules.fiscalLabel('', false, 1), 'N−1');
  assert.equal(rules.backlogRatio('500', '0'), null);
  assert.equal(rules.backlogRatio('', '100'), null);
  assert.equal(rules.backlogRatio('invalid', '100'), null);
  assert.equal(rules.backlogRatio('-10', '100'), null);
  assert.equal(rules.backlogRatio('500', '1000'), 50);
});

test('conditional project fields and dates follow selected values', () => {
  assert.equal(rules.conditionApplies({key:'type',not:'Hotel'},{type:''}), false);
  assert.equal(rules.conditionApplies({key:'type',not:'Hotel'},{type:'Hotel'}), false);
  assert.equal(rules.conditionApplies({key:'type',not:'Hotel'},{type:'Commercial'}), true);
  assert.equal(rules.conditionApplies({key:'insured',value:'Yes'},{insured:'No'}), false);
  assert.ok(rules.yearError('2026','2025'));
  assert.equal(rules.yearError('2025','2025'), '');
});

test('file limit includes exactly 16 MB and percentage warnings are optional', () => {
  assert.equal(rules.fileError({name:'a.pdf',size:16000000},16000000), '');
  assert.ok(rules.fileError({name:'a.pdf',size:16000001},16000000));
  assert.equal(rules.percentageWarning(['','','']), '');
  assert.equal(rules.percentageWarning(['64','21','15']), '');
  assert.ok(rules.percentageWarning(['60','20','15']));
});

// Draft / submit behaviour (staging model, 23 Nov 2026): Save draft / Submit write ONLY asc_portalsubmission rows,
// asc_auditlog and uploaded files (asc_attachment) - never the live consultant/contact/project/shareholder/... tables.
// Runs the REAL dataverse-mapping.js + services.js against a mocked Web API (no network, no browser).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const map = require('../src/portal/dataverse-map.json');
const read = file => fs.readFileSync(path.join(root, 'src/portal', file), 'utf8');
const json = value => JSON.stringify(value);

function freshContext() {
  const ctx = { portalConfig: { dataverseMap: map }, console };
  vm.createContext(ctx);
  vm.runInContext(read('scripts/dataverse-mapping.js'), ctx);
  vm.runInContext(read('scripts/services.js'), ctx);
  ctx.verificationToken = 'test-token';
  return ctx;
}
const created = id => ({ ok: true, headers: { get: h => (h === 'entityid' ? '(' + id + ')' : null) } });

function payload(extra) {
  return Object.assign({
    schemaVersion: 1,
    identity: { firmName: 'Rajan Consultant Limited', firmType: 'Private', disciplines: [], sectors: [], regions: [] },
    sections: {}, revenueByRegion: {}, files: [],
    collections: {
      offices: [], contacts: [], projects: [], bimProjects: [],
      shareholders: [{ id: 'shareholders-1', liveId: null, name: 'Shuvo Kumar Das', equity: '20' }, { id: 'shareholders-2', liveId: null, name: 'Rimon Paul', equity: '40.5' }],
      operatorApprovals: [{ id: 'operatorApprovals-1', liveId: null, operator: 'Marriott', disciplines: ['MEP', 'Structure'], regions: ['Africa'], brands: 'JW Marriott, Autograph' }]
    }
  }, extra || {});
}

function stubbedSaveAll() {
  const ctx = freshContext();
  const sent = [];
  const staged = [];
  const liveWrites = [];
  let n = 0;
  ctx.liveConsultantId = 'consultant-1';
  ctx.webApiRequest = async (method, url, body) => { sent.push([method, url, body]); return created('00000000-0000-4000-8000-' + String(++n).padStart(12, '0')); };
  ctx.resolveReferenceId = async (set, idField, name) => set + ':' + name;
  // The old live-write functions must never be called by saveAll any more.
  ['saveConsultant', 'saveChildTables', 'saveContacts', 'saveShareholders', 'saveOperatorApprovals', 'saveBimProjects', 'saveProjects', 'saveConsultantReferences']
    .forEach(name => { ctx[name] = async () => { liveWrites.push(name); return []; }; });
  ctx.saveAttachments = async () => ({ uploaded: 0, failed: 0, submitted: 0 });
  ctx.logAuditEvent = async () => {};
  ctx.saveTabSubmission = async (consultantId, tab, after, before, status) => { staged.push({ tab, after: JSON.parse(JSON.stringify(after)), status }); };
  return { ctx, sent, staged, liveWrites };
}

for (const status of ['Draft', 'Submitted']) {
  test(status + ': nothing is written to the live tables; every tab is staged with the right status', async () => {
    const { ctx, sent, staged, liveWrites } = stubbedSaveAll();
    const result = await ctx.saveAll(payload(), status);
    assert.equal(liveWrites.length, 0, 'no live-table writer is called');
    assert.equal(sent.length, 0, 'no direct Web API write outside the staging/attachment/audit helpers');
    assert.equal(result.consultantId, 'consultant-1');
    const offices = staged.find(x => x.tab === 'Offices & contacts');
    assert.equal(offices.status, status);
    assert.equal(offices.after.shareholders.length, 2);
    assert.equal(offices.after.shareholders[0].name, 'Shuvo Kumar Das');
    const operators = staged.find(x => x.tab === 'Operator approvals');
    assert.equal(operators.status, status);
    assert.equal(operators.after[0].operator, 'Marriott');
    assert.equal(json(operators.after[0].disciplines), json(['MEP', 'Structure']));
    assert.equal(staged.length, 9, 'all nine tabs are staged');
  });
}

test('saving without a linked consultant record fails clearly instead of creating one', async () => {
  const { ctx } = stubbedSaveAll();
  ctx.liveConsultantId = null;
  await assert.rejects(() => ctx.saveAll(payload(), 'Draft'), /No consultant record is linked/);
});

test('the confidentiality acknowledgement travels with the Identity submission, not the consultant row', async () => {
  const { ctx, staged, liveWrites } = stubbedSaveAll();
  ctx.pendingAcknowledgement = { by: 'Jane Doe', date: '2026-11-23T10:00:00.000Z' };
  await ctx.saveAll(payload(), 'Draft');
  const identity = staged.find(x => x.tab === 'Identity');
  assert.equal(identity.after.confidentialityAcknowledgedBy, 'Jane Doe');
  assert.equal(identity.after.confidentialityAcknowledgedOn, '2026-11-23T10:00:00.000Z');
  assert.equal(liveWrites.length, 0);
});

test('staged tab data comes back into the form on the next sign-in (prefill round trip)', async () => {
  const { ctx, staged } = stubbedSaveAll();
  await ctx.saveAll(payload(), 'Draft');
  const latest = {};
  staged.forEach(x => { latest[x.tab] = { status: x.status, after: JSON.stringify(x.after) }; });
  const prefill = ctx.reconstructPrefillRecord(latest);
  assert.equal(prefill.shareholders.length, 2);
  assert.equal(prefill.shareholders[1].fields.name, 'Rimon Paul');
  assert.equal(prefill.shareholders[1].fields.equity, '40.5');
  assert.equal(prefill.operatorApprovals.length, 1);
  const row = prefill.operatorApprovals[0];
  assert.equal(row.fields.operator, 'Marriott');
  assert.equal(row.fields.brands, 'JW Marriott, Autograph');
  assert.equal(json(row.fields.regions), json(['Africa']));
  assert.equal(prefill.tabStatus['Operator approvals'], 'Draft');
});

test('a Submitted Operator approvals tab is locked: not rewritten by a later save', async () => {
  const { ctx, staged } = stubbedSaveAll();
  ctx.submissionTabStatus = { 'Operator approvals': 'Submitted' };
  await ctx.saveAll(payload(), 'Draft');
  assert.equal(staged.some(x => x.tab === 'Operator approvals'), false);
  assert.ok(staged.some(x => x.tab === 'Offices & contacts'));
});

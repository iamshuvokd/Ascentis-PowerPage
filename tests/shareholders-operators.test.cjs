// Draft / submit behaviour for the Shareholders and Operator approvals sections.
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

// Stubs everything outside the two new sections so saveAll() can run end to end.
function stubbedSaveAll() {
  const ctx = freshContext();
  const sent = [];
  const staged = [];
  let n = 0;
  ctx.webApiRequest = async (method, url, body) => { sent.push([method, url, body]); return created('00000000-0000-4000-8000-' + String(++n).padStart(12, '0')); };
  ctx.resolveReferenceId = async (set, idField, name) => set + ':' + name;
  ctx.saveConsultant = async () => 'consultant-1';
  ctx.saveChildTables = async () => {};
  ctx.saveContacts = async () => [];
  ctx.saveBimProjects = async () => [];
  ctx.saveProjects = async () => [];
  ctx.saveConsultantReferences = async () => {};
  ctx.saveAttachments = async () => ({ uploaded: 0, failed: 0, submitted: 0 });
  ctx.logAuditEvent = async () => {};
  ctx.saveTabSubmission = async (consultantId, tab, after, before, status) => { staged.push({ tab, after: JSON.parse(JSON.stringify(after)), status }); };
  return { ctx, sent, staged };
}

for (const status of ['Draft', 'Submitted']) {
  test(status + ': shareholders and operator approvals are written live and staged on their tabs', async () => {
    const { ctx, sent, staged } = stubbedSaveAll();
    const result = await ctx.saveAll(payload(), status);

    // Shareholders: typed numbers, consultant bind, live ids returned for the form.
    const shareholderPosts = sent.filter(x => x[0] === 'POST' && x[1] === '/_api/asc_shareholders');
    assert.equal(shareholderPosts.length, 2);
    assert.equal(shareholderPosts[0][2].asc_name, 'Shuvo Kumar Das');
    assert.strictEqual(shareholderPosts[0][2].asc_equitypct, 20);
    assert.strictEqual(shareholderPosts[1][2].asc_equitypct, 40.5);
    assert.equal(shareholderPosts[0][2]['asc_consultant_id@odata.bind'], '/asc_consultants(consultant-1)');
    assert.equal(result.shareholders.length, 2);
    assert.equal(result.shareholders[0].clientId, 'shareholders-1');
    assert.ok(result.shareholders[0].liveId);

    // Operator approval: operator + consultant bind, brands, then discipline and region junction rows.
    const approval = sent.find(x => x[0] === 'POST' && x[1] === '/_api/asc_operatorapprovals');
    assert.equal(approval[2].asc_brands, 'JW Marriott, Autograph');
    assert.equal(approval[2]['asc_operator_id@odata.bind'], '/asc_operators(asc_operators:Marriott)');
    assert.equal(approval[2]['asc_consultant_id@odata.bind'], '/asc_consultants(consultant-1)');
    const approvalId = result.operatorApprovals[0].liveId;
    assert.ok(approvalId);
    const disciplineRows = sent.filter(x => x[1] === '/_api/asc_operatorapprovaldisciplines');
    assert.equal(disciplineRows.length, 2);
    assert.equal(disciplineRows[0][2]['asc_operatorapproval_id@odata.bind'], '/asc_operatorapprovals(' + approvalId + ')');
    assert.equal(disciplineRows[0][2]['asc_disciplineid@odata.bind'], '/asc_disciplines(asc_disciplines:MEP)');
    const regionRows = sent.filter(x => x[1] === '/_api/asc_operatorapprovalsregionses');
    assert.equal(regionRows.length, 1);
    assert.equal(regionRows[0][2]['asc_OperatorApprovalsID@odata.bind'], '/asc_operatorapprovals(' + approvalId + ')');
    assert.equal(regionRows[0][2]['asc_RegionsID@odata.bind'], '/asc_regions(asc_regions:Africa)');

    // Staged review rows carry the new data with the right status, ids stamped for next load.
    const offices = staged.find(x => x.tab === 'Offices & contacts');
    assert.equal(offices.status, status);
    assert.equal(offices.after.shareholders.length, 2);
    assert.equal(offices.after.shareholders[0].name, 'Shuvo Kumar Das');
    assert.ok(offices.after.shareholders[0].liveId, 'staged shareholder must carry its live id');
    const operators = staged.find(x => x.tab === 'Operator approvals');
    assert.equal(operators.status, status);
    assert.equal(operators.after[0].operator, 'Marriott');
    assert.equal(operators.after[0].liveId, approvalId);
    assert.equal(json(operators.after[0].disciplines), json(['MEP', 'Structure']));
  });
}

test('a second save PATCHes saved shareholders/approvals and only adds new junction rows', async () => {
  const { ctx, sent } = stubbedSaveAll();
  ctx.existingRecord = { operatorApprovals: [{ liveId: 'ap-1', fields: { operator: 'Marriott', brands: '', disciplines: ['MEP'], regions: ['Africa'] } }] };
  const second = payload({
    collections: {
      offices: [], contacts: [], projects: [], bimProjects: [],
      shareholders: [{ id: 's1', liveId: 'sh-1', name: 'Shuvo', equity: '25' }],
      operatorApprovals: [{ id: 'o1', liveId: 'ap-1', operator: 'Marriott', disciplines: ['MEP', 'Structure'], regions: ['Africa', 'Europe'], brands: 'Autograph' }]
    }
  });
  await ctx.saveAll(second, 'Submitted');
  assert.ok(sent.some(x => x[0] === 'PATCH' && x[1] === '/_api/asc_shareholders(sh-1)'));
  assert.ok(sent.some(x => x[0] === 'PATCH' && x[1] === '/_api/asc_operatorapprovals(ap-1)'));
  assert.equal(sent.filter(x => x[0] === 'POST' && x[1] === '/_api/asc_shareholders').length, 0);
  assert.equal(sent.filter(x => x[0] === 'POST' && x[1] === '/_api/asc_operatorapprovals').length, 0);
  const disciplines = sent.filter(x => x[1] === '/_api/asc_operatorapprovaldisciplines');
  assert.equal(disciplines.length, 1, 'only the new discipline is written');
  assert.equal(disciplines[0][2]['asc_disciplineid@odata.bind'], '/asc_disciplines(asc_disciplines:Structure)');
  const regions = sent.filter(x => x[1] === '/_api/asc_operatorapprovalsregionses');
  assert.equal(regions.length, 1, 'only the new region is written');
});

test('an operator-approval write failure never blocks the draft/submit (staged data still saved)', async () => {
  const { ctx, staged } = stubbedSaveAll();
  const realWrite = ctx.webApiRequest;
  ctx.webApiRequest = async (method, url, body) => {
    if (url.startsWith('/_api/asc_operatorapproval')) throw new Error('403 not enabled for Web API');
    return realWrite(method, url, body);
  };
  const warn = console.warn; console.warn = () => {};
  try {
    const result = await ctx.saveAll(payload(), 'Draft');
    assert.equal(result.operatorApprovals.length, 0);
    assert.ok(staged.find(x => x.tab === 'Operator approvals'), 'the tab is still staged for review');
  } finally { console.warn = warn; }
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
  assert.ok(prefill.shareholders[0].liveId);
  assert.equal(prefill.operatorApprovals.length, 1);
  const row = prefill.operatorApprovals[0];
  assert.equal(row.fields.operator, 'Marriott');
  assert.equal(row.fields.brands, 'JW Marriott, Autograph');
  assert.equal(json(row.fields.regions), json(['Africa']));
  assert.ok(row.liveId);
  assert.equal(prefill.tabStatus['Operator approvals'], 'Draft');
});

test('a Submitted Operator approvals tab is locked: not rewritten by a later save', async () => {
  const { ctx, staged } = stubbedSaveAll();
  ctx.submissionTabStatus = { 'Operator approvals': 'Submitted' };
  await ctx.saveAll(payload(), 'Draft');
  assert.equal(staged.some(x => x.tab === 'Operator approvals'), false);
  assert.ok(staged.some(x => x.tab === 'Offices & contacts'));
});

test('invalid equity is never sent to Dataverse (the form also caps it at 0-100)', async () => {
  const { ctx, sent } = stubbedSaveAll();
  const bad = payload();
  bad.collections.shareholders = [{ id: 's1', liveId: null, name: 'X', equity: 'abc' }];
  const warn = console.warn; console.warn = () => {};
  try { await ctx.saveAll(bad, 'Draft'); } finally { console.warn = warn; }
  assert.equal(sent.filter(x => x[1] === '/_api/asc_shareholders').length, 0);
});

test('a shareholder write failure never blocks the draft/submit (staged data still saved)', async () => {
  const { ctx, staged } = stubbedSaveAll();
  const realWrite = ctx.webApiRequest;
  ctx.webApiRequest = async (method, url, body) => {
    if (url.startsWith('/_api/asc_shareholders')) throw new Error('403 no table permission');
    return realWrite(method, url, body);
  };
  const warn = console.warn; console.warn = () => {};
  try {
    const result = await ctx.saveAll(payload(), 'Submitted');
    assert.equal(result.shareholders.length, 0);
    assert.equal(staged.find(x => x.tab === 'Offices & contacts').after.shareholders.length, 2);
  } finally { console.warn = warn; }
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const servicesSource = fs.readFileSync(path.join(root, 'src/portal/scripts/services.js'), 'utf8');
// services.js declares no top-level statement that requires a DOM/network to merely define its
// functions (window/document access is inside try/catch or inside function bodies only) - runs
// standalone the same way tests/mapping.test.cjs already runs dataverse-mapping.js standalone.
const context = {};
vm.createContext(context);
vm.runInContext(servicesSource, context);
const tabSnapshot = context.tabSnapshot;
// Fresh context per test for anything that calls the live-write functions - they mutate
// module-level state (portalSubmissionIds, verificationToken) that must not leak between tests.
// Overriding a top-level function/var on the context object after running the script does
// redirect calls made by other functions in that same context (confirmed: function declarations
// resolve the callee by name against the context's global object at call time, not by a
// reference captured when the script first ran) - this is what makes mocking webApiRequest/fetch
// here actually intercept calls made from inside saveTabSubmission/findDraftSubmissionId/
// logAuditEvent, without needing a real network or Power Pages session.
function freshServicesContext() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(servicesSource, ctx);
  ctx.verificationToken = 'test-token'; // skip the real /_layout/tokenhtml fetch
  return ctx;
}
function fakeCreateResponse(newId) {
  return { ok: true, headers: { get: h => (h === 'entityid' ? '(' + newId + ')' : null) } };
}
// tabSnapshot's return values are plain objects/arrays created inside the vm context, so
// assert.deepEqual (deepStrictEqual under node:assert/strict) fails on prototype identity even
// when the structure matches - compare via JSON instead, same as this project's other
// cross-realm-safe checks.
const json = value => JSON.stringify(value);

test('tabSnapshot maps every one of the 8 portal tabs from a collectProfile()-shaped payload', () => {
  const payload = {
    identity: { firmName: 'Studio Vermeer', disciplines: ['Architecture'] },
    sections: { financial: { revenue1: '100' }, legal: { insured: 'No' }, bim: { bimCapability: 'In-house' }, sustainability: { esgCert: 'No' } },
    collections: {
      offices: [{ id: 'o1' }], contacts: [{ id: 'c1' }],
      projects: [{ id: 'p1' }], bimProjects: [{ id: 'b1' }]
    },
    files: [{ file: { name: 'plan.pdf' }, documentType: 'Drawing', projectId: 'p1' }]
  };
  const snapshot = tabSnapshot(payload);
  assert.deepEqual(Object.keys(snapshot), ['Identity', 'Financial', 'Legal', 'Offices & contacts', 'Project references', 'BIM', 'Sustainability', 'Attachments']);
  assert.equal(snapshot.Identity.firmName, 'Studio Vermeer');
  assert.equal(snapshot.Financial.revenue1, '100');
  assert.equal(snapshot.Legal.insured, 'No');
  assert.equal(json(snapshot['Offices & contacts']), json({ offices: [{ id: 'o1' }], contacts: [{ id: 'c1' }] }));
  assert.equal(json(snapshot['Project references']), json([{ id: 'p1' }]));
  assert.equal(json(snapshot.BIM), json({ bim: { bimCapability: 'In-house' }, bimProjects: [{ id: 'b1' }] }));
  assert.equal(snapshot.Sustainability.esgCert, 'No');
  assert.equal(json(snapshot.Attachments), json([{ documentType: 'Drawing', projectId: 'p1', name: 'plan.pdf' }]));
});

test('tabSnapshot reads collections from the existingRecord (loadExistingRecordSync) shape too, where prefetched', () => {
  const existingRecord = {
    identity: { firmName: 'Prior Name' },
    sections: { financial: { revenue1: '50' } },
    contacts: [{ liveId: 'g1', fields: { firstName: 'A' } }],
    bimProjects: [{ liveId: 'g2', fields: { name: 'B' } }]
  };
  const snapshot = tabSnapshot(existingRecord);
  assert.equal(snapshot.Identity.firmName, 'Prior Name');
  assert.equal(json(snapshot['Offices & contacts'].contacts), json([{ liveId: 'g1', fields: { firstName: 'A' } }]));
  assert.equal(json(snapshot.BIM.bimProjects), json([{ liveId: 'g2', fields: { name: 'B' } }]));
  // Offices/projects/files are never prefetched into existingRecord (genuinely blocked
  // elsewhere in services.js) - the snapshot must stay an honest empty list, not fabricate data.
  assert.equal(json(snapshot['Offices & contacts'].offices), json([]));
  assert.equal(json(snapshot['Project references']), json([]));
  assert.equal(json(snapshot.Attachments), json([]));
});

test('tabSnapshot on a null/undefined source (brand-new consultant, nothing loaded yet) returns an empty object, not a throw', () => {
  assert.equal(json(tabSnapshot(null)), '{}');
  assert.equal(json(tabSnapshot(undefined)), '{}');
});

// --- Live-write body regression tests ---
// Guards against exactly the class of bug that has broken this table twice already: asc_status
// and asc_tab were both converted from plain text to Choice columns after this code was first
// written, each time silently breaking every write until caught live. These assert the actual
// numeric values and request shapes sent on the wire, confirmed against a fresh pac solution
// export at the time of writing (see PROJECT_MEMORY.md, 7 Oct 2026 entries) - re-confirm those
// numbers the same way before changing the expected values here, never by guessing.

test('saveTabSubmission POSTs a correctly-shaped create body when no Draft row exists yet', async () => {
  const ctx = freshServicesContext();
  let captured = null;
  ctx.fetch = async () => ({ ok: false }); // findDraftSubmissionId finds nothing -> create path
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; return fakeCreateResponse('11111111-1111-1111-1111-111111111111'); };
  const id = await ctx.saveTabSubmission('consultant-guid', 'Identity', { firmName: 'X' }, { firmName: 'Y' }, 'Draft');
  assert.equal(id, '11111111-1111-1111-1111-111111111111');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url, '/_api/asc_portalsubmissions');
  assert.equal(captured.body.asc_tab, 751050000); // Identity -> live "Overview" option
  assert.equal(captured.body.asc_status, 751050000); // Draft
  assert.equal(captured.body.asc_isreview, false); // required column - must always be sent on create
  assert.equal(captured.body['asc_consultant_id@odata.bind'], '/asc_consultants(consultant-guid)');
  assert.equal(captured.body.asc_before, JSON.stringify({ firmName: 'Y' }));
  assert.equal(captured.body.asc_after, JSON.stringify({ firmName: 'X' }));
  assert.equal(captured.body.asc_submittedon, undefined); // only set when status is Submitted
});

test('saveTabSubmission PATCHes an existing row without re-sending create-only fields, and stamps asc_submittedon on Submit', async () => {
  const ctx = freshServicesContext();
  ctx.portalSubmissionIds = { Financial: 'existing-id-123' }; // already found/created this session
  let captured = null;
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; };
  await ctx.saveTabSubmission('consultant-guid', 'Financial', { revenue1: '5' }, undefined, 'Submitted');
  assert.equal(captured.method, 'PATCH');
  assert.equal(captured.url, '/_api/asc_portalsubmissions(existing-id-123)');
  assert.equal(captured.body.asc_tab, 751050001); // Financial
  assert.equal(captured.body.asc_status, 751050001); // Submitted ("Submited" live, doesn't matter - numeric)
  assert.equal(typeof captured.body.asc_submittedon, 'string');
  assert.ok(!Number.isNaN(Date.parse(captured.body.asc_submittedon)));
  assert.equal(captured.body.asc_isreview, undefined); // required-on-create only, never re-sent on update
  assert.equal(captured.body['asc_consultant_id@odata.bind'], undefined);
  assert.equal(captured.body.asc_before, undefined); // before is frozen at create, never touched again
});

test('findDraftSubmissionId filters by the correct numeric Tab/Status values and matches client-side by consultant', async () => {
  const ctx = freshServicesContext();
  let requestedUrl = null;
  ctx.fetch = async (url) => {
    requestedUrl = url;
    return {
      ok: true,
      json: async () => ({
        value: [
          { asc_portalsubmissionid: 'wrong-consultant-row', _asc_consultant_id_value: 'OTHER-GUID' },
          { asc_portalsubmissionid: 'right-row', _asc_consultant_id_value: 'Target-Guid' }
        ]
      })
    };
  };
  const id = await ctx.findDraftSubmissionId('target-guid', 'Offices & contacts');
  assert.ok(requestedUrl.includes('asc_tab eq 751050003')); // Offices & contacts
  assert.ok(requestedUrl.includes('asc_status eq 751050000')); // Draft only
  assert.equal(id, 'right-row'); // case-insensitive match on the real consultant, not the other row
});

test('logAuditEvent sends the correct numeric Action/Origin and binds the fixed Actor on every call, and never throws on failure', async () => {
  const ctx = freshServicesContext();
  let captured = null;
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; };
  await ctx.logAuditEvent('Submit', 'asc_consultant test-id (Test Firm)');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url, '/_api/asc_auditlogs');
  assert.equal(captured.body.asc_action, 751050004); // Submit
  assert.equal(captured.body.asc_origin, 751050001); // Self-service portal
  // Capital A matches the live relationship's navigation property name (asc_Actor), not the
  // attribute's all-lowercase LogicalName - the actual bug this fix corrects.
  assert.equal(captured.body['asc_Actor@odata.bind'], '/systemusers(2ed46b7a-98a6-f111-b373-6045bdad8d08)');
  assert.equal(captured.body.asc_object, 'asc_consultant test-id (Test Firm)');
  assert.ok(!Number.isNaN(Date.parse(captured.body.asc_eventtime)));

  ctx.webApiRequest = async () => { throw new Error('simulated 403'); };
  await assert.doesNotReject(ctx.logAuditEvent('Update', 'irrelevant')); // fire-and-forget - must never throw
});

test('createConsultantJunctionRow binds the Consultant and target lookups by their navigation property names (case-sensitive), not the lowercase attribute LogicalName', async () => {
  const ctx = freshServicesContext();
  let captured = null;
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; };
  await ctx.createConsultantJunctionRow('asc_consultantsectorses', 'asc_SectorID', 'asc_sectors', 'sector-id', 'consultant-id');
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url, '/_api/asc_consultantsectorses');
  // Both found capitalized (asc_ConsultantID / asc_SectorID) in a fresh pac solution export of
  // the live relationship - the lowercase forms this code used to send 400 with the generic
  // "Common Data Service error occurred", exactly like the Audit Log asc_actor bug above, and
  // affected all 3 junction tables (disciplines/sectors/regions), not just this one.
  assert.equal(captured.body['asc_ConsultantID@odata.bind'], '/asc_consultants(consultant-id)');
  assert.equal(captured.body['asc_SectorID@odata.bind'], '/asc_sectors(sector-id)');
});

test('saveConsultant sets asc_status=Active only on first create, never on a later update', async () => {
  // dataverseMapping.prepare() deliberately strips asc_status from every mapped payload
  // (tests/mapping.test.cjs: "excludes privileged consultant fields") - mocked here rather than
  // loading the real module, since this test is only about saveConsultant's own create-vs-update
  // branching, not the mapping logic itself.
  const ctxCreate = freshServicesContext();
  ctxCreate.dataverseMapping = { prepare: payload => ({ consultant: { asc_name: payload.identity.firmName } }) };
  let created = null;
  ctxCreate.webApiRequest = async (method, url, body) => { created = { method, url, body }; return fakeCreateResponse('22222222-2222-2222-2222-222222222222'); };
  await ctxCreate.saveConsultant({ identity: { firmName: 'New Firm' } });
  assert.equal(created.method, 'POST');
  assert.equal(created.body.asc_status, 751050000); // Active - required column added live 2026-10-08

  const ctxUpdate = freshServicesContext();
  ctxUpdate.dataverseMapping = { prepare: payload => ({ consultant: { asc_name: payload.identity.firmName } }) };
  ctxUpdate.liveConsultantId = 'already-exists-id'; // simulates a returning consultant
  let updated = null;
  ctxUpdate.webApiRequest = async (method, url, body) => { updated = { method, url, body }; };
  await ctxUpdate.saveConsultant({ identity: { firmName: 'Existing Firm' } });
  assert.equal(updated.method, 'PATCH');
  assert.equal(updated.body.asc_status, undefined); // never re-sent on update - stays admin-controlled
});

// 2026-10-08: Financial/Legal/Sustainability moved off asc_consultant onto their own 1:1 child
// tables after a live schema change silently broke every portal save (asc_consultant no longer
// has those columns at all - selecting or writing them now 400s outright). These guard the fix.
test('saveChildTable POSTs with the consultant bind on first create, then PATCHes the same row on a later save', async () => {
  const ctx = freshServicesContext();
  ctx.dataverseMapping = { prepareChildTable: () => ({ asc_revenuen1: 1000 }) };
  ctx.portalConfig = { dataverseMap: { childTables: { financial: { table: 'asc_financialinformation' } } } };
  let captured = null;
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; return fakeCreateResponse('33333333-3333-3333-3333-333333333333'); };
  const createdId = await ctx.saveChildTable('consultant-guid', 'financial', {});
  assert.equal(captured.method, 'POST');
  assert.equal(captured.url, '/_api/asc_financialinformations');
  assert.equal(captured.body['asc_consultant_id@odata.bind'], '/asc_consultants(consultant-guid)');
  assert.equal(createdId, '33333333-3333-3333-3333-333333333333');

  // Same session, same key - must reuse the cached ID and PATCH, not create a duplicate row.
  captured = null;
  ctx.webApiRequest = async (method, url, body) => { captured = { method, url, body }; };
  await ctx.saveChildTable('consultant-guid', 'financial', {});
  assert.equal(captured.method, 'PATCH');
  assert.equal(captured.url, '/_api/asc_financialinformations(33333333-3333-3333-3333-333333333333)');
  assert.equal(captured.body['asc_consultant_id@odata.bind'], undefined); // never re-bound on update
});

test('saveChildTables never lets one incomplete/failing child table block the others (a Draft may genuinely be incomplete)', async () => {
  const ctx = freshServicesContext();
  const attempted = [];
  ctx.saveChildTable = async (consultantId, key) => {
    attempted.push(key);
    if (key === 'legal') throw new Error('simulated required-field 400 - Legal not fully answered yet');
  };
  await assert.doesNotReject(ctx.saveChildTables('consultant-guid', {}));
  assert.deepEqual(attempted, ['financial', 'legal', 'sustainability']); // legal's failure didn't stop sustainability from being attempted
});

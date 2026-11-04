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
  assert.deepEqual(attempted, ['financial', 'legal', 'sustainability', 'bim']); // legal's failure didn't stop sustainability from being attempted
});

// 2026-10-15: invitation binding now reads the native Contact's asc_consultantid lookup
// (rendered server-side into #account-consultant by shell.html via Power Pages' own
// authentication, not anything this function validates itself) - replacing the earlier
// custom asc_invitation token + email-string-matching system. See backend/README.md's
// "Required before enabling live writes" checklist: "Never infer access from submitted
// email/domain or custom business contact ID."
function fakeDom(accountConsultantText) {
  return { getElementById: id => (id === 'account-consultant' ? { textContent: accountConsultantText } : null) };
}
test('resolveInvitationConsultant: no consultant on the signed-in contact leaves liveConsultantId untouched (existing behaviour, unaffected)', () => {
  const ctx = freshServicesContext();
  ctx.document = fakeDom('');
  ctx.liveConsultantId = 'already-set-id';
  assert.equal(ctx.resolveInvitationConsultant(), true);
  assert.equal(ctx.liveConsultantId, 'already-set-id'); // not overwritten
});
test('resolveInvitationConsultant: a consultant on the signed-in contact ties the session to it', () => {
  const ctx = freshServicesContext();
  ctx.document = fakeDom('0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
  ctx.window = { localStorage: { setItem: () => {} } };
  assert.equal(ctx.resolveInvitationConsultant(), true);
  assert.equal(ctx.liveConsultantId, '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d');
});
test('resolveInvitationConsultant: a Liquid error string is never stored as the consultant', () => {
  const ctx = freshServicesContext();
  ctx.document = fakeDom("Liquid error: Object of type 'EntityReferenceDrop' cannot be converted to type 'System.String'.");
  ctx.window = { localStorage: { setItem: () => {} } };
  ctx.liveConsultantId = 'already-set-id';
  assert.equal(ctx.resolveInvitationConsultant(), true);
  assert.equal(ctx.liveConsultantId, 'already-set-id');
});

// Attachment upload: only the pure request shaping and the orchestration around it are covered.
// The binary PUT itself (fetch with a File body against a live Power Pages session) cannot run in
// this no-DOM/no-network harness, same limitation as loadExistingRecordSync's sync XHR.
test('buildAttachmentRequest shapes a consultant-level attachment row and file upload', () => {
  const ctx = freshServicesContext();
  const file = { name: 'cert.pdf', size: 2500000 };
  const r = ctx.buildAttachmentRequest({ file, documentType: 'Certificate', projectId: null }, { consultantId: 'c-1', documentTypeId: 'd-1', uploadedById: 'u-1', uploadedOn: '2026-10-24T00:00:00Z', status: 'Submitted' });
  assert.equal(json(r.body), json({
    asc_name: 'cert.pdf', asc_filename: 'cert.pdf', asc_filesizemb: 2.5, asc_uploadedon: '2026-10-24T00:00:00Z', asc_status: 751050001, asc_origin: 751050001,
    'asc_uploadedby_id@odata.bind': '/systemusers(u-1)',
    'asc_consultant_id@odata.bind': '/asc_consultants(c-1)',
    'asc_documenttype_id@odata.bind': '/asc_documenttypes(d-1)'
  }));
  assert.equal(r.uploadPath('a-9'), '/_api/asc_attachments(a-9)/asc_attachedfile');
  assert.equal(json(r.uploadHeaders), json({ 'Content-Type': 'application/octet-stream', 'x-ms-file-name': 'cert.pdf' }));
  assert.equal(r.tooLargeForSingleRequest, false);
});

test('buildAttachmentRequest binds project-level entries to the project, never the consultant, and flags >16 MB', () => {
  const ctx = freshServicesContext();
  const r = ctx.buildAttachmentRequest({ file: { name: 'big.pdf', size: 20000000 }, projectId: 'p-local', projectLiveId: 'p-live' }, { consultantId: 'c-1', documentTypeId: null, uploadedById: 'u-1', uploadedOn: 'x' });
  assert.equal(r.body['asc_projectreference_id@odata.bind'], '/asc_projectreferences(p-live)');
  assert.equal(r.body['asc_consultant_id@odata.bind'], '/asc_consultants(c-1)'); // project files carry the consultant too
  assert.equal('asc_documenttype_id@odata.bind' in r.body, false);
  assert.equal(r.tooLargeForSingleRequest, true);
});

test('saveAttachments uploads consultant-level files once, skips project-level/oversize, never throws', async () => {
  const ctx = freshServicesContext();
  const calls = [];
  ctx.resolveReferenceId = async () => 'd-1';
  ctx.webApiRequest = async (method, url, body) => { calls.push([method, url]); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  ctx.uploadAttachmentBytes = async (p) => { calls.push(['PUT', p]); };
  const ok = { name: 'a.pdf', size: 10 };
  const payload = { files: [{ file: ok, documentType: 'X', projectId: null }, { file: { name: 'p.pdf', size: 10 }, projectId: 'r1' }, { file: { name: 'big.pdf', size: 20000000 }, projectId: null }] };
  const first = await ctx.saveAttachments('c-1', payload);
  assert.equal(json(first), json({ uploaded: 1, skipped: 2, failed: 0, submitted: 0 }));
  assert.equal(json(calls), json([['POST', '/_api/asc_attachments'], ['PUT', '/_api/asc_attachments(11111111-2222-3333-4444-555555555555)/asc_attachedfile']]));
  const again = await ctx.saveAttachments('c-1', { files: [payload.files[0]] });
  assert.equal(json(again), json({ uploaded: 0, skipped: 0, failed: 0, submitted: 0 }));
  ctx.uploadAttachmentBytes = async () => { throw new Error('boom'); };
  const failed = await ctx.saveAttachments('c-1', { files: [{ file: { name: 'b.pdf', size: 10 }, projectId: null }] });
  assert.equal(failed.failed, 1);
});

// --- Prefill from asc_portalsubmission.asc_after (2026-10-24) ---
// Only the pure selection/reconstruction halves are covered. loadPrefillRecordSync() itself uses
// synchronous XHR against a live Power Pages session and cannot run in this no-DOM/no-network
// harness - same limitation as loadExistingRecordSync().
test('tabSnapshot folds revenueByRegion into the Financial slice (both payload and existingRecord shapes)', () => {
  const snap = tabSnapshot({ sections: { financial: { revenue1: '5' } }, revenueByRegion: { Europe: '40' } });
  assert.equal(json(snap.Financial), json({ revenue1: '5', revenueByRegion: { Europe: '40' } }));
  assert.equal(json(tabSnapshot({ sections: { financial: { revenue1: '5' } } }).Financial), json({ revenue1: '5' }));
});

test('pickLatestSubmissionPerTab takes the newest row per tab for this consultant only, whatever its status', () => {
  const rows = [
    { asc_portalsubmissionid: 'old-draft', asc_tab: 751050000, asc_status: 751050000, createdon: '2026-10-01T00:00:00Z', _asc_consultant_id_value: 'ME' },
    { asc_portalsubmissionid: 'newest-rejected', asc_tab: 751050000, asc_status: 751050003, createdon: '2026-10-05T00:00:00Z', _asc_consultant_id_value: 'me' },
    { asc_portalsubmissionid: 'someone-else', asc_tab: 751050001, asc_status: 751050001, createdon: '2026-10-09T00:00:00Z', _asc_consultant_id_value: 'OTHER' },
    { asc_portalsubmissionid: 'fin-submitted', asc_tab: 751050001, asc_status: 751050001, createdon: '2026-10-02T00:00:00Z', _asc_consultant_id_value: 'ME' },
    { asc_portalsubmissionid: 'legal-accepted', asc_tab: 751050002, asc_status: 751050002, createdon: '2026-10-03T00:00:00Z', _asc_consultant_id_value: 'ME' },
    { asc_portalsubmissionid: 'unknown-tab', asc_tab: 751050005, asc_status: 751050000, createdon: '2026-10-04T00:00:00Z', _asc_consultant_id_value: 'ME' }
  ];
  const latest = context.pickLatestSubmissionPerTab(rows, 'Me');
  assert.deepEqual(Object.keys(latest).sort(), ['Financial', 'Identity', 'Legal']);
  assert.equal(json(latest.Identity), json({ id: 'newest-rejected', status: 'Rejected', after: null }));
  assert.equal(json(latest.Financial), json({ id: 'fin-submitted', status: 'Submitted', after: null }));
  assert.equal(json(latest.Legal), json({ id: 'legal-accepted', status: 'Accepted', after: null }));
  assert.equal(json(context.pickLatestSubmissionPerTab(null, 'me')), '{}');
});

test('reconstructPrefillRecord maps every tab onto the shape profile.js consumes', () => {
  const snapshot = tabSnapshot({
    identity: { firmName: 'Studio', disciplines: ['Architecture'], sectors: [], regions: ['Europe'] },
    sections: { financial: { revenue1: '100' }, legal: { insured: 'No' }, bim: { capability: 'Yes' }, sustainability: { certified: 'No' } },
    revenueByRegion: { Europe: '60' },
    collections: {
      offices: [{ id: 'offices-1', liveId: null, city: 'Paris', leaders: ['contacts-1'] }],
      contacts: [{ id: 'contacts-1', liveId: 'live-c1', firstName: 'A', email: 'a@x.com' }],
      projects: [{ id: 'projects-1', liveId: null, name: 'Tower' }],
      bimProjects: [{ id: 'bimProjects-1', liveId: 'live-b1', name: 'Hub' }]
    }
  });
  const latest = {};
  Object.keys(snapshot).forEach(tab => { latest[tab] = { status: tab === 'Legal' ? 'Submitted' : 'Draft', after: JSON.stringify(snapshot[tab]) }; });
  const r = context.reconstructPrefillRecord(latest);
  assert.equal(r.identity.firmName, 'Studio');
  assert.equal(json(r.sections.financial), json({ revenue1: '100' })); // revenueByRegion split back out
  assert.equal(json(r.revenueByRegion), json({ Europe: '60' }));
  assert.equal(json(r.sections.legal), json({ insured: 'No' }));
  assert.equal(json(r.sections.bim), json({ capability: 'Yes' }));
  assert.equal(json(r.sections.sustainability), json({ certified: 'No' }));
  assert.equal(json(r.contacts), json([{ localId: 'contacts-1', liveId: 'live-c1', fields: { firstName: 'A', email: 'a@x.com' } }]));
  assert.equal(json(r.offices), json([{ localId: 'offices-1', liveId: null, fields: { city: 'Paris', leaders: ['contacts-1'] } }]));
  assert.equal(json(r.projects), json([{ localId: 'projects-1', liveId: null, fields: { name: 'Tower' } }]));
  assert.equal(json(r.bimProjects), json([{ localId: 'bimProjects-1', liveId: 'live-b1', fields: { name: 'Hub' } }]));
  assert.equal(r.tabStatus.Legal, 'Submitted');
  assert.equal(r.tabStatus.Identity, 'Draft');
});

test('reconstructPrefillRecord degrades corrupt, empty or missing asc_after to a blank tab without throwing', () => {
  const r = context.reconstructPrefillRecord({
    'Identity': { status: 'Draft', after: '{not json' },
    'Financial': { status: 'Draft', after: '' },
    'Offices & contacts': { status: 'Accepted', after: '"a string"' },
    'BIM': { status: 'Draft', after: JSON.stringify({ bim: null, bimProjects: 'nope' }) }
  });
  assert.equal(json(r.identity), json({ disciplines: [], sectors: [], regions: [] }));
  assert.equal(json(r.sections.financial), '{}');
  assert.equal(json(r.contacts), '[]');
  assert.equal(json(r.offices), '[]');
  assert.equal(json(r.bimProjects), '[]');
  assert.equal(json(context.reconstructPrefillRecord(null).projects), '[]'); // no rows at all -> fully blank
});

test('adoptLiveIds fills a missing liveId from a unique live match only', () => {
  const rows = [{ liveId: null, fields: { email: 'A@x.com' } }, { liveId: null, fields: { email: 'dup@x.com' } }, { liveId: 'keep', fields: { email: 'a@x.com' } }];
  const live = [{ liveId: 'L1', fields: { email: 'a@x.com' } }, { liveId: 'L2', fields: { email: 'dup@x.com' } }, { liveId: 'L3', fields: { email: 'dup@x.com' } }];
  context.adoptLiveIds(rows, live, 'email');
  assert.equal(rows[0].liveId, 'L1');
  assert.equal(rows[1].liveId, null); // ambiguous - never guess
  assert.equal(rows[2].liveId, 'keep');
});

test('stampLiveIds copies server-assigned live IDs into the staged collections without mutating the payload', () => {
  const payload = { collections: { contacts: [{ id: 'contacts-1', liveId: null }], bimProjects: [{ id: 'b-1', liveId: null }] } };
  const out = context.stampLiveIds(payload, { contacts: [{ clientId: 'contacts-1', liveId: 'L9' }], bimProjects: [] });
  assert.equal(out.collections.contacts[0].liveId, 'L9');
  assert.equal(out.collections.bimProjects[0].liveId, null);
  assert.equal(payload.collections.contacts[0].liveId, null);
});

test('recordPortalSubmissions never writes a Submitted (locked) tab, and marks the others', async () => {
  const ctx = freshServicesContext();
  ctx.submissionTabStatus = { Legal: 'Submitted' };
  const written = [];
  ctx.saveTabSubmission = async (consultantId, tab) => { written.push(tab); };
  await ctx.recordPortalSubmissions('c-1', { identity: {} }, 'Draft');
  assert.equal(written.includes('Legal'), false);
  assert.equal(written.length, 7);
  assert.equal(ctx.submissionTabStatus.Identity, 'Draft');
});

test('buildAttachmentRequest sends an ASCII-safe x-ms-file-name header for non-Latin file names', () => {
  const ctx = freshServicesContext();
  const r = ctx.buildAttachmentRequest({ file: { name: 'شهادة.pdf', size: 10 }, projectId: null }, { consultantId: 'c-1', documentTypeId: null, uploadedById: 'u-1', uploadedOn: 'x' });
  assert.equal(r.uploadHeaders['x-ms-file-name'], '_____.pdf');
  assert.equal(r.body.asc_filename, 'شهادة.pdf');
});

test('a Seeded row (written by the Power Apps seeding app) is picked as the latest row, loads, and is not locked', () => {
  const latest = context.pickLatestSubmissionPerTab([
    { asc_portalsubmissionid: 'seed', asc_tab: 751050000, asc_status: 751050004, createdon: '2026-10-27T00:00:00Z', _asc_consultant_id_value: 'me' }
  ], 'ME');
  assert.equal(latest.Identity.status, 'Seeded');
  const r = context.reconstructPrefillRecord({ Identity: { status: 'Seeded', after: JSON.stringify({ firmName: 'Seeded Co' }) } });
  assert.equal(r.identity.firmName, 'Seeded Co');
  assert.equal(r.tabStatus.Identity, 'Seeded'); // only 'Submitted' locks a tab
});

test('BIM capability/operators live on asc_biminformation (not asc_consultant) and the Choice maps both ways', () => {
  const ctx = freshServicesContext();
  const map = ctx.portalConfig ? ctx.portalConfig.dataverseMap : null;
  const mapJson = JSON.parse(fs.readFileSync(path.join(root, 'src/portal/dataverse-map.json'), 'utf8'));
  assert.equal(mapJson.consultant.bim, undefined);
  assert.equal(mapJson.childTables.bim.table, 'asc_biminformation');
  assert.equal(mapJson.childTables.bim.fields.capability, 'asc_bimcapability');
  assert.equal(mapJson.picklistColumns.asc_bimcapability['In-house'], 751050000);
  assert.equal(mapJson.picklistColumns.asc_bimcapability.Outsourced, 751050001);
});

test('saveContacts binds contact type via the asc_ContactType lookup and never sends it as text', async () => {
  const ctx = freshServicesContext();
  const sent = [];
  ctx.dataverseMapping = { prepare: () => ({ collections: { contacts: [{ clientId: 'x', liveId: null, fields: { asc_firstname: 'A' }, references: { contactType: 'Senior leader', region: null } }] } }) };
  ctx.resolveReferenceId = async (set, idField, name, nameField) => { sent.push([set, idField, name, nameField]); return set === 'asc_contacttypes' ? 'ct-1' : null; };
  ctx.webApiRequest = async (m, u, body) => { sent.push([m, u, body]); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  await ctx.saveContacts('c-1', { collections: { contacts: [{ id: 'x', firstName: 'A', lastName: 'B', email: 'a@b.co', contactType: 'Senior leader', status: 'Active' }] } });
  assert.equal(json(sent[0]), json(['asc_contacttypes', 'asc_contacttypeid', 'Senior leader', 'asc_contacttypename']));
  const post = sent.find(x => x[0] === 'POST');
  assert.equal(post[2]['asc_ContactType@odata.bind'], '/asc_contacttypes(ct-1)');
  assert.equal('asc_contacttype' in post[2], false);
});

test('reconstructPrefillRecord maps a stored short fiscal format to the dropdown label', () => {
  const ctx = freshServicesContext();
  const mk = v => ({ Financial: { after: JSON.stringify({ yearFormat: v }), status: 'Accepted' } });
  assert.equal(ctx.reconstructPrefillRecord(mk('YYYY')).sections.financial.yearFormat, 'YYYY (Jan–Dec)');
  assert.equal(ctx.reconstructPrefillRecord(mk('YYYY/ZZ')).sections.financial.yearFormat, 'YYYY/ZZ (Apr–Mar)');
  assert.equal(ctx.reconstructPrefillRecord(mk('YYYY (Jan–Dec)')).sections.financial.yearFormat, 'YYYY (Jan–Dec)');
});

test('resolveReferenceId filters on the supplied name column (asc_contacttypename), default asc_name', async () => {
  const ctx = freshServicesContext();
  const urls = [];
  ctx.fetch = async url => { urls.push(url); return { ok: true, json: async () => ({ value: [{ asc_contacttypeid: 'ct-1' }] }) }; };
  assert.equal(await ctx.resolveReferenceId('asc_contacttypes', 'asc_contacttypeid', "Senior leader", 'asc_contacttypename'), 'ct-1');
  await ctx.resolveReferenceId('asc_regions', 'asc_regionid', 'Africa');
  assert.ok(urls[0].includes("$filter=asc_contacttypename eq 'Senior leader'"), urls[0]);
  assert.ok(urls[1].includes("$filter=asc_name eq 'Africa'"), urls[1]);
});

test('BIM child-table create body has no asc_name (asc_biminformation has none; asc_number auto-fills)', async () => {
  const ctx = freshServicesContext();
  const bodies = [];
  ctx.webApiRequest = async (m, u, b) => { bodies.push(b); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  ctx.portalConfig = { dataverseMap: { childTables: { bim: { table: 'asc_biminformation' } } } };
  ctx.dataverseMapping = { prepareChildTable: () => ({ asc_bimcapability: 751050000, asc_bimoperatorcount: 3 }) };
  await ctx.saveChildTable('c-1', 'bim', { identity: { firmName: 'X' } });
  assert.equal('asc_name' in bodies[0], false);
  assert.equal(bodies[0]['asc_consultant_id@odata.bind'], '/asc_consultants(c-1)');
});

// --- Project references write path (2026-10-29) ---
test('saveProjects creates the project with country/region/consultant binds, then the type and discipline junction rows', async () => {
  const ctx = freshServicesContext();
  const sent = [];
  ctx.dataverseMapping = { prepare: () => ({ collections: { projects: [{ clientId: 'p1', liveId: null, fields: { asc_name: 'Tower' }, references: { country: 'Oman', region: 'Middle East', type: 'Hotel', disciplines: ['Architecture', 'Structure'] } }] } }) };
  ctx.resolveReferenceId = async (set, idField, name, nameField) => ({ asc_countrys: 'co-1', asc_regions: 're-1', asc_disciplines: 'di-' + name, asc_projecttypes: 'ty-1' }[set] || null);
  ctx.webApiRequest = async (m, u, body) => { sent.push([m, u, body]); return fakeCreateResponse('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'); };
  const results = await ctx.saveProjects('c-1', {});
  assert.equal(json(results), json([{ clientId: 'p1', liveId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' }]));
  const create = sent[0];
  assert.equal(create[0] + ' ' + create[1], 'POST /_api/asc_projectreferences');
  assert.equal(create[2]['asc_CountryID@odata.bind'], '/asc_countrys(co-1)');
  assert.equal(create[2]['asc_region_id@odata.bind'], '/asc_regions(re-1)');
  assert.equal(create[2]['asc_consultant_id@odata.bind'], '/asc_consultants(c-1)');
  const disciplineRows = sent.filter(x => x[1] === '/_api/asc_projectreferencedisciplines');
  assert.equal(disciplineRows.length, 2);
  assert.equal(disciplineRows[0][2]['asc_ProjectReferenceID@odata.bind'], '/asc_projectreferences(aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)');
  assert.equal(disciplineRows[0][2]['asc_DisciplineID@odata.bind'], '/asc_disciplines(di-Architecture)');
  const typeRow = sent.find(x => x[1] === '/_api/asc_projectreferencetypes');
  assert.equal(typeRow[2]['asc_projecttype_id@odata.bind'], '/asc_projecttypes(ty-1)');
  assert.equal(typeRow[2]['asc_projectreference_id@odata.bind'], '/asc_projectreferences(aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee)');
});

test('saveProjects PATCHes a live project and only writes junction rows that are not live yet', async () => {
  const ctx = freshServicesContext();
  const sent = [];
  ctx.existingRecord = { projects: [{ liveId: 'live-1', fields: {}, references: { disciplines: ['Architecture'], type: 'Hotel' } }] };
  ctx.dataverseMapping = { prepare: () => ({ collections: { projects: [{ clientId: 'p1', liveId: 'live-1', fields: { asc_name: 'Tower' }, references: { country: null, region: null, type: 'Hotel', disciplines: ['Architecture', 'Structure'] } }] } }) };
  ctx.resolveReferenceId = async (set, idField, name) => (set === 'asc_disciplines' ? 'di-' + name : 'x');
  ctx.webApiRequest = async (m, u, body) => { sent.push([m, u, body]); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  await ctx.saveProjects('c-1', {});
  assert.equal(sent[0][0] + ' ' + sent[0][1], 'PATCH /_api/asc_projectreferences(live-1)');
  assert.equal('asc_consultant_id@odata.bind' in sent[0][2], false);
  const junctions = sent.filter(x => x[0] === 'POST');
  assert.equal(junctions.length, 1);
  assert.equal(junctions[0][1], '/_api/asc_projectreferencedisciplines');
  assert.equal(junctions[0][2]['asc_DisciplineID@odata.bind'], '/asc_disciplines(di-Structure)');
});

test('saveAttachments uploads a project-level file bound to the saved project, and skips one whose project was not saved', async () => {
  const ctx = freshServicesContext();
  const calls = [];
  ctx.resolveReferenceId = async () => 'd-1';
  ctx.webApiRequest = async (method, url, body) => { calls.push([method, url, body]); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  ctx.uploadAttachmentBytes = async (p) => { calls.push(['PUT', p]); };
  const payload = { files: [{ file: { name: 'p.pdf', size: 10 }, documentType: 'References', projectId: 'p1' }, { file: { name: 'q.pdf', size: 10 }, documentType: 'References', projectId: 'p2' }] };
  const results = await ctx.saveAttachments('c-1', payload, [{ clientId: 'p1', liveId: 'live-1' }, { clientId: 'p2', liveId: null }]);
  assert.equal(json(results), json({ uploaded: 1, skipped: 1, failed: 0, submitted: 0 }));
  assert.equal(calls[0][2]['asc_projectreference_id@odata.bind'], '/asc_projectreferences(live-1)');
  assert.equal(calls[0][2]['asc_consultant_id@odata.bind'], '/asc_consultants(c-1)');
});

test('attachments: new rows are Draft on Save draft; Submit promotes only the portal-owned Draft rows', async () => {
  const ctx = freshServicesContext();
  const calls = [];
  ctx.resolveReferenceId = async () => 'd-1';
  ctx.webApiRequest = async (m, u, b) => { calls.push([m, u, b]); return fakeCreateResponse('11111111-2222-3333-4444-555555555555'); };
  ctx.uploadAttachmentBytes = async () => {};
  const draft = await ctx.saveAttachments('c-1', { files: [{ file: { name: 'a.pdf', size: 10 }, projectId: null }] }, [], 'Draft');
  assert.equal(draft.uploaded, 1);
  assert.equal(calls[0][2].asc_status, 751050000);
  assert.equal(calls[0][2].asc_origin, 751050001);
  calls.length = 0;
  ctx.existingAttachments.push({ liveId: 'r-draft', name: 'x', status: 'Draft' }, { liveId: 'r-acc', name: 'y', status: 'Accepted' }, { liveId: 'r-seed', name: 'z', status: 'Seeded' }, { liveId: 'r-rej', name: 'w', status: 'Rejected' });
  const submit = await ctx.saveAttachments('c-1', { files: [{ file: { name: 'b.pdf', size: 10 }, projectId: null }] }, [], 'Submitted');
  assert.equal(calls[0][2].asc_status, 751050001);
  const patches = calls.filter(c => c[0] === 'PATCH');
  assert.equal(json(patches.map(c => c[1])), json(['/_api/asc_attachments(11111111-2222-3333-4444-555555555555)', '/_api/asc_attachments(r-draft)']));
  assert.equal(patches[0][2].asc_status, 751050001);
  // the file saved as Draft earlier in this same session is promoted too (no reload needed)
  assert.equal(submit.submitted, 2);
});

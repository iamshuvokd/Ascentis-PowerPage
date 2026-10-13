(function () {
  'use strict';
  var portalConfig = {"views":["signin","confidentiality","profile","submit"],"choices":{"Disciplines":["Architecture","Interior design","Engineering","Landscape","MEP"],"Sectors":["Hospitality","Mixed-use","Residential","Commercial"],"Regions":["Middle East","South Asia","Europe","Africa","Other"]},"formSchema":{"limits":{"text":200,"details":2000,"fileBytes":25000000,"projects":30,"bimProjects":10,"leaders":3},"documentTypes":["Company profile","References","Financials","Certificate","Insurance","Other"],"sections":[{"id":"financial","panel":1,"title":"Financial","description":"Enter amounts in USD. Choose your fiscal year to label the three previous years.","fields":[{"key":"effectiveYear","label":"Effective year (N)","type":"year","required":true},{"key":"yearFormat","label":"Fiscal-year format","type":"select","required":true,"options":["YYYY (Jan–Dec)","YYYY/ZZ (Apr–Mar)"]},{"key":"backlog","label":"Current backlog in hand","type":"money"},{"key":"revenue1","label":"Revenue N−1","type":"money","required":true},{"key":"revenue2","label":"Revenue N−2","type":"money","required":true},{"key":"revenue3","label":"Revenue N−3","type":"money","required":true}]},{"id":"legal","panel":2,"title":"Legal","description":"Choose Yes or No for each question. Additional information is required where applicable.","fields":[{"key":"indemnified","label":"Have you indemnified a client?","type":"yesno","required":true},{"key":"indemnityDetails","label":"Indemnification details","type":"textarea","required":true,"when":{"key":"indemnified","value":"Yes"}},{"key":"litigation","label":"Have you lost litigation with a client?","type":"yesno","required":true},{"key":"litigationDetails","label":"Litigation details","type":"textarea","required":true,"when":{"key":"litigation","value":"Yes"}},{"key":"insured","label":"Do you hold professional indemnity insurance?","type":"yesno","required":true},{"key":"perOccurrence","label":"PI insurance — per occurrence","type":"money","required":true,"when":{"key":"insured","value":"Yes"}},{"key":"aggregate","label":"PI insurance — in aggregate","type":"money","required":true,"when":{"key":"insured","value":"Yes"}}]},{"id":"bim","panel":5,"title":"BIM","description":"Tell us how you deliver building information modelling and add relevant projects.","fields":[{"key":"capability","label":"BIM capability","type":"select","required":true,"options":["In-house","Outsourced"]},{"key":"operators","label":"Number of BIM operators","type":"integer","required":true,"when":{"key":"capability","value":"In-house"}},{"key":"disciplines","label":"BIM disciplines","type":"multi","required":true,"source":"Disciplines"}]},{"id":"sustainability","panel":6,"title":"Sustainability & ESG","description":"Share your environmental credentials, reporting practices, and quality assurance approach.","fields":[{"key":"certified","label":"Any environmental or sustainability certification?","type":"yesno","required":true},{"key":"certificationDetails","label":"Certification details","type":"textarea","required":true,"when":{"key":"certified","value":"Yes"}},{"key":"reporting","label":"Formal ESG reporting?","type":"yesno","required":true},{"key":"frameworkDetails","label":"ESG framework details","type":"textarea","required":true,"when":{"key":"reporting","value":"Yes"}},{"key":"professionals","label":"Number of accredited professionals","type":"integer","help":"For example, LEED AP or WELL AP."},{"key":"qa","label":"Is sustainability part of your QA system?","type":"yesno","required":true},{"key":"qaDetails","label":"Implementation details","type":"textarea","required":true,"when":{"key":"qa","value":"Yes"}}]}],"collections":[{"id":"contacts","panel":3,"title":"Contacts","singular":"contact","fields":[{"key":"firstName","label":"First name","type":"text","required":true},{"key":"lastName","label":"Last name","type":"text","required":true},{"key":"email","label":"Work email","type":"email","required":true},{"key":"phone","label":"Phone","type":"tel","required":true},{"key":"jobTitle","label":"Job title","type":"text"},{"key":"region","label":"Region","type":"select","source":"Regions"},{"key":"contactType","label":"Contact type","type":"select","required":true,"options":["Senior leader","Project contact","Primary contact"]},{"key":"status","label":"Contact status","type":"select","required":true,"options":["Active","Inactive"]}]},{"id":"offices","panel":3,"title":"Offices","singular":"office","fields":[{"key":"region","label":"Office region","type":"select","required":true,"source":"Regions"},{"key":"city","label":"City","type":"text"},{"key":"country","label":"Office country","type":"select","required":true,"source":"Countries"},{"key":"address","label":"Office address","type":"textarea"},{"key":"status","label":"Office status","type":"select","required":true,"options":["Active","Inactive"]},{"key":"headcount","label":"Headcount","type":"integer"},{"key":"leaders","label":"Office leaders (up to 3)","type":"multi","source":"contacts","help":"Add contacts above, then select their names here."}]},{"id":"projects","panel":4,"title":"Project references","singular":"project","limit":"projects","fields":[{"key":"name","label":"Project name","type":"text","required":true},{"key":"country","label":"Country","type":"select","required":true,"source":"Countries"},{"key":"region","label":"Region","type":"select","source":"Regions","required":true},{"key":"disciplines","label":"Disciplines","type":"multi","source":"Disciplines","required":true},{"key":"type","label":"Project type","type":"select","required":true,"source":"ProjectTypes","options":["Hotel","Mixed-use","Residential","Commercial","Other"]},{"key":"gfa","label":"Gross floor area (m²)","type":"integer","required":true,"when":{"key":"type","not":"Hotel"}},{"key":"keys","label":"Number of hotel keys","type":"integer","required":true,"when":{"key":"type","value":"Hotel"}},{"key":"status","label":"Project status","type":"select","required":true,"options":["In progress","Completed","On hold","Cancelled"]},{"key":"startYear","label":"Start year","type":"year","required":true},{"key":"completionYear","label":"Completion year","type":"year","required":true,"when":{"key":"status","value":"Completed"}},{"key":"attachment","label":"Project attachment","type":"file","help":"Maximum 25 MB. Also listed under Attachments."}]},{"id":"bimProjects","panel":5,"title":"BIM projects","singular":"BIM project","limit":"bimProjects","fields":[{"key":"name","label":"Project name","type":"text","required":true},{"key":"location","label":"Location","type":"text","required":true},{"key":"gfa","label":"Gross floor area (m²)","type":"integer","required":true},{"key":"lod","label":"Level of development (LOD)","type":"text","required":true},{"key":"disciplines","label":"BIM project disciplines","type":"multi","source":"Disciplines"}]}],"countryCodes":["AE","AU","BD","BH","CA","CH","CN","DE","EG","ES","FR","GB","HK","ID","IN","IT","JP","KE","KW","LK","MA","MU","MV","MY","NG","NL","NP","NZ","OM","PH","PK","PT","QA","SA","SG","TH","TR","US","VN","ZA"]},"dataverseMap":{"version":1,"consultant":{"identity":{"firmName":"asc_name","website":"asc_website","alias":"asc_akaname"},"bim":{"capability":"asc_bimcapability","operators":"asc_bimoperatorcount"}},"childTables":{"_comment":"2026-10-08 live drift: financial/legal/sustainability were removed from asc_consultant entirely and moved into these dedicated 1:1 child tables (asc_financialinformation/asc_legalinformation/asc_sustainabilityesg - placeholder tables added 16 Sept 2026, never wired up until now actually gaining real columns). Same {table, fields} shape as collections below, but exactly one row per consultant, not a list - see saveChildTable()/loadExistingRecordSync() in services.js.","financial":{"table":"asc_financialinformation","fields":{"effectiveYear":"asc_effectiveyear","yearFormat":"asc_fiscalformat","backlog":"asc_backloginhand","revenue1":"asc_revenuen1","revenue2":"asc_revenuen2","revenue3":"asc_revenuen3"}},"legal":{"table":"asc_legalinformation","fields":{"indemnified":"asc_indemnified","indemnityDetails":"asc_indemnitydetails","litigation":"asc_litigation","litigationDetails":"asc_litigationdetails","insured":"asc_holdspi","perOccurrence":"asc_piperoccurrence","aggregate":"asc_piaggregate"}},"sustainability":{"table":"asc_sustainabilityesg","fields":{"certified":"asc_esgcert","certificationDetails":"asc_esgcertdetails","reporting":"asc_esgreporting","frameworkDetails":"asc_esgframework","professionals":"asc_accreditedcount","qa":"asc_esgqa","qaDetails":"asc_esgqadetails"}}},"collections":{"contacts":{"table":"asc_contact","fields":{"firstName":"asc_firstname","lastName":"asc_lastname","email":"asc_workemail","phone":"asc_phone","jobTitle":"asc_jobtitle","contactType":"asc_contacttype","status":"asc_status"}},"offices":{"table":"asc_office","fields":{"city":"asc_city","address":"asc_address","status":"asc_status","headcount":"asc_headcount"}},"projects":{"table":"asc_projectreference","fields":{"name":"asc_name","brand":"asc_brand","gfa":"asc_gfa","keys":"asc_keys","status":"asc_projectstatus","startYear":"asc_startyear","completionYear":"asc_completionyear"}},"bimProjects":{"table":"asc_bimproject","fields":{"name":"asc_name","location":"asc_location","gfa":"asc_gfa","lod":"asc_lod"}}},"referenceLookupColumns":{"_comment":"Fields moved out of the scalar 'fields' maps above because Dataverse now stores them as lookups, not free text. Carried in dataverseMapping's per-row 'references' object (label/local value) for a trusted service to resolve to the GUID column named here - never written directly as a string.","contacts.region":{"column":"asc_regionid","targetTable":"asc_region"},"offices.country":{"column":"asc_countryid","targetTable":"asc_country"},"projects.country":{"column":"asc_countryid","targetTable":"asc_country"},"projects.type":{"column":"asc_type","targetTable":"asc_ProjectType","note":"BLOCKED: asc_ProjectType has no rows yet (placeholder table, only the default field) - cannot resolve labels to IDs until it is built out and seeded. See backend/README.md."}},"unresolvedLiveGaps":{"_comment":"URS/FS-required fields whose Dataverse column no longer exists live. Kept mapped here (not deleted) so requirements aren't silently dropped, per project's no-removal-without-permission rule. Portal writes to these will fail until the columns are restored - do not enable live writes for these fields until resolved.","offices.city":{"table":"asc_office","column":"asc_city","status":"MISSING_LIVE","note":"Documented in backend/README.md as a deliberate additive FS requirement; removed live, cause unknown."},"offices.status":{"table":"asc_office","column":"asc_status","status":"MISSING_LIVE","note":"Region-eligibility business rule (active office) depends on this. Documented in backend/README.md as a deliberate additive FS requirement; removed live, cause unknown."},"offices.leaders":{"table":"asc_office","status":"AMBIGUOUS","note":"Frontend collects up to 3 existing Contact records as leaders (asc_office.asc_leader1_id/2_id/3_id, all removed live). Live now has a single asc_office.asc_officeleaderid lookup to the separate asc_officeleader table (its own name/position/email/phone, not linked to Contact, and singular not up-to-3) - does not match URS §6.3 'up to three senior leaders' or the current frontend. Needs a decision before this can be wired to anything; not mapped to asc_officeleaderid."},"bimProjects.lod":{"table":"asc_bimproject","column":"asc_lod","status":"MISSING_LIVE","note":"Required by URS §6.9 'LOD ... Yes'. Removed live with no replacement found."}},"revenueRegions":{"Middle East":"asc_revenuepct_middleeast","South Asia":"asc_revenuepct_southasia","Europe":"asc_revenuepct_europe","Africa":"asc_revenuepct_africa","Other":"asc_revenuepct_other"},"booleanColumns":["asc_indemnified","asc_litigation","asc_holdspi","asc_esgcert","asc_esgreporting","asc_esgqa"],"integerColumns":["asc_effectiveyear","asc_bimoperatorcount","asc_accreditedcount","asc_headcount","asc_gfa","asc_keys","asc_startyear","asc_completionyear"],"decimalColumns":["asc_backloginhand","asc_revenuen1","asc_revenuen2","asc_revenuen3","asc_piperoccurrence","asc_piaggregate"]}};
  function initialize() {
    var root = document.querySelector('.consultant-portal');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    var preview = root.dataset.preview === 'true';
    var views = portalConfig.views;
    var form = document.getElementById('profile-form');

    // Pure rules: shared by the UI and the Node regression tests.
    var profileRules = {
      eligibleRegions: function (offices, projects) {
        var counts = {};
        var regions = new Set(offices.filter(function (office) {
          return office.status === 'Active' && office.region;
        }).map(function (office) { return office.region; }));
        projects.forEach(function (project) {
          if (project.status === 'Completed' && project.region) {
            counts[project.region] = (counts[project.region] || 0) + 1;
            if (counts[project.region] >= 3) regions.add(project.region);
          }
        });
        return Array.from(regions);
      },
      fiscalLabel: function (year, split, offset) {
        if (!/^\d{4}$/.test(String(year))) return 'N−' + offset;
        var prior = Number(year) - offset;
        return split ? prior + '/' + String(prior + 1).slice(-2) : String(prior);
      },
      backlogRatio: function (backlog, revenue) {
        if (backlog === '' || revenue === '' || !Number.isFinite(Number(backlog)) || !Number.isFinite(Number(revenue)) || Number(backlog) < 0 || Number(revenue) <= 0) return null;
        return Number(backlog) / Number(revenue) * 100;
      },
      conditionApplies: function (condition, values) {
        if (!condition) return true;
        var value = values[condition.key];
        return condition.not !== undefined ? Boolean(value) && value !== condition.not : value === condition.value;
      },
      percentageWarning: function (values) {
        var entered = values.filter(function (value) { return value !== ''; });
        if (!entered.length) return '';
        var total = entered.reduce(function (sum, value) { return sum + Number(value); }, 0);
        return Math.abs(total - 100) > 0.5 ? 'Revenue shares total ' + total.toFixed(1) + '%. Check that they total approximately 100%.' : '';
      },
      fileError: function (file, maximum) {
        return file.size > maximum ? file.name + ' exceeds the 25 MB limit.' : '';
      },
      yearError: function (start, completion) {
        return start && completion && Number(completion) < Number(start) ? 'Completion year must be on or after the start year.' : '';
      }
    };

    // Review-service DTO, NOT an OData PATCH of the published consultant.
    // The trusted service must resolve labels, temporary row IDs and ownership.
    var dataverseMapping = (function () {
      var map = portalConfig.dataverseMap;
      function value(column, input) {
        if (input === undefined || input === null || input === '') return null;
        if (map.booleanColumns.includes(column)) {
          if (input === true || input === 'Yes') return true;
          if (input === false || input === 'No') return false;
          throw new Error('Invalid Yes/No value for ' + column + '.');
        }
        if (map.integerColumns.includes(column) || map.decimalColumns.includes(column) || column.startsWith('asc_revenuepct_')) {
          var text = String(input).trim();
          if (!/^\$?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) throw new Error('Invalid number for ' + column + '.');
          var number = Number(text.replace(/[$,]/g, ''));
          if (!Number.isFinite(number) || number > 100000000000 || (map.integerColumns.includes(column) && (!Number.isSafeInteger(number) || number > 2147483647))) throw new Error('Number is outside the supported range for ' + column + '.');
          return number;
        }
        if (column === 'asc_fiscalformat') {
          if (String(input).startsWith('YYYY/ZZ')) return 'YYYY/ZZ';
          if (String(input).startsWith('YYYY (')) return 'YYYY';
          if (input === 'YYYY') return input;
          throw new Error('Unsupported fiscal-year format.');
        }
        return String(input).trim();
      }
      function fields(input, mapping) {
        var output = {};
        Object.keys(mapping).forEach(function (key) { output[mapping[key]] = value(mapping[key], (input || {})[key]); });
        return output;
      }
      // Inverse of value(): turns a raw Dataverse column value back into the string/label
      // shape the form controls expect (createFields' `initial` argument). Used to prefill
      // the form from an existing live record, not by the save path.
      function reverseValue(column, raw) {
        if (raw === null || raw === undefined) return undefined;
        if (map.booleanColumns.includes(column)) return raw ? 'Yes' : 'No';
        if (map.integerColumns.includes(column) || map.decimalColumns.includes(column) || column.startsWith('asc_revenuepct_')) return String(raw);
        if (column === 'asc_fiscalformat') return raw === 'YYYY/ZZ' ? 'YYYY/ZZ (Apr–Mar)' : raw === 'YYYY' ? 'YYYY (Jan–Dec)' : raw;
        return String(raw);
      }
      function reverseFields(record, mapping) {
        var output = {};
        Object.keys(mapping).forEach(function (key) {
          var reversed = reverseValue(mapping[key], record[mapping[key]]);
          if (reversed !== undefined) output[key] = reversed;
        });
        return output;
      }
      function reverseConsultant(record) {
        var identity = reverseFields(record, map.consultant.identity);
        var sections = {};
        Object.keys(map.consultant).filter(function (key) { return key !== 'identity'; }).forEach(function (key) {
          sections[key] = reverseFields(record, map.consultant[key]);
        });
        var revenueByRegion = {};
        Object.keys(map.revenueRegions).forEach(function (region) {
          var raw = record[map.revenueRegions[region]];
          if (raw !== null && raw !== undefined) revenueByRegion[region] = String(raw);
        });
        return { identity: identity, sections: sections, revenueByRegion: revenueByRegion };
      }
      function reverseRow(collectionKey, record) {
        return reverseFields(record, map.collections[collectionKey].fields);
      }
      // Financial/Legal/Sustainability live on their own 1:1 child tables now (see
      // dataverse-map.json's childTables._comment) - same fields()/reverseFields() shape as a
      // collection row, just addressed by a fixed key instead of a table+row list.
      function prepareChildTable(key, payload) {
        return fields((payload.sections || {})[key], map.childTables[key].fields);
      }
      function reverseChildTable(key, record) {
        return reverseFields(record, map.childTables[key].fields);
      }
      function prepare(payload) {
        var consultant = fields(payload.identity, map.consultant.identity);
        Object.keys(map.consultant).filter(function (key) { return key !== 'identity'; }).forEach(function (key) {
          Object.assign(consultant, fields((payload.sections || {})[key], map.consultant[key]));
        });
        Object.keys(payload.revenueByRegion || {}).forEach(function (region) {
          if (!map.revenueRegions[region]) throw new Error('Revenue region is not configured: ' + region + '.');
          consultant[map.revenueRegions[region]] = value(map.revenueRegions[region], payload.revenueByRegion[region]);
        });
        var collections = {};
        Object.keys(map.collections).forEach(function (key) {
          collections[key] = ((payload.collections || {})[key] || []).map(function (row) {
            return { clientId: row.id, liveId: row.liveId || null, table: map.collections[key].table, fields: fields(row, map.collections[key].fields), references: { region: row.region || null, country: row.country || null, type: row.type || null, disciplines: row.disciplines || [], leaders: row.leaders || [] } };
          });
        });
        return { mappingVersion: map.version, consultant: consultant, references: { firmType: payload.identity.firmType || null, disciplines: payload.identity.disciplines || [], sectors: payload.identity.sectors || [], regions: payload.identity.regions || [], bimDisciplines: ((payload.sections || {}).bim || {}).disciplines || [] }, collections: collections, files: payload.files || [] };
      }
      return { prepare: prepare, reverseConsultant: reverseConsultant, reverseRow: reverseRow, prepareChildTable: prepareChildTable, reverseChildTable: reverseChildTable };
    }());

    // dataverseMapping.prepare(payload) produces the review-service DTO.
    // LIVE WRITE PATH: writes directly via the Power Pages Web API. Explicit interim
    // implementation, not the final architecture:
    //  - Writes: asc_consultant (own fields, incl. firmtype lookup), asc_contact rows,
    //    asc_bimproject rows, and discipline/sector/region rows in their dedicated junction
    //    tables (asc_consultantdiscipline/asc_consultantsectors/asc_consultantregions -
    //    pre-existing live tables discovered 2026-09-27, not created by this schema). The
    //    corresponding asc_consultant_discipline/sector/region N:N relationships still exist in
    //    Dataverse but are no longer written to, per project decision.
    //  - NOT written - genuinely blocked, not a code gap:
    //    * Offices - asc_office.asc_officeleaderid is a required lookup that doesn't match
    //      what the frontend collects (up to 3 existing Contacts). Every create would fail.
    //    * Project references - asc_projectreference.asc_type is a required lookup to
    //      asc_ProjectType, which has zero rows. Nothing to link to.
    //    * Attachments - asc_attachment.asc_file (file column) is not provisioned yet.
    //    See dataverse-map.json's unresolvedLiveGaps/referenceLookupColumns and
    //    backend/README.md for the exact blockers and what would unblock each one.
    //  - This bypasses the intended draft/review workflow (S7 accept/reject in
    //    portalsubmission), which is not built yet - writes go straight to published
    //    records. Requires Webapi/<table>/enabled + Webapi/<table>/fields site settings per
    //    table written or read here, and Table Permissions (Append on consultant/discipline/
    //    sector/region, AppendTo on the tables written here) for every @odata.bind lookup used
    //    on create - see backend/README.md for the exact list.
    var previewDraft = null;
    var liveConsultantId = null;
    try { liveConsultantId = window.localStorage.getItem('ascentisLiveConsultantId') || null; } catch (ignored) {}
    var verificationToken = null;
    async function getVerificationToken() {
      if (verificationToken) return verificationToken;
      var response = await fetch('/_layout/tokenhtml', { credentials: 'same-origin' });
      var text = await response.text();
      var doc = new DOMParser().parseFromString(text, 'text/html');
      var input = doc.querySelector('input[name="__RequestVerificationToken"]') || doc.querySelector('input');
      if (!input) throw new Error('Could not read the sign-in token. Please refresh and sign in again.');
      verificationToken = input.getAttribute('value');
      return verificationToken;
    }
    async function webApiRequest(method, url, body) {
      var token = await getVerificationToken();
      var response = await fetch(url, {
        method: method,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          'X-Requested-With': 'XMLHttpRequest',
          '__RequestVerificationToken': token
        },
        body: body ? JSON.stringify(body) : undefined
      });
      if (!response.ok) {
        var detail = '';
        try {
          var errorBody = (await response.json()).error;
          detail = errorBody.message;
          // Dataverse's top-level error.message is often a generic wrapper ("Common Data
          // Service error occurred.") with the actual cause nested in innererror - the UI only
          // ever showed the generic text with no way to see the real reason. Log the full body
          // (same pattern as syncGetJson's console.warn elsewhere in this file) so the browser
          // console has what the screen can't show.
          console.warn('[ascentis] write failed', method, url, errorBody);
        } catch (ignored) {}
        throw new Error('Save failed (' + response.status + ')' + (detail ? ': ' + detail : '.'));
      }
      return response;
    }
    // Set by confidentiality.js when the user checks the acknowledgement box, before any
    // consultant record necessarily exists yet (Confidentiality is step 2, Identity/save is
    // step 3). Carried here and merged into the next consultant save. DEMO scope: records who
    // (signed-in display name) and when, but not a real OTP-bound identity check or a signed
    // PDF - see docs/dataverse-integration.md and backend/README.md for the full requirement.
    var pendingAcknowledgement = null;
    function extractCreatedId(response) {
      var entityUrl = response.headers.get('entityid') || response.headers.get('OData-EntityId') || '';
      var match = entityUrl.match(/\(([0-9a-fA-F-]{36})\)/) || entityUrl.match(/([0-9a-fA-F-]{36})$/);
      return match ? match[1] : null;
    }
    async function saveConsultant(payload) {
      var dto = dataverseMapping.prepare(payload);
      var fields = dto.consultant;
      if (pendingAcknowledgement) {
        fields.asc_confackn = true;
        fields.asc_confacknby = pendingAcknowledgement.by;
        fields.asc_confackndate = pendingAcknowledgement.date;
      }
      var firmTypeLabel = payload.identity && payload.identity.firmType;
      if (firmTypeLabel) {
        var firmTypeId = await resolveReferenceId('asc_firmtypes', 'asc_firmtypeid', firmTypeLabel);
        if (firmTypeId) fields['asc_firmtype_id@odata.bind'] = '/asc_firmtypes(' + firmTypeId + ')';
      }
      if (liveConsultantId) {
        await webApiRequest('PATCH', '/_api/asc_consultants(' + liveConsultantId + ')', fields);
        return liveConsultantId;
      }
      // 2026-10-08 live drift: asc_consultant.asc_status was converted from free text to a
      // required Choice column (Active=751050000/Inactive=751050001/Blacklisted=751050002).
      // dataverse-mapping.js deliberately never includes asc_status in `fields` - it's an
      // internal/admin-controlled concept (a consultant must never be able to set themselves
      // Active after being Blacklisted, for instance), excluded by design, confirmed by
      // tests/mapping.test.cjs. A brand-new record now needs SOME value to satisfy the required
      // column, so this sets Active only on this one-time Create path - never on the PATCH
      // branch above, preserving the exclusion for every save after the first.
      fields.asc_status = 751050000;
      var response = await webApiRequest('POST', '/_api/asc_consultants', fields);
      var createdId = extractCreatedId(response);
      if (!createdId) throw new Error('The record was created but its ID could not be read from the response.');
      liveConsultantId = createdId;
      try { window.localStorage.setItem('ascentisLiveConsultantId', liveConsultantId); } catch (ignored) {}
      return liveConsultantId;
    }

    // Financial/Legal/Sustainability - 1:1 child tables as of the 2026-10-08 live drift (see
    // dataverse-map.json's childTables._comment). liveChildTableIds caches each one's row ID
    // once found/created this session (same role as liveConsultantId, just three of them).
    var CHILD_TABLE_KEYS = ['financial', 'legal', 'sustainability'];
    var liveChildTableIds = {};
    async function saveChildTable(consultantId, key, payload) {
      var entry = portalConfig.dataverseMap.childTables[key];
      var body = dataverseMapping.prepareChildTable(key, payload);
      var id = liveChildTableIds[key];
      if (id) {
        await webApiRequest('PATCH', '/_api/' + entry.table + 's(' + id + ')', body);
        return id;
      }
      body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + consultantId + ')';
      var response = await webApiRequest('POST', '/_api/' + entry.table + 's', body);
      var createdId = extractCreatedId(response);
      if (createdId) liveChildTableIds[key] = createdId;
      return createdId;
    }
    async function saveChildTables(consultantId, payload) {
      for (var i = 0; i < CHILD_TABLE_KEYS.length; i++) {
        var key = CHILD_TABLE_KEYS[i];
        try {
          await saveChildTable(consultantId, key, payload);
        } catch (error) {
          // Each of these tables has several required fields (e.g. asc_effectiveyear/
          // asc_revenuen1 on Financial, three required Yes/No fields on Legal, three on
          // Sustainability) that a genuinely incomplete Save Draft may not have answered yet -
          // the frontend only enforces completeness on real Submit (validateProfile(draft)).
          // Never let an incomplete draft's child-table save block the rest of saveAll() - same
          // non-blocking pattern as recordPortalSubmissions above.
          console.warn('[ascentis] child table save failed for', key, error);
        }
      }
    }

    // Synchronous live choice loading for Disciplines/Sectors/Regions, called once from the
    // very top of profile.js before `choices = portalConfig.choices` is read, so the rest of
    // the codebase needs no change - it keeps overwriting the same array-of-names shape that
    // config.json's hardcoded fallback already used. Uses synchronous XHR (deprecated, but the
    // whole portal init is a single synchronous pass with no async bootstrapping - this avoids
    // a much larger restructure for what's an interim/demo-quality fix) rather than the async
    // fetch() pattern used elsewhere. On any failure (not signed in yet, network error, entity
    // not enabled for Web API) it silently leaves the hardcoded config.json list in place.
    // Every read below is a plain GET to a URL that's identical on every visit
    // (e.g. /_api/asc_regions?$select=asc_name), which browsers are free to serve from cache
    // instead of re-requesting - so edits made straight to a Dataverse table would not
    // reliably show up on the next portal load. A cache-busting query param (e.g. &_=<time>)
    // does NOT work here - the Web API rejects any query parameter it doesn't recognize
    // (confirmed live: "The _ query parameter is not supported"). Use request headers instead,
    // which the Web API ignores for its own parsing but the browser still honours for caching.
    function setNoCacheHeaders(xhr) {
      xhr.setRequestHeader('Cache-Control', 'no-cache, no-store');
      xhr.setRequestHeader('Pragma', 'no-cache');
    }
    function syncGetVerificationToken() {
      // Reuses the same cache the async getVerificationToken() writes to, so a token fetched
      // by either path is never fetched twice.
      if (verificationToken) return verificationToken;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/_layout/tokenhtml', false);
      xhr.send();
      if (xhr.status < 200 || xhr.status >= 300) return null;
      var doc = new DOMParser().parseFromString(xhr.responseText, 'text/html');
      var input = doc.querySelector('input[name="__RequestVerificationToken"]') || doc.querySelector('input');
      verificationToken = input ? input.getAttribute('value') : null;
      return verificationToken;
    }
    // Master-list dropdowns that are NOT Disciplines/Sectors/Regions/Firm Type - kept out of
    // portalConfig.choices on purpose, since that object drives the tag-picker rendering loop.
    // form-fields.js optionsFor() and profile.js read these directly, falling back to the
    // hardcoded lists in form-schema.json when a key is absent (preview mode, failed fetch, or
    // the master table is empty).
    var liveLists = {};
    function syncFetchNames(entitySet, token, nameField) {
      if (!token) return null;
      var field = nameField || 'asc_name';
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/_api/' + entitySet + '?$select=' + field, false);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('OData-MaxVersion', '4.0');
      xhr.setRequestHeader('OData-Version', '4.0');
      xhr.setRequestHeader('__RequestVerificationToken', token);
      setNoCacheHeaders(xhr);
      try { xhr.send(); } catch (ignored) { return null; }
      if (xhr.status < 200 || xhr.status >= 300) {
        // Silently falling back to the config.json list on failure made this impossible to
        // diagnose from the outside - log the real reason instead.
        try { console.warn('[ascentis] live choices fetch failed', xhr.status, entitySet, JSON.parse(xhr.responseText).error); } catch (ignored2) {}
        return null;
      }
      try {
        var data = JSON.parse(xhr.responseText);
        var names = (data.value || []).map(function (r) { return r[field]; }).filter(Boolean);
        if (!names.length) console.warn('[ascentis] live choices fetch returned zero rows', entitySet);
        return names.length ? names : null;
      } catch (ignored) { return null; }
    }
    function loadLiveChoicesSync() {
      // One token fetch, reused for all three entity calls (was fetching it 3x before - the
      // main cause of the slowness).
      var token = syncGetVerificationToken();
      if (!token) return;
      var disciplines = syncFetchNames('asc_disciplines', token);
      var sectors = syncFetchNames('asc_sectors', token);
      var regions = syncFetchNames('asc_regions', token);
      var firmTypes = syncFetchNames('asc_firmtypes', token);
      if (disciplines) portalConfig.choices.Disciplines = disciplines;
      if (sectors) portalConfig.choices.Sectors = sectors;
      if (firmTypes) {
        // Deliberately NOT stored on portalConfig.choices - that object drives the
        // Disciplines/Sectors/Regions tag-picker rendering (Object.keys(choices).forEach
        // renders one per key), and Firm Type has no matching tag-picker element. Populate
        // the <select> directly instead, as done below.
        var select = document.querySelector('select[name="firmType"]');
        if (select) {
          var current = select.value;
          select.innerHTML = '';
          var placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select firm type';
          select.appendChild(placeholder);
          firmTypes.forEach(function (name) {
            var option = document.createElement('option');
            option.textContent = name;
            select.appendChild(option);
          });
          if (firmTypes.includes(current)) select.value = current;
        }
      }
      if (regions) portalConfig.choices.Regions = regions;
      var countries = syncFetchNames('asc_countrys', token);
      if (countries) liveLists.Countries = countries;
      var documentTypes = syncFetchNames('asc_documenttypes', token);
      if (documentTypes) liveLists.DocumentTypes = documentTypes;
      var projectTypes = syncFetchNames('asc_projecttypes', token, 'asc_projecttypename');
      if (projectTypes) liveLists.ProjectTypes = projectTypes;
    }

    function syncGetJson(url, token) {
      if (!token) return null;
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.setRequestHeader('Accept', 'application/json');
      xhr.setRequestHeader('OData-MaxVersion', '4.0');
      xhr.setRequestHeader('OData-Version', '4.0');
      xhr.setRequestHeader('__RequestVerificationToken', token);
      // Gives every lookup column in the response a '<field>@OData.Community.Display.V1.
      // FormattedValue' companion holding the related record's display name, without needing
      // $expand - useful because the Web API rejects $filter and $expand used together.
      xhr.setRequestHeader('Prefer', 'odata.include-annotations="OData.Community.Display.V1.FormattedValue"');
      setNoCacheHeaders(xhr);
      try { xhr.send(); } catch (ignored) { return null; }
      if (xhr.status < 200 || xhr.status >= 300) {
        // Prefill is best-effort - never breaks the form on failure - but log the actual
        // Dataverse error (network tab only ever shows the status code, not why).
        try { console.warn('[ascentis] prefill request failed', xhr.status, url, JSON.parse(xhr.responseText).error); } catch (ignored2) {}
        return null;
      }
      try { return JSON.parse(xhr.responseText); } catch (ignored) { return null; }
    }

    // Fetches the signed-in user's existing consultant record (identified the same way
    // saveConsultant() identifies it - the browser-local ascentisLiveConsultantId, since
    // there's no real per-user ownership on asc_consultant yet) plus its contacts and BIM
    // projects, and reverse-maps them into the shape profile.js's createFields()/addRecord()
    // `initial` argument expects. Called once, synchronously, before the form is built, same
    // pattern as loadLiveChoicesSync(). On any failure the form is simply left blank, as it
    // always was before this existed.
    var existingRecord = null;
    function loadExistingRecordSync() {
      if (!liveConsultantId) return;
      var token = syncGetVerificationToken();
      if (!token) return;
      // 2026-10-08 live drift: asc_effectiveyear/asc_fiscalformat/asc_backloginhand/
      // asc_revenuen1-3/asc_indemnified/asc_indemnitydetails/asc_litigation/
      // asc_litigationdetails/asc_holdspi/asc_piperoccurrence/asc_piaggregate/asc_esgcert/
      // asc_esgcertdetails/asc_esgreporting/asc_esgframework/asc_accreditedcount/asc_esgqa/
      // asc_esgqadetails were removed from asc_consultant entirely - selecting a column that no
      // longer exists 400s the whole request, so they're gone from this $select. Fetched from
      // their own tables below instead (dataverse-map.json's childTables).
      var consultantUrl = '/_api/asc_consultants(' + liveConsultantId + ')'
        + '?$select=asc_name,asc_website,asc_akaname,asc_bimcapability,asc_bimoperatorcount,'
        + 'asc_revenuepct_middleeast,asc_revenuepct_southasia,'
        + 'asc_revenuepct_europe,asc_revenuepct_africa,asc_revenuepct_other'
        + '&$expand=asc_firmtype_id($select=asc_name)';
      var consultant = syncGetJson(consultantUrl, token);
      if (!consultant) return;
      var reversed = dataverseMapping.reverseConsultant(consultant);
      reversed.identity.firmType = consultant.asc_firmtype_id ? consultant.asc_firmtype_id.asc_name : '';

      // $filter on a lookup's _value annotation is rejected by the Power Pages Web API here
      // (generic "unexpected error", regardless of whether $expand is also present) - fetch
      // unfiltered instead (same request shape already proven to work for the choice-list
      // reads) and match the consultant client-side. Table Permissions are Global scope
      // anyway, not per-owner, so this returns no more than an unfiltered fetch already could.
      function belongsToThisConsultant(row) {
        return row._asc_consultant_id_value && row._asc_consultant_id_value.toLowerCase() === liveConsultantId.toLowerCase();
      }
      function belongsToThisConsultantJunction(row) {
        return row._asc_consultantid_value && row._asc_consultantid_value.toLowerCase() === liveConsultantId.toLowerCase();
      }
      var contactsData = syncGetJson('/_api/asc_contacts?$select=asc_contactid,asc_firstname,asc_lastname,asc_workemail,asc_phone,asc_jobtitle,asc_contacttype,asc_status,asc_regionid,asc_consultant_id', token);
      var contacts = ((contactsData && contactsData.value) || []).filter(belongsToThisConsultant).map(function (row) {
        // contactType/status come through reverseRow() as plain strings already - asc_contact
        // is plain text now, not the option-set integers it used to be before the 2026-09-27
        // rebuild.
        var rowFields = dataverseMapping.reverseRow('contacts', row);
        rowFields.region = row['_asc_regionid_value@OData.Community.Display.V1.FormattedValue'] || '';
        return { liveId: row.asc_contactid, fields: rowFields };
      });

      var bimData = syncGetJson('/_api/asc_bimprojects?$select=asc_bimprojectid,asc_name,asc_location,asc_gfa,asc_consultant_id', token);
      var bimProjects = ((bimData && bimData.value) || []).filter(belongsToThisConsultant).map(function (row) {
        return { liveId: row.asc_bimprojectid, fields: dataverseMapping.reverseRow('bimProjects', row) };
      });

      // Disciplines/Sectors/Regions now live as real rows in dedicated junction tables
      // (asc_consultantdiscipline/asc_consultantsectors/asc_consultantregions - pre-existing
      // live tables, not created by this schema, discovered 2026-09-27) rather than only in
      // Dataverse's hidden N:N intersect data. $consultantid is unfiltered + client-matched for
      // the same reason as contacts/bimProjects above.
      // $expand targets the relationship's NavigationPropertyName (capitalized - same
      // case-sensitivity rule as the @odata.bind fix above), NOT the lowercase attribute
      // LogicalName used in $select for the junction row's own asc_consultantid column - that one
      // stays lowercase since it's a plain attribute read, not a navigation property. The expanded
      // JSON response key echoes back exactly the casing requested, so the row.asc_DisciplineID
      // reads below must match too.
      var disciplineData = syncGetJson('/_api/asc_consultantdisciplines?$select=asc_consultantid&$expand=asc_DisciplineID($select=asc_name)', token);
      reversed.identity.disciplines = ((disciplineData && disciplineData.value) || []).filter(belongsToThisConsultantJunction).map(function (row) { return row.asc_DisciplineID && row.asc_DisciplineID.asc_name; }).filter(Boolean);

      var sectorData = syncGetJson('/_api/asc_consultantsectorses?$select=asc_consultantid&$expand=asc_SectorID($select=asc_name)', token);
      reversed.identity.sectors = ((sectorData && sectorData.value) || []).filter(belongsToThisConsultantJunction).map(function (row) { return row.asc_SectorID && row.asc_SectorID.asc_name; }).filter(Boolean);

      var regionData = syncGetJson('/_api/asc_consultantregionses?$select=asc_consultantid&$expand=asc_RegionID($select=asc_name)', token);
      reversed.identity.regions = ((regionData && regionData.value) || []).filter(belongsToThisConsultantJunction).map(function (row) { return row.asc_RegionID && row.asc_RegionID.asc_name; }).filter(Boolean);

      // Financial/Legal/Sustainability - 1:1 child tables (see dataverse-map.json's
      // childTables._comment). Unfiltered + client-matched, same established reason as every
      // other read in this function. Caches the one live row ID per table so saveChildTable()
      // PATCHes it later in this same session instead of creating a duplicate.
      CHILD_TABLE_KEYS.forEach(function (key) {
        var entry = portalConfig.dataverseMap.childTables[key];
        var fieldNames = Object.values(entry.fields).join(',');
        var rowsData = syncGetJson('/_api/' + entry.table + 's?$select=' + entry.table + 'id,asc_consultant_id,' + fieldNames, token);
        var row = ((rowsData && rowsData.value) || []).find(belongsToThisConsultant);
        if (row) {
          liveChildTableIds[key] = row[entry.table + 'id'];
          reversed.sections[key] = dataverseMapping.reverseChildTable(key, row);
        }
      });

      existingRecord = { identity: reversed.identity, sections: reversed.sections, revenueByRegion: reversed.revenueByRegion, contacts: contacts, bimProjects: bimProjects };
    }

    // Reference-label -> GUID resolution, with an in-page cache since the same labels
    // (e.g. regions) repeat across many rows in one submission.
    var referenceIdCache = {};
    async function resolveReferenceId(entitySet, idField, name) {
      if (!name) return null;
      var cacheKey = entitySet + '|' + name;
      if (Object.prototype.hasOwnProperty.call(referenceIdCache, cacheKey)) return referenceIdCache[cacheKey];
      var token = await getVerificationToken();
      var filterValue = String(name).replace(/'/g, "''");
      var url = '/_api/' + entitySet + '?$select=' + idField + '&$filter=asc_name eq \'' + filterValue + '\'';
      var response = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', '__RequestVerificationToken': token, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
      });
      var id = null;
      if (response.ok) {
        var data = await response.json();
        id = (data.value && data.value[0] && data.value[0][idField]) || null;
      }
      referenceIdCache[cacheKey] = id;
      return id;
    }

    // Writes one row into a Consultant x <Discipline/Sector/Region> junction table (real,
    // queryable tables - asc_consultantdiscipline/asc_consultantsectors/asc_consultantregions,
    // pre-existing live tables discovered 2026-09-27, not created by this schema) rather than
    // using $ref on the corresponding N:N relationship (asc_consultant_discipline etc., which
    // stays defined but is no longer written to, per project decision).
    // Bind keys must match each lookup's relationship NavigationPropertyName (SchemaName-cased,
    // e.g. "asc_ConsultantID"/"asc_DisciplineID"), NOT the attribute's all-lowercase LogicalName
    // (e.g. "asc_consultantid") - confirmed via a fresh pac solution export (same case-sensitivity
    // bug as the Audit Log asc_actor/asc_Actor fix, present on all 3 of these junction tables).
    // targetIdField (below) is unaffected - it is a plain $select attribute name on the target
    // entity's own primary key, not a navigation property, so it stays lowercase.
    async function createConsultantJunctionRow(junctionEntitySet, targetNavProperty, targetEntitySet, targetId, consultantId) {
      var body = {};
      body['asc_ConsultantID@odata.bind'] = '/asc_consultants(' + consultantId + ')';
      body[targetNavProperty + '@odata.bind'] = '/' + targetEntitySet + '(' + targetId + ')';
      await webApiRequest('POST', '/_api/' + junctionEntitySet, body);
    }
    async function createConsultantJunctionRows(consultantId, labels, junctionEntitySet, targetNavProperty, targetEntitySet, targetIdField) {
      for (var i = 0; i < (labels || []).length; i++) {
        var id = await resolveReferenceId(targetEntitySet, targetIdField, labels[i]);
        if (id) await createConsultantJunctionRow(junctionEntitySet, targetNavProperty, targetEntitySet, id, consultantId);
      }
    }

    async function saveContacts(consultantId, payload) {
      var dto = dataverseMapping.prepare(payload);
      var rows = (dto.collections && dto.collections.contacts) || [];
      var results = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var body = Object.assign({}, row.fields);
        // asc_contacttype/asc_status are sent as plain text - asc_contact was rebuilt
        // 2026-09-27 with these as plain text columns (rebuild tooling can't create custom
        // picklists), replacing the option-set integer values the live picklist used to need.
        var regionLabel = row.references && row.references.region;
        if (regionLabel) {
          var regionId = await resolveReferenceId('asc_regions', 'asc_regionid', regionLabel);
          if (regionId) body['asc_regionid@odata.bind'] = '/asc_regions(' + regionId + ')';
        }
        if (row.liveId) {
          await webApiRequest('PATCH', '/_api/asc_contacts(' + row.liveId + ')', body);
          results.push({ clientId: row.clientId, liveId: row.liveId });
        } else {
          body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + consultantId + ')';
          var response = await webApiRequest('POST', '/_api/asc_contacts', body);
          results.push({ clientId: row.clientId, liveId: extractCreatedId(response) });
        }
      }
      return results;
    }
    async function saveBimProjects(consultantId, payload) {
      var dto = dataverseMapping.prepare(payload);
      var rows = (dto.collections && dto.collections.bimProjects) || [];
      var results = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var body = Object.assign({}, row.fields);
        // asc_lod no longer exists as a writable text field live (replaced by a lookup,
        // asc_lodid, that we don't resolve) - see dataverse-map.json's unresolvedLiveGaps.
        // Strip it rather than let the Web API reject the whole row.
        delete body.asc_lod;
        if (row.liveId) {
          await webApiRequest('PATCH', '/_api/asc_bimprojects(' + row.liveId + ')', body);
          results.push({ clientId: row.clientId, liveId: row.liveId });
        } else {
          body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + consultantId + ')';
          var response = await webApiRequest('POST', '/_api/asc_bimprojects', body);
          results.push({ clientId: row.clientId, liveId: extractCreatedId(response) });
        }
      }
      return results;
    }
    async function saveConsultantReferences(consultantId, payload) {
      // Only write rows for labels not already linked (from existingRecord, fetched at load
      // time) - on every edit-resubmit most previously-selected labels are unchanged, and there
      // is no unique-key constraint stopping a duplicate junction row from being created.
      // Unselecting a previously-saved label is not handled here - its row stays live; removing
      // it would need a DELETE call, not built yet.
      var already = (existingRecord && existingRecord.identity) || { disciplines: [], sectors: [], regions: [] };
      var newDisciplines = ((payload.identity && payload.identity.disciplines) || []).filter(function (l) { return !already.disciplines.includes(l); });
      var newSectors = ((payload.identity && payload.identity.sectors) || []).filter(function (l) { return !already.sectors.includes(l); });
      var newRegions = ((payload.identity && payload.identity.regions) || []).filter(function (l) { return !already.regions.includes(l); });
      await createConsultantJunctionRows(consultantId, newDisciplines, 'asc_consultantdisciplines', 'asc_DisciplineID', 'asc_disciplines', 'asc_disciplineid');
      await createConsultantJunctionRows(consultantId, newSectors, 'asc_consultantsectorses', 'asc_SectorID', 'asc_sectors', 'asc_sectorid');
      await createConsultantJunctionRows(consultantId, newRegions, 'asc_consultantregionses', 'asc_RegionID', 'asc_regions', 'asc_regionid');
      // Keep the "already associated" cache in sync so a second save later in the same
      // session (no page reload) does not try to re-associate the same labels again.
      if (!existingRecord) existingRecord = { identity: {}, sections: {}, revenueByRegion: {}, contacts: [], bimProjects: [] };
      existingRecord.identity.disciplines = (payload.identity && payload.identity.disciplines) || [];
      existingRecord.identity.sectors = (payload.identity && payload.identity.sectors) || [];
      existingRecord.identity.regions = (payload.identity && payload.identity.regions) || [];
    }
    // docs/portal-submission-configuration.md staging table (asc_portalsubmission) - an
    // ADDITIVE review-trail write, parallel to the direct live asc_consultant write above, not
    // a replacement of it. The doc's target design has the direct write disappear once an
    // internal S7 review/accept flow promotes asc_after into the live record on Accept - that
    // flow is internal-only (CONSULTANT-PORTAL.md: external scope is E1-E4, internal S1-S15 are
    // separate) and out of this repository, so cutting the direct write now would strand every
    // submission with no path to the live record. Every call here is wrapped so a failure never
    // breaks the existing, tested saveConsultant/saveContacts/saveBimProjects path.
    //
    // Step 2's Contact-scoped Table Permission could not be built as literally specified:
    // asc_submittedby_id targets asc_contact (this project's custom business-contact table),
    // not the native Power Pages Contact entity that Table Permissions' Contact scope actually
    // walks to resolve the signed-in visitor - so no relationship from asc_portalsubmission to
    // native Contact exists to select there. Configured as Global scope instead (matching every
    // other table permission in this project - none are per-owner yet) and asc_submittedby_id is
    // deliberately never written by this code. asc_before is captured client-side from the
    // already-loaded existingRecord (the live values as of page load) rather than by the doc's
    // required server-side plugin/flow (atomic with row creation, tamper-resistant) - no plugin
    // project exists in this repository to build that. Both gaps are genuine, not code gaps.
    // 2026-09-30 live drift: the user converted asc_status from plain text into a real Choice
    // column (global option set asc_powerpagestatuschoice - values Draft/Submited [sic, one
    // 't' live]/Accepted/Rejected) and added a new required Yes/No column asc_isreview. Both
    // confirmed via a fresh pac solution export. Values below are the live numeric option
    // values, not the old plain-text strings this code used to send - a picklist write needs
    // the number, not the label, and the spelling doesn't matter once we're writing numbers.
    // asc_isreview always gets false on create (the portal never marks anything reviewed).
    //
    // 2026-10-07 live drift, found independently of any request (routine re-verification before
    // touching this code again): asc_tab was ALSO converted to a Choice column (global option
    // set asc_consultantprofiletabchoice), same breaking-change shape as asc_status before it,
    // and a new optional asc_submittedon datetime column was added. The tab choice's own labels
    // don't exactly match this portal's 8 tab names (it's a broader list covering sections this
    // external portal doesn't have, e.g. "Operator approvals"/"Engagements & Ratings"/"Notes"/
    // "KAM" - presumably shared with an internal admin view) - "Identity" is "Overview" there,
    // "Sustainability" is "Sustainability & ESG". Mapped explicitly below rather than relying on
    // label text matching at all, the same lesson as the Status fix.
    var PORTAL_SUBMISSION_STATUS_VALUES = { Draft: 751050000, Submitted: 751050001 };
    var PORTAL_SUBMISSION_TAB_VALUES = {
      'Identity': 751050000, 'Financial': 751050001, 'Legal': 751050002,
      'Offices & contacts': 751050003, 'Project references': 751050004,
      'BIM': 751050006, 'Sustainability': 751050007, 'Attachments': 751050010
    };
    var PORTAL_SUBMISSION_TABS = ['Identity', 'Financial', 'Legal', 'Offices & contacts', 'Project references', 'BIM', 'Sustainability', 'Attachments'];
    function tabSnapshot(source) {
      if (!source) return {};
      return {
        'Identity': source.identity || {},
        'Financial': (source.sections && source.sections.financial) || {},
        'Legal': (source.sections && source.sections.legal) || {},
        'Offices & contacts': {
          offices: (source.collections && source.collections.offices) || [],
          contacts: (source.collections && source.collections.contacts) || source.contacts || []
        },
        'Project references': (source.collections && source.collections.projects) || [],
        'BIM': {
          bim: (source.sections && source.sections.bim) || {},
          bimProjects: (source.collections && source.collections.bimProjects) || source.bimProjects || []
        },
        'Sustainability': (source.sections && source.sections.sustainability) || {},
        'Attachments': (source.files || []).map(function (item) {
          return { documentType: item.documentType, projectId: item.projectId, name: item.file && item.file.name };
        })
      };
    }
    var portalSubmissionIds = {};
    async function findDraftSubmissionId(consultantId, tab) {
      var token = await getVerificationToken();
      // asc_tab and asc_status are both Choice columns now - $filter needs their bare numeric
      // values, not quoted strings (a picklist compared against a string literal is a type
      // mismatch, confirmed with asc_status before this).
      var url = '/_api/asc_portalsubmissions?$select=asc_portalsubmissionid,_asc_consultant_id_value'
        + '&$filter=asc_tab eq ' + PORTAL_SUBMISSION_TAB_VALUES[tab] + ' and asc_status eq ' + PORTAL_SUBMISSION_STATUS_VALUES.Draft;
      var response = await fetch(url, {
        credentials: 'same-origin',
        headers: { 'Accept': 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0', '__RequestVerificationToken': token, 'Cache-Control': 'no-cache, no-store', 'Pragma': 'no-cache' }
      });
      if (!response.ok) return null;
      var data = await response.json();
      // Global scope has no server-side per-consultant isolation - match client-side, same
      // defensive pattern already used for contacts/bimProjects/junction-row reads above.
      var match = (data.value || []).find(function (row) {
        return row._asc_consultant_id_value && row._asc_consultant_id_value.toLowerCase() === consultantId.toLowerCase();
      });
      return match ? match.asc_portalsubmissionid : null;
    }
    async function saveTabSubmission(consultantId, tab, afterValue, beforeValue, status) {
      var id = portalSubmissionIds[tab] || await findDraftSubmissionId(consultantId, tab);
      var body = { asc_tab: PORTAL_SUBMISSION_TAB_VALUES[tab], asc_after: JSON.stringify(afterValue), asc_status: PORTAL_SUBMISSION_STATUS_VALUES[status] };
      // asc_submittedon is optional but clearly meant to record when Submit happened - stamp it
      // on the same transition saveConsultant's own asc_confackn-style fields get merged in.
      if (status === 'Submitted') body.asc_submittedon = new Date().toISOString();
      if (id) {
        await webApiRequest('PATCH', '/_api/asc_portalsubmissions(' + id + ')', body);
        portalSubmissionIds[tab] = id;
        return id;
      }
      body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + consultantId + ')';
      if (beforeValue !== undefined) body.asc_before = JSON.stringify(beforeValue);
      // asc_isreview is required on create (added live 2026-09-30) - always false, the portal
      // never marks a submission as reviewed.
      body.asc_isreview = false;
      var response = await webApiRequest('POST', '/_api/asc_portalsubmissions', body);
      var createdId = extractCreatedId(response);
      if (createdId) portalSubmissionIds[tab] = createdId;
      return createdId;
    }
    async function recordPortalSubmissions(consultantId, payload, status) {
      var after = tabSnapshot(payload);
      var before = tabSnapshot(existingRecord);
      for (var i = 0; i < PORTAL_SUBMISSION_TABS.length; i++) {
        var tab = PORTAL_SUBMISSION_TABS[i];
        try {
          await saveTabSubmission(consultantId, tab, after[tab], before[tab], status);
        } catch (error) {
          console.warn('[ascentis] portal submission staging write failed for tab', tab, error);
        }
      }
    }
    // Generic, cross-system audit table discovered live 2026-10-07 (not built by this project -
    // see PROJECT_MEMORY.md). No dedicated consultant lookup - it's a loosely-coupled design
    // shared across internal and portal events, so "what record this is about" goes into the
    // free-text asc_object column, not a typed relationship. Values below confirmed live via a
    // fresh pac solution export, not guessed - re-verify (asc_actionchoiceset /
    // asc_originchoiceset) if this table changes.
    var AUDIT_ACTION_VALUES = {
      Create: 751050000, Update: 751050001, Submit: 751050004,
      Reject: 751050006, AcceptSubmission: 751050007,
      AcknowledgeConfidentiality: 751050016
    };
    // asc_actor (lookup -> SystemUser) - every portal-originated entry is attributed to this one
    // Application User ("Consultant DatabaseApp Service account"), not the signed-in consultant -
    // an external consultant signs in as a portal Contact via Entra External ID, not a Dataverse
    // SystemUser, so there is no per-visitor SystemUser to bind instead. GUID confirmed by the
    // project owner directly against the record in the Power Platform admin center (matches the
    // `pac org who` User ID for svc.dev@ascentis.build) - not looked up by this code at runtime.
    var AUDIT_ACTOR_SYSTEMUSER_ID = '2ed46b7a-98a6-f111-b373-6045bdad8d08';
    var AUDIT_ORIGIN_SELF_SERVICE_PORTAL = 751050001;
    async function logAuditEvent(action, objectText) {
      try {
        await webApiRequest('POST', '/_api/asc_auditlogs', {
          asc_action: AUDIT_ACTION_VALUES[action],
          asc_eventtime: new Date().toISOString(),
          asc_object: objectText,
          asc_origin: AUDIT_ORIGIN_SELF_SERVICE_PORTAL,
          // Bind property must match the relationship's single-valued navigation property name
          // (SchemaName-derived: "asc_Actor", capital A) - NOT the attribute's all-lowercase
          // LogicalName "asc_actor". Confirmed via a fresh pac solution export: every other
          // @odata.bind lookup in this file happens to have been typed all-lowercase originally
          // so LogicalName and the nav property already matched by coincidence; this one didn't.
          // Dataverse Web API treats this as case-sensitive, so the lowercase form 400s with the
          // generic "Common Data Service error occurred" - this, not the systemuser Web API
          // exposure, was the real cause of every unconfirmed Audit Log failure logged so far.
          'asc_Actor@odata.bind': '/systemusers(' + AUDIT_ACTOR_SYSTEMUSER_ID + ')'
        });
      } catch (error) {
        // Never blocks or fails the actual save this is logging - same fire-and-forget pattern
        // as recordPortalSubmissions above.
        console.warn('[ascentis] audit log write failed', action, error);
      }
    }
    async function saveAll(payload, submissionStatus) {
      var wasNewConsultant = !liveConsultantId;
      var consultantId = await saveConsultant(payload);
      await saveChildTables(consultantId, payload);
      var contacts = await saveContacts(consultantId, payload);
      var bimProjects = await saveBimProjects(consultantId, payload);
      await saveConsultantReferences(consultantId, payload);
      await recordPortalSubmissions(consultantId, payload, submissionStatus);
      var firmName = (payload.identity && payload.identity.firmName) || '';
      var objectText = 'asc_consultant ' + consultantId + (firmName ? ' (' + firmName + ')' : '');
      await logAuditEvent(submissionStatus === 'Submitted' ? 'Submit' : (wasNewConsultant ? 'Create' : 'Update'), objectText);
      return { consultantId: consultantId, contacts: contacts, bimProjects: bimProjects };
    }
    var portalService = {
      saveDraft: async function (payload) {
        if (preview) { previewDraft = payload; return { preview: true }; }
        var result = await saveAll(payload, 'Draft');
        return Object.assign({ preview: false }, result);
      },
      submit: async function (payload) {
        if (preview) return { preview: true, nextRevalidationDate: null };
        var result = await saveAll(payload, 'Submitted');
        return Object.assign({ preview: false, nextRevalidationDate: null }, result);
      }
    };

    function report(id, message) { var el = document.getElementById(id); el.textContent = message; el.hidden = false; }
    function show(view, focus) {
      if (views.indexOf(view) < 0) view = 'signin';
      root.querySelectorAll('[data-view]').forEach(function (el) { el.hidden = el.dataset.view !== view; });
      root.querySelector('.portal-content').hidden = view === 'signin';
      root.querySelector('.portal-account').hidden = view === 'signin';
      root.querySelectorAll('.portal-steps li').forEach(function (el, i) {
        var current = views.indexOf(view);
        el.className = i < current ? 'is-complete' : i === current ? 'is-current' : '';
        el.querySelector('.step-number').textContent = i < current ? '\u2713' : String(i + 1);
        if (i === current) el.setAttribute('aria-current', 'step'); else el.removeAttribute('aria-current');
      });
      root.querySelector('.portal-skip').href = view === 'profile' ? '#tab-0' : '#' + (view === 'signin' ? 'signin-title' : view === 'submit' ? 'submission-title' : 'confidentiality-title');
      if (preview) { document.getElementById('preview-screen').value = view; history.replaceState(null, '', '#' + view); }
      if (focus) { var target = root.querySelector('[data-view="'+view+'"] h1') || document.getElementById('tab-0'); target.focus(); }
    }


    function download() {
      var configured = document.getElementById('download-confidentiality').dataset.pdfUrl;
      if (!configured) { window.alert('The confidentiality PDF is not available yet.'); return; }
      try { var url = new URL(configured, location.href); if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === location.origin)) throw new Error(); location.assign(url.href); }
      catch (_) { window.alert('The confidentiality PDF link is unavailable.'); }
    }
    root.querySelectorAll('#download-confidentiality,[data-download]').forEach(function (el) { el.addEventListener('click', download); });
    document.getElementById('confidentiality-form').addEventListener('submit', function (event) {
      event.preventDefault();
      if (!this.reportValidity()) return;
      var now = new Date();
      var dateLabel = now.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
      if (preview) {
        document.getElementById('acknowledged-date').textContent = 'Confidentiality statement acknowledged on ' + dateLabel + '.';
      } else {
        // DEMO acknowledgement: records who (the signed-in user's display name, already
        // rendered by Liquid into #account-name) and when, actually written to
        // asc_consultant.asc_confackn/asc_confacknby/asc_confackndate the next time the
        // consultant record saves (services.js's pendingAcknowledgement). Not the full
        // production feature - no OTP-specific identity binding beyond whatever Entra
        // already established at sign-in, and no signed PDF. See backend/README.md.
        var acknowledgerName = (document.getElementById('account-name').textContent || '').trim() || 'Signed-in user';
        pendingAcknowledgement = { by: acknowledgerName, date: now.toISOString() };
        document.getElementById('acknowledged-date').textContent = 'Confidentiality statement acknowledged by ' + acknowledgerName + ' on ' + dateLabel + ' — recorded when your profile is saved.';
        // Fire-and-forget - logAuditEvent catches its own errors and this must never block
        // moving on to the profile screen.
        logAuditEvent('AcknowledgeConfidentiality', acknowledgerName);
      }
      show('profile', true);
    });


    document.getElementById('send-code').addEventListener('click', function () {
      if (!document.getElementById('registered-email').reportValidity()) return;
      report('signin-status', preview ? 'Preview only: no code was sent. Enter any six digits to explore the next screen.' : 'Email code sign-in is not connected yet. Use the Power Pages sign-in link below.');
      if (preview) root.querySelector('.otp-fields input').focus();
    });
    var digits = Array.from(root.querySelectorAll('.otp-fields input'));
    digits.forEach(function (input, index) {
      input.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(-1); if (this.value && digits[index+1]) digits[index+1].focus(); });
      input.addEventListener('keydown', function (event) { if (event.key === 'Backspace' && !this.value && digits[index-1]) digits[index-1].focus(); });
      input.addEventListener('paste', function (event) { event.preventDefault(); var value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0,6-index); value.split('').forEach(function (digit, offset) { digits[index+offset].value = digit; }); digits[Math.min(index+value.length,5)].focus(); });
    });
    document.getElementById('signin-form').addEventListener('submit', function (event) { event.preventDefault(); if (!this.reportValidity()) return; if (preview) show('confidentiality', true); else report('signin-status','Email verification is not connected yet. Use the Power Pages sign-in link below.'); });


    var schema = portalConfig.formSchema;
    var fieldGroups = [];
    var fieldSequence = 0;

    function element(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function optionsFor(definition) {
      if (definition.type === 'yesno') return ['Yes', 'No'];
      if (definition.source && liveLists[definition.source]) return liveLists[definition.source];
      if (definition.source === 'Countries') {
        var names = new Intl.DisplayNames(['en'], {type:'region'});
        return schema.countryCodes.map(function (code) { return { value: code, label: names.of(code) }; }).sort(function (a,b) { return a.label.localeCompare(b.label); });
      }
      return definition.options || portalConfig.choices[definition.source] || [];
    }

    function fieldValue(control) {
      if (control.multiple) return Array.from(control.selectedOptions).map(function (option) { return option.value; });
      if (control.type === 'file') return control.files[0] || null;
      if (control.closest('[data-type="money"]')) return control.value.replace(/,/g, '').trim();
      return control.value.trim();
    }

    function readFields(group) {
      var values = {};
      group.querySelectorAll('[data-field-key]').forEach(function (control) {
        if (!control.disabled) values[control.dataset.fieldKey] = fieldValue(control);
      });
      return values;
    }

    function setOptions(control, options) {
      var previous = control.multiple ? fieldValue(control) : [control.value];
      control.replaceChildren();
      if (!control.multiple) {
        var placeholder = element('option', '', 'Choose an option');
        placeholder.value = '';
        control.appendChild(placeholder);
      }
      options.forEach(function (value) {
        var option = element('option', '', typeof value === 'string' ? value : value.label);
        option.value = typeof value === 'string' ? value : value.value;
        option.selected = previous.includes(option.value);
        control.appendChild(option);
      });
      if (control.refreshMulti) control.refreshMulti();
    }

    function multiPicker(control, wrapper) {
      control.classList.add('native-multi');
      control.tabIndex = -1;
      control.setAttribute('aria-hidden', 'true');
      var widget = element('div', 'multi-picker');
      var chips = element('div', 'multi-chips');
      var add = element('button', 'text-button', '+ add');
      add.type = 'button';
      add.setAttribute('aria-label', 'Add ' + control.dataset.label.toLowerCase());
      add.setAttribute('aria-expanded', 'false');
      var menu = element('div', 'multi-options');
      menu.id = control.id + '-options';
      menu.hidden = true;
      add.setAttribute('aria-controls', menu.id);
      widget.append(chips, add, menu);
      wrapper.appendChild(widget);
      function close() { menu.hidden = true; add.setAttribute('aria-expanded', 'false'); }
      add.addEventListener('click', function () { menu.hidden = !menu.hidden; add.setAttribute('aria-expanded', String(!menu.hidden)); });
      widget.addEventListener('keydown', function (event) { if (event.key === 'Escape') { close(); add.focus(); } });
      widget.addEventListener('focusout', function (event) { if (!widget.contains(event.relatedTarget)) close(); });
      control.refreshMulti = function () {
        chips.replaceChildren();
        menu.replaceChildren();
        Array.from(control.options).forEach(function (option) {
          if (option.selected) {
            var chip = element('button', 'tag', option.textContent + ' ×');
            chip.type = 'button';
            chip.setAttribute('aria-label', 'Remove ' + option.textContent);
            chip.addEventListener('click', function () { option.selected = false; control.dispatchEvent(new Event('change', {bubbles:true})); control.refreshMulti(); add.focus(); });
            chips.appendChild(chip);
          }
          var label = element('label', 'multi-option');
          var checkbox = element('input');
          checkbox.type = 'checkbox';
          checkbox.checked = option.selected;
          checkbox.disabled = control.dataset.source === 'contacts' && !option.selected && control.selectedOptions.length >= schema.limits.leaders;
          checkbox.addEventListener('change', function () {
            option.selected = checkbox.checked;
            control.dispatchEvent(new Event('change', {bubbles:true}));
            control.refreshMulti();
            add.focus();
          });
          label.append(checkbox, document.createTextNode(option.textContent));
          menu.appendChild(label);
        });
        if (!control.options.length) menu.appendChild(element('p', 'field-help', 'Add contacts first to choose office leaders.'));
      };
      control.refreshMulti();
    }

    function createField(definition, group) {
      var wrapper = element('div', 'form-field');
      wrapper.dataset.type = definition.type;
      wrapper.dataset.key = definition.key;
      var id = 'profile-field-' + (++fieldSequence);
      var label = element('label', '', definition.label);
      label.htmlFor = id;
      if (definition.required) label.appendChild(element('span', 'required', ' *'));
      wrapper.appendChild(label);

      var type = definition.type;
      var control = element(type === 'textarea' ? 'textarea' : ['select', 'yesno', 'multi'].includes(type) ? 'select' : 'input');
      control.id = id;
      control.name = id;
      control.dataset.fieldKey = definition.key;
      control.dataset.label = definition.label;
      control.required = Boolean(definition.required);
      control.setAttribute('aria-describedby', id + '-help ' + id + '-error');
      if (control.tagName === 'INPUT') {
        control.type = ['money', 'integer', 'decimal', 'year', 'percent'].includes(type) ? 'number' : type;
        if (control.type === 'number') {
          control.min = type === 'year' ? '1000' : '0';
          control.step = ['integer', 'year'].includes(type) ? '1' : '0.01';
          if (type === 'year') control.max = '9999';
          if (type === 'percent') control.max = '100';
        }
      }
      if (type === 'textarea') control.rows = 4;
      if (type === 'money') {
        control.type = 'text';
        control.inputMode = 'decimal';
        control.maxLength = 24;
        control.addEventListener('blur', function () {
          var value = fieldValue(control);
          if (/^\d+(\.\d{1,2})?$/.test(value)) control.value = Number(value).toLocaleString('en-US', {maximumFractionDigits:2});
        });
      }
      if (['text', 'textarea', 'email', 'tel'].includes(type)) {
        control.maxLength = definition.maxLength || (type === 'textarea' ? schema.limits.details : schema.limits.text);
      }
      if (type === 'multi') { control.multiple = true; control.size = 4; }
      if (control.tagName === 'SELECT') setOptions(control, optionsFor(definition));
      if (definition.source) control.dataset.source = definition.source;

      if (type === 'money') {
        var money = element('div', 'money-control');
        money.appendChild(element('span', '', '$'));
        money.appendChild(control);
        wrapper.appendChild(money);
      } else wrapper.appendChild(control);
      if (type === 'multi') multiPicker(control, wrapper);

      var help = element('small', 'field-help', definition.help || '');
      help.id = id + '-help';
      if (control.maxLength > 0) help.textContent += (help.textContent ? ' ' : '') + 'Maximum ' + control.maxLength + ' characters.';
      if (type === 'money') help.textContent = 'USD';
      wrapper.appendChild(help);
      var error = element('small', 'field-error');
      error.id = id + '-error';
      wrapper.appendChild(error);

      if (type === 'money') control.addEventListener('blur', function () {
        help.textContent = fieldValue(control) && /^\d+(\.\d{1,2})?$/.test(fieldValue(control)) ? new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Number(fieldValue(control))) : 'USD';
      });
      group.appendChild(wrapper);
      return {definition: definition, control: control, wrapper: wrapper};
    }

    function syncConditions(group) {
      var values = readFields(group.node);
      group.fields.forEach(function (field) {
        var applies = !field.manuallyHidden && profileRules.conditionApplies(field.definition.when, values);
        field.wrapper.hidden = !applies;
        field.control.disabled = !applies;
        field.control.required = applies && Boolean(field.definition.required);
        if (!applies) field.control.setCustomValidity('');
      });
    }

    function createFields(parent, definitions, initial) {
      var node = element('div', 'field-grid');
      var group = { node: node, fields: [] };
      parent.appendChild(node);
      definitions.forEach(function (definition) {
        var field = createField(definition, node);
        if (initial && initial[definition.key] !== undefined && definition.type !== 'file') {
          if (field.control.multiple) Array.from(field.control.options).forEach(function (option) { option.selected = initial[definition.key].includes(option.value); });
          else field.control.value = initial[definition.key];
        }
        group.fields.push(field);
        if (field.control.refreshMulti) field.control.refreshMulti();
      });
      node.addEventListener('change', function () { syncConditions(group); });
      fieldGroups.push(group);
      syncConditions(group);
      return group;
    }

    var tabs = Array.from(root.querySelectorAll('[role=tab]'));
    var sections = {};
    var collections = {};
    var collectionSequence = 0;
    var attachments = [];
    var busy = false;
    if (!preview) { try { loadLiveChoicesSync(); } catch (ignored) { /* keep the config.json fallback list */ } }
    if (!preview) { try { loadExistingRecordSync(); } catch (ignored) { /* start from a blank form */ } }
    var choices = portalConfig.choices;
    var selected = {
      Disciplines: (existingRecord && existingRecord.identity.disciplines) || [],
      Sectors: (existingRecord && existingRecord.identity.sectors) || [],
      Regions: (existingRecord && existingRecord.identity.regions) || []
    };
    if (existingRecord) {
      if (existingRecord.identity.firmName) form.elements.firmName.value = existingRecord.identity.firmName;
      if (existingRecord.identity.website) form.elements.website.value = existingRecord.identity.website;
      if (existingRecord.identity.alias) form.elements.alias.value = existingRecord.identity.alias;
      if (existingRecord.identity.firmType) form.elements.firmType.value = existingRecord.identity.firmType;
    }

    function activate(index, focus) {
      tabs.forEach(function (tab, i) {
        tab.setAttribute('aria-selected', String(index === i));
        tab.tabIndex = index === i ? 0 : -1;
        document.getElementById('panel-' + i).hidden = index !== i;
      });
      if (focus) tabs[index].focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { activate(index); });
      tab.addEventListener('keydown', function (event) {
        var next = event.key === 'ArrowRight' ? (index + 1) % tabs.length
          : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1;
        if (next >= 0) { event.preventDefault(); activate(next, true); }
      });
    });

    schema.sections.forEach(function (definition) {
      var panel = document.getElementById('panel-' + definition.panel);
      panel.appendChild(element('h2', '', definition.title));
      panel.appendChild(element('p', 'section-description', definition.description));
      panel.dataset.section = definition.id;
      panel.prepend(element('p', 'required-legend', '* required field'));
      sections[definition.id] = createFields(panel, definition.fields, existingRecord && existingRecord.sections[definition.id]);
    });

    function fieldIn(group, key) {
      return group.node.querySelector('[data-field-key="' + key + '"]');
    }

    function records(id) {
      return collections[id].rows.map(function (row) {
        return Object.assign({ id: row.id, liveId: row.liveId || null }, readFields(row.group.node));
      });
    }

    function eligibleRegions() {
      return profileRules.eligibleRegions(records('offices'), records('projects'));
    }

    function updateContacts() {
      var options = records('contacts').map(function (contact) {
        return { value: contact.id, label: [contact.firstName, contact.lastName].filter(Boolean).join(' ') + (contact.jobTitle ? ' (' + contact.jobTitle + ')' : '') };
      }).filter(function (contact) { return contact.label; });
      collections.offices.rows.forEach(function (row) {
        setOptions(fieldIn(row.group, 'leaders'), options);
      });
    }

    function refreshCollection(collection) {
      var limit = collection.definition.limit && schema.limits[collection.definition.limit];
      collection.count.textContent = collection.rows.length + (limit ? ' / ' + limit : '') + ' added';
      collection.add.disabled = Boolean(limit && collection.rows.length >= limit);
      collection.empty.hidden = collection.rows.length !== 0;
      collection.rows.forEach(function (row, index) {
        var values = readFields(row.group.node);
        var name = values.name || [values.firstName, values.lastName].filter(Boolean).join(' ') || values.region;
        row.heading.textContent = collection.definition.singular + ' ' + (index + 1) + (name ? ' — ' + name : '');
      });
      renderCollection(collection);
    }

    function openRecord(row) {
      if (!row.dialog.open) row.dialog.showModal();
      row.group.fields[0].control.focus();
    }

    function dataTable(headers) {
      var wrap = element('div', 'table-scroll');
      var table = element('table', 'portal-table');
      var head = element('thead');
      var heading = element('tr');
      headers.forEach(function (text) { var th = element('th', '', text); th.scope = 'col'; heading.appendChild(th); });
      head.appendChild(heading);
      var body = element('tbody');
      table.append(head, body);
      wrap.appendChild(table);
      return { wrap: wrap, body: body };
    }

    function renderCollection(collection) {
      collection.list.replaceChildren();
      var id = collection.definition.id;
      if (id === 'contacts') {
        collection.rows.forEach(function (row) {
          var values = readFields(row.group.node);
          var link = element('button', 'text-button contact-link', [values.firstName, values.lastName].filter(Boolean).join(' ') || 'New contact');
          link.type = 'button';
          link.addEventListener('click', function () { openRecord(row); });
          collection.list.appendChild(link);
        });
        return;
      }
      if (id === 'offices') {
        collection.rows.forEach(function (row) {
          var values = readFields(row.group.node);
          var card = element('button', 'office-summary');
          card.type = 'button';
          var top = element('span', 'office-summary-top');
          top.appendChild(element('span', '', 'Region * ' + (values.region || 'Choose region') + (values.city ? ' – ' + values.city : '')));
          top.appendChild(element('span', '', 'Headcount ' + (values.headcount || '—')));
          card.appendChild(top);
          var leaders = records('contacts').filter(function (contact) { return (values.leaders || []).includes(contact.id); }).map(function (contact) {
            return [contact.firstName, contact.lastName].filter(Boolean).join(' ') + (contact.jobTitle ? ' (' + contact.jobTitle + ')' : '');
          });
          card.appendChild(element('span', '', 'Leaders (from contacts, up to 3): ' + (leaders.join(', ') || 'None selected')));
          if (values.status === 'Inactive') card.appendChild(element('small', 'field-help', 'Inactive office'));
          card.setAttribute('aria-label', 'Edit office in ' + (values.region || 'unselected region'));
          card.addEventListener('click', function () { openRecord(row); });
          collection.list.appendChild(card);
        });
        return;
      }
      var table = dataTable(id === 'projects' ? ['Project', 'Country / region', 'Disciplines', 'Type', 'GFA / Keys', 'Status', 'Years'] : ['Name', 'Location', 'GFA', 'LOD']);
      collection.rows.forEach(function (row) {
        var values = readFields(row.group.node);
        var tr = element('tr');
        var first = element('td');
        var link = element('button', 'table-link', values.name || 'New project');
        link.type = 'button';
        link.addEventListener('click', function () { openRecord(row); });
        first.appendChild(link);
        tr.appendChild(first);
        var cells = id === 'projects'
          ? [[values.country, values.region].filter(Boolean).join(' / '), (values.disciplines || []).join(', '), values.type,
            values.type === 'Hotel' ? (values.keys || '—') + ' keys' : (values.gfa ? Number(values.gfa).toLocaleString('en-US') : '—') + ' m²',
            values.status, [values.startYear, values.status === 'Completed' ? values.completionYear : ''].filter(Boolean).join('–')]
          : [values.location, values.gfa ? Number(values.gfa).toLocaleString('en-US') : '—', values.lod];
        cells.forEach(function (value) { tr.appendChild(element('td', '', value || '—')); });
        table.body.appendChild(tr);
      });
      collection.list.appendChild(table.wrap);
    }

    function addRecord(id, initial, focus, liveId) {
      var collection = collections[id];
      var limit = collection.definition.limit && schema.limits[collection.definition.limit];
      if (limit && collection.rows.length >= limit) return;
      var recordId = id + '-' + (++collectionSequence);
      var card = element('fieldset', 'record-card');
      var dialog = element('dialog', 'record-dialog');
      dialog.setAttribute('aria-label', 'Edit ' + collection.definition.singular);
      dialog.appendChild(card);
      var heading = element('legend');
      card.appendChild(heading);
      var group = createFields(card, collection.definition.fields, initial);
      var remove = element('button', 'text-button remove-record', 'Remove ' + collection.definition.singular);
      remove.type = 'button';
      card.appendChild(remove);
      var close = element('button', 'portal-button portal-button-primary close-editor', 'Done');
      close.type = 'button';
      card.appendChild(close);
      var row = { id: recordId, liveId: liveId || null, node: card, dialog: dialog, group: group, heading: heading };
      collection.rows.push(row);
      collection.editors.appendChild(dialog);
      close.addEventListener('click', function () { dialog.close(); refreshCollection(collection); refreshRelatedData(); });
      dialog.addEventListener('close', function () { refreshCollection(collection); });
      remove.addEventListener('click', function () {
        if (!window.confirm('Remove this ' + collection.definition.singular + ' and its entered details?')) return;
        collection.rows = collection.rows.filter(function (item) { return item !== row; });
        fieldGroups = fieldGroups.filter(function (item) { return item !== group; });
        dialog.close();
        dialog.remove();
        refreshCollection(collection);
        refreshRelatedData();
        collection.add.focus();
        report('profile-status', 'Removed from the current form. Submit your changes for review when ready.');
      });
      card.addEventListener('input', function () { refreshCollection(collection); });
      card.addEventListener('change', function () { refreshCollection(collection); });
      refreshCollection(collection);
      refreshRelatedData();
      if (focus) openRecord(row);
      return row;
    }

    schema.collections.forEach(function (definition) {
      var panel = document.getElementById('panel-' + definition.panel);
      var section = element('section', 'collection-section');
      var heading = element('h2', '', definition.id === 'offices' ? 'Regional offices' : definition.title + (definition.limit ? ' (up to ' + schema.limits[definition.limit] + ')' : ''));
      heading.id = 'collection-' + definition.id;
      section.setAttribute('aria-labelledby', heading.id);
      section.appendChild(heading);
      var count = element('p', 'collection-count');
      count.setAttribute('aria-live', 'polite');
      section.appendChild(count);
      var empty = element('p', 'empty-state', 'No ' + definition.title.toLowerCase() + ' added yet.');
      section.appendChild(empty);
      var list = element('div', 'record-list');
      section.appendChild(list);
      var editors = element('div', 'record-editors');
      section.appendChild(editors);
      var add = element('button', 'text-button add-record', definition.id === 'offices' ? '+ Add' : '+ add ' + (definition.id === 'bimProjects' ? 'project' : definition.singular));
      add.type = 'button';
      add.dataset.add = definition.id;
      section.appendChild(add);
      panel.appendChild(section);
      section.dataset.collection = definition.id;
      var collection = { definition: definition, rows: [], list: list, editors: editors, section: section, count: count, add: add, empty: empty };
      collections[definition.id] = collection;
      add.addEventListener('click', function () { addRecord(definition.id, null, true); });
      refreshCollection(collection);
    });
    document.getElementById('panel-3').insertBefore(collections.offices.section, collections.contacts.section);
    collections.contacts.section.querySelector('h2').textContent = 'Contacts — click a name to view or edit';
    document.getElementById('panel-4').appendChild(element('p', 'region-help', 'GFA (m²) is required for non-hotel projects; Keys is required for hotels. Completion year is required only once a project is Completed.'));

    // Prefill previously-saved Contacts and BIM projects. Offices/Project references are not
    // included - saving those is blocked live (see services.js header), so there is nothing to
    // load back either.
    if (existingRecord) {
      existingRecord.contacts.forEach(function (row) { addRecord('contacts', row.fields, false, row.liveId); });
      existingRecord.bimProjects.forEach(function (row) { addRecord('bimProjects', row.fields, false, row.liveId); });
    }

    // Financial derived values are display-only; the server must calculate them again.
    var financialPanel = document.getElementById('panel-1');
    var ratio = element('p', 'derived-value');
    ratio.id = 'backlog-ratio';
    ratio.setAttribute('aria-live', 'polite');
    financialPanel.appendChild(ratio);
    financialPanel.appendChild(element('h3', '', 'Revenue by region'));
    financialPanel.appendChild(element('p', 'field-help', 'Optional percentages. A warning appears if the total differs from 100%.'));
    // Deliberately NOT choices.Regions (the live-loaded operating-regions list, config.json
    // fallback or asc_regions table - can contain any region someone adds live, including test
    // rows). asc_consultant only has 5 physical revenue-percentage columns
    // (dataverse-map.json's revenueRegions), so offering a share input for every live region
    // let a region with no backing column (e.g. a stray live test row) reach
    // dataverseMapping.prepare() and hard-block Submit with "Revenue region is not configured:
    // <name>." - even when its share was left blank. Scope this section to the mapped regions.
    var revenueRegionNames = Object.keys(portalConfig.dataverseMap.revenueRegions);
    var revenueShareInitial = {};
    revenueRegionNames.forEach(function (region, index) {
      var value = existingRecord && existingRecord.revenueByRegion[region];
      if (value) revenueShareInitial['region-' + index] = value;
    });
    var regionShares = createFields(financialPanel, revenueRegionNames.map(function (region, index) {
      return { key: 'region-' + index, label: region, type: 'percent' };
    }), revenueShareInitial);
    regionShares.node.classList.add('revenue-shares');
    regionShares.fields.forEach(function (field) { field.manuallyHidden = revenueShareInitial[field.definition.key] === undefined; });
    syncConditions(regionShares);
    var addShare = element('select', 'share-picker');
    addShare.setAttribute('aria-label', 'Add revenue region');
    function refreshSharePicker() {
      setOptions(addShare, regionShares.fields.filter(function (field) { return field.manuallyHidden; }).map(function (field) {
        return {value: field.definition.key, label: field.definition.label};
      }));
      addShare.options[0].textContent = '+ add region';
    }
    function addShareRegion(key) {
      var field = regionShares.fields.find(function (item) { return item.definition.key === key; });
      if (!field) return;
      field.manuallyHidden = false;
      syncConditions(regionShares);
      refreshSharePicker();
    }
    addShare.addEventListener('change', function () { if (this.value) addShareRegion(this.value); });
    financialPanel.appendChild(addShare);
    refreshSharePicker();
    var revenueWarning = element('p', 'portal-status');
    revenueWarning.id = 'revenue-warning';
    revenueWarning.setAttribute('role', 'status');
    financialPanel.appendChild(revenueWarning);

    function refreshFinancial() {
      var values = readFields(sections.financial.node);
      [1, 2, 3].forEach(function (offset) {
        var control = fieldIn(sections.financial, 'revenue' + offset);
        var label = control.closest('.form-field').querySelector('label');
        label.firstChild.textContent = 'Revenue FY ' + profileRules.fiscalLabel(values.effectiveYear, (values.yearFormat || '').startsWith('YYYY/ZZ'), offset);
      });
      var percentage = profileRules.backlogRatio(values.backlog, values.revenue1);
      ratio.textContent = 'Backlog / prior-year revenue: ' + (percentage === null ? 'Not available — enter backlog and revenue greater than zero.' : percentage.toFixed(1) + '%');
      revenueWarning.textContent = profileRules.percentageWarning(Object.values(readFields(regionShares.node)));
    }

    function renderTags(group) {
      var container = root.querySelector('[data-tags="' + group + '"]');
      container.tabIndex = -1;
      container.replaceChildren();
      var eligible = group === 'Regions' ? eligibleRegions() : [];
      selected[group].forEach(function (value) {
        var tag = element('button', 'tag', value + ' ×');
        tag.type = 'button';
        tag.setAttribute('aria-label', 'Remove ' + value);
        if (group === 'Regions' && !eligible.includes(value)) {
          tag.classList.add('tag-ineligible');
          tag.title = 'Add an active office or three completed projects in this region.';
        }
        tag.addEventListener('click', function () {
          selected[group] = selected[group].filter(function (item) { return item !== value; });
          renderTags(group);
          container.querySelector('button, select').focus();
        });
        container.appendChild(tag);
      });
      var select = element('select', 'tag-picker');
      select.setAttribute('aria-label', 'Add ' + group.toLowerCase());
      var placeholder = element('option', '', '+ Add ' + group.toLowerCase());
      placeholder.value = '';
      select.appendChild(placeholder);
      choices[group].filter(function (value) { return !selected[group].includes(value); }).forEach(function (value) {
        var option = element('option', '', value);
        option.value = value;
        if (group === 'Regions' && !eligible.includes(value)) {
          option.disabled = true;
          option.textContent += ' (office or 3 completed projects required)';
        }
        select.appendChild(option);
      });
      select.addEventListener('change', function () {
        if (this.value) selected[group].push(this.value);
        renderTags(group);
        container.querySelector('select').focus();
      });
      container.appendChild(select);
    }

    var manageRegions = element('button', 'text-button', 'Add offices and contacts to establish region eligibility');
    manageRegions.type = 'button';
    manageRegions.addEventListener('click', function () { activate(3, true); });
    document.getElementById('panel-0').appendChild(manageRegions);

    // File objects remain in this browser until a future authenticated upload service accepts them.
    var attachmentPanel = document.getElementById('panel-7');
    attachmentPanel.appendChild(element('h2', '', 'Attachments (max 25 MB each)'));
    attachmentPanel.appendChild(element('p', 'section-description', 'Add supporting documents, up to 25 MB per file. Project attachments also appear here.'));
    var uploadLabel = element('label', '', 'Choose supporting documents');
    uploadLabel.htmlFor = 'profile-files';
    uploadLabel.className = 'visually-hidden';
    attachmentPanel.appendChild(uploadLabel);
    var uploadInput = element('input');
    uploadInput.id = 'profile-files';
    uploadInput.type = 'file';
    uploadInput.multiple = true;
    uploadInput.className = 'visually-hidden';
    uploadInput.setAttribute('aria-describedby', 'attachment-message');
    attachmentPanel.appendChild(uploadInput);
    var uploadButton = element('button', 'text-button upload-button', '+ upload');
    uploadButton.type = 'button';
    uploadButton.addEventListener('click', function () { uploadInput.click(); });
    attachmentPanel.appendChild(uploadButton);
    var attachmentMessage = element('p', 'portal-status');
    attachmentMessage.id = 'attachment-message';
    attachmentMessage.setAttribute('role', 'status');
    attachmentPanel.appendChild(attachmentMessage);
    var attachmentList = element('div', 'attachment-list');
    attachmentPanel.appendChild(attachmentList);
    attachmentPanel.appendChild(element('p', 'region-help', 'You may delete files you uploaded yourself. Uploads and deletions will be recorded when saving is connected.'));
    var attachmentSequence = 0;

    function allFiles() {
      var projectFiles = collections.projects.rows.flatMap(function (row) {
        var values = readFields(row.group.node);
        return values.attachment ? [{ id: row.id + '-file', file: values.attachment, documentType: 'References', projectId: row.id, control: fieldIn(row.group, 'attachment'), projectName: values.name || 'Untitled project' }] : [];
      });
      return attachments.concat(projectFiles);
    }

    function renderAttachments() {
      if (!attachmentList) return;
      attachmentList.replaceChildren();
      var files = allFiles();
      var table = dataTable(['File', 'Document type', 'Uploaded', 'Size', '']);
      files.forEach(function (item) {
        var tr = element('tr');
        var fileCell = element('td');
        var fileName = element('button', 'table-link', item.file.name);
        fileName.type = 'button';
        fileName.addEventListener('click', function () {
          if (!(item.file instanceof Blob)) {
            attachmentMessage.textContent = 'This is an example file in the design preview; no document is stored.';
            return;
          }
          var url = URL.createObjectURL(item.file);
          var link = element('a'); link.href = url; link.download = item.file.name; link.click();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        });
        fileCell.appendChild(fileName);
        if (item.projectName) fileCell.appendChild(element('small', 'field-help', item.projectName));
        tr.appendChild(fileCell);
        var typeCell = element('td');
        var select = element('select');
        select.id = 'document-type-' + item.id;
        select.setAttribute('aria-label', 'Document type for ' + item.file.name);
        setOptions(select, liveLists.DocumentTypes || schema.documentTypes);
        select.value = item.documentType || '';
        select.disabled = Boolean(item.projectId);
        select.addEventListener('change', function () { item.documentType = this.value; });
        typeCell.appendChild(select); tr.appendChild(typeCell);
        tr.appendChild(element('td', '', item.exampleDate || 'Not uploaded'));
        tr.appendChild(element('td', '', (item.file.size / 1000000).toFixed(1) + ' MB'));
        var action = element('td');
        var remove = element('button', 'text-button', 'Delete');
        remove.type = 'button';
        remove.setAttribute('aria-label', 'Delete ' + item.file.name);
        remove.addEventListener('click', function () {
          if (item.control) item.control.value = '';
          else attachments = attachments.filter(function (file) { return file !== item; });
          renderAttachments();
          uploadButton.focus();
        });
        action.appendChild(remove); tr.appendChild(action); table.body.appendChild(tr);
      });
      attachmentList.appendChild(table.wrap);
      if (!files.length) attachmentList.appendChild(element('p', 'empty-state', 'No documents selected.'));
    }

    uploadInput.addEventListener('change', function () {
      var errors = [];
      Array.from(uploadInput.files).forEach(function (file) {
        var error = profileRules.fileError(file, schema.limits.fileBytes);
        if (error) errors.push(error);
        else attachments.push({ id: 'local-' + (++attachmentSequence), file: file, documentType: '' });
      });
      uploadInput.value = '';
      attachmentMessage.textContent = errors.join(' ') || 'Files selected. They will be uploaded when saving is connected.';
      renderAttachments();
    });

    function refreshRelatedData() {
      if (!collections.offices || !collections.projects || !collections.contacts) return;
      updateContacts();
      refreshCollection(collections.offices);
      renderTags('Regions');
      renderAttachments();
    }

    form.addEventListener('input', function (event) {
      if (event.target.closest('#panel-1')) refreshFinancial();
    });
    form.addEventListener('change', function (event) {
      if (event.target.closest('#panel-1')) refreshFinancial();
      if (event.target.closest('#panel-3, #panel-4')) refreshRelatedData();
      if (event.target.type === 'file' && event.target !== uploadInput && event.target.files[0]) {
        var error = profileRules.fileError(event.target.files[0], schema.limits.fileBytes);
        if (error) {
          event.target.value = '';
          report('profile-status', error + ' Please choose a smaller file.');
          renderAttachments();
        }
      }
    });

    function collectProfile() {
      var payload = {
        schemaVersion: 1,
        identity: {
          firmName: form.elements.firmName.value.trim(), website: form.elements.website.value.trim(),
          firmType: form.elements.firmType.value, alias: form.elements.alias.value.trim(),
          disciplines: selected.Disciplines.slice(), sectors: selected.Sectors.slice(), regions: selected.Regions.slice()
        },
        sections: {}, collections: {}, revenueByRegion: {}, files: []
      };
      Object.keys(sections).forEach(function (key) { payload.sections[key] = readFields(sections[key].node); });
      Object.keys(collections).forEach(function (key) {
        payload.collections[key] = records(key).map(function (row) { var value = Object.assign({}, row); delete value.attachment; return value; });
      });
      var shares = readFields(regionShares.node);
      revenueRegionNames.forEach(function (region, index) { payload.revenueByRegion[region] = shares['region-' + index]; });
      payload.files = allFiles().map(function (item) { return { file: item.file, documentType: item.documentType, projectId: item.projectId || null }; });
      return payload;
    }

    function focusControl(control) {
      var panel = control.closest('[role=tabpanel]');
      if (panel) activate(Number(panel.id.split('-')[1]));
      var dialog = control.closest('dialog');
      if (dialog && !dialog.open) dialog.showModal();
      if (control.multiple) control.closest('.form-field').querySelector('.multi-picker>.text-button').focus();
      else control.focus();
    }

    function validateProfile(draft) {
      var errors = [];
      var controls = Array.from(form.querySelectorAll('input, select, textarea'));
      controls.forEach(function (control) {
        control.setCustomValidity('');
        control.removeAttribute('aria-invalid');
        var message = document.getElementById(control.id + '-error');
        if (message) message.textContent = '';
      });
      fieldGroups.forEach(syncConditions);
      form.querySelectorAll('[data-type="money"] input').forEach(function (control) {
        var value = fieldValue(control);
        if (value && (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) > Number.MAX_SAFE_INTEGER / 100)) {
          control.setCustomValidity('Enter a non-negative USD amount with up to two decimal places.');
        }
      });
      var website = form.elements.website;
      if (website.value.trim()) {
        try {
          var url = new URL(/^[a-z]+:\/\//i.test(website.value) ? website.value : 'https://' + website.value);
          if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || /\s/.test(website.value) || url.username || url.password) throw new Error();
        } catch (_) { website.setCustomValidity('Enter a valid website, for example studio.com.'); }
      }
      var emails = {};
      collections.contacts.rows.forEach(function (row) {
        var email = fieldIn(row.group, 'email');
        var value = email.value.trim().toLowerCase();
        if (value && emails[value]) email.setCustomValidity('This work email is already used by another contact in this form.');
        if (value) emails[value] = true;
      });
      collections.offices.rows.forEach(function (row) {
        var leaders = fieldIn(row.group, 'leaders');
        if (fieldValue(leaders).length > schema.limits.leaders) leaders.setCustomValidity('Select no more than three office leaders.');
      });
      collections.projects.rows.forEach(function (row) {
        var values = readFields(row.group.node);
        fieldIn(row.group, 'completionYear').setCustomValidity(profileRules.yearError(values.startYear, values.completionYear));
      });
      controls.forEach(function (control) {
        if (control.disabled || control.type === 'file') return;
        // A draft may omit required values, but must not contain invalid entered data.
        if (draft && !control.value && !control.validity.badInput) return;
        if (!control.checkValidity()) {
          control.setAttribute('aria-invalid', 'true');
          var label = control.dataset.label || (control.labels && control.labels[0] && control.labels[0].textContent.replace(/\s+/g, ' ').trim()) || 'Field';
          var message = control.validity.valueMissing ? 'Please complete this field.' : control.validationMessage;
          var inline = document.getElementById(control.id + '-error');
          if (inline) inline.textContent = message;
          errors.push({ control: control, message: label + ': ' + message });
        }
      });
      Object.keys(selected).forEach(function (group) {
        if (!draft && !selected[group].length) errors.push({ control: root.querySelector('[data-tags="' + group + '"]'), message: 'Select at least one ' + group.toLowerCase() + ' value.' });
      });
      if (!draft) {
        var eligible = eligibleRegions();
        var invalidRegions = selected.Regions.filter(function (region) { return !eligible.includes(region); });
        if (invalidRegions.length) errors.push({ control: root.querySelector('[data-tags="Regions"]'), message: 'Add an active office or three completed projects for: ' + invalidRegions.join(', ') + '.' });
      }
      allFiles().forEach(function (item) {
        var error = profileRules.fileError(item.file, schema.limits.fileBytes);
        if (error) errors.push({ control: uploadInput, message: error });
      });
      var summary = document.getElementById('profile-errors');
      summary.replaceChildren();
      summary.hidden = errors.length === 0;
      if (errors.length) {
        summary.appendChild(element('strong', '', 'Please check ' + errors.length + ' item' + (errors.length === 1 ? '' : 's') + '.'));
        var list = element('ul');
        errors.forEach(function (error) {
          var item = element('li');
          var link = element('button', 'text-button', error.message);
          link.type = 'button';
          link.addEventListener('click', function () { focusControl(error.control); });
          item.appendChild(link);
          list.appendChild(item);
        });
        summary.appendChild(list);
        summary.focus();
      }
      return errors.length === 0;
    }

    async function persist(action) {
      if (busy || !validateProfile(action === 'saveDraft')) return;
      busy = true;
      var buttons = Array.from(form.querySelectorAll('.profile-actions button'));
      buttons.forEach(function (button) { button.disabled = true; });
      form.setAttribute('aria-busy', 'true');
      report('profile-status', action === 'saveDraft' ? 'Preparing draft…' : 'Preparing submission…');
      try {
        var result = await portalService[action](collectProfile());
        // Remember the live row IDs the save just created, so a second save later in this
        // same session (no reload) updates those rows instead of creating duplicates.
        (result.contacts || []).forEach(function (item) {
          var row = collections.contacts.rows.find(function (r) { return r.id === item.clientId; });
          if (row && item.liveId) row.liveId = item.liveId;
        });
        (result.bimProjects || []).forEach(function (item) {
          var row = collections.bimProjects.rows.find(function (r) { return r.id === item.clientId; });
          if (row && item.liveId) row.liveId = item.liveId;
        });
        if (action === 'saveDraft') {
          report('profile-status', result.preview ? 'Preview draft captured in memory for this session only. Reloading clears it; no data was sent to Dataverse.' : 'Draft saved.');
        } else {
          var dateText = 'Available after review.';
          if (result.nextRevalidationDate) {
            var date = new Date(result.nextRevalidationDate);
            if (!Number.isNaN(date.getTime())) dateText = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
          }
          document.getElementById('next-revalidation-date').textContent = dateText;
          document.getElementById('submission-preview-note').hidden = !result.preview;
          show('submit', true);
        }
      } catch (error) {
        report('profile-status', error.message || 'The request failed. Your entered details remain on this screen. Please try again.');
      } finally {
        busy = false;
        buttons.forEach(function (button) { button.disabled = false; });
        form.setAttribute('aria-busy', 'false');
      }
    }

    form.noValidate = true;
    document.getElementById('save-draft').addEventListener('click', function () { persist('saveDraft'); });
    form.addEventListener('submit', function (event) { event.preventDefault(); persist('submit'); });
    document.getElementById('done').addEventListener('click', function () { show('profile', true); });
    Object.keys(choices).forEach(renderTags);
    refreshFinancial();
    renderAttachments();

    if (preview) {
      root.querySelector('.live-signin').hidden = true;
      document.getElementById('registered-email').value = 'contact@studiovermeer.com';
      ['4','9','2'].forEach(function (value,index) { digits[index].value = value; });
      form.elements.firmName.value = 'Studio Vermeer Architects'; form.elements.website.value = 'studiovermeer.com'; form.elements.firmType.value = 'Private'; form.elements.alias.value = 'SVA Design';
      // All sample data stays here; live initialization leaves fields empty until loading is connected.
      selected.Disciplines = ['Architecture'];
      selected.Sectors = ['Hospitality', 'Mixed-use'];
      selected.Regions = ['Middle East', 'South Asia'];
      var contactA = addRecord('contacts', { firstName: 'A.', lastName: 'Haddad', email: 'haddad@example.com', phone: '+971 4 555 0100', jobTitle: 'Principal', status: 'Active', contactType: 'Primary contact' });
      var contactB = addRecord('contacts', { firstName: 'R.', lastName: 'Mensah', email: 'mensah@example.com', phone: '+971 4 555 0101', jobTitle: 'Design Director', status: 'Active', contactType: 'Senior leader' });
      var contactC = addRecord('contacts', { firstName: 'S.', lastName: 'Iyer', email: 'iyer@example.com', phone: '+91 22 5555 0100', jobTitle: 'Studio Head', status: 'Active', contactType: 'Senior leader' });
      addRecord('contacts', { firstName: 'P.', lastName: 'Rao', email: 'rao@example.com', phone: '+91 22 5555 0101', status: 'Active', contactType: 'Project contact' });
      var officeA = addRecord('offices', { region: 'Middle East', city: 'Dubai', country: 'AE', headcount: '86', status: 'Active' });
      var officeB = addRecord('offices', { region: 'South Asia', city: 'Mumbai', country: 'IN', headcount: '34', status: 'Active' });
      [[officeA, [contactA.id, contactB.id]], [officeB, [contactC.id]]].forEach(function (item) {
        var control = fieldIn(item[0].group, 'leaders');
        Array.from(control.options).forEach(function (option) { option.selected = item[1].includes(option.value); });
        control.refreshMulti();
      });
      addRecord('projects', {name:'Lagoon Resort', country:'AE', region:'Middle East', disciplines:['Architecture'], type:'Hotel', keys:'320', status:'Completed', startYear:'2021', completionYear:'2024'});
      addRecord('projects', {name:'Marina Mixed-use Tower', country:'AE', region:'Middle East', disciplines:['Architecture'], type:'Mixed-use', gfa:'92000', status:'In progress', startYear:'2024'});
      addRecord('bimProjects', {name:'Coral Bay Hotel', location:'Muscat', gfa:'48000', lod:'LOD 350'});
      function setPreviewFields(id, values) {
        sections[id].fields.forEach(function (field) {
          var value = values[field.definition.key];
          if (value === undefined) return;
          if (field.control.multiple) Array.from(field.control.options).forEach(function (option) { option.selected = value.includes(option.value); });
          else field.control.value = value;
          if (field.control.refreshMulti) field.control.refreshMulti();
        });
        syncConditions(sections[id]);
      }
      setPreviewFields('financial', {effectiveYear: '2025', yearFormat: 'YYYY (Jan–Dec)', revenue1: '5850000', revenue2: '6120000', revenue3: '5580000', backlog: '4200000'});
      setPreviewFields('legal', {indemnified: 'No', litigation: 'No', insured: 'Yes', perOccurrence:'500000', aggregate:'1000000'});
      setPreviewFields('bim', {capability: 'In-house', operators:'12', disciplines: ['Architecture','MEP']});
      setPreviewFields('sustainability', {certified: 'Yes', certificationDetails:'ISO 14001; LEED Gold projects', reporting: 'Yes', frameworkDetails:'GRI-aligned annual ESG report', professionals:'8', qa: 'Yes', qaDetails:'ESG checkpoints in design QA gate reviews'});
      ['64', '21', '15'].forEach(function (value, index) { addShareRegion('region-' + index); regionShares.fields[index].control.value = value; });
      attachments.push({id:'example-profile', file:{name:'SVA_Company_Profile_2026.pdf',size:4200000},documentType:'Company profile',exampleDate:'14 May 2026'});
      attachments.push({id:'example-insurance', file:{name:'PI_Certificate.pdf',size:1100000},documentType:'Insurance',exampleDate:'2 Mar 2026'});
      form.querySelectorAll('[data-type="money"] input').forEach(function (control) { control.dispatchEvent(new Event('blur')); });
      refreshRelatedData();
      renderAttachments();
      Object.keys(choices).forEach(renderTags);
      refreshFinancial();
      document.getElementById('acknowledged-date').textContent = 'Confidentiality statement acknowledged on 8 Jun 2026.';
      document.getElementById('preview-screen').addEventListener('change',function () { show(this.value,true); });
      document.getElementById('submission-preview-note').hidden = false;
      document.getElementById('sign-out').addEventListener('click',function (event) { event.preventDefault(); show('signin',true); });
      show(location.hash.slice(1) || 'signin');
    } else show(root.dataset.authenticated === 'true' ? 'confidentiality' : 'signin');


  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize); else initialize();
}());

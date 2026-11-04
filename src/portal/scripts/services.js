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
    //    * Project-level attachments - need a live asc_projectreference row to bind to (see above);
    //      the upload code is written and gated, consultant-level attachments ARE written.
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
    var CHILD_TABLE_KEYS = ['financial', 'legal', 'sustainability', 'bim'];
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
      // asc_biminformation has no asc_name; its required primary name asc_number is an auto-number.
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
        + '?$select=asc_name,asc_website,asc_akaname,'
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
      var contactsData = syncGetJson('/_api/asc_contacts?$select=asc_contactid,asc_firstname,asc_lastname,asc_workemail,asc_phone,asc_jobtitle,_asc_contacttype_value,asc_status,asc_regionid,asc_consultant_id', token);
      var contacts = ((contactsData && contactsData.value) || []).filter(belongsToThisConsultant).map(function (row) {
        // contactType/status come through reverseRow() as plain strings already - asc_contact
        // is plain text now, not the option-set integers it used to be before the 2026-09-27
        // rebuild.
        var rowFields = dataverseMapping.reverseRow('contacts', row);
        rowFields.region = row['_asc_regionid_value@OData.Community.Display.V1.FormattedValue'] || '';
        // asc_contacttype is a lookup to asc_ContactType now (2026-10-28) - read its display name.
        rowFields.contactType = row['_asc_contacttype_value@OData.Community.Display.V1.FormattedValue'] || '';
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
      var disciplineData = syncGetJson('/_api/asc_consultantdisciplines?$select=_asc_consultantid_value&$expand=asc_DisciplineID($select=asc_name)', token);
      reversed.identity.disciplines = ((disciplineData && disciplineData.value) || []).filter(belongsToThisConsultantJunction).map(function (row) { return row.asc_DisciplineID && row.asc_DisciplineID.asc_name; }).filter(Boolean);

      var sectorData = syncGetJson('/_api/asc_consultantsectorses?$select=_asc_consultantid_value&$expand=asc_SectorID($select=asc_name)', token);
      reversed.identity.sectors = ((sectorData && sectorData.value) || []).filter(belongsToThisConsultantJunction).map(function (row) { return row.asc_SectorID && row.asc_SectorID.asc_name; }).filter(Boolean);

      var regionData = syncGetJson('/_api/asc_consultantregionses?$select=_asc_consultantid_value&$expand=asc_RegionID($select=asc_name)', token);
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

      // Project references (2026-10-29): same unfiltered + client-matched pattern as above. Disciplines
      // and type come from their junction tables, grouped by project, so saveProjects() only writes
      // the ones that are not live yet. Best-effort like the other reads: if a table is not
      // reachable yet the project list is simply empty and the form still loads from the staged JSON.
      var projectRows = syncGetJson('/_api/asc_projectreferences?$select=asc_projectreferenceid,asc_name,asc_brand,asc_gfa,asc_keys,asc_projectstatus,asc_startyear,asc_completionyear,_asc_consultant_id_value', token);
      var projectDisciplineData = syncGetJson('/_api/asc_projectreferencedisciplines?$select=_asc_projectreferenceid_value&$expand=asc_DisciplineID($select=asc_name)', token);
      var projectTypeData = syncGetJson('/_api/asc_projectreferencetypes?$select=_asc_projectreference_id_value&$expand=asc_projecttype_id($select=asc_projecttypename)', token);
      var projects = ((projectRows && projectRows.value) || []).filter(belongsToThisConsultant).map(function (row) {
        var disciplinesForProject = ((projectDisciplineData && projectDisciplineData.value) || [])
          .filter(function (link) { return link._asc_projectreferenceid_value && link._asc_projectreferenceid_value.toLowerCase() === row.asc_projectreferenceid.toLowerCase(); })
          .map(function (link) { return link.asc_DisciplineID && link.asc_DisciplineID.asc_name; }).filter(Boolean);
        var typeLink = ((projectTypeData && projectTypeData.value) || []).find(function (link) { return link._asc_projectreference_id_value && link._asc_projectreference_id_value.toLowerCase() === row.asc_projectreferenceid.toLowerCase(); });
        return {
          liveId: row.asc_projectreferenceid,
          fields: dataverseMapping.reverseRow('projects', row),
          references: { disciplines: disciplinesForProject, type: (typeLink && typeLink.asc_projecttype_id && typeLink.asc_projecttype_id.asc_projecttypename) || '' }
        };
      });

      var attachmentData = syncGetJson('/_api/asc_attachments?$select=asc_attachmentid,asc_filename,asc_filesizemb,asc_uploadedon,asc_status,asc_documenttype_id,asc_consultant_id,asc_projectreference_id', token);
      // Project-level files have no consultant lookup; they belong to this consultant through their project.
      var ownProjectIds = projects.map(function (project) { return project.liveId.toLowerCase(); });
      existingAttachments = ((attachmentData && attachmentData.value) || []).filter(function (row) {
        return belongsToThisConsultant(row) || (row._asc_projectreference_id_value && ownProjectIds.indexOf(row._asc_projectreference_id_value.toLowerCase()) !== -1);
      }).map(function (row) {
        return { liveId: row.asc_attachmentid, name: row.asc_filename || '', sizeMb: Number(row.asc_filesizemb) || 0, uploadedOn: row.asc_uploadedon || '', status: ATTACHMENT_STATUS_NAMES[row.asc_status] || '', documentType: row['_asc_documenttype_id_value@OData.Community.Display.V1.FormattedValue'] || '' };
      });

      existingRecord = { identity: reversed.identity, sections: reversed.sections, revenueByRegion: reversed.revenueByRegion, contacts: contacts, bimProjects: bimProjects, projects: projects };
    }

    // Secure self-service invitation flow, built 2026-10-13. Real design, confirmed with the
    // project owner rather than assumed: an internal admin app (separate from this repository)
    // creates a native Dataverse Contact for the invited person (emailaddress1 = their email,
    // asc_consultantid lookup = the consultant they're invited to edit), then uses Power Pages'
    // own native "Invite contacts" feature (docs.microsoft.com/power-pages/security/invite-
    // contacts) to email a secure link + code. Redemption, the 6-digit code, and binding the
    // Entra External ID identity to that exact Contact record all happen inside Power Pages'
    // own "Redeem invitation" flow before this code ever runs - no custom token table, no
    // email-string matching (per backend/README.md's "Required before enabling live writes"
    // checklist: "Never infer access from submitted email/domain or custom business contact
    // ID."). This replaces an earlier custom asc_invitation token system (superseded, 15 Oct
    // 2026) that duplicated what Power Pages already does natively.
    // Called once, after Entra sign-in has succeeded (root.dataset.authenticated === 'true'),
    // before letting the visitor proceed past sign-in. Reads the signed-in native Contact's
    // asc_consultantid lookup (rendered server-side into #account-consultant by shell.html,
    // same pattern as #account-email) and ties the session to that consultant. Returns true
    // when it's safe to continue: either the signed-in contact has no consultant assigned yet
    // (existing behaviour, unaffected - e.g. admin/test sign-ins), or liveConsultantId has now
    // been set from the native lookup. Never left false - a visitor with no assignment simply
    // keeps whatever liveConsultantId (if any) localStorage already had.
    function resolveInvitationConsultant() {
      var consultantId = ((document.getElementById('account-consultant') || {}).textContent || '').trim();
      // Only a real GUID is accepted - a Liquid error string (e.g. when the lookup is rendered
      // without .id) must never be stored as the consultant.
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(consultantId)) {
        liveConsultantId = consultantId;
        try { window.localStorage.setItem('ascentisLiveConsultantId', liveConsultantId); } catch (ignored) {}
      }
      return true;
    }

    // Reference-label -> GUID resolution, with an in-page cache since the same labels
    // (e.g. regions) repeat across many rows in one submission.
    var referenceIdCache = {};
    async function resolveReferenceId(entitySet, idField, name, nameField) {
      if (!name) return null;
      nameField = nameField || 'asc_name';
      var cacheKey = entitySet + '|' + nameField + '|' + name;
      if (Object.prototype.hasOwnProperty.call(referenceIdCache, cacheKey)) return referenceIdCache[cacheKey];
      var token = await getVerificationToken();
      var filterValue = String(name).replace(/'/g, "''");
      var url = '/_api/' + entitySet + '?$select=' + idField + '&$filter=' + nameField + ' eq \'' + filterValue + '\'';
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
        var contactTypeLabel = row.references && row.references.contactType;
        if (contactTypeLabel) {
          // asc_contacttype became a lookup to asc_ContactType (name column asc_contacttypename);
          // bind key uses the relationship's navigation property name (Pascal-cased, like asc_Actor).
          var contactTypeId = await resolveReferenceId('asc_contacttypes', 'asc_contacttypeid', contactTypeLabel, 'asc_contacttypename');
          if (contactTypeId) body['asc_ContactType@odata.bind'] = '/asc_contacttypes(' + contactTypeId + ')';
        }
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
    // Project references (asc_projectreference). Written 2026-10-29 once the live table was inspected
    // from a fresh export: required lookups asc_CountryID / asc_region_id / asc_consultant_id (bind keys
    // are SchemaName-cased, same rule as the junction tables), asc_projectstatus is a choice (mapped in
    // dataverse-map.json), and asc_startyear/asc_completionyear are Date and Time columns so a plain
    // form year is sent as 1 January UTC (dataverse-mapping.js). Project type and disciplines are
    // junction rows (asc_projectreferencetype / asc_projectreferencediscipline), written only for
    // values not already live - there is no unique key, so re-writing would duplicate them. Changing a
    // saved project's type, or removing a discipline, is not written back (would need PATCH/DELETE).
    async function saveProjectJunctions(projectLiveId, row, known) {
      var references = row.references || {};
      var knownDisciplines = (known && known.disciplines) || [];
      var newDisciplines = (references.disciplines || []).filter(function (label) { return !knownDisciplines.includes(label); });
      for (var i = 0; i < newDisciplines.length; i++) {
        var disciplineId = await resolveReferenceId('asc_disciplines', 'asc_disciplineid', newDisciplines[i]);
        if (!disciplineId) continue;
        var disciplineBody = {};
        disciplineBody['asc_ProjectReferenceID@odata.bind'] = '/asc_projectreferences(' + projectLiveId + ')';
        disciplineBody['asc_DisciplineID@odata.bind'] = '/asc_disciplines(' + disciplineId + ')';
        await webApiRequest('POST', '/_api/asc_projectreferencedisciplines', disciplineBody);
      }
      if (references.type && !(known && known.type)) {
        var typeId = await resolveReferenceId('asc_projecttypes', 'asc_projecttypeid', references.type, 'asc_projecttypename');
        if (typeId) {
          var typeBody = {};
          typeBody['asc_projectreference_id@odata.bind'] = '/asc_projectreferences(' + projectLiveId + ')';
          typeBody['asc_projecttype_id@odata.bind'] = '/asc_projecttypes(' + typeId + ')';
          await webApiRequest('POST', '/_api/asc_projectreferencetypes', typeBody);
        }
      }
    }
    async function saveProjects(consultantId, payload) {
      var dto = dataverseMapping.prepare(payload);
      var rows = (dto.collections && dto.collections.projects) || [];
      var knownRows = (existingRecord && existingRecord.projects) || [];
      var results = [];
      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        var body = Object.assign({}, row.fields);
        var references = row.references || {};
        var countryId = await resolveReferenceId('asc_countrys', 'asc_countryid', references.country);
        if (countryId) body['asc_CountryID@odata.bind'] = '/asc_countrys(' + countryId + ')';
        var regionId = await resolveReferenceId('asc_regions', 'asc_regionid', references.region);
        if (regionId) body['asc_region_id@odata.bind'] = '/asc_regions(' + regionId + ')';
        var liveId = row.liveId;
        if (liveId) {
          await webApiRequest('PATCH', '/_api/asc_projectreferences(' + liveId + ')', body);
        } else {
          body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + consultantId + ')';
          var response = await webApiRequest('POST', '/_api/asc_projectreferences', body);
          liveId = extractCreatedId(response);
        }
        if (liveId) {
          var known = knownRows.find(function (item) { return item.liveId === liveId; });
          await saveProjectJunctions(liveId, row, known && known.references);
        }
        results.push({ clientId: row.clientId, liveId: liveId || null });
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
      if (!existingRecord) existingRecord = { identity: {}, sections: {}, revenueByRegion: {}, contacts: [], bimProjects: [], projects: [] };
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
    // Accepted/Rejected re-confirmed via a fresh pac solution export 2026-10-24 (asc_powerpagestatuschoice:
    // Draft/Submitted/Accepted/Rejected = 751050000..751050003; Seeded = 751050004 added 2026-10-27, written by the Power Apps seeding app, loads editable like Accepted) - needed to READ a tab's latest row back.
    var PORTAL_SUBMISSION_STATUS_VALUES = { Draft: 751050000, Submitted: 751050001, Accepted: 751050002, Rejected: 751050003, Seeded: 751050004 };
    var PORTAL_SUBMISSION_TAB_VALUES = {
      'Identity': 751050000, 'Financial': 751050001, 'Legal': 751050002,
      'Offices & contacts': 751050003, 'Project references': 751050004,
      'BIM': 751050006, 'Sustainability': 751050007, 'Attachments': 751050010
    };
    var PORTAL_SUBMISSION_STATUS_NAMES = {};
    Object.keys(PORTAL_SUBMISSION_STATUS_VALUES).forEach(function (name) { PORTAL_SUBMISSION_STATUS_NAMES[PORTAL_SUBMISSION_STATUS_VALUES[name]] = name; });
    var PORTAL_SUBMISSION_TAB_NAMES = {};
    Object.keys(PORTAL_SUBMISSION_TAB_VALUES).forEach(function (name) { PORTAL_SUBMISSION_TAB_NAMES[PORTAL_SUBMISSION_TAB_VALUES[name]] = name; });
    var PORTAL_SUBMISSION_TABS = ['Identity', 'Financial', 'Legal', 'Offices & contacts', 'Project references', 'BIM', 'Sustainability', 'Attachments'];
    function tabSnapshot(source) {
      if (!source) return {};
      return {
        'Identity': source.identity || {},
        // revenueByRegion lives beside (not inside) sections.financial in the payload/existingRecord
        // shapes - folded into the Financial slice so the staged asc_after loses nothing.
        'Financial': Object.assign({}, (source.sections && source.sections.financial) || {}, source.revenueByRegion ? { revenueByRegion: source.revenueByRegion } : {}),
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
    // ---- Prefill from asc_portalsubmission.asc_after (read side) ----
    // Per tab, the consultant's most recent submission row (any status) is the source of truth for
    // what the form shows on login: Draft/Rejected/Accepted load editable, Submitted loads locked
    // (profile.js applyTabLocks), no row = blank. No copy-forward write logic is needed - the next
    // Save draft on a Rejected/Accepted tab already creates a fresh Draft row (findDraftSubmissionId
    // only matches Draft).
    var prefillRecord = null;
    var submissionTabStatus = {};
    function pickLatestSubmissionPerTab(rows, consultantId) {
      var wanted = String(consultantId || '').toLowerCase();
      var latest = {};
      (Array.isArray(rows) ? rows : []).filter(function (row) {
        return row && row._asc_consultant_id_value && String(row._asc_consultant_id_value).toLowerCase() === wanted;
      }).sort(function (a, b) {
        var left = String(a.createdon || ''), right = String(b.createdon || '');
        return left < right ? 1 : left > right ? -1 : 0;
      }).forEach(function (row) {
        var tab = PORTAL_SUBMISSION_TAB_NAMES[row.asc_tab];
        if (!tab || latest[tab]) return;
        latest[tab] = { id: row.asc_portalsubmissionid, status: PORTAL_SUBMISSION_STATUS_NAMES[row.asc_status] || null, after: row.asc_after || null };
      });
      return latest;
    }
    function parseSubmissionAfter(text) {
      if (!text) return null;
      try { var value = JSON.parse(text); return value && typeof value === 'object' ? value : null; } catch (ignored) { return null; }
    }
    function plainObject(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
    function submissionRows(list) {
      return (Array.isArray(list) ? list : []).filter(function (row) { return row && typeof row === 'object'; }).map(function (row) {
        // asc_after stores collectProfile() rows flat ({id, liveId, ...fields}); tolerate the
        // existingRecord-style {liveId, fields} too.
        var fields = Object.assign({}, row.fields && typeof row.fields === 'object' ? row.fields : row);
        delete fields.id; delete fields.liveId;
        return { localId: row.id || null, liveId: row.liveId || null, fields: fields };
      });
    }
    // Pure: {tabName: {status, after}} -> the existingRecord-like shape profile.js consumes. A
    // corrupt/empty asc_after degrades that one tab to blank.
    function reconstructPrefillRecord(latest) {
      latest = latest || {};
      function afterOf(tab) { return latest[tab] ? parseSubmissionAfter(latest[tab].after) : null; }
      var identity = Object.assign({}, plainObject(afterOf('Identity')));
      ['disciplines', 'sectors', 'regions'].forEach(function (key) { if (!Array.isArray(identity[key])) identity[key] = []; });
      var financial = Object.assign({}, plainObject(afterOf('Financial')));
      var revenueByRegion = Object.assign({}, plainObject(financial.revenueByRegion));
      delete financial.revenueByRegion;
      // Rows written by reviewers/seeding (or accepted from the DB) carry the short stored value
      // ('YYYY' / 'YYYY/ZZ'), but the dropdown options are the labelled forms - an unmatched value
      // renders as a blank select.
      if (financial.yearFormat === 'YYYY') financial.yearFormat = 'YYYY (Jan–Dec)';
      else if (financial.yearFormat === 'YYYY/ZZ') financial.yearFormat = 'YYYY/ZZ (Apr–Mar)';
      var officesTab = plainObject(afterOf('Offices & contacts'));
      var bimTab = plainObject(afterOf('BIM'));
      var tabStatus = {};
      Object.keys(latest).forEach(function (tab) { if (latest[tab] && latest[tab].status) tabStatus[tab] = latest[tab].status; });
      return {
        identity: identity,
        sections: { financial: financial, legal: plainObject(afterOf('Legal')), bim: plainObject(bimTab.bim), sustainability: plainObject(afterOf('Sustainability')) },
        revenueByRegion: revenueByRegion,
        contacts: submissionRows(officesTab.contacts),
        offices: submissionRows(officesTab.offices),
        projects: submissionRows(afterOf('Project references')),
        bimProjects: submissionRows(bimTab.bimProjects),
        tabStatus: tabStatus
      };
    }
    // Older asc_after payloads were captured before the live write returned row IDs, so rows may
    // lack liveId; adopt it from the live read (loadExistingRecordSync) by email/name so the next
    // save PATCHes instead of creating a duplicate.
    function adoptLiveIds(rows, liveRows, key) {
      rows.forEach(function (row) {
        var wanted = String(row.fields[key] || '').trim().toLowerCase();
        if (row.liveId || !wanted) return;
        var matches = (liveRows || []).filter(function (live) { return String(live.fields[key] || '').trim().toLowerCase() === wanted; });
        if (matches.length === 1) row.liveId = matches[0].liveId;
      });
    }
    // Network half - cannot be unit tested (sync XHR), same as loadExistingRecordSync.
    function loadPrefillRecordSync() {
      prefillRecord = null;
      submissionTabStatus = {};
      if (!liveConsultantId) return;
      var token = syncGetVerificationToken();
      if (!token) return;
      // Light listing first (no asc_after - Global scope returns every consultant's rows), then
      // fetch asc_after only for the up-to-8 rows actually selected. $orderby is best-effort;
      // the pick sorts client-side regardless.
      var base = '/_api/asc_portalsubmissions?$select=asc_portalsubmissionid,asc_tab,asc_status,createdon,_asc_consultant_id_value';
      var listing = syncGetJson(base + '&$orderby=createdon desc', token) || syncGetJson(base, token);
      if (!listing) return;
      var latest = pickLatestSubmissionPerTab(listing.value, liveConsultantId);
      Object.keys(latest).forEach(function (tab) {
        var full = syncGetJson('/_api/asc_portalsubmissions(' + latest[tab].id + ')?$select=asc_after', token);
        latest[tab].after = full && full.asc_after;
      });
      prefillRecord = reconstructPrefillRecord(latest);
      if (existingRecord) {
        adoptLiveIds(prefillRecord.contacts, existingRecord.contacts, 'email');
        adoptLiveIds(prefillRecord.bimProjects, existingRecord.bimProjects, 'name');
        adoptLiveIds(prefillRecord.projects, existingRecord.projects, 'name');
      }
      submissionTabStatus = Object.assign({}, prefillRecord.tabStatus);
    }
    async function recordPortalSubmissions(consultantId, payload, status) {
      var after = tabSnapshot(payload);
      var before = tabSnapshot(existingRecord);
      for (var i = 0; i < PORTAL_SUBMISSION_TABS.length; i++) {
        var tab = PORTAL_SUBMISSION_TABS[i];
        // A Submitted tab is locked until reviewed - saving again would create/overwrite a Draft row.
        if (submissionTabStatus[tab] === 'Submitted') continue;
        try {
          await saveTabSubmission(consultantId, tab, after[tab], before[tab], status);
          submissionTabStatus[tab] = status;
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

    // ---- Attachments (asc_attachment row + asc_attachedfile file column) ----
    // The live file column is asc_attachedfile ("Attached File", 32 MB max), confirmed via a fresh
    // pac solution export 2026-10-24 - NOT asc_file as the original design/dbml said. All lookups
    // on asc_attachment have all-lowercase schema names, so nav property == LogicalName here
    // (asc_consultant_id, asc_documenttype_id, asc_uploadedby_id, asc_projectreference_id).
    // Upload: PUT /_api/asc_attachments(<id>)/asc_attachedfile with raw bytes (Power Pages docs).
    // Docs cap a single service call at 16 MB; larger files would need chunking, which Power Pages
    // does not document for uploads, so they are skipped with a warning rather than attempted.
    var ATTACHMENT_FILE_COLUMN = 'asc_attachedfile';
    var ATTACHMENT_SINGLE_REQUEST_MAX_BYTES = 16 * 1024 * 1024;
    var uploadedAttachmentFiles = new WeakSet();
    // asc_attachment.asc_status reuses the portal-submission status Choice (asc_powerpagestatuschoice,
    // confirmed live 2026-11-01). The portal writes Draft/Submitted; Accepted/Rejected/Seeded come from
    // the Power Apps reviewer app and are never overwritten here.
    var ATTACHMENT_STATUS_VALUES = { Draft: 751050000, Submitted: 751050001, Accepted: 751050002, Rejected: 751050003, Seeded: 751050004 };
    var ATTACHMENT_STATUS_NAMES = { 751050000: 'Draft', 751050001: 'Submitted', 751050002: 'Accepted', 751050003: 'Rejected', 751050004: 'Seeded' };
    // Files already saved for this consultant (filled by loadExistingRecordSync): [{liveId, name, sizeMb, uploadedOn, status, documentType}]
    var existingAttachments = [];
    // Pure request shaping (unit-tested): what row body / upload headers a payload.files entry gets.
    function buildAttachmentRequest(entry, ids) {
      var file = entry.file;
      var body = {
        asc_name: file.name,
        asc_filename: file.name,
        asc_filesizemb: Math.round((file.size / 1000000) * 1000) / 1000,
        asc_uploadedon: ids.uploadedOn,
        asc_status: ATTACHMENT_STATUS_VALUES[ids.status || 'Draft'], asc_origin: AUDIT_ORIGIN_SELF_SERVICE_PORTAL,
        'asc_uploadedby_id@odata.bind': '/systemusers(' + ids.uploadedById + ')'
      };
      // Always tied to the consultant (reviewers filter by it); project files are also tied to their project.
      body['asc_consultant_id@odata.bind'] = '/asc_consultants(' + ids.consultantId + ')';
      if (entry.projectId) body['asc_projectreference_id@odata.bind'] = '/asc_projectreferences(' + entry.projectLiveId + ')';
      if (ids.documentTypeId) body['asc_documenttype_id@odata.bind'] = '/asc_documenttypes(' + ids.documentTypeId + ')';
      return {
        body: body,
        uploadPath: function (attachmentId) { return '/_api/asc_attachments(' + attachmentId + ')/' + ATTACHMENT_FILE_COLUMN; },
        // Header values must be ISO-8859-1 or fetch() throws; the real name is kept in asc_filename.
        uploadHeaders: { 'Content-Type': 'application/octet-stream', 'x-ms-file-name': String(file.name).replace(/[^ -~]/g, '_') },
        tooLargeForSingleRequest: file.size > ATTACHMENT_SINGLE_REQUEST_MAX_BYTES
      };
    }
    async function uploadAttachmentBytes(path, file, headers) {
      var token = await getVerificationToken();
      var all = Object.assign({ 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest', '__RequestVerificationToken': token }, headers);
      var response = await fetch(path, { method: 'PUT', credentials: 'same-origin', headers: all, body: file });
      if (!response.ok) throw new Error('File upload failed (' + response.status + ').');
    }
    async function saveAttachments(consultantId, payload, projectResults, submissionStatus) {
      var results = { uploaded: 0, skipped: 0, failed: 0, submitted: 0 };
      var newStatus = submissionStatus === 'Submitted' ? 'Submitted' : 'Draft';
      var files = payload.files || [];
      for (var i = 0; i < files.length; i++) {
        var entry = files[i];
        if (!entry.file || uploadedAttachmentFiles.has(entry.file)) continue;
        // Project-scoped attachments bind to the live asc_projectreference row saved by saveProjects()
        // earlier in this same save. If that project could not be saved, skip loudly.
        if (entry.projectId) {
          var savedProject = (projectResults || []).find(function (item) { return item.clientId === entry.projectId && item.liveId; });
          if (!savedProject) {
            console.warn('[ascentis] project-level attachment not uploaded - its project reference was not saved:', entry.file.name);
            results.skipped++;
            continue;
          }
          entry = Object.assign({}, entry, { projectLiveId: savedProject.liveId });
        }
        try {
          var documentTypeId = await resolveReferenceId('asc_documenttypes', 'asc_documenttypeid', entry.documentType);
          var request = buildAttachmentRequest(entry, { consultantId: consultantId, documentTypeId: documentTypeId, uploadedById: AUDIT_ACTOR_SYSTEMUSER_ID, uploadedOn: new Date().toISOString(), status: newStatus });
          if (request.tooLargeForSingleRequest) {
            console.warn('[ascentis] attachment over 16 MB not uploaded (single-request limit):', entry.file.name);
            results.skipped++;
            continue;
          }
          var created = await webApiRequest('POST', '/_api/asc_attachments', request.body);
          var attachmentId = extractCreatedId(created);
          if (!attachmentId) throw new Error('Attachment row created but no id returned.');
          try {
            await uploadAttachmentBytes(request.uploadPath(attachmentId), entry.file, request.uploadHeaders);
          } catch (uploadError) {
            // Don't leave a file-less row behind; ignore cleanup failure (delete not permitted by the table permission).
            try { await webApiRequest('DELETE', '/_api/asc_attachments(' + attachmentId + ')'); } catch (ignored) {}
            throw uploadError;
          }
          uploadedAttachmentFiles.add(entry.file);
          // Track it so a Submit in this same session (no reload) promotes it too.
          existingAttachments.push({ liveId: attachmentId, name: entry.file.name, sizeMb: request.body.asc_filesizemb, uploadedOn: request.body.asc_uploadedon, status: newStatus, documentType: entry.documentType || '' });
          results.uploaded++;
        } catch (error) {
          console.warn('[ascentis] attachment write failed', entry.file && entry.file.name, error);
          results.failed++;
        }
      }
      // Submit for review: the portal's own Draft files become Submitted. Accepted/Rejected/Seeded
      // (set by the reviewer app) are never touched.
      if (newStatus === 'Submitted') {
        for (var j = 0; j < existingAttachments.length; j++) {
          var row = existingAttachments[j];
          if (row.status !== 'Draft') continue;
          try {
            await webApiRequest('PATCH', '/_api/asc_attachments(' + row.liveId + ')', { asc_status: ATTACHMENT_STATUS_VALUES.Submitted });
            row.status = 'Submitted';
            results.submitted++;
          } catch (error) {
            console.warn('[ascentis] attachment status update failed', row.name, error);
            results.failed++;
          }
        }
      }
      return results;
    }
    // The staged asc_after must carry the live row IDs this save just created, or the next login's
    // prefill would POST duplicates instead of PATCHing. Returns a copy; payload is untouched.
    function stampLiveIds(payload, results) {
      var collections = Object.assign({}, payload.collections);
      Object.keys(results).forEach(function (key) {
        collections[key] = (collections[key] || []).map(function (row) {
          var hit = results[key].find(function (item) { return item.clientId === row.id; });
          return hit && hit.liveId ? Object.assign({}, row, { liveId: hit.liveId }) : row;
        });
      });
      return Object.assign({}, payload, { collections: collections });
    }
    async function saveAll(payload, submissionStatus) {
      var wasNewConsultant = !liveConsultantId;
      var consultantId = await saveConsultant(payload);
      await saveChildTables(consultantId, payload);
      var contacts = await saveContacts(consultantId, payload);
      var bimProjects = await saveBimProjects(consultantId, payload);
      // Project references never block the save: a failure here (e.g. Web API settings not deployed
      // yet) is logged and the staged submission below still carries the project data.
      var projects = [];
      try { projects = await saveProjects(consultantId, payload); } catch (projectError) { console.warn('[ascentis] project references write failed', projectError); }
      await saveConsultantReferences(consultantId, payload);
      var attachments = await saveAttachments(consultantId, payload, projects, submissionStatus);
      await recordPortalSubmissions(consultantId, stampLiveIds(payload, { contacts: contacts, bimProjects: bimProjects, projects: projects }), submissionStatus);
      var firmName = (payload.identity && payload.identity.firmName) || '';
      var objectText = 'asc_consultant ' + consultantId + (firmName ? ' (' + firmName + ')' : '');
      await logAuditEvent(submissionStatus === 'Submitted' ? 'Submit' : (wasNewConsultant ? 'Create' : 'Update'), objectText);
      return { consultantId: consultantId, contacts: contacts, bimProjects: bimProjects, projects: projects, attachments: attachments };
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

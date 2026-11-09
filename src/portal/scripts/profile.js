    var tabs = Array.from(root.querySelectorAll('[role=tab]'));
    var sections = {};
    var collections = {};
    var collectionSequence = 0;
    var attachments = [];
    var busy = false;
    if (!preview) { try { loadLiveChoicesSync(); } catch (ignored) { /* keep the config.json fallback list */ } }
    // Resolve the signed-in contact's consultant BEFORE any record is loaded. It used to run later (when the
    // confidentiality screen was shown), so on a first sign-in - empty browser storage - the loaders below saw no
    // consultant id and left the form blank until the next page refresh.
    if (!preview && root.dataset.authenticated === 'true') { try { resolveInvitationConsultant(); } catch (ignored) { /* fall back to stored id */ } }
    if (!preview) { try { loadExistingRecordSync(); } catch (ignored) { /* start from a blank form */ } }
    // Form values come from each tab's latest asc_portalsubmission row; existingRecord (live tables)
    // is still loaded above for asc_before, junction diffing and live-row ID caches.
    if (!preview) { try { loadPrefillRecordSync(); } catch (ignored) { prefillRecord = null; /* blank form */ } }
    var choices = portalConfig.choices;
    var selected = {
      Disciplines: (prefillRecord && prefillRecord.identity.disciplines.slice()) || [],
      Sectors: (prefillRecord && prefillRecord.identity.sectors.slice()) || [],
      Regions: (prefillRecord && prefillRecord.identity.regions.slice()) || []
    };
    if (prefillRecord) {
      if (prefillRecord.identity.firmName) form.elements.firmName.value = prefillRecord.identity.firmName;
      if (prefillRecord.identity.website) form.elements.website.value = prefillRecord.identity.website;
      if (prefillRecord.identity.alias) form.elements.alias.value = prefillRecord.identity.alias;
      if (prefillRecord.identity.firmType) form.elements.firmType.value = prefillRecord.identity.firmType;
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
      sections[definition.id] = createFields(panel, definition.fields, prefillRecord && prefillRecord.sections[definition.id]);
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
      var table = dataTable(id === 'projects' ? ['Project', 'Country / region', 'Disciplines', 'Type', 'GFA / Keys', 'Status', 'Years'] : ['Name', 'Location', 'GFA', 'LOD', 'Disciplines']);
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
          : [values.location, values.gfa ? Number(values.gfa).toLocaleString('en-US') : '—', values.lod, (values.disciplines || []).join(', ')];
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

    // Prefill every collection from the staged asc_after rows. Contacts go first: offices
    // reference them as leaders by local row id, which is regenerated on load, so the old ids are
    // remapped to the new ones.
    if (prefillRecord) {
      var contactIdMap = {};
      prefillRecord.contacts.forEach(function (row) {
        var added = addRecord('contacts', row.fields, false, row.liveId);
        if (added && row.localId) contactIdMap[row.localId] = added.id;
      });
      prefillRecord.offices.forEach(function (row) {
        var fields = Object.assign({}, row.fields);
        var leaders = (Array.isArray(fields.leaders) ? fields.leaders : []).map(function (id) { return contactIdMap[id]; }).filter(Boolean);
        delete fields.leaders;
        var added = addRecord('offices', fields, false, row.liveId);
        var control = added && fieldIn(added.group, 'leaders');
        if (control) {
          // Leader options only exist once contacts are registered (updateContacts), so select after.
          Array.from(control.options).forEach(function (option) { option.selected = leaders.includes(option.value); });
          if (control.refreshMulti) control.refreshMulti();
          refreshCollection(collections.offices);
        }
      });
      prefillRecord.projects.forEach(function (row) { addRecord('projects', row.fields, false, row.liveId); });
      prefillRecord.bimProjects.forEach(function (row) { addRecord('bimProjects', row.fields, false, row.liveId); });
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
      var value = prefillRecord && prefillRecord.revenueByRegion[region];
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
    attachmentPanel.appendChild(element('h2', '', 'Attachments (max 16 MB each)'));
    attachmentPanel.appendChild(element('p', 'section-description', 'Add supporting documents, up to 16 MB per file. Project attachments also appear here.'));
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
    attachmentPanel.appendChild(element('p', 'region-help', 'Saved files show their review status. Files marked locked (Accepted, Rejected or Seeded) are set by our team and cannot be changed here.'));
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
      // Files already uploaded by a save show as saved rows below, not again as pending local files.
      var files = allFiles().filter(function (item) { return !(typeof uploadedAttachmentFiles !== 'undefined' && uploadedAttachmentFiles.has(item.file)); });
      var table = dataTable(['File', 'Document type', 'Uploaded', 'Status', 'Size', '']);
      // Files already saved to Dataverse: read-only, with the status the reviewer app/portal set.
      (typeof existingAttachments !== 'undefined' ? existingAttachments : []).forEach(function (saved) {
        var tr = element('tr');
        tr.appendChild(element('td', '', saved.name || '(unnamed file)'));
        tr.appendChild(element('td', '', saved.documentType || '—'));
        tr.appendChild(element('td', '', saved.uploadedOn ? new Date(saved.uploadedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'));
        var locked = saved.status === 'Accepted' || saved.status === 'Rejected' || saved.status === 'Seeded';
        tr.appendChild(element('td', '', (saved.status || '—') + (locked ? ' (locked)' : '')));
        tr.appendChild(element('td', '', saved.sizeMb ? saved.sizeMb.toFixed(1) + ' MB' : '—'));
        tr.appendChild(element('td'));
        table.body.appendChild(tr);
      });
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
        tr.appendChild(element('td', '', 'Not saved yet'));
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
      if (!files.length && !(typeof existingAttachments !== 'undefined' && existingAttachments.length)) attachmentList.appendChild(element('p', 'empty-state', 'No documents selected.'));
    }

    uploadInput.addEventListener('change', function () {
      var errors = [];
      Array.from(uploadInput.files).forEach(function (file) {
        var error = profileRules.fileError(file, schema.limits.fileBytes);
        if (error) errors.push(error);
        else attachments.push({ id: 'local-' + (++attachmentSequence), file: file, documentType: '' });
      });
      uploadInput.value = '';
      attachmentMessage.textContent = errors.join(' ') || 'Files selected. They will be uploaded when you save.';
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
      if (busy || allTabsLocked() || !validateProfile(action === 'saveDraft')) return;
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
        if (!result.preview) renderAttachments();
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
          report('profile-status', result.preview ? 'Example submission only. No data was sent.' : 'Submitted for review. Submitted sections are locked until the review is complete.');
          show('submit', true);
          if (!result.preview) applyTabLocks();
        }
      } catch (error) {
        report('profile-status', error.message || 'The request failed. Your entered details remain on this screen. Please try again.');
      } finally {
        busy = false;
        form.setAttribute('aria-busy', 'false');
        refreshActionState();
      }
    }

    // A tab whose latest submission is Submitted is pending review: read-only, no unlock action.
    // inert (not disabled) so readFields() still collects its values and record cards stay openable.
    // With every tab Submitted there is nothing left to save, so both actions are disabled.
    function allTabsLocked() {
      return PORTAL_SUBMISSION_TABS.every(function (tab) { return submissionTabStatus[tab] === 'Submitted'; });
    }
    function refreshActionState() {
      var locked = allTabsLocked();
      form.querySelectorAll('.profile-actions button').forEach(function (button) { button.disabled = locked || busy; });
      if (locked && !busy) report('profile-status', 'All sections have been submitted and are pending review. Nothing left to save.');
    }
    function applyTabLocks() {
      PORTAL_SUBMISSION_TABS.forEach(function (tab, index) {
        var panel = document.getElementById('panel-' + index);
        if (submissionTabStatus[tab] !== 'Submitted' || !panel || panel.dataset.locked === 'true') return;
        panel.dataset.locked = 'true';
        panel.classList.add('tab-locked');
        var banner = element('p', 'pending-review-banner', 'Pending review — this section has been submitted and cannot be edited until the review is complete.');
        banner.setAttribute('role', 'status');
        panel.prepend(banner);
        Array.from(panel.children).forEach(function (child) {
          if (child === banner) return;
          if (child.classList.contains('collection-section')) {
            child.querySelectorAll('.form-field, .add-record, .remove-record').forEach(function (node) { node.setAttribute('inert', ''); });
            // Record cards open in a modal dialog: keep only its Done button live so a submitted
            // record can be viewed but nothing inside it (fields, pickers, Remove) can change.
            child.querySelectorAll('.record-card').forEach(function (card) {
              Array.from(card.children).forEach(function (part) {
                if (part.tagName !== 'LEGEND' && !part.classList.contains('close-editor')) part.setAttribute('inert', '');
              });
            });
          }
          else child.setAttribute('inert', '');
        });
      });
      refreshActionState();
    }

    form.noValidate = true;
    document.getElementById('save-draft').addEventListener('click', function () { persist('saveDraft'); });
    form.addEventListener('submit', function (event) { event.preventDefault(); persist('submit'); });
    document.getElementById('done').addEventListener('click', function () { show('profile', true); });
    Object.keys(choices).forEach(renderTags);
    applyTabLocks();
    refreshFinancial();
    renderAttachments();

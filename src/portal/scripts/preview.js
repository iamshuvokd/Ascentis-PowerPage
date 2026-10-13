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

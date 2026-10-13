// Compile the supplied DBML into an explicit deployment manifest. No credentials.
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const source = fs.readFileSync(path.join(root, 'schema/phase-1.dbml'), 'utf8');
const references = ['discipline','sector','region','operator','service','certificationtype','firmtype','documenttype'];
// Tables that already existed live before this schema knew about them (discovered via a
// collision, not created by this project) - built manually in the maker portal at some earlier
// point, with structure this schema must match rather than dictate. See phase-1.dbml notes.
const preExisting = ['consultantdiscipline','consultantsectors','consultantregions'];
// Overrides for tables whose real live entity set name or primary name field don't follow this
// script's usual 'asc_<key>s' / 'asc_name' conventions.
const entitySetNameOverrides = {consultantsectors:'asc_consultantsectorses',consultantregions:'asc_consultantregionses'};
const primaryNameOverrides = {consultantdiscipline:'asc_number',consultantsectors:'asc_number',consultantregions:'asc_number',biminformation:'asc_number',contact:'asc_number',consultationcategory:'asc_number',portalsubmission:'asc_number',projecttype:'asc_projecttypename',lod:'asc_number',duplicateoverride:'asc_number',financialinformation:'asc_number',financialrevenueregion:'asc_number',kamcomarketing:'asc_number',kamleadreceived:'asc_number',kamleadshared:'asc_number',legalinformation:'asc_number',kamdriverrating:'asc_number',operatorapproval:'asc_number',operatorapprovaldiscipline:'asc_number',sustainabilityesg:'asc_number',projectreferencetype:'asc_number',engagementcontact:'asc_number'};
// Tables whose primary name column is a Dataverse autonumber ({SEQNUM:4}) rather than
// free text. Build-Solution.ps1 sets this on brand-new tables only (the 3 pre-existing
// junction tables above never go through table creation, so this is documentation for them).
// NOTE: projecttype is deliberately NOT in this list - its primary (asc_projecttypename) is
// plain single-line text, not autonumber, per explicit user request 2026-09-28 (its second
// rebuild that same day, overriding the first rebuild's asc_number/autonumber choice).
const primaryNameAutonumberTables = ['consultantdiscipline','consultantsectors','consultantregions','biminformation','contact','consultationcategory','portalsubmission','lod','duplicateoverride','financialinformation','financialrevenueregion','kamcomarketing','kamleadreceived','kamleadshared','legalinformation','kamdriverrating','operatorapproval','operatorapprovaldiscipline','sustainabilityesg','projectreferencetype','engagementcontact'];
const labels = {appuser:'App User',consultant:'Consultant',consultanttabupdate:'Consultant Tab Update',financialinformation:'Financial Information',financialrevenueregion:'Financial Revenue by Region',legalinformation:'Legal Information',biminformation:'BIM Information',sustainabilityesg:'Sustainability & ESG',office:'Office',officeleader:'Office Leader',contact:'Consultant Contact',shareholder:'Shareholder',operatorapproval:'Operator Approval',projectreference:'Project Reference',bimproject:'BIM Project',note:'Consultant Note',attachment:'Consultant Attachment',engagement:'Engagement',rating:'Rating',ratingscore:'Rating Score',engagementcontact:'Engagement Contact',consultantdiscipline:'Consultant Discipline',consultantsectors:'Consultant Sectors',consultantregions:'Consultant Regions',kamprofile:'KAM Profile',kamdriverrating:'KAM Driver Rating',kamleadreceived:'KAM Lead Received',kamleadshared:'KAM Lead Shared',kamcomarketing:'KAM Co-marketing',portalsubmission:'Portal Submission',invitation:'Consultant Invitation',discipline:'Discipline',sector:'Sector',region:'Region',country:'Country',operator:'Operator',service:'Service',certificationtype:'Certification Type',firmtype:'Firm Type',documenttype:'Document Type',ratingcriterion:'Rating Criterion',kamdriver:'KAM Driver',consultationcategory:'Consultation Category',projecttype:'Project Type',lod:'LOD',duplicateoverride:'Duplicate Override',operatorapprovaldiscipline:'Operator Approval Disciplines',projectreferencetype:'Project Reference Type'};
const tables = [], relationships = [];
for (const match of source.matchAll(/^Table (\w+) \{([\s\S]*?)^\}/gm)) {
  const [,key,body] = match;
  const columns = [...body.matchAll(/^\s+(\w+) (uuid|varchar|text|boolean|decimal|int|datetime|date)(?: \[([^\n]*)\])?/gm)].map(([,name,type,options=''])=>({name,type,required:options.includes('not null'),unique:options.includes('unique'),target:options.match(/ref: [>-] (\w+)\.id/)?.[1] || (/lookup to systemuser/.test(options) || name==='asc_reviewedby_id' ? 'systemuser':undefined),description:options.match(/note: '(.*)'/)?.[1]||''}));
  if (key.includes('_')) {relationships.push({name:'asc_'+key,left:columns[0].target,right:columns[1].target});continue;}
  tables.push({key,logicalName:'asc_'+key,entitySetName:entitySetNameOverrides[key]||('asc_'+key+'s'),label:labels[key],existing:references.includes(key)||preExisting.includes(key),primaryName:primaryNameOverrides[key]||'asc_name',primaryNameAutonumber:primaryNameAutonumberTables.includes(key),columns:columns.filter(c=>!['id','createdon','createdby'].includes(c.name))});
}
function add(key,column) { tables.find(t=>t.key===key).columns.push(column); }
// Additive extensions required by the supplied screens and review-first workflow.
add('consultant',{name:'asc_revenuepct_europe',type:'decimal',description:'Europe revenue share, present in the supplied Financial screen.'});
add('office',{name:'asc_city',type:'varchar',description:'Office city shown in the supplied office screen.'});
add('office',{name:'asc_status',type:'varchar',description:'Active / Inactive; region eligibility.'});
relationships.push({name:'asc_consultant_bimdiscipline',left:'consultant',right:'discipline'});
// Explicit human-readable column Display Name overrides. Without an entry here, Build-Solution.ps1
// falls back to stripping the asc_ prefix and turning underscores into spaces (no capitalisation,
// no word-splitting of concatenated names) - fine for e.g. asc_startyear -> "startyear" being
// acceptable-ish, not fine for asc_bimcapability -> "bimcapability". Add tables here as requested.
const columnLabels = {
  biminformation: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_bimcapability: 'BIM Capability',
    asc_bimdiscipline: 'BIM Discipline',
    asc_bimoperatorcount: 'BIM Operator Count'
  },
  consultantdiscipline: { asc_number: 'Name', asc_consultantid: 'Consultant', asc_disciplineid: 'Discipline' },
  consultantsectors: { asc_number: 'Name', asc_consultantid: 'Consultant', asc_sectorid: 'Sector' },
  consultantregions: { asc_number: 'Name', asc_consultantid: 'Consultant', asc_regionid: 'Region' },
  contact: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_firstname: 'First Name',
    asc_lastname: 'Last Name',
    asc_workemail: 'Work Email',
    asc_phone: 'Phone',
    asc_jobtitle: 'Job Title',
    asc_regionid: 'Region',
    asc_contacttype: 'Contact Type',
    asc_status: 'Status'
  },
  consultationcategory: { asc_number: 'Number' },
  portalsubmission: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_tab: 'Tab',
    asc_before: 'Before',
    asc_after: 'After',
    asc_status: 'Status',
    asc_reviewedby_id: 'Reviewed By',
    asc_revieweddate: 'Reviewed Date',
    asc_submittedby_id: 'Submitted By',
    asc_rejectreason: 'Reject Reason'
  },
  projecttype: { asc_projecttypename: 'Project Type Name' },
  sustainabilityesg: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_esgcert: 'ESG Certified',
    asc_esgcertdetails: 'ESG Certification Details',
    asc_esgreporting: 'ESG Reporting',
    asc_esgframework: 'ESG Framework',
    asc_accreditedcount: 'Accredited Count',
    asc_esgqa: 'ESG QA',
    asc_esgqadetails: 'ESG QA Details'
  },
  lod: { asc_number: 'Number' },
  duplicateoverride: {
    asc_number: 'Number',
    asc_consultantid: 'Consultant',
    asc_justification: 'Justification',
    asc_matchedvalue: 'Matched Value',
    asc_recordtype: 'Record Type'
  },
  financialinformation: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_effectiveyear: 'Effective Year',
    asc_fiscalformat: 'Fiscal Format',
    asc_backloginhand: 'Backlog In Hand',
    asc_revenuen1: 'Revenue N-1',
    asc_revenuen2: 'Revenue N-2',
    asc_revenuen3: 'Revenue N-3',
    asc_backlogratio: 'Backlog Ratio'
  },
  financialrevenueregion: {
    asc_number: 'Number',
    asc_financialinformation_id: 'Financial Information',
    asc_region_id: 'Region',
    asc_revenuepct: 'Revenue Percent'
  },
  kamcomarketing: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_description: 'Description',
    asc_status: 'Status',
    asc_statusdate: 'Status Date'
  },
  kamleadreceived: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_leaddate: 'Lead Date',
    asc_projectname: 'Project Name',
    asc_clientname: 'Client Name',
    asc_referraltype: 'Referral Type',
    asc_referralcomment: 'Referral Comment',
    asc_leadowner: 'Lead Owner',
    asc_services: 'Services',
    asc_leadstatus: 'Lead Status'
  },
  kamleadshared: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_leaddate: 'Lead Date',
    asc_projectname: 'Project Name',
    asc_referraltype: 'Referral Type',
    asc_referralcomment: 'Referral Comment',
    asc_leadowner: 'Lead Owner',
    asc_servicesproposed: 'Services Proposed',
    asc_referralstatus: 'Referral Status'
  },
  legalinformation: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_indemnified: 'Indemnified',
    asc_indemnitydetails: 'Indemnity Details',
    asc_litigation: 'Litigation',
    asc_litigationdetails: 'Litigation Details',
    asc_holdspi: 'Holds PI',
    asc_piperoccurrence: 'PI Per Occurrence',
    asc_piaggregate: 'PI Aggregate'
  },
  kamdriverrating: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_kamdriver_id: 'KAM Driver',
    asc_rating: 'Rating'
  },
  operatorapproval: {
    asc_number: 'Number',
    asc_consultant_id: 'Consultant',
    asc_operator_id: 'Operator',
    asc_brands: 'Brands'
  },
  operatorapprovaldiscipline: {
    asc_number: 'Number',
    asc_operatorapproval_id: 'Operator Approval',
    asc_disciplineid: 'Discipline'
  },
  projectreferencetype: {
    asc_number: 'Number',
    asc_projectreference_id: 'Project Reference',
    asc_projecttype_id: 'Project Type'
  },
  engagementcontact: {
    asc_number: 'Number',
    asc_engagement_id: 'Engagement',
    asc_contactid: 'Contact',
    asc_role: 'Role'
  }
};
for (const table of tables) {
  if (!table.columns.some(c=>c.name===table.primaryName)) table.columns.unshift({name:'asc_name',type:'varchar',required:true,description:'Record display name; generated by the trusted application service.'});
  for (const column of table.columns) if(column.name==='asc_file') column.type='file';
  const overrides = columnLabels[table.key];
  if (overrides) for (const column of table.columns) if (overrides[column.name]) column.label = overrides[column.name];
}
const model = {version:1,environment:'https://org84e19bfd.crm8.dynamics.com',solution:'ConsultantDatabaseSolution',publisher:'asc',tables,relationships};
fs.writeFileSync(path.join(root,'schema/model.json'),JSON.stringify(model,null,2)+'\n');
console.log(`Compiled ${tables.length} tables and ${relationships.length} many-to-many relationships.`);

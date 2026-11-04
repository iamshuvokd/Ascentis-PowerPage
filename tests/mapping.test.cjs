const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname,'..');
const map = require('../src/portal/dataverse-map.json');
const context = {portalConfig:{dataverseMap:map}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root,'src/portal/scripts/dataverse-mapping.js'),'utf8'),context);
const prepare = context.dataverseMapping.prepare;
const prepareChildTable = context.dataverseMapping.prepareChildTable;
const base = () => ({identity:{firmName:'Example',firmType:'Private'},sections:{financial:{yearFormat:'YYYY/ZZ (Apr–Mar)',revenue1:'$5,850,000'},legal:{insured:'No'}},collections:{},revenueByRegion:{Europe:'15'},files:[]});
test('mapping preserves false, normalizes finance and excludes privileged consultant fields',()=>{
 const payload=base();payload.identity.asc_status='Active';payload.sections.legal.asc_confackn=true;
 const result=prepare(payload);
 assert.equal(result.consultant.asc_revenuepct_europe,15);
 assert.equal(result.consultant.asc_status,undefined);
 assert.equal(result.consultant.asc_confackn,undefined);
 assert.equal(result.references.firmType,'Private');
 // 2026-10-08: Financial/Legal moved off asc_consultant onto their own 1:1 child tables (see
 // dataverse-map.json's childTables._comment) - prepare() no longer touches these sections at
 // all, prepareChildTable() does.
 assert.equal(prepareChildTable('legal',payload).asc_holdspi,false);
 const financial=prepareChildTable('financial',payload);
 assert.equal(financial.asc_revenuen1,5850000);
 assert.equal(financial.asc_fiscalformat,'YYYY/ZZ');
});
test('malformed numbers, fractional integer GFA and unmapped revenue regions are rejected',()=>{
 let payload=base();payload.sections.financial.revenue1='12,34';assert.throws(()=>prepareChildTable('financial',payload),/Invalid number/);
 payload=base();payload.collections.projects=[{id:'local-1',gfa:'12.5'}];assert.throws(()=>prepare(payload),/supported range/);
 payload=base();payload.revenueByRegion={'Unknown':'20'};assert.throws(()=>prepare(payload),/not configured/);
});
test('every mapped scalar column exists in the compiled Dataverse model',()=>{
 const model=require('../backend/schema/model.json');
 const check=(table,mapping)=>{const columns=model.tables.find(t=>t.logicalName===table).columns.map(c=>c.name);for(const column of Object.values(mapping))assert.ok(columns.includes(column),table+'.'+column)};
 for(const section of Object.values(map.consultant))check('asc_consultant',section);
 check('asc_consultant',map.revenueRegions);
 for(const collection of Object.values(map.collections))check(collection.table,collection.fields);
 for(const [key,entry] of Object.entries(map.childTables))if(key!=='_comment')check(entry.table,entry.fields);
});

test('BIM child table: capability Choice maps to option values and back, operators stay integers', () => {
  const body = prepareChildTable('bim', { sections: { bim: { capability: 'Outsourced', operators: '' } } });
  assert.equal(body.asc_bimcapability, 751050001);
  assert.equal(body.asc_bimoperatorcount, null);
  assert.equal(prepareChildTable('bim', { sections: { bim: { capability: 'In-house', operators: '4' } } }).asc_bimoperatorcount, 4);
  const back = context.dataverseMapping.reverseChildTable('bim', { asc_bimcapability: 751050000, asc_bimoperatorcount: 4 });
  assert.equal(back.capability, 'In-house');
  assert.equal(back.operators, '4');
  assert.throws(() => prepareChildTable('bim', { sections: { bim: { capability: 'Nope' } } }));
});

test('project years are sent as 1 January UTC dates, read back as the year, and bad years are rejected',()=>{
 // asc_startyear/asc_completionyear are Date and Time columns live (fresh export 2026-10-29) while the
 // form collects a plain year.
 const payload=base();payload.collections.projects=[{id:'p1',name:'Tower',startYear:'2024',completionYear:'2026',status:'In progress',gfa:'1200'}];
 const row=prepare(payload).collections.projects[0];
 assert.equal(row.fields.asc_startyear,'2024-01-01T00:00:00Z');
 assert.equal(row.fields.asc_completionyear,'2026-01-01T00:00:00Z');
 assert.equal(row.fields.asc_projectstatus,751050000);
 assert.equal(row.fields.asc_gfa,1200);
 const reversed=context.dataverseMapping.reverseRow('projects',{asc_name:'Tower',asc_startyear:'2024-01-01T00:00:00Z',asc_completionyear:null,asc_projectstatus:751050001});
 assert.equal(reversed.startYear,'2024');
 assert.equal(reversed.completionYear,undefined);
 assert.equal(reversed.status,'Completed');
 for(const bad of ['24','2024-01','abcd','1800','2200']){
  const p=base();p.collections.projects=[{id:'p1',name:'T',startYear:bad}];
  assert.throws(()=>prepare(p),/Invalid year/,bad);
 }
 const unset=base();unset.collections.projects=[{id:'p1',name:'T'}];
 assert.equal(prepare(unset).collections.projects[0].fields.asc_startyear,null);
});

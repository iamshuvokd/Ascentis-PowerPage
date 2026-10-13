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

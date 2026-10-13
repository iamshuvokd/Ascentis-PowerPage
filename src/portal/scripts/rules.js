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

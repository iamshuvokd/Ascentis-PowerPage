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
          else {
            field.control.value = initial[definition.key];
            // Stored values can differ from the option text only by case (e.g. 'In Progress' vs
            // 'In progress'); an unmatched value would leave the select blank, so match loosely.
            if (field.control.tagName === 'SELECT' && field.control.selectedIndex <= 0 && initial[definition.key]) {
              var wanted = String(initial[definition.key]).trim().toLowerCase();
              var match = Array.from(field.control.options).find(function (option) { return option.value.trim().toLowerCase() === wanted; });
              if (match) field.control.value = match.value;
            }
          }
        }
        group.fields.push(field);
        if (field.control.refreshMulti) field.control.refreshMulti();
      });
      node.addEventListener('change', function () { syncConditions(group); });
      fieldGroups.push(group);
      syncConditions(group);
      return group;
    }

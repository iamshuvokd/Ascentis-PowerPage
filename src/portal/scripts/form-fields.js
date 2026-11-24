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

    // Calling codes for the countries in schema.countryCodes; the phone field's country-code list is built from them.
    var DIAL_CODES = {AE:'971',AU:'61',BD:'880',BH:'973',CA:'1',CH:'41',CN:'86',DE:'49',EG:'20',ES:'34',FR:'33',GB:'44',HK:'852',ID:'62',IN:'91',IT:'39',JP:'81',KE:'254',KW:'965',LK:'94',MA:'212',MU:'230',MV:'960',MY:'60',NG:'234',NL:'31',NP:'977',NZ:'64',OM:'968',PH:'63',PK:'92',PT:'351',QA:'974',SA:'966',SG:'65',TH:'66',TR:'90',US:'1',VN:'84',ZA:'27'};
    function dialOptions() {
      return schema.countryCodes.filter(function (code) { return DIAL_CODES[code]; }).map(function (code) { return { value: code, label: code + ' +' + DIAL_CODES[code] }; });
    }
    // Split a stored phone such as "+971 4 555 0100" into the country (longest matching calling code) and the rest.
    function splitPhone(text) {
      var value = String(text || '').trim();
      var match = value.match(/^\+(\d+)/);
      if (!match) return { country: '', number: value };
      var digits = match[1], best = '';
      Object.keys(DIAL_CODES).forEach(function (code) {
        if (digits.indexOf(DIAL_CODES[code]) === 0 && (!best || DIAL_CODES[code].length > DIAL_CODES[best].length || (DIAL_CODES[code].length === DIAL_CODES[best].length && code === 'IN'))) best = code;
      });
      return best ? { country: best, number: value.slice(1 + DIAL_CODES[best].length).trim() } : { country: '', number: value };
    }

    // A saved attachment can be removed while it has no review status yet (files added from the reviewer app have none) or is a Draft.
    function isRemovableAttachment(item) { return Boolean(item) && (!item.status || item.status === 'Draft'); }

    function fieldValue(control) {
      if (control.dialSelect) {
        var number = control.value.trim();
        return number ? '+' + DIAL_CODES[control.dialSelect.value] + ' ' + number : '';
      }
      if (control.type === 'file') return control.multiple ? Array.from(control.files) : (control.files[0] || null);
      if (control.multiple) return Array.from(control.selectedOptions).map(function (option) { return option.value; });
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

    // ---- Floating menus (dropdown lists and the multi-picker checklist) ----
    // The menus are position:fixed and placed from the anchor's viewport rectangle, so they are never clipped by a
    // scrolling ancestor (record dialogs, panels) and can overlap the edge of a popup. They open below the anchor, or
    // above it when there is more room there, are limited to the free height, stay inside the viewport horizontally,
    // and follow the anchor while the page or a dialog scrolls or the window is resized.
    var menuRepositionBound = false;
    function placeMenu(menu, anchor) {
      var rect = anchor.getBoundingClientRect();
      var viewportWidth = document.documentElement.clientWidth;
      var viewportHeight = window.innerHeight;
      var pill = menu.parentNode && menu.parentNode.classList && menu.parentNode.classList.contains('dd-pill');
      menu.style.top = 'auto';
      menu.style.bottom = 'auto';
      menu.style.maxHeight = '';
      menu.style.minWidth = menu.classList.contains('dd-menu') && !pill ? Math.round(rect.width) + 'px' : '';
      var natural = Math.min(menu.scrollHeight + 2, 260);
      var below = viewportHeight - rect.bottom - 10;
      var above = rect.top - 10;
      var down = below >= natural || below >= above;
      menu.style.maxHeight = Math.max(110, Math.min(260, down ? below : above)) + 'px';
      if (down) menu.style.top = Math.round(rect.bottom + 6) + 'px';
      else menu.style.bottom = Math.round(viewportHeight - rect.top + 6) + 'px';
      menu.style.left = Math.round(Math.max(8, Math.min(rect.left, viewportWidth - menu.offsetWidth - 8))) + 'px';
      menu._ddAnchor = anchor;
      if (!menuRepositionBound) {
        menuRepositionBound = true;
        var again = function () {
          document.querySelectorAll('.dd-menu:not([hidden]), .multi-options:not([hidden])').forEach(function (open) { if (open._ddAnchor) placeMenu(open, open._ddAnchor); });
        };
        window.addEventListener('scroll', again, true);
        window.addEventListener('resize', again);
      }
    }

    function multiPicker(control, wrapper, inlineChoices) {
      control.classList.add('native-multi');
      control.tabIndex = -1;
      control.setAttribute('aria-hidden', 'true');
      var widget = element('div', 'multi-picker');
      // Inside a record popup the choices are shown inline as a row of checkboxes (no "+ add" button, chips or floating menu).
      var inline = Boolean(inlineChoices);
      if (inline) widget.classList.add('multi-inline');
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
      function close() { if (inline) return; menu.hidden = true; add.setAttribute('aria-expanded', 'false'); }
      add.addEventListener('click', function () {
        menu.hidden = !menu.hidden;
        add.setAttribute('aria-expanded', String(!menu.hidden));
        if (!menu.hidden) placeMenu(menu, add);
      });
      widget.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !inline) { close(); add.focus(); } });
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
            if (!inline) add.focus();
          });
          label.append(checkbox, document.createTextNode(option.textContent));
          menu.appendChild(label);
        });
        if (!control.options.length) menu.appendChild(element('p', 'field-help', 'Add contacts first to choose office leaders.'));
        if (!menu.hidden && !inline) placeMenu(menu, add);
      };
      if (inline) menu.hidden = false;
      control.refreshMulti();
    }

    // ---- Themed modal (replaces the browser's window.confirm / window.alert) ----
    // portalDialog({title, message, confirmLabel, cancelLabel, icon, danger, noCancel, focus}) resolves true when the
    // confirm button is used and false on Cancel, Esc or a click on the backdrop. The dialog is built on <dialog>, so
    // focus is trapped, Esc works and it stacks above any open record popup. Cancel has the initial focus for
    // destructive/irreversible questions (danger or focus:'cancel') so an accidental Enter never confirms.
    var portalDialogSequence = 0;
    function portalDialog(options) {
      return new Promise(function (resolve) {
        var id = 'portal-dialog-' + (++portalDialogSequence);
        var dlg = element('dialog', 'record-dialog confirm-dialog portal-dialog' + (options.danger ? ' portal-dialog-danger' : ''));
        dlg.setAttribute('role', options.danger || options.noCancel ? 'alertdialog' : 'dialog');
        dlg.setAttribute('aria-labelledby', id + '-title');
        dlg.setAttribute('aria-describedby', id + '-text');
        var icon = element('span', 'portal-dialog-icon', options.icon || (options.danger ? '!' : options.noCancel ? 'i' : '?'));
        icon.setAttribute('aria-hidden', 'true');
        var title = element('h2', 'confirm-title', options.title || '');
        title.id = id + '-title';
        var text = element('p', '', options.message || '');
        text.id = id + '-text';
        var actions = element('div', 'confirm-actions', '');
        var cancel = null;
        if (!options.noCancel) {
          cancel = element('button', 'portal-button', options.cancelLabel || 'Cancel');
          cancel.type = 'button';
          actions.appendChild(cancel);
        }
        var ok = element('button', 'portal-button ' + (options.danger ? 'portal-button-danger' : 'portal-button-primary'), options.confirmLabel || 'OK');
        ok.type = 'button';
        actions.appendChild(ok);
        dlg.append(icon, title, text, actions);
        var confirmed = false;
        ok.addEventListener('click', function () { confirmed = true; dlg.close(); });
        if (cancel) cancel.addEventListener('click', function () { dlg.close(); });
        dlg.addEventListener('click', function (event) {
          if (event.target !== dlg || !cancel) return;
          var box = dlg.getBoundingClientRect();
          if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dlg.close();
        });
        dlg.addEventListener('close', function () {
          if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
          resolve(confirmed);
        });
        root.appendChild(dlg);
        dlg.showModal();
        ((cancel && (options.danger || options.focus === 'cancel')) ? cancel : ok).focus();
      });
    }

    // ---- Themed single-select dropdown (desktop pointers only) ----
    // The browser's own option list cannot be styled, so on devices with a mouse the <select> is replaced visually by
    // a button + listbox. The native <select> stays in the DOM (visually hidden) as the single source of truth for the
    // value, validation, required/disabled state and the Dataverse mapping; the button and list only mirror it, and
    // every programmatic change (select.value = ..., disabled, rebuilt options) is picked up. Phones and tablets keep
    // the native picker, which is better there. Keyboard: Up/Down/Home/End, Enter/Space, Esc, type-ahead.
    var ddSequence = 0;
    var ddDocumentListener = false;
    function enhanceSelect(select) {
      if (!select || select.multiple || select.dataset.enhanced || !select.parentNode) return;
      if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      select.dataset.enhanced = 'true';
      var pill = select.classList.contains('tag-picker') || select.classList.contains('share-picker');
      var wrap = element('div', 'dd' + (pill ? ' dd-pill' : ''));
      select.parentNode.insertBefore(wrap, select);
      wrap.appendChild(select);
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      var id = 'dd-' + (++ddSequence);
      var button = element('button', 'dd-button', '');
      button.type = 'button';
      button.id = id + '-btn';
      // A <label> (wrapping the select, or pointing at it with for=) activates its control with a click - which
      // opened the browser's own list from the hidden <select>. Re-point every label of this select at the
      // visible button instead, so label text and list rows never reach the native control.
      Array.from(select.labels || []).forEach(function (label) { label.htmlFor = button.id; });
      button.setAttribute('role', 'combobox');
      button.setAttribute('aria-haspopup', 'listbox');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', id + '-list');
      var text = element('span', 'dd-text', '');
      button.appendChild(text);
      var menu = element('div', 'dd-menu');
      menu.id = id + '-list';
      menu.setAttribute('role', 'listbox');
      menu.hidden = true;
      wrap.append(button, menu);
      var items = [];
      var active = -1;
      var typed = '';
      var typedAt = 0;

      function sync() {
        var option = select.options[select.selectedIndex];
        var empty = !option || option.value === '';
        text.textContent = option ? option.textContent : '';
        button.classList.toggle('dd-placeholder', empty && !pill);
        var accessibleName = select.getAttribute('aria-label') || select.dataset.label || '';
        if (accessibleName) button.setAttribute('aria-label', accessibleName);
        else button.removeAttribute('aria-label');   // name then comes from the field's <label for=...>, never an empty aria-label
        button.setAttribute('aria-disabled', String(select.disabled));
        button.setAttribute('aria-required', String(select.required));
        button.tabIndex = select.disabled ? -1 : 0;
        if (select.getAttribute('aria-invalid') === 'true') button.setAttribute('aria-invalid', 'true');
        else button.removeAttribute('aria-invalid');
        if (select.disabled && !menu.hidden) close(false);
      }
      function render() {
        menu.replaceChildren();
        items = [];
        Array.from(select.options).forEach(function (option, index) {
          if (pill && option.value === '') return;
          var item = element('div', 'dd-option', option.textContent);
          item.id = id + '-opt-' + index;
          item.setAttribute('role', 'option');
          item.dataset.index = String(index);
          item.setAttribute('aria-selected', String(!pill && index === select.selectedIndex));
          if (option.disabled) item.setAttribute('aria-disabled', 'true');
          if (option.value === '') item.classList.add('dd-empty');
          item.addEventListener('click', function () { choose(index); });
          menu.appendChild(item);
          items.push(item);
        });
        if (!items.length) {
          var none = element('div', 'dd-option dd-empty', 'Nothing left to add');
          none.setAttribute('role', 'option');
          none.setAttribute('aria-disabled', 'true');
          menu.appendChild(none);
          items.push(none);
        }
      }
      function enabledFrom(start, step) {
        for (var i = start; i >= 0 && i < items.length; i += step) if (items[i].getAttribute('aria-disabled') !== 'true') return i;
        return -1;
      }
      function setActive(index) {
        items.forEach(function (item) { item.removeAttribute('data-active'); });
        active = index;
        if (index < 0 || !items[index]) { button.removeAttribute('aria-activedescendant'); return; }
        items[index].setAttribute('data-active', 'true');
        button.setAttribute('aria-activedescendant', items[index].id);
        if (items[index].scrollIntoView) items[index].scrollIntoView({ block: 'nearest' });
      }
      function move(step) {
        var next = enabledFrom(active + step, step);
        if (next >= 0) setActive(next);
      }
      function open() {
        if (select.disabled || !menu.hidden) return;
        render();
        menu.hidden = false;
        wrap.classList.add('dd-open');
        button.setAttribute('aria-expanded', 'true');
        placeMenu(menu, button);
        var current = items.findIndex(function (item) { return item.getAttribute('aria-selected') === 'true'; });
        setActive(current >= 0 ? current : enabledFrom(0, 1));
      }
      function close(returnFocus) {
        menu.hidden = true;
        wrap.classList.remove('dd-open');
        button.setAttribute('aria-expanded', 'false');
        setActive(-1);
        if (returnFocus) button.focus();
      }
      function choose(index) {
        var option = select.options[index];
        if (!option || option.disabled) return;
        var changed = select.selectedIndex !== index;
        select.selectedIndex = index;
        sync();
        close(true);
        // Pill pickers act on every pick (they add a chip), regular dropdowns only when the value changed.
        if (changed || pill) {
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Keep the mirror in step with programmatic changes of the native select.
      ['value', 'selectedIndex'].forEach(function (property) {
        var base = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, property);
        Object.defineProperty(select, property, {
          configurable: true,
          get: function () { return base.get.call(select); },
          set: function (value) { base.set.call(select, value); sync(); }
        });
      });
      new MutationObserver(function () { sync(); if (!menu.hidden) { render(); placeMenu(menu, button); } })
        .observe(select, { attributes: true, attributeFilter: ['disabled', 'required', 'aria-invalid'], childList: true, subtree: true });
      select.addEventListener('change', sync);
      select.addEventListener('focus', function () { if (!select.disabled) button.focus(); });
      // Code that focuses the field (validation error links, "focus the first field") must land on the visible button.
      select.focus = function (focusOptions) { if (!select.disabled) button.focus(focusOptions); };
      // A click inside the list is handled by the list; stop it from being forwarded to any label's control.
      menu.addEventListener('click', function (event) { event.preventDefault(); });

      button.addEventListener('click', function () { if (menu.hidden) open(); else close(false); });
      menu.addEventListener('mousedown', function (event) { event.preventDefault(); });
      wrap.addEventListener('focusout', function (event) { if (!wrap.contains(event.relatedTarget)) close(false); });
      button.addEventListener('keydown', function (event) {
        if (select.disabled) return;
        var key = event.key;
        var isOpen = !menu.hidden;
        if (key === 'ArrowDown' || key === 'ArrowUp') {
          event.preventDefault();
          if (!isOpen) open(); else move(key === 'ArrowDown' ? 1 : -1);
        } else if (key === 'Home' || key === 'End') {
          if (isOpen) { event.preventDefault(); setActive(key === 'Home' ? enabledFrom(0, 1) : enabledFrom(items.length - 1, -1)); }
        } else if (key === 'Enter' || key === ' ') {
          event.preventDefault();
          if (!isOpen) open(); else if (active >= 0) choose(Number(items[active].dataset.index));
        } else if (key === 'Escape') {
          if (isOpen) { event.preventDefault(); event.stopPropagation(); close(true); }
        } else if (key === 'Tab') {
          if (isOpen) close(false);
        } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          if (isOpen === false) open();
          var now = Date.now();
          typed = (now - typedAt > 700 ? '' : typed) + key.toLowerCase();
          typedAt = now;
          for (var step = 0; step < items.length; step++) {
            var index = (Math.max(active, 0) + (typed.length > 1 ? 0 : 1) + step) % items.length;
            if (items[index].getAttribute('aria-disabled') !== 'true' && items[index].textContent.toLowerCase().indexOf(typed) === 0) { setActive(index); break; }
          }
        }
      });
      wrap._ddClose = function () { if (!menu.hidden) close(false); };
      if (!ddDocumentListener) {
        ddDocumentListener = true;
        document.addEventListener('pointerdown', function (event) {
          document.querySelectorAll('.dd.dd-open').forEach(function (open) { if (!open.contains(event.target) && open._ddClose) open._ddClose(); });
        });
      }
      sync();
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
      if (definition.placeholder) control.placeholder = definition.placeholder;
      if (type === 'file' && definition.multiple) control.multiple = true;
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
      } else if (type === 'tel' && definition.dial) {
        var phone = element('div', 'phone-control');
        var dial = element('select');
        dial.id = id + '-dial';
        dial.setAttribute('aria-label', 'Country calling code');
        setOptions(dial, dialOptions());
        if (dial.options[0] && dial.options[0].value === '') dial.remove(0);
        dial.value = 'IN';
        control.dialSelect = dial;
        phone.appendChild(dial);
        phone.appendChild(control);
        wrapper.appendChild(phone);
        enhanceSelect(dial);
      } else wrapper.appendChild(control);
      if (definition.wide) wrapper.classList.add('field-wide');
      // The field group is already attached to its card, so a field inside a record popup can be recognised here
      // (the field's own wrapper is not attached yet).
      if (type === 'multi') multiPicker(control, wrapper, Boolean(group.closest && group.closest('.record-popup')));
      else if (control.tagName === 'SELECT') {
        enhanceSelect(control);
        // select.labels is empty for elements that are not attached to the page yet, so point this field's label at
        // the visible button explicitly (otherwise a label click would be forwarded to the hidden native select).
        var enhancedButton = wrapper.querySelector('.dd-button');
        if (enhancedButton) label.htmlFor = enhancedButton.id;
      }

      if (type === 'file' && definition.multiple) {
        // Gallery of the files chosen so far (name, size, remove) under the picker.
        var gallery = element('ul', 'file-gallery');
        gallery.setAttribute('aria-label', definition.label + ' – selected files');
        var renderGallery = function () {
          control.keptFiles = Array.from(control.files);
          gallery.replaceChildren();
          var saved = control.savedFiles ? control.savedFiles() : [];
          // Files chosen here and already uploaded by a save show as saved tiles, not twice.
          var fresh = Array.from(control.files).filter(function (file) { return !(typeof uploadedAttachmentFiles !== 'undefined' && uploadedAttachmentFiles.has(file)); });
          gallery.hidden = !(saved.length + fresh.length);
          saved.forEach(function (item) {
            var tile = element('li', 'file-tile file-tile-saved');
            tile.appendChild(element('span', 'file-tile-icon', ((item.name || '').split('.').pop() || 'file').slice(0, 4).toUpperCase()));
            var meta = element('span', 'file-tile-meta');
            meta.appendChild(element('span', 'file-tile-name', item.name || '(unnamed file)'));
            meta.appendChild(element('span', 'file-tile-size', (item.sizeMb ? Number(item.sizeMb).toFixed(1) + ' MB' : '') + (item.status ? (item.sizeMb ? ' · ' : '') + item.status : '')));
            tile.appendChild(meta);
            if (isRemovableAttachment(item) && control.removeSaved) {
              var removeSaved = element('button', 'file-tile-remove', '×');
              removeSaved.type = 'button';
              removeSaved.setAttribute('aria-label', 'Remove ' + (item.name || 'file'));
              removeSaved.addEventListener('click', function () { control.removeSaved(item); });
              tile.appendChild(removeSaved);
            }
            gallery.appendChild(tile);
          });
          fresh.forEach(function (file) {
            var tile = element('li', 'file-tile');
            tile.appendChild(element('span', 'file-tile-icon', (file.name.split('.').pop() || 'file').slice(0, 4).toUpperCase()));
            var meta = element('span', 'file-tile-meta');
            meta.appendChild(element('span', 'file-tile-name', file.name));
            meta.appendChild(element('span', 'file-tile-size', (file.size / 1000000).toFixed(1) + ' MB'));
            tile.appendChild(meta);
            var remove = element('button', 'file-tile-remove', '×');
            remove.type = 'button';
            remove.setAttribute('aria-label', 'Remove ' + file.name);
            remove.addEventListener('click', function () {
              var keep = new DataTransfer();
              Array.from(control.files).forEach(function (other) { if (other !== file) keep.items.add(other); });
              control.files = keep.files;
              control.skipMerge = true;
              control.dispatchEvent(new Event('change', { bubbles: true }));
            });
            tile.appendChild(remove);
            gallery.appendChild(tile);
          });
        };
        // A native file input replaces its list on every selection; keep the earlier files and add the new ones.
        control.addEventListener('change', function () {
          if (control.skipMerge) { control.skipMerge = false; return; }
          var merged = new DataTransfer();
          var seen = {};
          (control.keptFiles || []).concat(Array.from(control.files)).forEach(function (file) {
            var id = file.name + '|' + file.size;
            if (!seen[id]) { seen[id] = true; merged.items.add(file); }
          });
          control.files = merged.files;
        });
        control.addEventListener('gallery-refresh', renderGallery);
        control.addEventListener('change', renderGallery);
        renderGallery();
        wrapper.appendChild(gallery);
      }

      var help = element('small', 'field-help', definition.help || '');
      help.id = id + '-help';
      // No automatic "Maximum N characters." hint (project decision 22 Nov 2026): the input's maxlength still enforces the
      // limit; only an explicit definition.help (e.g. the file size note) is shown.
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
            if (field.control.dialSelect) {
              var parts = splitPhone(initial[definition.key]);
              if (parts.country) { field.control.dialSelect.value = parts.country; field.control.dialSelect.dispatchEvent(new Event('change')); }
              field.control.value = parts.number;
            } else field.control.value = initial[definition.key];
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

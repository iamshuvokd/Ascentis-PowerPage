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


    function download() {
      var configured = document.getElementById('download-confidentiality').dataset.pdfUrl;
      if (!configured) { window.alert('The confidentiality PDF is not available yet.'); return; }
      try { var url = new URL(configured, location.href); if (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.origin === location.origin)) throw new Error(); location.assign(url.href); }
      catch (_) { window.alert('The confidentiality PDF link is unavailable.'); }
    }
    root.querySelectorAll('#download-confidentiality,[data-download]').forEach(function (el) { el.addEventListener('click', download); });
    document.getElementById('confidentiality-form').addEventListener('submit', function (event) {
      event.preventDefault();
      if (!this.reportValidity()) return;
      var now = new Date();
      var dateLabel = now.toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'});
      if (preview) {
        document.getElementById('acknowledged-date').textContent = 'Confidentiality statement acknowledged on ' + dateLabel + '.';
      } else {
        // DEMO acknowledgement: records who (the signed-in user's display name, already
        // rendered by Liquid into #account-name) and when, actually written to
        // asc_consultant.asc_confackn/asc_confacknby/asc_confackndate the next time the
        // consultant record saves (services.js's pendingAcknowledgement). Not the full
        // production feature - no OTP-specific identity binding beyond whatever Entra
        // already established at sign-in, and no signed PDF. See backend/README.md.
        var acknowledgerName = (document.getElementById('account-name').textContent || '').trim() || 'Signed-in user';
        pendingAcknowledgement = { by: acknowledgerName, date: now.toISOString() };
        document.getElementById('acknowledged-date').textContent = 'Confidentiality statement acknowledged by ' + acknowledgerName + ' on ' + dateLabel + ' — recorded when your profile is saved.';
        // Fire-and-forget - logAuditEvent catches its own errors and this must never block
        // moving on to the profile screen.
        logAuditEvent('AcknowledgeConfidentiality', acknowledgerName);
      }
      show('profile', true);
    });


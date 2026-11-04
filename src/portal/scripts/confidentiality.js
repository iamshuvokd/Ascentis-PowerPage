    // Personalised PDF: calls the registered Power Pages cloud flow (secret stays server-side).
    // Flow returns { ok, fileName, contentBase64, message }. Falls back to the static PDF when
    // no flow ID is configured or in preview mode.
    async function downloadFromFlow(flowId) {
      var status = document.getElementById('confidentiality-status');
      function say(text) { status.textContent = text; status.hidden = !text; }
      say('Preparing the statement...');
      try {
        var token = await getVerificationToken();
        var addressee = (document.getElementById('account-name').textContent || '').trim() || (document.getElementById('account-email').textContent || '').trim() || 'Consultant';
        var response = await fetch('/_api/cloudflow/v1.0/trigger/' + encodeURIComponent(flowId), {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest', '__RequestVerificationToken': token },
          body: 'eventData=' + encodeURIComponent(JSON.stringify({ text: addressee, addresseeName: addressee }))
        });
        if (!response.ok) { var detail = ''; try { detail = (await response.text()).slice(0, 300); } catch (ignored) {} var failure = new Error('flow ' + response.status + ' ' + detail); failure.status = response.status; throw failure; }
        var result = await response.json();
        if (typeof result === 'string') result = JSON.parse(result);
        if (result && result.responseText) result = JSON.parse(result.responseText);
        // Power Pages flow outputs are text and lower-cased (ok, filename, contentbase64, message).
        var pick = function (name) { if (!result) return ''; var key = Object.keys(result).find(function (k) { return k.toLowerCase() === name; }); return key ? result[key] : ''; };
        var content = pick('contentbase64');
        if (String(pick('ok')).toLowerCase() !== 'true' || !content) { say(pick('message') || 'The statement could not be created.'); return; }
        result = { fileName: pick('filename'), contentBase64: content };
        var bin = atob(result.contentBase64), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var href = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        var a = document.createElement('a');
        a.href = href; a.download = result.fileName || 'Confidentiality statement.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(href);
        say('Downloaded.');
      } catch (error) {
        console.warn('[ascentis] confidentiality flow failed', error);
        say('The statement could not be created. Try again.' + (error && error.status ? ' (error ' + error.status + ')' : ''));
      }
    }
    function download() {
      var button = document.getElementById('download-confidentiality');
      if (!preview && button.dataset.flowId) { downloadFromFlow(button.dataset.flowId); return; }
      var configured = button.dataset.pdfUrl;
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


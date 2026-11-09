    // The "Send me a code"/6-digit card only ever renders in the local design preview now
    // (preview.js un-hides it) - it never sent or verified a real code. On the live site the
    // single working action is "Continue with Power Pages sign in", Entra External ID's own
    // email-OTP flow (confirmed end-to-end, 24 Sept 2026): Dataverse writes require Power
    // Pages' own redirect-completed session, so a code verified purely on this page could never
    // unlock a real save - explicit project-owner decision, 13 Oct 2026.
    //
    // Invitation redemption (email prefill, the 6-digit code, tying the identity to a specific
    // consultant) is handled entirely by Power Pages' own native "Redeem invitation" flow,
    // reached via the link below, before this page is ever shown again post-sign-in - see
    // resolveInvitationConsultant() in services.js. Nothing to prefill here (15 Oct 2026).
    if (!preview) {
      // Live: the email box does nothing (the button only links to Power Pages sign-in, where Entra External ID
      // asks for the email and sends the code), so remove it instead of asking for the email twice.
      var liveEmail = document.getElementById('registered-email');
      if (liveEmail) {
        liveEmail.required = false;
        liveEmail.hidden = true;
        var liveEmailLabel = root.querySelector('label[for="registered-email"]');
        if (liveEmailLabel) liveEmailLabel.hidden = true;
      }
    }
    if (preview) {
      document.getElementById('send-code').addEventListener('click', function () {
        if (!document.getElementById('registered-email').reportValidity()) return;
        report('signin-status', 'Preview only: no code was sent. Enter any six digits to explore the next screen.');
        root.querySelector('.otp-fields input').focus();
      });
      var digits = Array.from(root.querySelectorAll('.otp-fields input'));
      digits.forEach(function (input, index) {
        input.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(-1); if (this.value && digits[index+1]) digits[index+1].focus(); });
        input.addEventListener('keydown', function (event) { if (event.key === 'Backspace' && !this.value && digits[index-1]) digits[index-1].focus(); });
        input.addEventListener('paste', function (event) { event.preventDefault(); var value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0,6-index); value.split('').forEach(function (digit, offset) { digits[index+offset].value = digit; }); digits[Math.min(index+value.length,5)].focus(); });
      });
      document.getElementById('signin-form').addEventListener('submit', function (event) { event.preventDefault(); if (!this.reportValidity()) return; show('confidentiality', true); });
    }

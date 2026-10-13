    document.getElementById('send-code').addEventListener('click', function () {
      if (!document.getElementById('registered-email').reportValidity()) return;
      report('signin-status', preview ? 'Preview only: no code was sent. Enter any six digits to explore the next screen.' : 'Email code sign-in is not connected yet. Use the Power Pages sign-in link below.');
      if (preview) root.querySelector('.otp-fields input').focus();
    });
    var digits = Array.from(root.querySelectorAll('.otp-fields input'));
    digits.forEach(function (input, index) {
      input.addEventListener('input', function () { this.value = this.value.replace(/\D/g, '').slice(-1); if (this.value && digits[index+1]) digits[index+1].focus(); });
      input.addEventListener('keydown', function (event) { if (event.key === 'Backspace' && !this.value && digits[index-1]) digits[index-1].focus(); });
      input.addEventListener('paste', function (event) { event.preventDefault(); var value = event.clipboardData.getData('text').replace(/\D/g, '').slice(0,6-index); value.split('').forEach(function (digit, offset) { digits[index+offset].value = digit; }); digits[Math.min(index+value.length,5)].focus(); });
    });
    document.getElementById('signin-form').addEventListener('submit', function (event) { event.preventDefault(); if (!this.reportValidity()) return; if (preview) show('confidentiality', true); else report('signin-status','Email verification is not connected yet. Use the Power Pages sign-in link below.'); });


/* Adds X close button + gallery upload to bottom-sheet modals (user requests). */
(function () {
  function enhance() {
    document.querySelectorAll('.sheet').forEach(function (sheet) {
      var head = sheet.querySelector('.sheet-head');
      if (head && !sheet.querySelector('.muse-close')) {
        var btn = document.createElement('button');
        btn.className = 'icon-btn muse-close';
        btn.setAttribute('aria-label', '닫기');
        btn.textContent = '✕';
        btn.style.marginLeft = 'auto';
        btn.addEventListener('click', function () {
          var backdrop = document.querySelector('.sheet-backdrop');
          if (backdrop) backdrop.click();
        });
        head.appendChild(btn);
      }
      // Gallery upload button in scan modal
      if (!sheet.querySelector('.muse-gallery-btn')) {
        var cta = sheet.querySelector('.cta');
        var fileInput = sheet.querySelector('input[type="file"]');
        if (cta && fileInput) {
          var galleryBtn = document.createElement('button');
          galleryBtn.className = 'cta muse-gallery-btn';
          galleryBtn.style.marginTop = '0.5rem';
          galleryBtn.textContent = '🖼️ 앨범에서 선택';
          galleryBtn.addEventListener('click', function () {
            var input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = function (e) {
              var file = e.target.files && e.target.files[0];
              if (!file) return;
              var dt = new DataTransfer();
              dt.items.add(file);
              fileInput.files = dt.files;
              fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            };
            input.click();
          });
          cta.parentNode.insertBefore(galleryBtn, cta.nextSibling);
        }
      }
    });
  }
  var scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; enhance(); }, 300);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhance);
  } else {
    enhance();
  }
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });
})();

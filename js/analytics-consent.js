/* No tag, preconnect or noscript beacon is created before explicit consent. */
(() => {
  'use strict';
  const key = 'ilya100.analytics-consent.v1';
  // Bump together with consent.html and consent/VERSIONS.md when terms change.
  const consentVersion = '1.0';
  const versionKey = 'ilya100.analytics-consent.text-version';
  const counter = 114079632;
  const notice = document.getElementById('analytics-notice');
  const status = document.getElementById('analytics-status');
  const dismiss = document.getElementById('analytics-dismiss');
  const settings = document.querySelector('[data-analytics-settings]');
  let started = false;
  let returnFocus;
  let choice = null;
  let savedVersion = null;
  try {
    choice = localStorage.getItem(key);
    savedVersion = localStorage.getItem(versionKey);
  } catch (_) { /* Remain opt-in if storage is unavailable. */ }
  if (choice !== 'accepted' && choice !== 'denied') choice = null;
  // A legacy/different-version permission does not cover the current text.
  // Keep denials across revisions so a text update never enables analytics.
  if (choice === 'accepted' && savedVersion !== consentVersion) choice = null;
  window['disableYaCounter' + counter] = choice !== 'accepted';

  // Only presentation: the stored choice and counter lifecycle remain unchanged.
  function updateNoticeSpace() {
    const space = notice.hidden ? 0 : Math.ceil(
      notice.getBoundingClientRect().height + (parseFloat(getComputedStyle(notice).bottom) || 0) + 12
    );
    document.documentElement.style.setProperty('--analytics-bottom-space', `${space}px`);
  }
  if ('ResizeObserver' in window) new ResizeObserver(updateNoticeSpace).observe(notice);
  window.addEventListener('resize', updateNoticeSpace);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateNoticeSpace);
  if (document.fonts) document.fonts.ready.then(updateNoticeSpace);

  function start() {
    if (started || choice !== 'accepted') return;
    started = true;
    window['disableYaCounter' + counter] = false;
    // Official supplied snippet, invoked only after consent. No noscript pixel.
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j=0;j<document.scripts.length;j++) { if(document.scripts[j].src===r) return; }
      k=e.createElement(t);a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=114079632','ym');
    window.ym(counter,'init',{ssr:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
  }

  function clearFirstPartyData() {
    // Only Metrica-owned entries, never the visitor's consent or unrelated storage.
    try { Object.keys(localStorage).filter(name => /^_ym/.test(name)).forEach(name => localStorage.removeItem(name)); } catch (_) {}
    document.cookie.split(';').map(part => part.split('=')[0].trim()).filter(name => /^_ym/.test(name)).forEach(name => {
      const parts = location.hostname.split('.');
      const domains = ['', ...parts.map((_, index) => parts.slice(index).join('.'))];
      const paths = ['/', ...location.pathname.split('/').slice(0, -1).map((_, index, all) => all.slice(0, index + 1).join('/') || '/')];
      domains.forEach(domain => paths.forEach(path => {
        document.cookie = `${name}=; Max-Age=0; Path=${path};${domain ? ` Domain=${domain};` : ''} SameSite=Lax`;
      }));
    });
  }

  function close() {
    notice.hidden = true;
    updateNoticeSpace();
    (returnFocus || settings).focus({preventScroll:true});
  }

  function apply(value, persist = true) {
    choice = value;
    if (persist) {
      try {
        localStorage.setItem(key, value);
        localStorage.setItem(versionKey, consentVersion);
      } catch (_) {}
    }
    if (value === 'accepted') start();
    else {
      window['disableYaCounter' + counter] = true;
      if (window.ym && started) window.ym(counter, 'destruct');
      clearFirstPartyData();
    }
    close();
    // Remove the already loaded third-party runtime on withdrawal. An in-flight
    // request cannot be recalled; subsequent page loads do not load the tag.
    if (value === 'denied' && started) location.reload();
  }

  settings.hidden = false;
  settings.addEventListener('click', () => {
    returnFocus = settings;
    status.textContent = choice === 'accepted' ? 'Сейчас статистика разрешена.' : choice === 'denied' ? 'Сейчас статистика отключена.' : '';
    dismiss.hidden = !choice;
    notice.hidden = false;
    updateNoticeSpace();
    notice.querySelector('[data-analytics-choice]').focus({preventScroll:true});
  });
  notice.querySelectorAll('[data-analytics-choice]').forEach(button => button.addEventListener('click', () => apply(button.dataset.analyticsChoice)));
  dismiss.addEventListener('click', close);
  notice.addEventListener('keydown', event => { if (event.key === 'Escape' && choice) close(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === versionKey || event.key === null) {
      // Reload also closes races with an in-flight tag in another tab.
      location.reload();
    }
  });
  if (choice === 'accepted') start();
  else { if (choice === 'denied') clearFirstPartyData(); notice.hidden = choice === 'denied'; }
  updateNoticeSpace();
})();

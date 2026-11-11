/* Progressive enhancements: content and horizontal scrolling work without JS. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  const animations = new Set();
  const animate = (element, frames, options = {}) => {
    if (!reduced.matches && element.animate) {
      const animation = element.animate(frames, {duration:300, easing:'ease-out', ...options});
      animations.add(animation);
      animation.onfinish = animation.oncancel = () => animations.delete(animation);
    }
  };
  reduced.addEventListener('change', () => {if (reduced.matches) animations.forEach(animation => animation.cancel());});

  const picker = document.querySelector('.package-picker');
  if (picker) {
    const buttons = [...picker.querySelectorAll('button')];
    const values = [...document.querySelectorAll('[data-package-count]')];
    const status = document.querySelector('.package-status');
    let activeCount;
    function select(count, animateChange = true) {
      if (count === activeCount) return;
      activeCount = count;
      buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.count === count)));
      values.forEach(v => { v.hidden = v.dataset.packageCount !== count; });
      status.textContent = `Выбрано ${count} ${count === '8' ? 'занятий' : 'занятия'}. Индивидуально — от ${count === '4' ? '7 600' : '14 800'} рублей. В группе — ${count === '4' ? '3 600' : '7 200'} рублей за ученика.`;
      if (animateChange) {
        values.filter(value => !value.hidden).forEach(value => {
          animate(value.querySelector('strong'), [{opacity:.7}, {opacity:1}]);
          const saving = value.querySelector('.saving');
          if (saving) animate(saving, [{backgroundColor:'#8be4cc36'}, {backgroundColor:'#8be4cc16'}]);
        });
      }
    }
    buttons.forEach(b => b.addEventListener('click', () => select(b.dataset.count)));
    select('4', false);
    picker.hidden = false;
    document.querySelector('.pricing-packages').classList.add('packages-enhanced');
  }

  const track = document.querySelector('.reviews-track');
  if (track) {
    const originals = [...track.children];
    const count = originals.length;
    const controls = document.querySelector('.reviews-controls');
    const dots = [...controls.querySelectorAll('[data-review-index]')];
    const announcement = controls.querySelector('.reviews-announcement');
    // One complete copy on either side keeps the visible sequence identical at
    // each rebase, including when three cards straddle the last/first boundary.
    function copy(card) {
      const clone = card.cloneNode(true);
      clone.dataset.reviewClone = '';
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      clone.removeAttribute('aria-labelledby');
      clone.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
      return clone;
    }
    track.prepend(...originals.map(copy));
    track.append(...originals.map(copy));
    const physical = [...track.children];
    // The positioned track is the direct offsetParent of every slide.
    const offset = index => physical[index].offsetLeft;
    const nearest = () => physical.reduce((best, card, index) => Math.abs(offset(index) - track.scrollLeft) < Math.abs(offset(best) - track.scrollLeft) ? index : best, 0);
    const logical = index => ((index - count) % count + count) % count;
    let selected = -1;
    let moving = false;
    let expected = null;
    let pointerDown = false;
    let settleTimer;
    let queue = [];
    let lastWidth = track.clientWidth;
    let rebasing = false;
    function update() {
      const index = logical(nearest());
      if (index === selected) return;
      selected = index;
      physical.forEach((card, position) => {
        card.classList.toggle('is-active', logical(position) === selected);
      });
      dots.forEach((dot, index) => {
        dot.hidden = false;
        dot.setAttribute('aria-current', String(index === selected));
      });
    }
    function settle() {
      clearTimeout(settleTimer);
      if (pointerDown || rebasing) return;
      if (expected !== null && Math.abs(track.scrollLeft - offset(expected)) > 1.5) return;
      const position = nearest();
      const originalPosition = count + logical(position);
      if (position !== originalPosition) {
        rebasing = true;
        track.scrollTo({left:offset(originalPosition), behavior:'instant'});
        requestAnimationFrame(() => {rebasing = false;});
      }
      update();
      announcement.textContent = originals[selected].querySelector('.review-author').textContent;
      moving = false;
      expected = null;
      if (queue.length) {
        const direction = queue.shift();
        requestAnimationFrame(() => step(direction));
      }
    }
    function go(index) {
      moving = true;
      expected = index;
      track.scrollTo({left:offset(index), behavior:reduced.matches ? 'instant' : 'smooth'});
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, reduced.matches ? 30 : 220);
    }
    function step(direction) {
      if (moving) {if (queue.length < 10) queue.push(direction);return;}
      go(nearest() + direction);
    }
    controls.querySelector('[data-review-prev]').addEventListener('click', () => step(-1));
    controls.querySelector('[data-review-next]').addEventListener('click', () => step(1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => {
      queue = [];
      const position = nearest();
      let distance = index - logical(position);
      if (distance > count / 2) distance -= count;
      if (distance < -count / 2) distance += count;
      go(position + distance);
    }));
    track.addEventListener('scroll', () => {
      update();
      if (rebasing) return;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(settle, 140);
    }, {passive:true});
    track.addEventListener('scrollend', settle);
    track.addEventListener('pointerdown', () => {pointerDown = true; queue = []; moving = false; expected = null;});
    track.addEventListener('wheel', () => {queue = []; moving = false; expected = null;}, {passive:true});
    const release = () => {if (pointerDown) {pointerDown = false; clearTimeout(settleTimer); settleTimer = setTimeout(settle, 180);}};
    addEventListener('pointerup', release);
    track.addEventListener('pointercancel', release);
    track.addEventListener('keydown', event => {
      if (event.target !== track) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {event.preventDefault();step(event.key === 'ArrowRight' ? 1 : -1);}
      if (event.key === 'Home' || event.key === 'End') {event.preventDefault();queue = [];go(count + (event.key === 'Home' ? 0 : count - 1));}
    });
    new ResizeObserver(() => {
      if (Math.abs(lastWidth - track.clientWidth) < .5) return;
      lastWidth = track.clientWidth;
      queue = [];moving = false;expected = null;
      track.scrollTo({left:offset(count + selected), behavior:'instant'});
      update();
    }).observe(track);
    track.scrollTo({left:offset(count), behavior:'instant'});
    controls.hidden = false;
    update();
  }

  const header = document.querySelector('.site-header');
  const toggle = header.querySelector('.menu-toggle');
  const navigation = document.getElementById('site-navigation');
  const backdrop = document.querySelector('.menu-backdrop');
  const desktop = matchMedia('(min-width:1280px)');
  const background = [...document.querySelectorAll('main,.site-footer,.analytics-notice,.booking-dock')];
  const previousInert = new Map();
  let expanded = false;
  function setMenu(open, restoreFocus = true) {
    const next = open && !desktop.matches;
    if (!next && navigation.contains(document.activeElement)) toggle.focus({preventScroll:true});
    expanded = next;
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Закрыть меню' : 'Открыть меню');
    toggle.querySelector('.menu-toggle-label').textContent = expanded ? 'Закрыть' : 'Меню';
    header.classList.toggle('menu-expanded', expanded);
    document.documentElement.classList.toggle('menu-is-open', expanded);
    backdrop.hidden = !expanded;
    navigation.inert = !desktop.matches && !expanded;
    navigation.setAttribute('aria-hidden', String(!desktop.matches && !expanded));
    if (expanded) {
      header.setAttribute('role', 'dialog');
      header.setAttribute('aria-modal', 'true');
      header.setAttribute('aria-label', 'Навигация по сайту');
      background.forEach(element => {previousInert.set(element, element.inert); element.inert = true;});
      const focusNavigation = () => {
        if (expanded && !navigation.contains(document.activeElement)) navigation.querySelector('a').focus({preventScroll:true});
      };
      requestAnimationFrame(focusNavigation);
      // A rapid reopen may reverse the closing visibility transition.
      setTimeout(focusNavigation, reduced.matches ? 0 : 240);
    } else {
      header.removeAttribute('role');header.removeAttribute('aria-modal');header.removeAttribute('aria-label');
      previousInert.forEach((inert, element) => {element.inert = inert;});previousInert.clear();
      if (restoreFocus && !desktop.matches) toggle.focus({preventScroll:true});
    }
  }
  toggle.addEventListener('click', () => setMenu(!expanded));
  backdrop.addEventListener('click', () => setMenu(false));
  header.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !expanded) return;
    setMenu(false, false);
    const target = document.getElementById(link.hash.slice(1));
    if (target) {target.setAttribute('tabindex','-1');target.focus({preventScroll:true});}
  });
  document.addEventListener('keydown', event => {
    if (!expanded) return;
    if (event.key === 'Escape') {event.preventDefault();setMenu(false);}
    if (event.key === 'Tab') {
      const focusable = [...header.querySelectorAll('a,button')].filter(e => e.getClientRects().length && !e.inert);
      const index = focusable.indexOf(document.activeElement);
      if (event.shiftKey && index <= 0) {event.preventDefault();focusable.at(-1).focus();}
      else if (!event.shiftKey && index === focusable.length - 1) {event.preventDefault();focusable[0].focus();}
    }
  });
  function headerHeight() {document.documentElement.style.setProperty('--header-height', Math.ceil(header.getBoundingClientRect().height + 12) + 'px');}
  desktop.addEventListener('change', () => {setMenu(false, false);headerHeight();});
  new ResizeObserver(headerHeight).observe(header);
  setMenu(false, false);headerHeight();header.classList.add('nav-ready');

  const navLinks = [...document.querySelectorAll('.navigation-links a:not(.menu-cta)')];
  const sections = navLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function updateNav() {
    const line = innerHeight * .3;
    let active = null;
    sections.forEach(s => {if (s.getBoundingClientRect().top <= line) active = s.id;});
    navLinks.forEach(a => {
      if (a.hash === '#' + active) a.setAttribute('aria-current', 'location');
      else a.removeAttribute('aria-current');
    });
  }
  let ticking = false;
  addEventListener('scroll', () => {if (!ticking) {ticking = true; requestAnimationFrame(() => {updateNav(); updateDock(); ticking = false;});}}, {passive:true});
  updateNav();

  const dock = document.querySelector('.booking-dock');
  const notice = document.getElementById('analytics-notice');
  const menu = document.querySelector('.menu-toggle');
  const contacts = document.getElementById('contacts');
  const footer = document.querySelector('.site-footer');
  function visible(element) {const r = element.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0;}
  function updateDock() {
    if (!dock) return;
    const keyboard = window.visualViewport && visualViewport.height < innerHeight * .75;
    const ctaVisible = [...document.querySelectorAll('main .button-primary')].some(visible);
    dock.hidden = innerWidth > 640 || !notice.hidden || menu.getAttribute('aria-expanded') === 'true' || visible(contacts) || visible(footer) || ctaVisible || keyboard;
  }
  new MutationObserver(updateDock).observe(notice, {attributes:true, attributeFilter:['hidden']});
  new MutationObserver(updateDock).observe(menu, {attributes:true, attributeFilter:['aria-expanded']});
  addEventListener('resize', updateDock);
  if (window.visualViewport) visualViewport.addEventListener('resize', updateDock);
  document.documentElement.classList.add('dock-ready');
  updateDock();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      const children = [...entry.target.querySelectorAll('.bento-cell,.service-item,.contact-card')];
      children.forEach((child, i) => animate(child, [{opacity:.6, transform:`translateY(${entry.target.id === 'about' ? 18 : 10}px)`},{opacity:1, transform:'none'}], {delay:i * 65, duration:450}));
      entry.target.querySelectorAll('.path-step strong').forEach((step, index) => {
        animate(step, [{color:'#9db0c3'}, {color:'#8be4cc', offset:.6}, {color:'#dce8f4'}], {
          delay:300 + index * 150,
          duration:500
        });
      });
    }), {threshold:.12});
    document.querySelectorAll('#about,#services,#contacts').forEach(s => observer.observe(s));
    const flow = document.querySelector('.method-flow');
    const processObserver = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      processObserver.disconnect();
      flow.classList.add('is-revealed');
      [...flow.children].forEach((step, index) => animate(step, [{opacity:.65,transform:'translateY(8px)'},{opacity:1,transform:'none'}], {delay:index*180,duration:350}));
    }, {threshold:.15});
    processObserver.observe(flow);
  }
})();

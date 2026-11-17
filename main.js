// Motion is an enhancement: without this file every section is simply visible.
document.documentElement.classList.add('js');

// Steps for each browser. Only the address and the place of the Developer mode switch differ.
const EDGE_PLACE = 'The switch is in the left panel, near the bottom. In a narrow window, open the menu at the top left first.';

document.addEventListener('DOMContentLoaded', async () => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  // Sound bars: one height per bar, with an even spread of timing.
  $$('[data-bars]').forEach((box) => {
    const count = Number(box.dataset.bars);
    for (let n = 0; n < count; n++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--n', n);
      bar.style.setProperty('--h', (0.28 + 0.72 * Math.abs(Math.sin(n * 1.7) * Math.cos(n * 0.6))).toFixed(2));
      box.append(bar);
    }
  });
  $$('.blocks i').forEach((b, n) => b.style.setProperty('--n', n));

  // How it works: one step at a time. Arrow keys move between the steps (the usual tabs pattern).
  const tabs = [...$$('[role="tab"]')];
  const show = (tab) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      const next = tabs[(to + tabs.length) % tabs.length];
      show(next);
      next.focus();
    });
  });

  // Reveal sections as they scroll into view. Cards keep their pictures moving only while on screen.
  const reveal = $$('[data-reveal]');
  if (calm) {
    reveal.forEach((el) => el.classList.add('in'));
    $$('.card').forEach((el) => el.classList.add('live'));
  } else {
    const once = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');
      once.unobserve(e.target);
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveal.forEach((el) => once.observe(el));
    const live = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle('live', e.isIntersecting)));
    $$('.card, .hero').forEach((el) => live.observe(el));
  }

  // Browser choice: switches the address and the place of the switch in the steps.
  const pick = (id) => {
    $$('[data-browser]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.browser === id)));
    $('#addr').textContent = `${id}://extensions`;
    $('#dev-place').textContent = id === 'edge' ? EDGE_PLACE : 'The switch is at the top right.';
  };
  $$('[data-browser]').forEach((b) => b.addEventListener('click', () => pick(b.dataset.browser)));

  // Browsers do not allow links to their own settings pages, so offer a copy button instead.
  $$('.copy').forEach((button) => button.addEventListener('click', async () => {
    const text = $(button.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = 'Copied';
    } catch {
      getSelection().selectAllChildren($(button.dataset.copy)); // copying was refused, so select it for Ctrl+C
      button.textContent = 'Press Ctrl+C';
    }
    setTimeout(() => (button.textContent = 'Copy'), 1800);
  }));

  // Learn More: opens on hover and keyboard focus through CSS. This adds tap to open and Esc to close.
  const wrap = $('.tip-wrap');
  const learn = $('.learn');
  const setOpen = (open) => {
    wrap.classList.toggle('open', open);
    learn.setAttribute('aria-expanded', String(open));
  };
  // Open downward when there is no room between the navigation bar and the card.
  const place = () => wrap.classList.toggle('below', wrap.closest('.note').getBoundingClientRect().top < $('.tip').offsetHeight + 96);
  ['pointerenter', 'focusin', 'click'].forEach((type) => wrap.addEventListener(type, place, true));
  learn.addEventListener('click', () => {
    wrap.classList.remove('closed');
    setOpen(!wrap.classList.contains('open'));
  });
  document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    setOpen(false);
    wrap.classList.add('closed');
  });
  wrap.addEventListener('pointerleave', () => wrap.classList.remove('closed'));
  learn.addEventListener('blur', () => wrap.classList.remove('closed'));

  // Close the mobile menu after choosing a section.
  $$('.menu-panel a').forEach((a) => a.addEventListener('click', () => a.closest('details')?.removeAttribute('open')));

  // Point the main button at the visitor's own browser.
  const ua = navigator.userAgent;
  const mobile = /Android|iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua));
  if (mobile) {
    $('#hero-meta').textContent = 'Reclux runs on desktop computers. Open this page on a computer to add it.';
    return;
  }
  // The Chrome tab stays the default. Firefox visitors land on their card.
  $('#hero-cta').href = /Firefox\//.test(ua) ? '#download-firefox' : '#download-chromium';
});

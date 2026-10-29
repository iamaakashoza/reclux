// Motion is an enhancement: without this file every section is simply visible.
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal sections and draw the hairline illustrations as they scroll into view.
  const targets = document.querySelectorAll('[data-reveal], .draw');
  const finish = (el) => { if (el.classList.contains('draw')) setTimeout(() => el.classList.add('done'), calm ? 0 : 1500); };
  if (calm || !('IntersectionObserver' in window)) {
    targets.forEach((el) => { el.classList.add('in'); finish(el); });
  } else {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        finish(e.target);
        io.unobserve(e.target);
      }),
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    targets.forEach((el) => io.observe(el));
  }

  // The hero timer counts up like a real recording.
  const timer = document.getElementById('hero-timer');
  if (timer && !calm) {
    let s = 12 * 60 + 48;
    const pad = (n) => String(n).padStart(2, '0');
    setInterval(() => {
      s++;
      timer.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    }, 1000);
  }

  // The installer is for Windows desktops. Say so to everyone else instead of letting them download it.
  const ua = navigator.userAgent;
  const note = document.getElementById('os-note');
  if (note && !/Windows NT/.test(ua)) {
    note.hidden = false;
    note.textContent = /Android|iPhone|iPad|iPod/.test(ua) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua))
      ? 'Reclux runs on desktop computers. Open this page on a Windows PC to install it.'
      : 'The setup file is for Windows. On Mac or Linux, the extension can be built from the source code on GitHub.';
  }

  // Close the mobile menu after choosing a section.
  document.querySelectorAll('.menu-panel a').forEach((a) =>
    a.addEventListener('click', () => a.closest('details')?.removeAttribute('open')),
  );
});

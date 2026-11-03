// Motion is an enhancement: without this file every section is simply visible.
document.documentElement.classList.add('js');

// Hero light: beams at the same 45 degrees as the leg of the R in the logo, spreading from the record dot.
const FRAGMENT = `
precision mediump float;
uniform vec2 res;
uniform float t;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float noise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(hash(vec2(i, 1.0)), hash(vec2(i + 1.0, 1.0)), f); }
void main() {
  vec2 p = (gl_FragCoord.xy - res * vec2(0.5, 0.42)) / res.y;
  float across = (p.x + p.y) * 0.7071;
  float along = (p.x - p.y) * 0.7071;
  float beams = noise(across * 7.0 + t * 0.11) * 0.62 + noise(across * 19.0 - t * 0.17) * 0.28 + noise(across * 47.0 + t * 0.23) * 0.1;
  beams = smoothstep(0.36, 0.86, beams);
  float reach = exp(-abs(along) * 2.3) * exp(-abs(across) * 1.9);
  float core = exp(-dot(p, p) * 9.0) * 0.34;
  float light = beams * reach * 1.15 + core * 1.05;
  light *= 0.86 + 0.14 * sin(t * 0.35);
  vec3 color = mix(vec3(0.039, 0.039, 0.047), vec3(0.84, 0.15, 0.24), clamp(light, 0.0, 1.0));
  color += vec3(0.95, 0.42, 0.42) * pow(clamp(light - 0.72, 0.0, 1.0), 2.0) * 1.1;
  float grain = hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5;
  gl_FragColor = vec4(color + grain * (0.035 + light * 0.11), 1.0);
}`;

function startLight(canvas, calm) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return; // the CSS glow behind the canvas stays
  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'a');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const res = gl.getUniformLocation(program, 'res');
  const time = gl.getUniformLocation(program, 't');

  const draw = (now) => {
    const scale = 0.7; // soft light does not need full resolution, and this keeps weak PCs cool
    const w = Math.round(canvas.clientWidth * scale);
    const h = Math.round(canvas.clientHeight * scale);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    gl.uniform2f(res, w, h);
    gl.uniform1f(time, 40 + now / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  canvas.classList.add('on');
  if (calm) {
    draw(0);
    addEventListener('resize', () => draw(0));
    return;
  }
  // 30 frames a second, and only while the hero is on screen and the tab is visible.
  let visible = true;
  let last = 0;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);
  const loop = (now) => {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || now - last < 33) return;
    last = now;
    draw(now);
  };
  requestAnimationFrame(loop);
}

// Steps for each browser. Only the address and the place of the Developer mode switch differ.
const BROWSERS = {
  chrome: { name: 'Chrome', address: 'chrome://extensions', place: 'The switch is at the top right.' },
  edge: { name: 'Edge', address: 'edge://extensions', place: 'The switch is in the left panel, near the bottom. In a narrow window, open the menu at the top left first.' },
  brave: { name: 'Brave', address: 'brave://extensions', place: 'The switch is at the top right.' },
  opera: { name: 'Opera', address: 'opera://extensions', place: 'The switch is at the top right.' },
};

document.addEventListener('DOMContentLoaded', async () => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => document.querySelectorAll(s);

  const light = $('#light');
  if (light) startLight(light, calm);

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

  // Reveal sections as they scroll into view. Cards keep their pictures moving only while on screen.
  const reveal = $$('[data-reveal]');
  if (calm || !('IntersectionObserver' in window)) {
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

  // The hero timer counts up like a real recording.
  const timer = $('#hero-timer');
  if (timer && !calm) {
    let s = 12 * 60 + 48;
    const pad = (n) => String(n).padStart(2, '0');
    setInterval(() => {
      s++;
      timer.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    }, 1000);
  }

  // A soft light follows the pointer across a card.
  $$('.card').forEach((card) => card.addEventListener('pointermove', (e) => {
    const box = card.getBoundingClientRect();
    card.style.setProperty('--x', `${e.clientX - box.left}px`);
    card.style.setProperty('--y', `${e.clientY - box.top}px`);
  }));

  // Browser choice: switches the address and the place of the switch in the steps.
  const pick = (id) => {
    $$('[data-browser]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.browser === id)));
    $('#addr').textContent = BROWSERS[id].address;
    $('#dev-place').textContent = BROWSERS[id].place;
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
  const brave = await navigator.brave?.isBrave?.().catch(() => false);
  const firefox = /Firefox\//.test(ua);
  const id = /OPR\//.test(ua) ? 'opera' : /Edg\//.test(ua) ? 'edge' : brave ? 'brave' : 'chrome';
  $('#hero-cta-text').textContent = `Get Reclux for ${firefox ? 'Firefox' : BROWSERS[id].name}`;
  $('#hero-cta').href = firefox ? '#download-firefox' : '#download-chromium';
  if (!firefox) pick(id);
});

// 旺來開運所 · 視覺與互動層（不碰命理邏輯）
(function () {
  'use strict';
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BR = '子丑寅卯辰巳午未申酉戌亥';

  // ---------- 星盤 SVG（程式生成：360 刻度、十二地支、廿四節點、星芒） ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function astrolabe(svg, opt) {
    opt = Object.assign({ R: 180, branches: true }, opt || {});
    const R = opt.R;
    svg.setAttribute('viewBox', [-R - 30, -R - 30, 2 * R + 60, 2 * R + 60].join(' '));
    const rings = el('g', { class: 'ax-rings' }, svg);
    [[R + 16, .45], [R, .85], [R - 34, .32], [R - 76, .6], [R - 82, .22]].forEach(([r, o]) =>
      el('circle', { r, fill: 'none', stroke: 'currentColor', 'stroke-opacity': o, 'stroke-width': 1 }, rings));
    const ticks = el('g', { class: 'ax-ticks' }, svg);
    let d = '', d2 = '', d3 = '';
    for (let i = 0; i < 360; i++) {
      const a = i * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
      const l = i % 30 === 0 ? 13 : i % 6 === 0 ? 8 : 4;
      const seg = 'M' + (R * c).toFixed(2) + ' ' + (R * s).toFixed(2) + 'L' + ((R - l) * c).toFixed(2) + ' ' + ((R - l) * s).toFixed(2);
      if (i % 30 === 0) d += seg; else if (i % 6 === 0) d2 += seg; else d3 += seg;
    }
    el('path', { d, stroke: 'currentColor', 'stroke-width': 1.8 }, ticks);
    el('path', { d: d2, stroke: 'currentColor', 'stroke-opacity': .6, 'stroke-width': 1 }, ticks);
    el('path', { d: d3, stroke: 'currentColor', 'stroke-opacity': .28, 'stroke-width': .8 }, ticks);
    for (let i = 0; i < 24; i++) {
      const a = i * 15 * Math.PI / 180, r = R + 16, big = i % 2 === 0, k = big ? 4 : 2.4;
      const x = r * Math.cos(a), y = r * Math.sin(a);
      el('path', { d: `M${x} ${y - k}L${x + k} ${y}L${x} ${y + k}L${x - k} ${y}Z`, fill: 'currentColor', 'fill-opacity': big ? .9 : .5 }, ticks);
    }
    const band = el('g', { class: 'ax-band' }, svg);
    const rb = R - 55;
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180, a2 = (i * 30 - 75) * Math.PI / 180;
      el('line', { x1: (R - 34) * Math.cos(a2), y1: (R - 34) * Math.sin(a2), x2: (R - 76) * Math.cos(a2), y2: (R - 76) * Math.sin(a2), stroke: 'currentColor', 'stroke-opacity': .4 }, band);
      if (opt.branches) {
        const t = el('text', { x: rb * Math.cos(a), y: rb * Math.sin(a), class: 'ax-br', 'text-anchor': 'middle', 'dominant-baseline': 'central' }, band);
        t.textContent = BR[i];
        t.style.setProperty('--i', i);
      }
    }
    const star = el('g', { class: 'ax-star' }, svg);
    const rin = R - 90, pts = [];
    for (let i = 0; i < 12; i++) { const a = (i * 30 - 90) * Math.PI / 180; pts.push([rin * Math.cos(a), rin * Math.sin(a)]); }
    let sd = '';
    for (let i = 0; i < 12; i++) { const p = pts[i], q = pts[(i + 5) % 12]; sd += `M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`; }
    el('path', { d: sd, stroke: 'currentColor', 'stroke-opacity': .16, 'stroke-width': .8 }, star);
    return svg;
  }

  // ---------- 品牌章：以「旺」印取代 emoji ----------
  const seal = $('.site-title .seal');
  if (seal) { seal.textContent = '旺'; seal.classList.add('seal-wang'); }
  const sub = $('.site-sub'); if (sub) sub.remove();

  // ---------- 首頁 Hero 星盤 ----------
  const hero = $('.home-hero');
  if (hero && !$('.hero-astro')) {
    const box = document.createElement('div');
    box.className = 'hero-astro'; box.setAttribute('aria-hidden', 'true');
    box.innerHTML = '<svg class="astro"></svg><div class="hero-seal"><span>旺</span></div><i class="hero-ripple"></i>';
    hero.insertBefore(box, hero.firstChild);
    astrolabe(box.querySelector('svg'), { R: 180 });
  }
  const lead = $('.home-lead');
  if (lead && !$('.hero-cta')) {
    const b = document.createElement('button');
    b.className = 'btn-gold hero-cta'; b.type = 'button'; b.innerHTML = '開始問命 <b>→</b>';
    b.addEventListener('click', () => { const s = $('#btn-start'); if (s) s.click(); });
    lead.after(b);
  }
  const eb = $('.home-eyebrow');
  if (eb) eb.innerHTML = '<span></span>2026 丙午・下半年運勢<span></span>';

  // ---------- 算命儀式（載入畫面） ----------
  const comp = $('#screen-loading .compass');
  if (comp) {
    comp.innerHTML = '<svg class="astro"></svg><div class="hero-seal small"><span>旺</span></div>';
    astrolabe(comp.querySelector('svg'), { R: 180 });
    comp.classList.add('compass-v3');
    const steps = document.createElement('ol');
    steps.className = 'load-steps';
    steps.innerHTML = ['排八字四柱', '安紫微十四主星', '推三才五格', '對照星象行運', '合參十二門'].map(s => '<li><i></i>' + s + '</li>').join('');
    comp.parentNode.appendChild(steps);
  }
  // 載入時依序點亮步驟
  let stepTimer = null;
  function runSteps() {
    const li = $$('.load-steps li');
    li.forEach(x => x.classList.remove('done', 'on'));
    let i = 0; clearInterval(stepTimer);
    const quick = /調出你的命盤/.test(($('#load-line') || {}).textContent || '');
    const gap = quick ? 260 : 1250;
    const tick = () => {
      if (i > 0 && li[i - 1]) { li[i - 1].classList.remove('on'); li[i - 1].classList.add('done'); }
      if (li[i]) li[i].classList.add('on');
      i++;
      if (i > li.length) clearInterval(stepTimer);
    };
    tick(); stepTimer = setInterval(tick, gap);
  }

  // ---------- 畫面切換：精簡頁首、觸發動畫 ----------
  function onScreen() {
    const act = $('.screen.active');
    const id = act ? act.id : '';
    document.body.dataset.screen = id.replace('screen-', '');
    if (id === 'screen-loading') runSteps(); else clearInterval(stepTimer);
    if (id === 'screen-result') { setTimeout(buildNav, 60); setTimeout(resultFx, 80); }
    scanReveal();
  }
  let lastScreen = null;
  const mo = new MutationObserver(() => { const a = $('.screen.active'); const id = a ? a.id : ''; if (id !== lastScreen) { lastScreen = id; onScreen(); } });
  $$('.screen').forEach(s => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));

  // ---------- 捲動顯現 ----------
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .08 }) : null;
  const RV_SEL = '.sys-tile, .home-cta, .home-stats, .privacy-line, .explain, .r-section, .sys-card, .form-card, .lk-row, .dw-row, .promo-box';
  function scanReveal() {
    if (!io || RM) return;
    $$(RV_SEL).forEach((n, k) => {
      if (n.dataset.rv) return;
      n.dataset.rv = '1';
      if (n.classList.contains('sys-tile')) n.style.setProperty('--d', ([...n.parentNode.children].indexOf(n) % 12) * 45 + 'ms');
      if (n.classList.contains('dw-row') || n.classList.contains('lk-row')) n.style.setProperty('--d', ([...n.parentNode.children].indexOf(n)) * 60 + 'ms');
      io.observe(n);
    });
  }
  const res = $('#screen-result');
  if (res) new MutationObserver(() => { clearTimeout(res._t); res._t = setTimeout(scanReveal, 50); }).observe(res, { childList: true, subtree: true });

  // ---------- 結果頁：分數跳動、曲線點序 ----------
  function countUp(node, to, dur) {
    if (RM || !node) return;
    const t0 = performance.now();
    const tn = [...node.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!tn) return;
    const step = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); tn.textContent = Math.round(to * e); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }
  function resultFx() {
    const ds = $('.daily-score');
    if (ds) { const v = parseInt(ds.textContent, 10); if (v) countUp(ds, v, 1400); }
    $$('.mc-pt').forEach(g => g.style.setProperty('--k', g.dataset.i || 0));
    // 開運色色票
    const SW = [['深藍', '#1f3a68'], ['黑', '#111'], ['綠', '#3d7a4a'], ['青', '#2f7f7a'], ['紅', '#c8361f'], ['橘', '#e0822f'], ['黃', '#d9b23a'], ['米', '#e8dcc0'], ['白', '#f2efe8'], ['金', '#c9a45c'], ['銀', '#c0c0c0']];
    const sw = txt => { const out = [], seen = new Set(); txt.split(/[、，,]/).forEach(w => { const m = SW.find(([k]) => w.includes(k)); if (m && !seen.has(m[1])) { seen.add(m[1]); out.push(m[1]); } }); return out.map(c => '<i class="swatch" style="--c:' + c + '"></i>').join(''); };
    $$('.lk-row').forEach(r => { const k = r.querySelector('.lk-k'); const v = r.querySelector('.lk-v'); if (k && v && k.textContent === '開運色' && !v.querySelector('.swatch')) v.insertAdjacentHTML('afterbegin', '<span class="swatches">' + sw(v.firstChild.textContent) + '</span>'); });
  }

  // ---------- 結果頁：章節導覽（sticky chips + scroll-spy） ----------
  function buildNav() {
    const r = $('#screen-result');
    if (!r) return;
    let nav = $('#r-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.id = 'r-nav'; nav.setAttribute('aria-label', '結果章節');
      r.insertBefore(nav, r.children[1] || null);
    }
    const secs = [];
    const add = (node, label) => { if (node && label && getComputedStyle(node).display !== 'none') { if (!node.id) node.id = 'sec-' + secs.length; secs.push([node, label]); } };
    add($('.daily-box'), '今日');
    $$('#screen-result > .r-section').forEach(s => {
      const h = s.querySelector('h2'); if (!h || s.classList.contains('daily-box')) return;
      const t = (h.childNodes[0] ? h.childNodes[0].textContent : h.textContent).replace(/[．·].*$/, '').replace('逐月運勢曲線', '逐月').replace('下半年五運總覽', '五運').replace('命理總論', '總論')
        .replace('2026 下半年', '逐月').replace('參考書目與演算依據', '書目').replace('開運處方箋', '處方').replace('AI 命理師', 'AI');
      if (/性格側寫/.test(t)) return;
      if (s.id === 'r-head') return;
      add(s, t.slice(0, 4));
    });
    const KW = [['星座', '星座'], ['生肖', '生肖'], ['靈數', '靈數'], ['生日', '生日'], ['姓名', '姓名'], ['八字', '八字'], ['紫微', '紫微'], ['人類圖', '人類圖'], ['塔羅', '塔羅'], ['血型', '血型']];
    $$('#r-cards .sys-card').forEach(c => { const h = c.querySelector('h3'); if (!h) return; const t = h.textContent; const k = KW.find(([w]) => t.includes(w)); add(c, k ? k[1] : t.slice(0, 3)); });
    // 依頁面位置排序
    secs.sort((a, b) => a[0].getBoundingClientRect().top - b[0].getBoundingClientRect().top);
    nav.innerHTML = '<div class="rn-track">' + secs.map(([n, l]) => '<a href="#' + n.id + '">' + l + '</a>').join('') + '</div>';
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => {
      ev.preventDefault();
      const t = document.getElementById(a.getAttribute('href').slice(1));
      const y = t.getBoundingClientRect().top + window.scrollY - nav.offsetHeight - 10;
      window.scrollTo({ top: y, behavior: RM ? 'auto' : 'smooth' });
    }));
    spy(nav, secs);
  }
  function spy(nav, secs) {
    const links = [...nav.querySelectorAll('a')];
    const on = () => {
      const y = nav.offsetHeight + 40;
      let k = 0;
      secs.forEach(([n], i) => { if (n.getBoundingClientRect().top <= y) k = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === k));
      const a = links[k];
      if (a && nav._last !== k) {
        nav._last = k;
        const tr = nav.firstChild;
        if (tr.scrollTo) tr.scrollTo({ left: a.offsetLeft - tr.clientWidth / 2 + a.offsetWidth / 2, behavior: RM ? 'auto' : 'smooth' });
      }
      nav.classList.toggle('stuck', nav.getBoundingClientRect().top <= 1);
    };
    window.removeEventListener('scroll', window.__rnSpy || (() => {}));
    window.__rnSpy = () => { if (!spy._raf) spy._raf = requestAnimationFrame(() => { spy._raf = 0; on(); }); };
    window.addEventListener('scroll', window.__rnSpy, { passive: true });
    on();
  }

  // ---------- 十二門磚：游標光暈 ----------
  $$('.sys-tile').forEach(t => {
    t.addEventListener('pointermove', e => {
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px'); t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // ---------- 金色按鈕：按下漣漪 ----------
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.btn-gold, .btn-ghost');
    if (!b || RM) return;
    const r = b.getBoundingClientRect(), s = document.createElement('i');
    s.className = 'btn-ink'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
    b.appendChild(s); setTimeout(() => s.remove(), 700);
  });

  // 結果頁動作鈕：線性圖示取代 emoji
  const IC = {
    'btn-share': '<path d="M15 8a3 3 0 1 0-2.8-4M9 12l6 3.5M9 12l6-3.5"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="18" r="3"/><circle cx="18" cy="6" r="3"/>',
    'btn-image': '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    'btn-compact': '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    'btn-friend': '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><path d="M16 5.5a3 3 0 0 1 0 5.6M18 15c1.9.6 3.1 2.2 3.4 4.6"/>',
    'btn-redo': '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v5h5"/>',
    'btn-print': '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>'
  };
  Object.keys(IC).forEach(id => {
    const b = document.getElementById(id); if (!b) return;
    const label = b.textContent.replace(/^[^\u4e00-\u9fff]+/, '').trim();
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[id] + '</svg><span>' + label + '</span>';
  });
  const shareB = document.getElementById('btn-share'); if (shareB) { shareB.classList.remove('btn-ghost'); shareB.classList.add('btn-gold'); }

  // 表單進度線
  const prog = $('.progress');
  if (prog) {
    const upd = () => { const n = prog.querySelectorAll('.progress-dot.on').length; prog.style.setProperty('--p', Math.max(0, n - 1) * 94 + 'px'); };
    new MutationObserver(upd).observe(prog, { subtree: true, attributes: true, attributeFilter: ['class'] }); upd();
  }

  document.body.classList.add('fx-ready');
  lastScreen = ($('.screen.active') || {}).id; onScreen();
})();

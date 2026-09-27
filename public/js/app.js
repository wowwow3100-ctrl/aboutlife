// ============ 旺來開運所．介面流程 ============
(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  // ---------- 訪客統計 ----------
  function getVid() {
    let v = localStorage.getItem('xj_vid');
    if (!v) { v = 'v' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('xj_vid', v); }
    return v;
  }
  function localCount() {
    const n = (parseInt(localStorage.getItem('xj_local_views') || '0', 10) + 1);
    localStorage.setItem('xj_local_views', String(n));
    return n;
  }
  // 線上人數呈現：真實心跳數 + 本次瀏覽隨機加成 1~3，最低顯示 2
  function onlineBoost() {
    let b = parseInt(sessionStorage.getItem('xj_boost') || '0', 10);
    if (!b) { b = 1 + Math.floor(Math.random() * 3); sessionStorage.setItem('xj_boost', String(b)); }
    return b;
  }
  function shownOnline(real) { return Math.max(2, (real || 0) + onlineBoost()); }
  function renderCounter(total, todayV, real) {
    $('#visit-counter').innerHTML = '<div class="stat"><b>' + total.toLocaleString() + '</b><span>香客足跡</span></div>' +
      '<div class="stat"><b><span class="online-dot"></span>' + shownOnline(real) + '</b><span>此刻線上</span></div>';
  }
  async function pingVisit() {
    const ln = localCount();
    try {
      const r = await fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: getVid() }) });
      const j = await r.json();
      const s = await (await fetch('/api/stats')).json();
      renderCounter(j.total, s.today.v, j.online);
      // 心跳：每 25 秒回報在線並更新人數
      setInterval(async () => {
        try {
          const p = await (await fetch('/api/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: getVid() }) })).json();
          const s2 = await (await fetch('/api/stats')).json();
          renderCounter(s2.total, s2.today.v, p.online);
        } catch (e) {}
      }, 25000);
    } catch (e) {
      $('#visit-counter').innerHTML = '<div class="stat"><b>' + ln + '</b><span>本機瀏覽</span></div><div class="stat"><b><span class="online-dot"></span>' + shownOnline(0) + '</b><span>此刻線上</span></div>';
    }
  }

  // ---------- 表單狀態 ----------
  const state = { step: 0, name: '', gender: '祕密', y: 1990, m: 1, d: 1, hourIdx: null, lateZi: false, blood: '不知道', focus: 'overall', strokes: [] };

  const HOUR_OPTS = [
    { v: 'x', t: '不知道／不填（略過時柱）' },
    { v: '0', t: '早子時 00:00–00:59' }, { v: '1', t: '丑時 01:00–02:59' }, { v: '2', t: '寅時 03:00–04:59' },
    { v: '3', t: '卯時 05:00–06:59' }, { v: '4', t: '辰時 07:00–08:59' }, { v: '5', t: '巳時 09:00–10:59' },
    { v: '6', t: '午時 11:00–12:59' }, { v: '7', t: '未時 13:00–14:59' }, { v: '8', t: '申時 15:00–16:59' },
    { v: '9', t: '酉時 17:00–18:59' }, { v: '10', t: '戌時 19:00–20:59' }, { v: '11', t: '亥時 21:00–22:59' },
    { v: '0L', t: '晚子時 23:00–23:59' }
  ];

  // ---------- 畫面切換 ----------
  function show(id) {
    $$('.screen').forEach(el => el.classList.remove('active'));
    $(id).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- 表單初始化 ----------
  function initForm() {
    const ySel = $('#f-year'), mSel = $('#f-month'), dSel = $('#f-day'), hSel = $('#f-hour');
    for (let y = 2026; y >= 1924; y--) ySel.add(new Option(y + ' 年（民國' + (y - 1911 > 0 ? y - 1911 : '前' + (1912 - y)) + '年）', y));
    for (let m = 1; m <= 12; m++) mSel.add(new Option(m + ' 月', m));
    ySel.value = '1990';
    function fillDays() {
      const y = +ySel.value, m = +mSel.value, dim = new Date(y, m, 0).getDate(), cur = +dSel.value || 1;
      dSel.innerHTML = '';
      for (let d = 1; d <= dim; d++) dSel.add(new Option(d + ' 日', d));
      dSel.value = Math.min(cur, dim);
    }
    ySel.onchange = fillDays; mSel.onchange = fillDays; fillDays();
    for (const o of HOUR_OPTS) hSel.add(new Option(o.t, o.v));

    // 姓名 → 筆畫確認
    $('#f-name').addEventListener('input', renderStrokeEditor);
    $$('input[name="f-gender"]').forEach(r => r.onchange = e => state.gender = e.target.value);
    $$('input[name="f-blood"]').forEach(r => r.onchange = e => state.blood = e.target.value);
    $$('.focus-chip').forEach(c => c.onclick = () => {
      $$('.focus-chip').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      state.focus = c.dataset.v;
    });
  }

  function renderStrokeEditor() {
    const name = $('#f-name').value.trim();
    const box = $('#stroke-editor');
    if (!/^[㐀-鿿]{2,6}$/.test(name)) { box.innerHTML = ''; box.classList.remove('open'); return; }
    const { surname, given } = splitName(name);
    let html = '<div class="stroke-title">筆畫確認 <span>（康熙字典筆畫，流派不同可自行微調）</span></div><div class="stroke-row">';
    [...name].forEach((ch, i) => {
      const s = strokeOf(ch);
      html += '<div class="stroke-cell"><div class="stroke-ch">' + ch + '</div>' +
        '<input type="number" min="1" max="64" class="stroke-in" data-i="' + i + '" value="' + (s || '') + '" placeholder="?">' +
        (s ? '' : '<div class="stroke-warn">查無此字，請填筆畫</div>') + '</div>';
    });
    html += '</div><div class="stroke-hint">姓「' + surname + '」／名「' + given + '」</div>';
    box.innerHTML = html; box.classList.add('open');
  }

  // ---------- 步驟控制 ----------
  function gotoStep(n) {
    state.step = n;
    $$('.form-step').forEach((el, i) => el.classList.toggle('active', i === n));
    $$('.progress-dot').forEach((el, i) => el.classList.toggle('on', i <= n));
    $('#btn-prev').style.visibility = n === 0 ? 'hidden' : 'visible';
    $('#btn-next').textContent = n === 2 ? '開始排盤 ✦' : '下一步';
  }
  function validateStep() {
    if (state.step === 0) {
      const name = $('#f-name').value.trim();
      if (!name) { state.name = ''; state.strokes = []; return true; } // 姓名選填，不填則略過姓名學
      if (!/^[㐀-鿿]{2,6}$/.test(name)) { toast('姓名請輸入 2–6 個中文字，或留空略過姓名學'); return false; }
      const ins = [...$$('.stroke-in')];
      const strokes = ins.map(x => parseInt(x.value, 10));
      if (strokes.some(v => !v || v < 1 || v > 64)) { toast('有字查無筆畫，請手動填寫'); return false; }
      state.name = name; state.strokes = strokes;
      return true;
    }
    if (state.step === 1) {
      state.y = +$('#f-year').value; state.m = +$('#f-month').value; state.d = +$('#f-day').value;
      const hv = $('#f-hour').value;
      state.hourIdx = hv === 'x' ? null : parseInt(hv, 10);
      state.lateZi = hv === '0L';
      if (hv === '0L') state.hourIdx = 0;
      return true;
    }
    return true;
  }
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2400);
  }

  // ---------- 排盤 ----------
  const LOAD_LINES = ['正在焚香淨手…', '推算生辰節氣…', '換算農曆生辰…', '排列三才五格…', '對照八十一數理…', '安紫微十四主星…', '推算太陽閘門…', '觀星測影，推演流年…', '天機將現，請稍候…'];
  function startAnalyze(quick) {
    show('#screen-loading');
    let i = 0;
    $('#load-line').textContent = quick ? '調出你的命盤，推算今日流日…' : LOAD_LINES[0];
    const iv = setInterval(() => { i = (i + 1) % LOAD_LINES.length; $('#load-line').textContent = LOAD_LINES[i]; }, 820);
    setTimeout(() => { clearInterval(iv); renderResult(); show('#screen-result'); }, quick ? 2200 : 7000);
  }

  // ---------- 結果組裝 ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function honor() { return state.gender === '男' ? '先生' : state.gender === '女' ? '小姐' : '緣主'; }
  const ASPECT_NAME = { wealth: '財運', love: '愛情', career: '事業', health: '健康', social: '貴人' };
  let lastResult = null;

  // ---------- 複製 / 分享 ----------
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    const ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  function doShare() {
    const url = siteUrl();
    let text = '旺來開運所．線上命理分析｜星座×生肖×姓名學×生命靈數×八字五行，一次看懂 2026 下半年財運、愛情、事業！';
    if (lastResult) text = '我在「旺來開運所」測了 2026 下半年運勢，' + lastResult.bestName + '拿了 ' + lastResult.bestScore + ' 分！你也來算算～';
    if (navigator.share) {
      navigator.share({ title: '旺來開運所．線上命理分析', text, url }).catch(() => {});
    } else {
      copyText(text + '\n' + url).then(() => toast('分享文字已複製，貼給朋友吧！'));
    }
  }

  function renderResult() {
    const { name, y, m, d, hourIdx, lateZi, blood } = state;
    const hasName = !!name;
    const dispName = hasName ? name : '有緣人';
    const { surname, given } = hasName ? splitName(name) : { surname: '', given: '' };
    const zodiacKey = getZodiac(m, d);
    const Z = ZODIAC[zodiacKey];
    const sx = getShengxiao(y, m, d, hourIdx == null ? 12 : (hourIdx === 0 && lateZi ? 23 : (hourIdx === 0 ? 0 : hourIdx * 2 - 1)), 30);
    const SX = SHENGXIAO[sx.animal];
    const lp = lifePath(y, m, d);
    const py = personalYear(m, d, 2026);
    const grids = hasName ? fiveGrids(surname, given, state.strokes) : null;
    const baziRes = bazi(y, m, d, hourIdx, lateZi);
    // 以古籍法（藏干＋月令加權、調候）取代簡易身強弱與喜用
    const bd = baziDeep(baziRes, y, m, d, hourIdx, lateZi, state.gender);
    baziRes.strong = bd.strong;
    baziRes.favorable = bd.fav;
    const seedStr = name + '|' + y + '-' + m + '-' + d;
    const profile = { name, y, m, d, zodiacKey, animal: sx.animal, lp, grids, baziRes, hourIdx, blood, seedStr };
    const scores = computeScores(profile);
    const lucky = luckyPrescription(profile);
    const months = monthlyFortune(seedStr, baziRes.pillars.year.zhi, baziRes.favorable, sx.animal, Z.h2.lucky.month);
    const tarot = tarotDraw(seedStr);
    const lun = solar2lunar(y, m, d);
    const zw = ziwei(lun, hourIdx);
    const zd = ziweiDeep(zw, lun, hourIdx);
    const hd = sunGate(y, m, d, hourIdx == null ? null : (hourIdx === 0 && lateZi ? 23 : (hourIdx === 0 ? 0 : hourIdx * 2 - 1)));

    // 頭牌
    $('#r-head').innerHTML =
      '<div class="r-name">' + esc(dispName) + (hasName ? ' ' + honor() : '') + '</div>' +
      '<div class="r-meta">' +
      '<span>國曆 ' + y + ' 年 ' + m + ' 月 ' + d + ' 日</span>' +
      '<span>' + Z.icon + ' ' + Z.name + '</span>' +
      '<span>' + SX.icon + ' 屬' + sx.animal + '（' + SX.rel + '）</span>' +
      '<span>靈數 ' + (lp.master ? lp.master + '/' + lp.final : lp.final) + '</span>' +
      '<span>日主 ' + baziRes.dayMaster + GAN_ELEM[baziRes.dayMaster] + '</span>' +
      '</div>';

    // 綜合分數
    const focusMap = { money: 'wealth', love: 'love', career: 'career', health: 'health', overall: null };
    const focusKey = focusMap[state.focus] || null;
    const order = Object.keys(ASPECT_NAME).sort((a, b) => (a === focusKey ? -1 : b === focusKey ? 1 : scores[b] - scores[a]));
    let bars = '';
    for (const k of order) {
      const v = scores[k];
      const star = '★'.repeat(Math.max(2, Math.round(v / 20))) + '☆'.repeat(5 - Math.max(2, Math.round(v / 20)));
      bars += '<div class="score-row' + (k === focusKey ? ' focus' : '') + '"><div class="score-label">' + ASPECT_NAME[k] + (k === focusKey ? '<em>最關注</em>' : '') + '</div>' +
        '<div class="score-bar"><div class="score-fill" style="width:' + v + '%"></div></div>' +
        '<div class="score-val">' + v + '<span class="score-star">' + star + '</span></div></div>';
    }
    const best = order.reduce((a, b) => scores[a] >= scores[b] ? a : b);
    $('#r-scores').innerHTML = bars;

    // 下半年總論
    const relNote = SX.relLevel >= 2 ? '生肖逢' + SX.rel + '，貴人明現、乘勢而上' :
      SX.relLevel <= -2 ? '生肖' + SX.rel + '，變動中藏轉機，宜穩不宜躁' :
        SX.relLevel === 1 ? '生肖得比旺之力，氣勢正盛' :
          SX.relLevel === -1 ? '生肖逢' + SX.rel + '，凡事白紙黑字、少口舌' : '生肖平順，走實力運';
    $('#r-summary').innerHTML =
      '<p><b>' + esc(hasName ? given : '有緣人') + '</b>' + (hasName ? honor() : '') + '，你的生命靈數為 <b>' + (lp.master ? lp.master + '（卓越數）' : lp.final) + ' 號</b>——' + NUMEROLOGY[lp.master || lp.final].key + '；2026 流年數 <b>' + py + '</b>，' + PERSONAL_YEAR[py] + '</p>' +
      '<p>丙午馬年下半年，' + relNote + '。五大運勢中以「<b>' + ASPECT_NAME[best] + '</b>」最為突出（' + scores[best] + ' 分），' + Z.name + '的你' + Z.h2.overall + '</p>' +
      '<p class="r-focus-tip">你最想了解的「' + ($('.focus-chip.sel') ? $('.focus-chip.sel').textContent.trim() : '整體') + '」詳解，已為你排在下方各單元之首。</p>';

    // 性格側寫．處事風格（每條先列依據、再下結論）
    const yGZname = GAN[baziRes.pillars.year.gan] + ZHI[baziRes.pillars.year.zhi];
    const zhiCh = ZHI[baziRes.pillars.year.zhi];
    // 靈數計算過程
    const dstr = String(y) + String(m).padStart(2, '0') + String(d).padStart(2, '0');
    let lpChain = dstr.split('').join('+') + '=' + lp.steps[0];
    for (let i = 0; i < lp.steps.length - 1; i++) {
      lpChain += '，再 ' + String(lp.steps[i]).split('').join('+') + '=' + lp.steps[i + 1] + (lp.steps[i + 1] === lp.master ? '（卓越數）' : '');
    }
    // 外格算式（未填姓名則略過）
    let waiLine = '';
    if (hasName) {
      const chs = [...name], ss = state.strokes;
      let waiFormula;
      if (surname.length === 1 && given.length === 1) waiFormula = '單姓單名依例固定為 2';
      else if (surname.length === 1) waiFormula = '名末字「' + chs[chs.length - 1] + '」' + ss[ss.length - 1] + ' 畫＋1';
      else if (given.length === 1) waiFormula = '姓首字「' + chs[0] + '」' + ss[0] + ' 畫＋1';
      else waiFormula = '姓首字「' + chs[0] + '」' + ss[0] + ' 畫＋名末字「' + chs[chs.length - 1] + '」' + ss[ss.length - 1] + ' 畫';
      const waiInfo = n81(grids.wai).info;
      const waiJudge = waiInfo.l === '吉' ? '所以你的外緣與貴人運天生不弱，出外常有人相挺' :
        waiInfo.l === '凶' ? '所以社交上宜主動經營、慎選盟友，被動等待容易錯過人脈' :
          '所以人脈運吉凶參半，經營重質不重量';
      waiLine = '你的姓名外格＝' + waiFormula + '＝<b>' + grids.wai + '</b>，對照 81 數理第 ' + grids.wai + ' 數「' + waiInfo.n + '．' + waiInfo.l + '」——' + waiJudge + '。';
    } else {
      waiLine = '未填姓名，無法推外格人脈數；';
    }
    const copeParts = ZODIAC_COPE[zodiacKey].split('——');
    $('#r-persona').innerHTML =
      '<div class="c-grid">' +
      '<div><label>核心性格</label>' +
      Z.icon + ' 你生於 ' + m + ' 月 ' + d + ' 日，正落在<b>' + Z.name + '</b>區間（' + Z.date + '），屬' + Z.elem + '象、守護星' + Z.ruler + '——所以' + Z.trait + '<br>' +
      SX.icon + ' 出生年以立春換算為 ' + sx.baziYear + '（' + yGZname + '）年，地支「' + zhiCh + '」即<b>生肖屬' + sx.animal + '</b>——所以' + SX.trait + '</div>' +
      '<div><label>遇到事情的處理方式</label>因為你是' + Z.elem + '象的' + Z.name + '，遇事的預設模式是「<b>' + copeParts[0] + '</b>」——' + (copeParts[1] || '') + '</div>' +
      '<div><label>做事與決策風格</label>你的生日逐位相加：' + lpChain + '，得<b>生命靈數 ' + (lp.master ? lp.master + '／' + lp.final : lp.final) + ' 號</b>——所以' + NUM_WORK[lp.master || lp.final] + '<br>' +
      '八字日柱排出「<b>' + GAN[baziRes.pillars.day.gan] + ZHI[baziRes.pillars.day.zhi] + '</b>」，日主天干' + baziRes.dayMaster + '屬' + GAN_ELEM[baziRes.dayMaster] + '——決策上' + DM_STYLE[baziRes.dayMaster] + '。</div>' +
      '<div><label>人際與外緣</label>' + waiLine +
      (blood !== '不知道' ? (hasName ? '<br>再看' : '') + '血型 ' + blood + ' 型：' + BLOOD[blood].match : (hasName ? '' : '真誠是你最好的名片。')) + '</div>' +
      '</div>';

    // 各月運勢（附推導依據）
    renderMonthCurve(months);
    if (false) $('#r-months').innerHTML = months.map(M =>
      '<div class="month-card"><div class="month-head">' + M.m + '月<span>' + M.title + '．' + M.gz + '月</span>' +
      '<span class="luck-badge ' + (M.cls === 'good' ? 'good' : M.cls === 'bad' ? 'bad' : 'mid') + '" style="float:right">' + M.label + '</span></div>' +
      '<div class="month-body"><p class="month-basis">依據：' + M.basis + '。</p>' +
      '<p>◈ ' + M.overall + '</p><p>💰 ' + M.money + '</p><p>💗 ' + M.love + '</p></div></div>').join('');

    // 開運處方
    $('#r-lucky').innerHTML =
      '<div class="lucky-grid">' +
      '<div><label>開運色</label>' + lucky.color + '</div>' +
      '<div><label>星座幸運色</label>' + lucky.zColor + '</div>' +
      '<div><label>幸運數字</label>' + lucky.nums + '</div>' +
      '<div><label>吉利方位</label>' + lucky.dir + '</div>' +
      '<div><label>開運小物</label>' + lucky.item + '</div>' +
      '<div><label>幸運月份</label>' + lucky.month + '</div>' +
      '</div>' +
      '<div class="lucky-tips"><p>✅ 宜：' + lucky.doTip + '</p><p>🚫 ' + lucky.dontTip + '</p><p>🧘 養生：' + lucky.care + '</p></div>';

    // ===== 各系統卡片 =====
    const cards = [];
    // 星座（含三區間與出生日差異）
    const decan = getDecan(zodiacKey, m, d);
    const dayNumReduced = (d => { let t = d; while (t > 9) t = Math.floor(t / 10) + (t % 10); return t; })(d);
    cards.push({ id: 'zodiac', icon: Z.icon, title: '西洋星座．' + Z.name + '（第' + decan.n + '區間）', tag: Z.elem + '象．守護星' + Z.ruler + '．副守護星' + decan.sub,
      html: '<p class="c-note">依據：你生於 ' + m + '/' + d + '，落在' + Z.name + '第' + decan.n + '區間（' + decan.range + '）。同一星座依日期分三區間，副守護星不同、性格面貌也不同。</p>' +
        '<p class="c-trait">' + Z.trait + '</p>' +
        '<div class="c-grid"><div><label>第' + decan.n + '區間．' + decan.sub + '色彩</label>' + decan.text + '</div>' +
        '<div><label>出生「日」的刻痕</label>同為' + Z.name + '，' + d + ' 日出生（生日數 ' + dayNumReduced + '）的你更帶有——' + DAYNUM[d] + '</div></div>' +
        '<div class="c-grid" style="margin-top:10px">' +
        '<div><label>下半年整體</label>' + Z.h2.overall + '</div>' +
        '<div><label>愛情</label>' + Z.h2.love + '</div>' +
        '<div><label>財運</label>' + Z.h2.money + '</div>' +
        '<div><label>事業</label>' + Z.h2.career + '</div>' +
        '<div><label>健康</label>' + Z.h2.health + '</div></div>' +
        (transitNotes(zodiacKey).length ? '<div class="c-grid" style="margin-top:10px"><div><label>2026 下半年行運依據</label>' + transitNotes(zodiacKey).join('<br>') + cite('astro') + '</div></div>' : '') });
    // 生肖
    cards.push({ id: 'sx', icon: SX.icon, title: '生肖運程．屬' + sx.animal, tag: '2026 丙午馬年．' + SX.rel + '（生肖以立春為界）',
      html: '<p class="c-note">依據：' + REL_REASON[sx.animal] + '，故為「' + SX.rel + '」。</p>' +
        '<p class="c-trait">' + SX.trait + '</p><p>' + SX.h2 + '</p>' });
    // 生命靈數
    const lpInfo = NUMEROLOGY[lp.master || lp.final];
    cards.push({ id: 'num', icon: '🔢', title: '生命靈數．' + (lp.master ? lp.master + '／' + lp.final : lp.final) + ' 號人', tag: lpInfo.key,
      html: '<p class="c-trait">' + lpInfo.desc + '</p>' +
        (lp.master ? '<p>你同時擁有卓越數 ' + lp.master + ' 與基礎數 ' + lp.final + ' 的能量：' + NUMEROLOGY[lp.final].desc + '</p>' : '') +
        '<div class="c-grid"><div><label>2026 流年數 ' + py + '</label>' + PERSONAL_YEAR[py] + '</div></div>' });
    // 生日解析
    cards.push({ id: 'bday', icon: '🎂', title: '生日密碼．' + m + '月' + d + '日', tag: '誕生石：' + BIRTHSTONE[m - 1],
      html: '<p class="c-trait">' + d + ' 日出生的你——' + DAYNUM[d] + '</p>' +
        '<p>誕生石「' + BIRTHSTONE[m - 1].split('．')[0] + '」象徵' + BIRTHSTONE[m - 1].split('．')[1] + '，佩戴或擺放皆能安定心神、放大你的本命能量。</p>' });
    // 姓名學
    if (!hasName) {
      cards.push({ id: 'name', icon: '✍️', title: '姓名學．三才五格', tag: '未填姓名',
        html: '<p class="c-trait">姓名學以中文姓名的康熙筆畫推算三才五格與 81 數理，解讀性格核心、基礎運與人脈外緣。</p>' +
          '<p class="c-note">你這次未填姓名，已略過此項分析。點「重算」補上中文姓名即可解鎖，其他分析不受影響。</p>' });
    } else {
    const gridRows = [['天格', grids.tian, '祖蔭與長上緣'], ['人格', grids.ren, '主運．性格核心'], ['地格', grids.di, '基礎運．36歲前'], ['外格', grids.wai, '外緣與社交'], ['總格', grids.zong, '總運．中晚年']];
    let gtable = '<table class="grid-table"><tr><th>五格</th><th>數理</th><th>吉凶</th><th>意涵</th></tr>';
    for (const [gname, num, meaning] of gridRows) {
      const info = n81(num).info;
      gtable += '<tr><td>' + gname + '<span class="g-mean">' + meaning + '</span></td><td class="g-num">' + num + '</td>' +
        '<td><span class="luck-badge ' + (info.l === '吉' ? 'good' : info.l === '凶' ? 'bad' : 'mid') + '">' + info.l + '</span></td>' +
        '<td><b>' + info.n + '</b>．' + info.d + '</td></tr>';
    }
    gtable += '</table>';
    const sc = sancai(gridElem(grids.tian), gridElem(grids.ren), gridElem(grids.di));
    cards.push({ id: 'name', icon: '✍️', title: '姓名學．三才五格', tag: '「' + esc(name) + '」筆畫 ' + state.strokes.join('・'),
      html: gtable +
        '<div class="sancai-box"><div class="sancai-combo">三才配置：' + sc.combo + '<span class="luck-badge ' + sc.cls + '">' + sc.label + '</span></div><p>' + sc.desc + '</p></div>' +
        '<p class="c-note">＊筆畫依康熙字典並含數字慣例（四=4、五=5…），各流派或有一二畫之差，可回上一步微調。' + cite('xq') + '</p>' });
    }
    // 八字五行
    const POS_NAME = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    let btable = '<div class="bazi-pillars">';
    for (const c of baziRes.chars) {
      const st = bd.tgStem.find(s => s.pos === c.pos);
      const hd2 = bd.tgHidden.find(s => s.pos === c.pos);
      btable += '<div class="pillar"><label>' + POS_NAME[c.pos] + '</label>' +
        '<div class="pillar-tg">' + (st ? st.tg : '') + '</div>' +
        '<div class="pillar-gz">' + c.gz + '</div><div class="pillar-elem">' + GAN_ELEM[c.gz[0]] + '．' + ZHI_ELEM[c.gz[1]] + '</div>' +
        '<div class="pillar-cang">藏 ' + (hd2 ? hd2.list.map(x => x.g + '<small>' + x.tg + '</small>').join(' ') : '') + '</div></div>';
    }
    btable += '</div>';
    let ebars = '<div class="elem-bars">';
    const maxC = Math.max(...Object.values(baziRes.counts), 1);
    for (const e of ['木', '火', '土', '金', '水']) {
      ebars += '<div class="elem-row"><span class="elem-name e-' + e + '">' + e + '</span><div class="elem-track"><div class="elem-fill e-' + e + '" style="width:' + (baziRes.counts[e] / maxC * 100) + '%"></div></div><span class="elem-cnt">' + baziRes.counts[e] + '</span></div>';
    }
    ebars += '</div>';
    const dmCh = baziRes.dayMaster;
    let dayunHtml = '';
    if (bd.dayun) {
      const du = bd.dayun;
      dayunHtml = '<div><label>大運．' + (du.forward ? '順行' : '逆行') + '，' + du.startAge + ' 歲起運</label>' +
        '<div class="dayun-row">' + du.seq.map(s => '<span class="dayun' + (du.cur && du.cur.gz === s.gz ? ' cur' : '') + '"><b>' + s.gz + '</b><small>' + s.from + '–' + s.to + '歲</small><small>' + s.tg + '</small></span>').join('') + '</div>' +
        (du.cur ? '目前行「<b>' + du.cur.gz + '</b>」大運（' + du.cur.from + '–' + du.cur.to + ' 歲），天干為' + du.cur.tg + '——' + TG_PLAIN[du.cur.tg] + '是這十年的主旋律。' : '尚未起運，以流年論為主。') +
        cite('yh') + '</div>';
    } else {
      dayunHtml = '<div><label>大運</label>大運需依性別判斷順逆，你選了「保密」，此項略過。' + '</div>';
    }
    cards.push({ id: 'bazi', icon: '☯️', title: '八字命盤．日主' + dmCh + GAN_ELEM[dmCh] + '．' + bd.geju, tag: (baziRes.hourKnown ? '四柱八字' : '三柱六字（未填時辰）') + '．' + bd.level + '．年命納音「' + bd.nayin + '」',
      html: btable + ebars +
        '<p class="c-trait">' + DAYMASTER[dmCh] + '</p>' +
        '<div class="c-grid">' +
        '<div><label>月令旺衰（得令與否）</label>日主' + dmCh + '屬' + GAN_ELEM[dmCh] + '，生於' + bd.monthZ + '月（' + seasonElem(bd.monthZ) + '令），為「<b>' + bd.ws + '</b>」——' + WANGXIANG[bd.ws] + '。' +
        '再以藏干加權、月令倍計，同黨（比劫＋印）佔全局 <b>' + Math.round(bd.ratio * 100) + '%</b>，判為<b>' + bd.level + '</b>。' +
        '<br><span class="plain">白話：' + (bd.strong ? '你的自身能量充足，適合主動出擊、承擔大事；要注意的是「過猶不及」，懂得分享與放手更旺。' : '你的自身能量偏含蓄，適合借力使力、找對團隊與貴人；先顧好身心，再求擴張。') + '</span>' + cite('dts') + '</div>' +
        '<div><label>格局．' + bd.geju + '</label>月令' + bd.monthZ + '藏「' + CANG[bd.monthZ].join('、') + '」，取' + (bd.touchu ? '透干之「' + bd.geStem + '」' : '本氣「' + bd.geStem + '」') + '（' + bd.geTg + '）立格。' + GEJU_DESC[bd.geju] + cite('zp') + '</div>' +
        '<div><label>命中主導十神．' + bd.domTg + '（' + TG_PLAIN[bd.domTg] + '）</label>' + TG_DESC[bd.domTg] + cite('sm') + '</div>' +
        '<div><label>用神喜忌</label>' + (bd.strong ? '身強宜洩、耗、剋（扶抑法）' : '身弱宜生、扶（扶抑法）') + (bd.tiaohou ? '；' + bd.tiaohou.txt : '') +
        '<br>綜合取用：「<b>' + bd.fav.join('、') + '</b>」為你的開運五行' + (baziRes.missing.length ? (function () {
          const need = baziRes.missing.filter(e => bd.fav.includes(e)), skip = baziRes.missing.filter(e => !bd.fav.includes(e));
          return (need.length ? '；命中缺「' + need.join('、') + '」且正是喜用，可藉' + need.map(e => ELEM_INFO[e].color.split('、')[0]).join('與') + '色系補足' : '') +
            (skip.length ? '；命中雖缺「' + skip.join('、') + '」，但非你的喜用，不必刻意去補（古法重「用神」而非「補缺」）' : '');
        })() : '；五行俱全，屬均衡之命') + '。' + cite('qt') + '</div>' +
        '<div><label>2026 丙午流年</label>流年天干丙為你的「' + bd.lnStem + '」、地支午（藏丁）為「' + bd.lnBranch + '」。' + LIUNIAN_TG[bd.lnStem] + (bd.lnBranch !== bd.lnStem ? '下半年地支之氣更顯：' + LIUNIAN_TG[bd.lnBranch] : '') + '</div>' +
        dayunHtml +
        '</div>' +
        (baziRes.hourKnown ? '' : '<p class="c-note">＊未填出生時辰，以三柱推算；補上時辰可得更完整的命盤。</p>') });
    // 紫微斗數
    if (zw && lun) {
      const lunTxt = '農曆 ' + lun.ly + ' 年' + (lun.leap ? '閏' : '') + lun.lm + ' 月 ' + lun.ld + ' 日';
      const mingStarNames = zw.mingStars.length ? zw.mingStars : zw.borrowed;
      const borrowNote = zw.mingStars.length ? '' : '（命宮無主星，依例借對宮主星論）';
      let starHtml = '';
      for (const sn of mingStarNames) {
        const S = ZIWEI_STARS[sn];
        if (S) starHtml += '<div><label>' + sn + '星坐命' + borrowNote + '</label>' + S.t + '<br>' + S.y + '</div>';
      }
      if (!starHtml) starHtml = '<div><label>命宮</label>命盤特殊，主星分佈於他宮，一生際遇多彩多姿。</div>';
      cards.push({ id: 'ziwei', icon: '👑', title: '紫微斗數．' + (mingStarNames[0] ? mingStarNames.join('') + '坐命' : '命盤'), tag: zw.juName + '．命宮在' + ZHI[zw.ming] + '．身宮在' + ZHI[zw.shen],
        html: '<p class="c-note">依據：國曆換算為' + lunTxt + '；依「寅起正月順數生月、再逆數生時」立命宮於<b>' + ZHI[zw.ming] + '</b>；命宮干支納音得<b>' + zw.juName + '</b>；以局數除生日安紫微於<b>' + ZHI[zw.zw] + '</b>，再依安星訣布十四主星。</p>' +
          '<div class="c-grid">' + starHtml +
          '<div><label>' + zw.juName + '</label>' + JU_DESC[zw.juElem] + '</div>' +
          (zw.shenStars.length ? '<div><label>身宮（' + ZHI[zw.shen] + '）主星：' + zw.shenStars.join('、') + '</label>身宮主中晚年走向與內在底色，' + zw.shenStars.join('、') + '的特質會隨年歲越發明顯。</div>' : '') +
          (zd ? (
            '<div><label>命宮輔星</label>' + (zd.mingAux.length ? zd.mingAux.map(s => '<b>' + s + '</b>（' + AUX_MEAN[s] + '）').join('、') +
              '——' + (zd.mingAux.some(s => AUX_BAD.includes(s)) && !zd.mingAux.some(s => AUX_GOOD.includes(s)) ? '命宮見煞，性格帶稜角，歷練越多越有成就。' : zd.mingAux.some(s => AUX_GOOD.includes(s)) ? '命宮得吉星拱照，一生多助力。' : '') : '命宮無六吉六煞，性格單純、少受外力干擾。') + '</div>' +
            '<div><label>生年四化（' + zd.yGan + '干）</label>' + zd.sihua.map(x => x.star + x.hua + '在<b>' + x.palace + '</b>').join('；') +
              '。<br><span class="plain">白話：' + zd.sihua.map(x => x.palace + '宮是你「' + HUA_MEAN[x.hua] + '」之處').join('；') + '。</span></div>' +
            zd.three.map(t => '<div><label>' + t.p + '宮（' + t.zhi + '）' + (t.stars.length ? '．' + t.stars.join('') + (t.borrowed ? '（借對宮）' : '') : '') + '</label>' + (t.txt || '主星空缺，宜看對宮與流年。') +
              (t.aux.length ? '；同宮' + t.aux.join('、') : '') + '</div>').join('') +
            '<div><label>2026 丙年流年四化</label>' + zd.liunian.map(x => x.star + x.hua + '入你的<b>' + x.palace + '</b>').join('；') +
              '。<br><span class="plain">白話：今年' + zd.liunian[0].palace + '最有收穫，' + zd.liunian[3].palace + '需多留心、別鑽牛角尖。</span></div>'
          ) : '') +
          '</div>' + cite('zw') });
    } else {
      cards.push({ id: 'ziwei', icon: '👑', title: '紫微斗數', tag: '需出生時辰方能立命盤',
        html: '<p class="c-trait">紫微斗數以農曆生辰＋時辰立命宮、定五行局、安十四主星。</p><p class="c-note">你尚未填寫出生時辰，點「重算」補上時辰即可解鎖完整紫微命盤。</p>' });
    }
    // 人類圖（太陽閘門）
    if (hd) {
      cards.push({ id: 'hd', icon: '🔯', title: '人類圖速覽．第 ' + hd.gate + ' 號閘門', tag: '意識太陽閘門．第 ' + hd.line + ' 爻',
        html: '<p class="c-note">依據：你出生時太陽位於黃經 ' + hd.lon.toFixed(1) + '°，落在人類圖曼陀羅第 ' + hd.gate + ' 號閘門（每閘門 5.625°）。意識太陽佔個人設計約 70% 的性格能量。</p>' +
          '<div class="c-grid">' +
          '<div><label>意識太陽．' + hd.gate + ' 號閘門</label>' + HD_GATES[hd.gate] + '</div>' +
          '<div><label>設計太陽．' + hd.designGate + ' 號閘門（潛意識）</label>' + HD_GATES[hd.designGate] + '<br><span style="color:var(--ink-dim);font-size:13px">出生前約 88 天太陽所在之處，代表你自己看不見、別人卻感受得到的底層特質。</span></div>' +
          '</div>' +
          '<p class="c-note">＊完整人類圖（類型／權威／通道）需精確出生時分與全星曆，此為太陽閘門速覽版。' + cite('hd') + '</p>' });
    }
    // 血型
    if (blood !== '不知道') {
      const B = BLOOD[blood];
      cards.push({ id: 'blood', icon: '🩸', title: '血型分析．' + blood + ' 型', tag: B.match,
        html: '<p class="c-trait">' + B.trait + '</p><p>' + B.h2 + '</p>' });
    }
    // 塔羅
    const T = tarot.card;
    cards.push({ id: 'tarot', icon: T.icon, title: '今日塔羅．' + T.n + (tarot.upright ? '（正位）' : '（逆位）'), tag: T.e + '．每日一抽，明日再來',
      html: '<p class="c-trait">' + (tarot.upright ? T.up : T.rev) + '</p><p>🗝️ 指引：' + T.adv + '</p>' });

    // 卡片：最關注的排最前
    const focusCardMap = { money: 'bazi', love: 'zodiac', career: 'name', health: 'bazi', overall: null };
    $('#r-cards').innerHTML = cards.map(c =>
      '<section class="sys-card" id="card-' + c.id + '">' +
      '<div class="sys-head"><span class="sys-icon">' + c.icon + '</span><div><h3>' + c.title + '</h3><div class="sys-tag">' + c.tag + '</div></div></div>' +
      '<div class="sys-body">' + c.html + '</div></section>').join('');

    // 今日運勢（每天不同，回訪誘因）
    const dly = dailyFortune(baziRes.dayMaster, bd.fav);
    $('#daily-date').textContent = (dly.date.getMonth() + 1) + '月' + dly.date.getDate() + '日．' + dly.gz + '日';
    $('#r-daily').innerHTML =
      '<div class="daily-top"><div class="daily-score">' + dly.score + '<small>分</small></div><div><b style="color:var(--gold-bright)">' + dly.tg + '日</b>．' + TG_PLAIN[dly.tg] + '<br>' +
      '<span style="font-size:14px">🎨 幸運色 ' + dly.color + '　🧭 吉方 ' + dly.dir + '</span></div></div>' +
      '<p class="month-basis">依據：' + dly.basis + '。</p>' +
      '<p>' + dly.text + '</p><p>✅ 宜：' + dly.yi + '　🚫 忌：' + dly.ji + '</p>' +
      '<p class="daily-come">📅 今日運勢每天換一次，命盤已存在你的裝置裡——明天回來首頁點你的名字，一秒就能看。<br>⚠️ 清除 Cookie／瀏覽器資料、無痕模式或換手機，紀錄會消失，建議順手「存成圖片」留底。</p>';
    saveProfile();

    const _copeParts = ZODIAC_COPE[zodiacKey].split('——');
    lastResult = {
      name: dispName, honorTxt: hasName ? honor() : '', ymd: y + '/' + m + '/' + d,
      zName: Z.name, zIcon: Z.icon, decanN: decan.n, animal: sx.animal, sxIcon: SX.icon, sxRel: SX.rel,
      lpTxt: (lp.master ? lp.master + '/' + lp.final : String(lp.final)), lpKey: NUMEROLOGY[lp.master || lp.final].key, py,
      scores, bestName: ASPECT_NAME[best], bestScore: scores[best],
      cope1: _copeParts[0], dm: baziRes.dayMaster + GAN_ELEM[baziRes.dayMaster], dmStyle: DM_STYLE[baziRes.dayMaster],
      lucky, tarotTxt: T.n + (tarot.upright ? '（正位）' : '（逆位）'), tarotAdv: T.adv,
      missing: baziRes.missing.join('、') || '無', zH2: Z.h2.overall,
      bestH2: Z.h2[{ wealth: 'money', love: 'love', career: 'career', health: 'health', social: 'overall' }[best]] || Z.h2.overall,
      // ---- 精簡版 Plan C：性格深度素材 ----
      persona: {
        zoneTrait: Z.trait,
        sxTrait: SX.trait,
        copeCore: _copeParts[0] || '',
        copeDesc: _copeParts[1] || '',
        numWork: NUM_WORK[lp.master || lp.final] || '',
        dmStyle: DM_STYLE[baziRes.dayMaster] || '',
        bloodMatch: (blood && blood !== '不知道' && BLOOD[blood]) ? BLOOD[blood].match : ''
      },
      // ---- 精簡版 Plan C：今日運勢完整素材 ----
      daily: {
        md: (dly.date.getMonth() + 1) + '月' + dly.date.getDate() + '日',
        gz: dly.gz, tg: dly.tg, tgPlain: TG_PLAIN[dly.tg] || '',
        score: dly.score, color: dly.color, dir: dly.dir,
        text: dly.text, yi: dly.yi, ji: dly.ji, basis: dly.basis
      }
    };
    // AI 解讀用命盤摘要（不含姓名與生日）
    const focusTxt = { overall: '整體', money: '財運', love: '愛情', career: '事業', health: '健康' }[state.focus];
    lastResult.chart = [
      '性別：' + (state.gender === '祕密' ? '未提供' : state.gender) + '；2026 年約 ' + (2026 - y) + ' 歲；最想了解：' + focusTxt,
      '星座：' + Z.name + '第' + decan.n + '區間（' + Z.elem + '象，副守護星' + decan.sub + '）',
      '2026下半年行運：' + (transitNotes(zodiacKey).join(' ') || '無特殊重大行運'),
      '生肖：屬' + sx.animal + '，與丙午太歲' + SX.rel,
      '生命靈數：' + lastResult.lpTxt + '（' + lastResult.lpKey + '），流年數 ' + py,
      '八字：' + baziRes.chars.map(c => c.gz).join(' ') + (baziRes.hourKnown ? '' : '（無時柱）') + '；日主' + dmCh + GAN_ELEM[dmCh],
      '十神（天干）：' + bd.tgStem.map(s => s.g + s.tg).join('、'),
      '月令：生於' + bd.monthZ + '月，日主' + bd.ws + '；旺衰：' + bd.level + '（同黨' + Math.round(bd.ratio * 100) + '%）',
      '格局：' + bd.geju + '；主導十神：' + bd.domTg + '；年命納音：' + bd.nayin,
      '用神：' + bd.fav.join('、') + (bd.tiaohou ? '（含調候' + bd.tiaohou.e + '）' : '') + '；五行缺：' + (baziRes.missing.join('、') || '無'),
      '2026丙午流年：天干' + bd.lnStem + '、地支' + bd.lnBranch,
      '大運：' + (bd.dayun && bd.dayun.cur ? '現行' + bd.dayun.cur.gz + '（' + bd.dayun.cur.tg + '）' : '未取得'),
      zw ? '紫微：命宮在' + ZHI[zw.ming] + '，主星' + ((zw.mingStars.length ? zw.mingStars : zw.borrowed).join('、') || '無') + (zw.mingStars.length ? '' : '（借對宮）') + '；' + zw.juName +
        (zd ? '；命宮輔星' + (zd.mingAux.join('、') || '無') + '；生年四化：' + zd.sihua.map(x => x.star + x.hua + '在' + x.palace).join('、') +
          '；' + zd.three.map(t => t.p + '宮主星' + (t.stars.join('') || '無')).join('、') + '；2026流年四化：' + zd.liunian.map(x => x.star + x.hua + '入' + x.palace).join('、') : '') : '紫微：未提供時辰，無命盤',
      '五運分數：財運' + scores.wealth + ' 愛情' + scores.love + ' 事業' + scores.career + ' 健康' + scores.health + ' 貴人' + scores.social
    ].join('\n');
    $('#ai-out').innerHTML = '';
    $('#btn-ai').disabled = false;
    $('#btn-ai').textContent = '✨ 請 AI 命理師深度解讀';
    pingResultCount();
  }

  // ---------- 逐月運勢曲線 ----------
  function renderMonthCurve(months) {
    const W = 640, H = 230, px = 46, top = 34, bot = 44;
    const xs = months.map((_, i) => px + i * (W - px * 2) / (months.length - 1));
    const ys = months.map(M => top + (1 - (M.pts - 40) / 60) * (H - top - bot));
    let path = 'M' + xs[0] + ',' + ys[0];
    for (let i = 0; i < xs.length - 1; i++) {
      const x0 = xs[i - 1] ?? xs[i], y0 = ys[i - 1] ?? ys[i], x3 = xs[i + 2] ?? xs[i + 1], y3 = ys[i + 2] ?? ys[i + 1];
      const c1x = xs[i] + (xs[i + 1] - x0) / 6, c1y = ys[i] + (ys[i + 1] - y0) / 6;
      const c2x = xs[i + 1] - (x3 - xs[i]) / 6, c2y = ys[i + 1] - (y3 - ys[i]) / 6;
      path += ' C' + c1x.toFixed(1) + ',' + c1y.toFixed(1) + ' ' + c2x.toFixed(1) + ',' + c2y.toFixed(1) + ' ' + xs[i + 1] + ',' + ys[i + 1];
    }
    const area = path + ' L' + xs[xs.length - 1] + ',' + (H - bot) + ' L' + xs[0] + ',' + (H - bot) + ' Z';
    const col = c => c === 'good' ? '#ecd08f' : c === 'bad' ? '#d0452f' : '#a8997f';
    let svg = '<svg class="mc-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet">' +
      '<defs><linearGradient id="mcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9a45c" stop-opacity=".35"/><stop offset="1" stop-color="#c9a45c" stop-opacity="0"/></linearGradient>' +
      '<filter id="mcGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    [50, 70, 90].forEach(v => { const y = top + (1 - (v - 40) / 60) * (H - top - bot); svg += '<line x1="' + px + '" x2="' + (W - px) + '" y1="' + y + '" y2="' + y + '" class="mc-grid"/><text x="' + (px - 10) + '" y="' + (y + 4) + '" class="mc-axis" text-anchor="end">' + v + '</text>'; });
    svg += '<path d="' + area + '" fill="url(#mcFill)"/><path d="' + path + '" class="mc-line" filter="url(#mcGlow)"/>';
    months.forEach((M, i) => {
      svg += '<g class="mc-pt" data-i="' + i + '" tabindex="0"><title>' + M.m + '月 ' + M.gz + '月 ' + M.label + ' ' + M.pts + '分</title><circle cx="' + xs[i] + '" cy="' + ys[i] + '" r="16" fill="transparent"/>' +
        '<circle cx="' + xs[i] + '" cy="' + ys[i] + '" r="' + (M.cls === 'good' ? 7 : 5.5) + '" fill="' + col(M.cls) + '" class="mc-dot' + (M.cls === 'good' ? ' glow' : '') + '"/>' +
        '<text x="' + xs[i] + '" y="' + (ys[i] - 14) + '" class="mc-val" text-anchor="middle">' + M.pts + '</text>' +
        '<text x="' + xs[i] + '" y="' + (H - bot + 22) + '" class="mc-mon" text-anchor="middle">' + M.m + '月</text>' +
        '<text x="' + xs[i] + '" y="' + (H - bot + 38) + '" class="mc-lab lab-' + M.cls + '" text-anchor="middle">' + M.label + '</text></g>';
    });
    svg += '</svg>';
    $('#r-months').innerHTML = svg + '<p class="mc-hint">點選月份查看依據與詳解</p><div id="mc-detail" class="mc-detail"></div>';
    const showM = i => {
      const M = months[i];
      $$('#r-months .mc-pt').forEach(g => g.classList.toggle('sel', +g.dataset.i === i));
      $('#mc-detail').innerHTML = '<div class="mc-dh">' + M.m + '月．' + M.title + '．' + M.gz + '月 <span class="luck-badge ' + (M.cls === 'good' ? 'good' : M.cls === 'bad' ? 'bad' : 'mid') + '">' + M.label + '．' + M.pts + '分</span></div>' +
        '<p class="month-basis">依據：' + M.basis + '。</p><p>◈ ' + M.overall + '</p><p>💰 ' + M.money + '</p><p>💗 ' + M.love + '</p>';
    };
    $$('#r-months .mc-pt').forEach(g => { g.onclick = () => showM(+g.dataset.i); g.onkeydown = e => { if (e.key === 'Enter') showM(+g.dataset.i); }; });
    let best = 0; months.forEach((M, i) => { if (M.pts > months[best].pts) best = i; });
    showM(best);
  }

  // ---------- 本機命盤（只存在此裝置，供回訪一鍵查看） ----------
  function loadProfiles() { try { return JSON.parse(localStorage.getItem('xj_profiles') || '[]'); } catch (e) { return []; } }
  function saveProfile() {
    try {
      const p = { name: state.name, gender: state.gender, y: state.y, m: state.m, d: state.d, hourIdx: state.hourIdx, lateZi: state.lateZi, blood: state.blood, focus: state.focus, strokes: state.strokes };
      const key = p.name + '|' + p.y + '-' + p.m + '-' + p.d + '|' + p.hourIdx;
      const list = loadProfiles().filter(x => (x.name + '|' + x.y + '-' + x.m + '-' + x.d + '|' + x.hourIdx) !== key);
      list.unshift(p);
      localStorage.setItem('xj_profiles', JSON.stringify(list.slice(0, 8)));
      renderWelcome();
    } catch (e) {}
  }
  function renderWelcome() {
    const box = $('#welcome-back');
    if (!box) return;
    const list = loadProfiles();
    if (!list.length) { box.style.display = 'none'; return; }
    box.style.display = '';
    box.innerHTML = '<div class="wb-title">歡迎回來・點名字看今日運勢</div><div class="wb-list">' +
      list.map((p, i) => '<button class="wb-item" data-i="' + i + '">' + esc(p.name || '有緣人') + '<small>' + p.y + '/' + p.m + '/' + p.d + '</small></button>').join('') +
      '</div><div class="wb-warn">⚠️ 紀錄只存在這台裝置，清除 Cookie／瀏覽器資料或用無痕模式就會不見</div><button class="wb-clear" id="wb-clear">清除本機紀錄</button>';
    box.querySelectorAll('.wb-item').forEach(b => b.onclick = () => {
      const p = loadProfiles()[+b.dataset.i];
      if (!p) return;
      Object.assign(state, p);
      if (!state.strokes) state.strokes = [];
      startAnalyze(true);
    });
    $('#wb-clear').onclick = () => { localStorage.removeItem('xj_profiles'); renderWelcome(); toast('本機紀錄已清除'); };
  }
  function privacyNotice() {
    try {
      if (localStorage.getItem('xj_privacy_ok')) return;
      $('#privacy-modal').classList.add('open');
      $('#privacy-ok').onclick = () => { localStorage.setItem('xj_privacy_ok', '1'); $('#privacy-modal').classList.remove('open'); };
    } catch (e) {}
  }

  // ---------- AI 命理師解讀 ----------
  async function checkAI() {
    try {
      const s = await (await fetch('/api/ai/status')).json();
      if (s.enabled) $('#r-ai').style.display = '';
    } catch (e) {}
  }
  function renderAIText(t) {
    return esc(t).split(/\n+/).map(line => {
      const m = line.match(/^\s*【(.+?)】\s*(.*)$/);
      if (m) return '<h4 class="ai-h">' + m[1] + '</h4>' + (m[2] ? '<p>' + m[2] + '</p>' : '');
      return line.trim() ? '<p>' + line.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>') + '</p>' : '';
    }).join('');
  }
  async function runAI() {
    if (!lastResult || !lastResult.chart) return;
    const btn = $('#btn-ai');
    btn.disabled = true; btn.textContent = '🔮 命理師推演中，約需 20–40 秒…';
    $('#ai-out').innerHTML = '<p class="c-note">正在綜合八字、紫微與星象，請稍候…</p>';
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chart: lastResult.chart }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'AI 暫時無法使用');
      $('#ai-out').innerHTML = renderAIText(j.text);
      btn.textContent = '✅ 解讀完成';
    } catch (e) {
      $('#ai-out').innerHTML = '<p class="c-note">⚠️ ' + esc(e.message) + '</p>';
      btn.disabled = false; btn.textContent = '✨ 再試一次';
    }
  }

  // ---------- 存成圖片（canvas 手繪命理圖卡） ----------
  function wrapCanvasText(ctx, text, x, y, maxW, lh) {
    let line = '', yy = y;
    for (const ch of [...String(text)]) {
      if (ctx.measureText(line + ch).width > maxW) { ctx.fillText(line, x, yy); yy += lh; line = ch; }
      else line += ch;
    }
    if (line) { ctx.fillText(line, x, yy); yy += lh; }
    return yy;
  }
  function rr(ctx, x, y, w, h, r) {
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
    else { ctx.beginPath(); ctx.rect(x, y, w, h); }
  }
  function saveImage() {
    const r = lastResult;
    if (!r) return;
    try {
      const W = 1080, H = 1700;
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const ctx = cv.getContext('2d');
      if (!ctx) throw new Error('no canvas');
      const F = '"Noto Serif TC","PMingLiU","Microsoft JhengHei",serif';
      // 背景與雙框
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#33100f'); bg.addColorStop(.5, '#24080a'); bg.addColorStop(1, '#170404');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#8a6a2f'; ctx.lineWidth = 2; ctx.strokeRect(36, 36, W - 72, H - 72);
      ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 3; ctx.strokeRect(48, 48, W - 96, H - 96);
      ctx.strokeStyle = '#f2cd7b'; ctx.lineWidth = 5;
      const cl = 34;
      [[48, 48, 1, 1], [W - 48, 48, -1, 1], [48, H - 48, 1, -1], [W - 48, H - 48, -1, -1]].forEach(([x, y, sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(x, y + sy * cl); ctx.lineTo(x, y); ctx.lineTo(x + sx * cl, y); ctx.stroke();
      });
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // 印章
      const sg = ctx.createLinearGradient(0, 105, 0, 225);
      sg.addColorStop(0, '#c53a30'); sg.addColorStop(1, '#b3261e');
      ctx.fillStyle = sg; rr(ctx, W / 2 - 60, 105, 120, 120, 14); ctx.fill();
      ctx.strokeStyle = 'rgba(255,233,201,.85)'; ctx.lineWidth = 3;
      rr(ctx, W / 2 - 52, 113, 104, 104, 10); ctx.stroke();
      ctx.fillStyle = '#ffe9c9'; ctx.font = 'bold 44px ' + F;
      ctx.fillText('旺', W / 2, 143); ctx.fillText('來', W / 2, 192);
      // 標題
      ctx.fillStyle = '#f2cd7b'; ctx.font = '900 62px ' + F;
      ctx.fillText('旺 來 開 運 所', W / 2, 302);
      ctx.fillStyle = '#c8ab7d'; ctx.font = '26px ' + F;
      ctx.fillText('線 上 命 理 分 析 ・ 命 理 精 簡 報 告', W / 2, 354);
      // 姓名與生日
      ctx.fillStyle = '#f2cd7b'; ctx.font = '900 74px ' + F;
      ctx.fillText(r.name + ' ' + r.honorTxt, W / 2, 448);
      ctx.fillStyle = '#c8ab7d'; ctx.font = '28px ' + F;
      ctx.fillText('國曆 ' + r.ymd, W / 2, 502);
      // 命理標籤兩行
      ctx.fillStyle = '#e6c27a'; ctx.font = '32px ' + F;
      ctx.fillText(r.zIcon + ' ' + r.zName + '（第' + r.decanN + '區間）　' + r.sxIcon + ' 屬' + r.animal + '（' + r.sxRel + '）', W / 2, 562);
      ctx.fillText('靈數 ' + r.lpTxt + '（' + r.lpKey + '）　日主 ' + r.dm, W / 2, 612);
      // 五運分數卡
      const aspects = [['財運', 'wealth'], ['愛情', 'love'], ['事業', 'career'], ['健康', 'health'], ['貴人', 'social']];
      const cw = 176, gap = 18, x0 = (W - (cw * 5 + gap * 4)) / 2, cy = 662, chh = 152;
      aspects.forEach(([nm, k], i) => {
        const x = x0 + i * (cw + gap);
        ctx.strokeStyle = 'rgba(217,164,65,.5)'; ctx.lineWidth = 2;
        rr(ctx, x, cy, cw, chh, 10); ctx.stroke();
        ctx.fillStyle = '#d9a441'; ctx.font = '28px ' + F;
        ctx.fillText(nm, x + cw / 2, cy + 36);
        ctx.fillStyle = '#f2cd7b'; ctx.font = '900 58px ' + F;
        ctx.fillText(String(r.scores[k]), x + cw / 2, cy + 92);
        const st = Math.max(2, Math.round(r.scores[k] / 20));
        ctx.fillStyle = '#d9a441'; ctx.font = '20px ' + F;
        ctx.fillText('★'.repeat(st) + '☆'.repeat(5 - st), x + cw / 2, cy + 130);
      });
      // 內文
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      let y = cy + chh + 76;
      const lx = 110, maxW = W - 220;
      const item = (label, text) => {
        ctx.fillStyle = '#d9a441'; ctx.font = 'bold 30px ' + F;
        ctx.fillText(label, lx, y); y += 48;
        ctx.fillStyle = '#f3e5c8'; ctx.font = '30px ' + F;
        y = wrapCanvasText(ctx, text, lx, y, maxW, 44) + 14;
      };
      item('⭐ 最旺運勢', r.bestName + '（' + r.bestScore + ' 分）——' + r.bestH2);
      item('🧭 處事風格', r.cope1 + '；' + r.dmStyle + '。');
      item('🎨 開運指南', '缺' + r.missing + '｜' + r.lucky.color + '｜幸運數字 ' + r.lucky.nums + '｜吉方 ' + r.lucky.dir + '｜幸運月 ' + r.lucky.month);
      item('🃏 今日塔羅', r.tarotTxt + '——' + r.tarotAdv);
      // 頁尾
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(217,164,65,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(150, H - 152); ctx.lineTo(W - 150, H - 152); ctx.stroke();
      ctx.fillStyle = '#c8ab7d'; ctx.font = '26px ' + F;
      ctx.fillText('完整報告 → ' + siteUrl().replace('https://', ''), W / 2, H - 112);
      ctx.fillStyle = '#e6c27a'; ctx.font = 'bold 28px ' + F;
      ctx.fillText('by 旺來 wowwow31001（Threads）🍍', W / 2, H - 68);
      // 輸出：手機優先原生分享，其餘直接下載
      cv.toBlob(async (blob) => {
        if (!blob) { toast('圖片產生失敗，請改用列印功能'); return; }
        const fname = '旺來開運所_命理報告_' + r.name + '.png';
        const file = new File([blob], fname, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: '旺來開運所．命理報告' }); return; } catch (e) { /* 使用者取消則續走下載 */ }
        }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        toast('圖片已下載！');
      }, 'image/png');
    } catch (e) { toast('此瀏覽器不支援圖片產生，請改用列印功能'); }
  }

  // ---------- 精簡版 ----------
  function buildCompactText() {
    const r = lastResult;
    if (!r) return '';
    const p = r.persona || {};
    const d = r.daily || {};
    const lines = [
      '🏮 旺來開運所．命理精簡報告',
      r.name + ' ' + r.honorTxt + '｜國曆 ' + r.ymd,
      r.zIcon + ' ' + r.zName + '｜' + r.sxIcon + ' 屬' + r.animal + '（' + r.sxRel + '）｜靈數 ' + r.lpTxt + '（' + r.lpKey + '）｜日主 ' + r.dm,
      '── ✧ 你是怎樣的人 ──',
      p.zoneTrait || '',
      p.sxTrait || '',
      '遇事：「' + (p.copeCore || '') + '」——' + (p.copeDesc || ''),
      '決策：' + (p.numWork || '') + '　｜　日主 ' + r.dm + '——' + (p.dmStyle || ''),
      (p.bloodMatch ? '血型：' + p.bloodMatch : '')
    ];
    if (d.md) {
      lines.push(
        '── 🌤 今日運勢 ' + d.md + '．' + d.gz + '日 ──',
        d.score + ' 分｜' + d.tg + '日．' + d.tgPlain + '｜🎨 ' + d.color + '｜🧭 ' + d.dir,
        '依據：' + d.basis,
        d.text,
        '✅ 宜：' + d.yi + '　🚫 忌：' + d.ji
      );
    }
    lines.push(
      '── 2026 下半年五運 ──',
      '💰 財 ' + r.scores.wealth + '｜💗 愛 ' + r.scores.love + '｜💼 事 ' + r.scores.career + '｜🏥 健 ' + r.scores.health + '｜🤝 貴 ' + r.scores.social,
      '🎨 ' + r.lucky.color + '｜🧭 ' + r.lucky.dir + '｜🍀 幸運月 ' + r.lucky.month,
      '──────────',
      '完整報告：' + siteUrl(),
      'by 旺來 ' + SITE.authorHandle + '（Threads：' + SITE.authorUrl + '）'
    );
    return lines.filter(Boolean).join('\n');
  }
  function openCompact() {
    const r = lastResult;
    if (!r) return;
    const p = r.persona || {};
    const d = r.daily || {};
    // 拼「你是怎樣的人」段落：星座主軸 + 生肖補刀 + 靈數決策 + 日主 + 血型
    const personaHtml =
      '<p>' + esc(p.zoneTrait || '') + '</p>' +
      '<p>' + esc(p.sxTrait || '') + '</p>' +
      '<p>遇事的預設模式是「<b>' + esc(p.copeCore) + '</b>」——' + esc(p.copeDesc) + '</p>' +
      '<p>做事與決策風格：' + esc(p.numWork) + '<br>八字日主 <b>' + esc(r.dm) + '</b>——' + esc(p.dmStyle) + '。</p>' +
      (p.bloodMatch ? '<p>血型面向：' + esc(p.bloodMatch) + '</p>' : '');
    // 今日運勢完整區塊
    const todayHtml = d.md ? (
      '<div class="cp-today-head"><b class="cp-today-score">' + d.score + '<small>分</small></b>' +
      '<div><b>📅 ' + d.md + '．' + d.gz + '日</b>　<span class="cp-today-tg">' + d.tg + '日．' + esc(d.tgPlain) + '</span><br>' +
      '<span class="cp-today-meta">🎨 幸運色 ' + esc(d.color) + '　🧭 吉方 ' + esc(d.dir) + '</span></div></div>' +
      '<p class="cp-today-basis">依據：' + esc(d.basis) + '。</p>' +
      '<p>' + esc(d.text) + '</p>' +
      '<p>✅ 宜：' + esc(d.yi) + '　🚫 忌：' + esc(d.ji) + '</p>'
    ) : '';

    $('#compact-body').innerHTML =
      '<div class="cp-title">🏮 旺來開運所．命理精簡報告</div>' +
      '<div class="cp-name">' + esc(r.name) + ' ' + r.honorTxt + '<span>國曆 ' + r.ymd + '</span></div>' +
      '<div class="cp-chips"><span>' + r.zIcon + ' ' + r.zName + '（' + r.decanN + '區）</span><span>' + r.sxIcon + ' 屬' + r.animal + '（' + r.sxRel + '）</span><span>靈數 ' + r.lpTxt + '</span><span>日主 ' + r.dm + '</span></div>' +
      '<div class="cp-section cp-persona"><div class="cp-section-title">✧ 你是怎樣的人</div>' + personaHtml + '</div>' +
      '<div class="cp-section cp-today"><div class="cp-section-title">🌤 今日運勢</div>' + todayHtml + '</div>' +
      '<div class="cp-scores-inline"><span>💰 財 ' + r.scores.wealth + '</span><span>💗 愛 ' + r.scores.love + '</span><span>💼 事 ' + r.scores.career + '</span><span>🏥 健 ' + r.scores.health + '</span><span>🤝 貴 ' + r.scores.social + '</span></div>' +
      '<div class="cp-line cp-lucky-inline">🎨 ' + esc(r.lucky.color) + '｜🧭 ' + r.lucky.dir + '｜🍀 幸運月 ' + r.lucky.month + '</div>' +
      '<div class="cp-foot">完整報告：' + siteUrl() + '<br>by 旺來 <a href="' + SITE.authorUrl + '" target="_blank" rel="noopener">' + SITE.authorHandle + '</a></div>';
    $('#compact-modal').classList.add('open');
  }

  // 統計「完成測算」次數（僅本機展示用）
  function pingResultCount() {
    const n = (parseInt(localStorage.getItem('xj_reports') || '0', 10) + 1);
    localStorage.setItem('xj_reports', String(n));
  }

  // ---------- 綁定 ----------
  document.addEventListener('DOMContentLoaded', () => {
    initForm();
    pingVisit();
    $('#btn-start').onclick = () => { show('#screen-form'); gotoStep(0); };
    $('#btn-next').onclick = () => { if (!validateStep()) return; if (state.step < 2) gotoStep(state.step + 1); else startAnalyze(); };
    $('#btn-prev').onclick = () => gotoStep(Math.max(0, state.step - 1));
    $('#btn-redo').onclick = () => { show('#screen-form'); gotoStep(0); };
    $('#btn-friend').onclick = () => {
      $('#f-name').value = '';
      $('#stroke-editor').innerHTML = ''; $('#stroke-editor').classList.remove('open');
      $$('input[name="f-gender"]').forEach(r => r.checked = r.value === '祕密');
      $$('input[name="f-blood"]').forEach(r => r.checked = r.value === '不知道');
      state.gender = '祕密'; state.blood = '不知道'; state.focus = 'overall';
      $('#f-hour').value = 'x';
      $$('.focus-chip').forEach(x => x.classList.toggle('sel', x.dataset.v === 'overall'));
      show('#screen-form'); gotoStep(0);
      $('#f-name').focus();
    };
    $('#btn-print').onclick = () => window.print();
    $('#btn-image').onclick = saveImage;
    $('#btn-ai').onclick = runAI;
    checkAI();
    renderWelcome();
    privacyNotice();
    $('#compact-image').onclick = saveImage;
    $('#btn-share-intro').onclick = doShare;
    $('#btn-share').onclick = doShare;
    $('#btn-compact').onclick = openCompact;
    $('#compact-close').onclick = () => $('#compact-modal').classList.remove('open');
    $('#compact-modal').addEventListener('click', e => { if (e.target === $('#compact-modal')) $('#compact-modal').classList.remove('open'); });
    $('#compact-copy').onclick = () => copyText(buildCompactText()).then(() => toast('精簡報告已複製，可直接貼上分享！'));
    $('#compact-print').onclick = () => {
      document.body.classList.add('print-compact');
      const done = () => { document.body.classList.remove('print-compact'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done);
      window.print();
      setTimeout(done, 2000);
    };
  });
})();

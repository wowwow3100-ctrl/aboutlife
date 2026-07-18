// ============ 玄機閣．介面流程 ============
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
  async function pingVisit() {
    const ln = localCount();
    try {
      const r = await fetch('/api/visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vid: getVid() }) });
      const j = await r.json();
      const s = await (await fetch('/api/stats')).json();
      $('#visit-counter').innerHTML = '香客足跡 <b>' + j.total.toLocaleString() + '</b> 次 ｜ 今日 <b>' + s.today.v + '</b> 次';
    } catch (e) {
      $('#visit-counter').innerHTML = '本機瀏覽 <b>' + ln + '</b> 次（啟動伺服器後顯示全站人數）';
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
      if (!/^[㐀-鿿]{2,6}$/.test(name)) { toast('請輸入 2–6 個中文字的姓名'); return false; }
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
  const LOAD_LINES = ['正在焚香淨手…', '推算生辰節氣…', '排列三才五格…', '對照八十一數理…', '觀星測影，推演流年…', '玄機將現，請稍候…'];
  function startAnalyze() {
    show('#screen-loading');
    let i = 0;
    $('#load-line').textContent = LOAD_LINES[0];
    const iv = setInterval(() => { i = (i + 1) % LOAD_LINES.length; $('#load-line').textContent = LOAD_LINES[i]; }, 700);
    setTimeout(() => { clearInterval(iv); renderResult(); show('#screen-result'); }, 2600);
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
    let text = '玄機閣．線上命理分析｜星座×生肖×姓名學×生命靈數×八字五行，一次看懂 2026 下半年財運、愛情、事業！';
    if (lastResult) text = '我在「玄機閣」測了 2026 下半年運勢，' + lastResult.bestName + '拿了 ' + lastResult.bestScore + ' 分！你也來算算～';
    if (navigator.share) {
      navigator.share({ title: '玄機閣．線上命理分析', text, url }).catch(() => {});
    } else {
      copyText(text + '\n' + url).then(() => toast('分享文字已複製，貼給朋友吧！'));
    }
  }

  function renderResult() {
    const { name, y, m, d, hourIdx, lateZi, blood } = state;
    const { surname, given } = splitName(name);
    const zodiacKey = getZodiac(m, d);
    const Z = ZODIAC[zodiacKey];
    const sx = getShengxiao(y, m, d, hourIdx == null ? 12 : (hourIdx === 0 && lateZi ? 23 : (hourIdx === 0 ? 0 : hourIdx * 2 - 1)), 30);
    const SX = SHENGXIAO[sx.animal];
    const lp = lifePath(y, m, d);
    const py = personalYear(m, d, 2026);
    const grids = fiveGrids(surname, given, state.strokes);
    const baziRes = bazi(y, m, d, hourIdx, lateZi);
    const seedStr = name + '|' + y + '-' + m + '-' + d;
    const profile = { name, y, m, d, zodiacKey, animal: sx.animal, lp, grids, baziRes, hourIdx, blood, seedStr };
    const scores = computeScores(profile);
    const lucky = luckyPrescription(profile);
    const months = monthlyFortune(seedStr);
    const tarot = tarotDraw(seedStr);

    // 頭牌
    $('#r-head').innerHTML =
      '<div class="r-name">' + esc(name) + ' ' + honor() + '</div>' +
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
      '<p><b>' + esc(given) + '</b>' + honor() + '，你的生命靈數為 <b>' + (lp.master ? lp.master + '（卓越數）' : lp.final) + ' 號</b>——' + NUMEROLOGY[lp.master || lp.final].key + '；2026 流年數 <b>' + py + '</b>，' + PERSONAL_YEAR[py] + '</p>' +
      '<p>丙午馬年下半年，' + relNote + '。五大運勢中以「<b>' + ASPECT_NAME[best] + '</b>」最為突出（' + scores[best] + ' 分），' + Z.name + '的你' + Z.h2.overall + '</p>' +
      '<p class="r-focus-tip">你最想了解的「' + ($('.focus-chip.sel') ? $('.focus-chip.sel').textContent.trim() : '整體') + '」詳解，已為你排在下方各單元之首。</p>';

    // 性格側寫．處事風格
    const waiInfo = n81(grids.wai).info;
    const waiLine = waiInfo.l === '吉' ? '外格 ' + grids.wai + ' 屬吉，外緣與貴人運佳，出外常有人相挺；' :
      waiInfo.l === '凶' ? '外格 ' + grids.wai + ' 偏弱，社交上宜主動經營、慎選盟友；' :
        '外格 ' + grids.wai + ' 吉凶參半，人脈重質不重量；';
    $('#r-persona').innerHTML =
      '<div class="c-grid">' +
      '<div><label>核心性格</label>' + Z.icon + ' ' + Z.name + '：' + Z.trait + '<br>' + SX.icon + ' 屬' + sx.animal + '：' + SX.trait + '</div>' +
      '<div><label>遇到事情的處理方式</label>' + ZODIAC_COPE[zodiacKey] + '</div>' +
      '<div><label>做事與決策風格</label>靈數 ' + (lp.master || lp.final) + ' 號：' + NUM_WORK[lp.master || lp.final] + '<br>日主' + baziRes.dayMaster + GAN_ELEM[baziRes.dayMaster] + '：' + DM_STYLE[baziRes.dayMaster] + '。</div>' +
      '<div><label>人際與外緣</label>' + waiLine + (blood !== '不知道' ? BLOOD[blood].match : '真誠是你最好的名片。') + '</div>' +
      '</div>';

    // 各月運勢
    $('#r-months').innerHTML = months.map(M =>
      '<div class="month-card"><div class="month-head">' + M.m + '月<span>' + M.title + '</span></div>' +
      '<div class="month-body"><p>◈ ' + M.overall + '</p><p>💰 ' + M.money + '</p><p>💗 ' + M.love + '</p></div></div>').join('');

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
    // 星座
    cards.push({ id: 'zodiac', icon: Z.icon, title: '西洋星座．' + Z.name, tag: Z.elem + '象．守護星' + Z.ruler,
      html: '<p class="c-trait">' + Z.trait + '</p><div class="c-grid">' +
        '<div><label>下半年整體</label>' + Z.h2.overall + '</div>' +
        '<div><label>愛情</label>' + Z.h2.love + '</div>' +
        '<div><label>財運</label>' + Z.h2.money + '</div>' +
        '<div><label>事業</label>' + Z.h2.career + '</div>' +
        '<div><label>健康</label>' + Z.h2.health + '</div></div>' });
    // 生肖
    cards.push({ id: 'sx', icon: SX.icon, title: '生肖運程．屬' + sx.animal, tag: '2026 丙午馬年．' + SX.rel + '（生肖以立春為界）',
      html: '<p class="c-trait">' + SX.trait + '</p><p>' + SX.h2 + '</p>' });
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
        '<p class="c-note">＊筆畫依康熙字典並含數字慣例（四=4、五=5…），各流派或有一二畫之差，可回上一步微調。</p>' });
    // 八字五行
    const POS_NAME = { year: '年柱', month: '月柱', day: '日柱', hour: '時柱' };
    let btable = '<div class="bazi-pillars">';
    for (const c of baziRes.chars) btable += '<div class="pillar"><label>' + POS_NAME[c.pos] + '</label><div class="pillar-gz">' + c.gz + '</div><div class="pillar-elem">' + GAN_ELEM[c.gz[0]] + '．' + ZHI_ELEM[c.gz[1]] + '</div></div>';
    btable += '</div>';
    let ebars = '<div class="elem-bars">';
    const maxC = Math.max(...Object.values(baziRes.counts), 1);
    for (const e of ['木', '火', '土', '金', '水']) {
      ebars += '<div class="elem-row"><span class="elem-name e-' + e + '">' + e + '</span><div class="elem-track"><div class="elem-fill e-' + e + '" style="width:' + (baziRes.counts[e] / maxC * 100) + '%"></div></div><span class="elem-cnt">' + baziRes.counts[e] + '</span></div>';
    }
    ebars += '</div>';
    cards.push({ id: 'bazi', icon: '☯️', title: '八字五行．日主' + baziRes.dayMaster + GAN_ELEM[baziRes.dayMaster], tag: (baziRes.hourKnown ? '四柱八字' : '三柱六字（未填時辰）') + '．身' + (baziRes.strong ? '強' : '弱'),
      html: btable + ebars +
        '<p class="c-trait">' + DAYMASTER[baziRes.dayMaster] + '</p>' +
        '<p>五行以「<b>' + baziRes.maxElem + '</b>」最旺' +
        (baziRes.missing.length ? '，命中較缺「<b>' + baziRes.missing.join('、') + '</b>」，日常可藉' + baziRes.missing.map(e => ELEM_INFO[e].color.split('、')[0]).join('與') + '色系補氣' : '，五行俱全，是難得的均衡之命') +
        '。日主身' + (baziRes.strong ? '強，喜洩不喜扶，宜多付出、多創造，「' + baziRes.favorable.join('、') + '」是你的開運五行' : '弱，喜生扶，「' + baziRes.favorable.join('、') + '」是你的開運五行，多親近相應的顏色與方位') + '。</p>' +
        (baziRes.hourKnown ? '' : '<p class="c-note">＊未填出生時辰，以三柱推算；補上時辰可得更完整的命盤。</p>') });
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

    lastResult = {
      name, honorTxt: honor(), ymd: y + '/' + m + '/' + d,
      zName: Z.name, zIcon: Z.icon, animal: sx.animal, sxIcon: SX.icon, sxRel: SX.rel,
      lpTxt: (lp.master ? lp.master + '/' + lp.final : String(lp.final)), lpKey: NUMEROLOGY[lp.master || lp.final].key, py,
      scores, bestName: ASPECT_NAME[best], bestScore: scores[best],
      cope1: ZODIAC_COPE[zodiacKey].split('——')[0], dm: baziRes.dayMaster + GAN_ELEM[baziRes.dayMaster], dmStyle: DM_STYLE[baziRes.dayMaster],
      lucky, tarotTxt: T.n + (tarot.upright ? '（正位）' : '（逆位）'), tarotAdv: T.adv,
      missing: baziRes.missing.join('、') || '無', zH2: Z.h2.overall
    };
    pingResultCount();
  }

  // ---------- 精簡版 ----------
  function buildCompactText() {
    const r = lastResult;
    if (!r) return '';
    return [
      '🏮 玄機閣．命理精簡報告',
      r.name + ' ' + r.honorTxt + '｜國曆 ' + r.ymd,
      r.zIcon + ' ' + r.zName + '｜' + r.sxIcon + ' 屬' + r.animal + '（' + r.sxRel + '）｜靈數 ' + r.lpTxt + '（' + r.lpKey + '）｜日主 ' + r.dm,
      '── 2026 下半年五運 ──',
      '財運 ' + r.scores.wealth + '｜愛情 ' + r.scores.love + '｜事業 ' + r.scores.career + '｜健康 ' + r.scores.health + '｜貴人 ' + r.scores.social,
      '最旺：' + r.bestName + '（' + r.bestScore + ' 分）',
      '處事風格：' + r.cope1 + '；' + r.dmStyle,
      '五行補氣：缺' + r.missing + '｜開運色 ' + r.lucky.color + '｜幸運數字 ' + r.lucky.nums + '｜吉方 ' + r.lucky.dir,
      '幸運月份：' + r.lucky.month + '｜今日塔羅：' + r.tarotTxt,
      '──────────',
      '完整報告：' + siteUrl(),
      'by 旺來 ' + SITE.authorHandle + '（Threads：' + SITE.authorUrl + '）'
    ].join('\n');
  }
  function openCompact() {
    const r = lastResult;
    if (!r) return;
    $('#compact-body').innerHTML =
      '<div class="cp-title">🏮 玄機閣．命理精簡報告</div>' +
      '<div class="cp-name">' + esc(r.name) + ' ' + r.honorTxt + '<span>國曆 ' + r.ymd + '</span></div>' +
      '<div class="cp-chips"><span>' + r.zIcon + ' ' + r.zName + '</span><span>' + r.sxIcon + ' 屬' + r.animal + '（' + r.sxRel + '）</span><span>靈數 ' + r.lpTxt + '</span><span>日主 ' + r.dm + '</span></div>' +
      '<div class="cp-scores">' +
      ['財運|wealth', '愛情|love', '事業|career', '健康|health', '貴人|social'].map(x => {
        const [nm, k] = x.split('|');
        return '<div><label>' + nm + '</label><b>' + r.scores[k] + '</b></div>';
      }).join('') + '</div>' +
      '<div class="cp-line">⭐ 最旺：<b>' + r.bestName + '（' + r.bestScore + ' 分）</b>——' + esc(r.zH2) + '</div>' +
      '<div class="cp-line">🧭 處事風格：' + esc(r.cope1) + '；' + esc(r.dmStyle) + '。</div>' +
      '<div class="cp-line">🎨 開運：缺' + r.missing + '｜' + esc(r.lucky.color) + '｜數字 ' + esc(String(r.lucky.nums)) + '｜吉方 ' + r.lucky.dir + '｜幸運月 ' + r.lucky.month + '</div>' +
      '<div class="cp-line">🃏 今日塔羅：' + r.tarotTxt + '——' + esc(r.tarotAdv) + '</div>' +
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
    $('#btn-again').onclick = () => { show('#screen-form'); gotoStep(0); };
    $('#btn-print').onclick = () => window.print();
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

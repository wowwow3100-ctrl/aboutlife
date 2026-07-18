// ============ 玄機閣．命理計算引擎 ============
// 純計算，不碰畫面。依賴 gen.js（GEN）與 content.js / content2.js

// ---------- 種子隨機（同一人同一天結果固定）----------
function seedHash(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 星座 ----------
function getZodiac(m, d) {
  const v = m * 100 + d;
  for (let i = ZODIAC_BOUNDS.length - 1; i >= 0; i--) {
    const [bm, bd, key] = ZODIAC_BOUNDS[i];
    if (v >= bm * 100 + bd) return key;
  }
  return 'capricorn'; // 1/1–1/19
}

// ---------- 星座三區間 ----------
function getDecan(key, m, d) {
  const D = ZODIAC_DECANS[key];
  let idx;
  if (key === 'capricorn') idx = (m === 12) ? 0 : (d <= 10 ? 1 : 2);
  else {
    const v = m * 100 + d;
    idx = v >= D.b[1] ? 2 : (v >= D.b[0] ? 1 : 0);
  }
  return { idx, n: ['一', '二', '三'][idx], sub: D.sub[idx], range: D.range[idx], text: D.t[idx] };
}

// ---------- 節氣工具 ----------
function epochDays(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / 86400000); }
function termMinutes(ty, t) { return ((epochDays(ty, t[0], t[1]) * 24 + t[2]) * 60) + t[3]; }

// ---------- 生肖（以立春為界）----------
function getBaziYear(y, m, d, hh, mi) {
  const lc = GEN.TERMS[y] && GEN.TERMS[y][1];
  if (!lc) return y;
  const now = (epochDays(y, m, d) * 24 + hh) * 60 + mi;
  return now < termMinutes(y, lc) ? y - 1 : y;
}
function getShengxiao(y, m, d, hh, mi) {
  const by = getBaziYear(y, m, d, hh == null ? 12 : hh, mi == null ? 0 : mi);
  const idx = ((by - 4) % 12 + 12) % 12; // 子=0 → 4年=鼠? (1984 甲子=鼠)
  return { animal: SX_LIST[idx], baziYear: by };
}

// ---------- 生命靈數 ----------
function digitSum(n) { let s = 0; while (n > 0) { s += n % 10; n = Math.floor(n / 10); } return s; }
function lifePath(y, m, d) {
  let total = 0;
  for (const ch of String(y) + String(m).padStart(2, '0') + String(d).padStart(2, '0')) total += +ch;
  const steps = [total];
  let master = null;
  while (total > 9) {
    if (total === 11 || total === 22 || total === 33) { master = total; }
    total = digitSum(total);
    steps.push(total);
  }
  return { final: total, master, steps };
}
function personalYear(m, d, year) {
  let t = digitSum(m) + digitSum(d) + digitSum(year);
  while (t > 9) t = digitSum(t);
  return t;
}

// ---------- 姓名學 ----------
const COMPOUND_SURNAMES = ['歐陽', '司馬', '諸葛', '上官', '夏侯', '皇甫', '尉遲', '公孫', '長孫', '慕容', '司徒', '司空', '張簡', '范姜', '令狐', '東方', '赫連', '宇文', '呼延', '澹臺', '淳于', '單于', '申屠', '鍾離', '聞人', '獨孤'];
function splitName(full) {
  full = full.trim();
  for (const cs of COMPOUND_SURNAMES) {
    if (full.startsWith(cs) && full.length > 2) return { surname: cs, given: full.slice(2) };
  }
  return { surname: full.slice(0, 1), given: full.slice(1) };
}
function strokeOf(ch) { return GEN.STROKES[ch] || 0; }
// strokes: 與姓名等長的筆畫陣列（可被使用者手動修正後傳入）
function fiveGrids(surname, given, strokes) {
  const sn = surname.length, gn = given.length;
  const s = strokes;
  const sSum = s.slice(0, sn).reduce((a, b) => a + b, 0);
  const gSum = s.slice(sn).reduce((a, b) => a + b, 0);
  let tian, ren, di, wai, zong = sSum + gSum;
  if (sn === 1) tian = s[0] + 1; else tian = s[0] + s[1];
  ren = s[sn - 1] + s[sn];
  if (gn === 1) di = s[sn] + 1; else di = s[sn] + s[sn + 1];
  if (sn === 1 && gn === 1) wai = 2;
  else if (sn === 1) wai = s[s.length - 1] + 1;
  else if (gn === 1) wai = s[0] + 1;
  else wai = s[0] + s[s.length - 1];
  return { tian, ren, di, wai, zong };
}
function n81(n) { const i = ((n - 1) % 81) + 1; return { num: n, idx: i, info: N81[i] }; }
function gridElem(n) {
  const d = n % 10;
  if (d === 1 || d === 2) return '木';
  if (d === 3 || d === 4) return '火';
  if (d === 5 || d === 6) return '土';
  if (d === 7 || d === 8) return '金';
  return '水';
}
function elemRelation(a, b) { // a 對 b
  if (a === b) return '比和';
  if (SHENG[a] === b) return '生出';
  if (SHENG[b] === a) return '生入';
  if (KE[a] === b) return '剋出';
  return '剋入';
}
function sancai(tianE, renE, diE) {
  // 天→人、人→地
  const r1 = elemRelation(tianE, renE); // 天對人：生出=天生人(人得生 → 生入人)
  const r2 = elemRelation(renE, diE);
  const scoreMap = { '生出': 2, '比和': 2, '生入': 1.5, '剋出': 0.5, '剋入': 0 };
  // 天生人(天的生出)對人是吉；人剋地=掌控
  const s1 = { '生出': 2, '比和': 1.5, '生入': 1, '剋出': 0, '剋入': 0.8 }[r1];
  const s2 = { '生出': 1.2, '比和': 1.5, '生入': 2, '剋出': 0.8, '剋入': 0 }[r2];
  const total = s1 + s2;
  let label, cls;
  if (total >= 3.4) { label = '大吉'; cls = 'good'; }
  else if (total >= 2.5) { label = '吉'; cls = 'good'; }
  else if (total >= 1.8) { label = '中吉'; cls = 'mid'; }
  else if (total >= 1.2) { label = '平'; cls = 'mid'; }
  else { label = '需調和'; cls = 'bad'; }
  const p1 = { '生出': SANCAI_PHRASE['生入天人'], '生入': SANCAI_PHRASE['生出天人'], '比和': SANCAI_PHRASE['比和天人'], '剋出': SANCAI_PHRASE['剋入天人'], '剋入': SANCAI_PHRASE['剋出天人'] }[r1];
  const p2 = { '生出': SANCAI_PHRASE['生出人地'], '生入': SANCAI_PHRASE['生入人地'], '比和': SANCAI_PHRASE['比和人地'], '剋出': SANCAI_PHRASE['剋出人地'], '剋入': SANCAI_PHRASE['剋入人地'] }[r2];
  return { combo: tianE + renE + diE, label, cls, desc: p1 + '；' + p2 + '。', score: total };
}

// ---------- 八字 ----------
function gzName(i) { return GAN[i % 10] + ZHI[i % 12]; }
function bazi(y, m, d, hourIdx, lateZi) {
  // hourIdx: 0=子…11=亥，null=不知；lateZi: 晚子時(23時)
  const repHour = hourIdx == null ? 12 : (hourIdx === 0 ? (lateZi ? 23 : 0) : hourIdx * 2 - 1);
  const mi = 30;
  const by = getBaziYear(y, m, d, repHour, mi);
  const yIdx = ((by - 4) % 60 + 60) % 60;
  // 月柱
  const flat = [];
  for (const ty of [y - 1, y]) {
    const arr = GEN.TERMS[ty];
    if (arr) arr.forEach((t, i) => { if (t) flat.push({ ty, i, t }); });
  }
  const now = (epochDays(y, m, d) * 24 + repHour) * 60 + mi;
  let cur = null;
  for (const e of flat) { if (termMinutes(e.ty, e.t) <= now) cur = e; }
  let mPillar = null;
  if (cur) {
    const zhi = (cur.i === 11) ? 0 : cur.i + 1;
    const yGan = yIdx % 10;
    const mFromYin = ((zhi - 2) % 12 + 12) % 12;
    mPillar = { gan: ((yGan % 5) * 2 + 2 + mFromYin) % 10, zhi };
  }
  // 日柱（晚子時歸翌日）
  let ed = epochDays(y, m, d);
  if (hourIdx === 0 && lateZi) ed += 1;
  const dIdx = ((ed % 60) + GEN.DAY_K + 60) % 60;
  // 時柱
  let hPillar = null;
  if (hourIdx != null) {
    const dg = dIdx % 10;
    hPillar = { gan: ((dg % 5) * 2 + hourIdx) % 10, zhi: hourIdx };
  }
  const pillars = {
    year: { gan: yIdx % 10, zhi: yIdx % 12 },
    month: mPillar, day: { gan: dIdx % 10, zhi: dIdx % 12 }, hour: hPillar
  };
  // 五行統計
  const counts = { '木': 0, '火': 0, '土': 0, '金': 0, '水': 0 };
  const chars = [];
  for (const key of ['year', 'month', 'day', 'hour']) {
    const p = pillars[key];
    if (!p) continue;
    const g = GAN[p.gan], z = ZHI[p.zhi];
    counts[GAN_ELEM[g]]++; counts[ZHI_ELEM[z]]++;
    chars.push({ pos: key, gz: g + z });
  }
  const dm = GAN[pillars.day.gan];
  const dmElem = GAN_ELEM[dm];
  // 身強弱（同黨=同我+生我，排除日主本身）
  const shengMe = Object.keys(SHENG).find(k => SHENG[k] === dmElem);
  const allySum = counts[dmElem] - 1 + counts[shengMe];
  const totalChars = chars.length * 2 - 1;
  const strong = allySum >= totalChars / 2;
  // 喜用
  const favorable = strong ? [SHENG[dmElem], KE[dmElem], Object.keys(KE).find(k => KE[k] === dmElem)] : [shengMe, dmElem];
  const missing = Object.keys(counts).filter(k => counts[k] === 0);
  const maxElem = Object.keys(counts).reduce((a, b) => counts[a] >= counts[b] ? a : b);
  return { pillars, counts, chars, dayMaster: dm, dmElem, strong, favorable, missing, maxElem, baziYear: by, hourKnown: hourIdx != null };
}

// ---------- 農曆換算 ----------
function solar2lunar(y, m, d) {
  const L = GEN.LUNAR;
  const ed = epochDays(y, m, d);
  let yi = y - L.start;
  if (yi < 0 || yi >= L.cny.length) return null;
  if (ed < L.cny[yi]) yi--;
  if (yi < 0) return null;
  let off = ed - L.cny[yi];
  const lp = L.leap[yi], b = L.bits[yi];
  const total = lp ? 13 : 12;
  let mNum = 1, isLeap = false;
  for (let i = 0; i < total; i++) {
    const len = (b & (1 << i)) ? 30 : 29;
    if (off < len) return { ly: L.start + yi, lm: mNum, leap: isLeap, ld: off + 1 };
    off -= len;
    if (lp && mNum === lp && !isLeap) isLeap = true;
    else { isLeap = false; mNum++; }
  }
  return null;
}

// ---------- 紫微斗數 ----------
// hourIdx: 0=子…11=亥（必填）；lun: solar2lunar 結果
function ziwei(lun, hourIdx) {
  if (!lun || hourIdx == null) return null;
  // 命宮/身宮：寅起正月順數生月；由生月宮起子時，命逆數、身順數至生時
  const YIN = 2; // 寅 index（子=0）
  const monthGong = (YIN + lun.lm - 1) % 12;
  const ming = ((monthGong - hourIdx) % 12 + 12) % 12;
  const shen = (monthGong + hourIdx) % 12;
  // 命宮天干（五虎遁，依農曆年干）
  const yGan = ((lun.ly - 4) % 10 + 10) % 10;
  const yinGan = (yGan % 5) * 2 + 2; // 寅宮天干
  const mingGanIdx = (yinGan + ((ming - YIN) % 12 + 12) % 12) % 10;
  // 命宮干支 → 納音 → 五行局
  const gzIdx = (function () { for (let i = 0; i < 60; i++) { if (i % 10 === mingGanIdx && i % 12 === ming) return i; } return 0; })();
  const juElem = NAYIN[gzIdx];
  const ju = JU_NUM[juElem];
  // 紫微落宮：商=⌈日/局⌉，借=商×局−日；借奇減偶加；寅起
  const q = Math.ceil(lun.ld / ju);
  const borrow = q * ju - lun.ld;
  const c = (borrow % 2 === 1) ? q - borrow : q + borrow;
  const zw = ((YIN + c - 1) % 12 + 12) % 12;
  // 十四主星
  const stars = {};
  const put = (idx, name) => { const k = ((idx % 12) + 12) % 12; (stars[k] = stars[k] || []).push(name); };
  put(zw, '紫微'); put(zw - 1, '天機'); put(zw - 3, '太陽'); put(zw - 4, '武曲'); put(zw - 5, '天同'); put(zw - 8, '廉貞');
  const tf = ((4 - zw) % 12 + 12) % 12;
  put(tf, '天府'); put(tf + 1, '太陰'); put(tf + 2, '貪狼'); put(tf + 3, '巨門'); put(tf + 4, '天相'); put(tf + 5, '天梁'); put(tf + 6, '七殺'); put(tf + 10, '破軍');
  const mingStars = stars[ming] || [];
  const opposite = (ming + 6) % 12;
  const borrowed = mingStars.length ? null : (stars[opposite] || []);
  return { ming, shen, monthGong, juElem, ju, juName: JU_NAME[juElem], zw, stars, mingStars, borrowed, shenStars: stars[shen] || [] };
}

// ---------- 人類圖．太陽閘門 ----------
function sunLongitude(y, m, d, hh) {
  const n = (Date.UTC(y, m - 1, d, (hh == null ? 12 : hh) - 8) / 86400000) - 10957.5; // 自 J2000（台灣時區→UTC）
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;
  return ((L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) % 360 + 360) % 360;
}
function sunGate(y, m, d, hh) {
  const lon = sunLongitude(y, m, d, hh);
  const off = ((lon - 302) % 360 + 360) % 360;
  const idx = Math.floor(off / 5.625) % 64;
  const line = Math.floor((off % 5.625) / 0.9375) + 1;
  // 設計太陽：出生前約 88 度（≈88天）
  const dLon = ((lon - 88) % 360 + 360) % 360;
  const dOff = ((dLon - 302) % 360 + 360) % 360;
  const dIdx = Math.floor(dOff / 5.625) % 64;
  return { lon, gate: HD_WHEEL[idx], line, designGate: HD_WHEEL[dIdx] };
}

// ---------- 地支關係（月支×生肖支） ----------
const LIUHE = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const SANHE = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];
const HAI = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
const PO = { 0: 9, 9: 0, 1: 4, 4: 1, 2: 11, 11: 2, 3: 6, 6: 3, 5: 8, 8: 5, 7: 10, 10: 7 };
function zhiRel(a, b) {
  if (a === b) return { k: 'same', n: '同氣比和' };
  if (LIUHE[a] === b) return { k: 'liuhe', n: '六合' };
  if (SANHE.some(g => g.includes(a) && g.includes(b))) return { k: 'sanhe', n: '三合' };
  if ((a + 6) % 12 === b) return { k: 'chong', n: '相沖' };
  if (HAI[a] === b) return { k: 'hai', n: '相害' };
  if (PO[a] === b) return { k: 'po', n: '相破' };
  return { k: 'none', n: '無刑沖' };
}

// ---------- 塔羅（每人每日一張，固定）----------
function tarotDraw(profileSeed) {
  const today = new Date();
  const ds = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const rng = mulberry32(seedHash(profileSeed + '#tarot#' + ds));
  const idx = Math.floor(rng() * 22);
  const upright = rng() < 0.62;
  return { idx, upright, card: TAROT[idx] };
}

// ---------- 綜合分數 ----------
function computeScores(profile) {
  const { name, y, m, d, zodiacKey, animal, lp, grids, baziRes } = profile;
  const seed = seedHash(name + '|' + y + '-' + m + '-' + d + '|' + (profile.hourIdx == null ? 'x' : profile.hourIdx) + '|' + profile.blood);
  const aspects = ['wealth', 'love', 'career', 'health', 'social'];
  const scores = {};
  const sx = SHENGXIAO[animal];
  const zElem = ZODIAC[zodiacKey].elem;
  const zongLuck = n81(grids.zong).info.l;
  const renLuck = n81(grids.ren).info.l;
  for (const a of aspects) {
    const rng = mulberry32(seedHash(seed + '#' + a));
    let v = 58 + rng() * 30;
    v += (sx.relLevel || 0) * 3;
    if (zongLuck === '吉') v += 4; else if (zongLuck === '凶') v -= 4;
    if (a === 'career' || a === 'social') { if (renLuck === '吉') v += 3; else if (renLuck === '凶') v -= 3; }
    if (a === 'wealth' && lp.final === 8) v += 4;
    if (a === 'love' && (lp.final === 2 || lp.final === 6)) v += 4;
    if (a === 'career' && (lp.final === 1 || lp.final === 4)) v += 3;
    if (a === 'social' && lp.final === 3) v += 3;
    if (a === 'health' && lp.final === 7) v += 2;
    // 星座元素 vs 丙午火年
    const elemBonus = { '火': 4, '土': 3, '風': 1, '水': -2 }[zElem] || 0;
    if (a === 'career' || a === 'wealth') v += elemBonus;
    // 八字喜用逢火土年
    if (baziRes) {
      const fav = baziRes.favorable;
      if (fav.includes('火') || fav.includes('土')) v += 3;
    }
    scores[a] = Math.max(42, Math.min(97, Math.round(v)));
  }
  return scores;
}

// ---------- 下半年月運（月支×生肖×喜用推導）----------
function monthlyFortune(profileSeed, animalZhiIdx, favorable, animalName, luckyMonthStr) {
  const out = [];
  for (let mm = 7; mm <= 12; mm++) {
    const rng = mulberry32(seedHash(profileSeed + '#month#' + mm));
    const gz = MONTH_GZ_2026[mm];
    const zhiCh = gz[1];
    const zhiIdx = ZHI.indexOf(zhiCh);
    const elem = ZHI_ELEM[zhiCh];
    const rel = zhiRel(zhiIdx, animalZhiIdx);
    let score = { sanhe: 2, liuhe: 2, same: 1, chong: -2, hai: -1, po: -1, none: 0 }[rel.k];
    const fav = favorable.includes(elem);
    if (fav) score += 1;
    const isLucky = luckyMonthStr === (mm + '月');
    if (isLucky) score += 1;
    const cls = score >= 2 ? 'good' : (score <= -1 ? 'bad' : 'mid');
    let basis = mm + '月為' + gz + '月（月支' + zhiCh + '屬' + elem + '），' + zhiCh + '與你的生肖' + animalName + rel.n;
    if (fav) basis += '；' + elem + '又是你的喜用五行';
    if (isLucky) basis += '；並逢你的星座幸運月';
    const P = MONTH_TXT[cls];
    out.push({
      m: mm, title: MONTH_TITLE[mm], gz, cls, basis,
      label: cls === 'good' ? '吉' : cls === 'bad' ? '慎' : '平',
      overall: P.o[Math.floor(rng() * P.o.length)],
      money: P.m[Math.floor(rng() * P.m.length)],
      love: P.l[Math.floor(rng() * P.l.length)]
    });
  }
  return out;
}

// ---------- 開運處方 ----------
function luckyPrescription(profile) {
  const { baziRes, lp, zodiacKey } = profile;
  const z = ZODIAC[zodiacKey];
  let mainElem = null;
  if (baziRes) mainElem = baziRes.missing[0] || baziRes.favorable[0];
  const ei = mainElem ? ELEM_INFO[mainElem] : null;
  const rng = mulberry32(seedHash(profile.seedStr + '#lucky'));
  return {
    elem: mainElem,
    color: ei ? ei.color + '（補' + mainElem + '）' : z.h2.lucky.color,
    zColor: z.h2.lucky.color,
    nums: (ei ? ei.nums + '、' : '') + lp.final,
    dir: ei ? ei.dir : '—',
    item: ei ? ei.item : '貼身玉飾',
    care: ei ? ei.care : '規律作息',
    month: z.h2.lucky.month,
    doTip: LUCKY_DO[Math.floor(rng() * LUCKY_DO.length)],
    dontTip: LUCKY_DONT[Math.floor(rng() * LUCKY_DONT.length)]
  };
}

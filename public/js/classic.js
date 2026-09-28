// ============ 旺來開運所．古籍命理引擎 ============
// 八字：十神、藏干、月令旺衰、格局、調候、大運、流年（參《子平真詮》《滴天髓》《窮通寶鑑》《三命通會》《淵海子平》）
// 紫微：十二宮、生年四化、六吉六煞、流年四化（參《紫微斗數全書》）
// 依賴：content.js（GAN, ZHI, GAN_ELEM, ZHI_ELEM, SHENG, KE）、fortune.js、gen.js

const BOOKS = {
  zp: '《子平真詮》（清．沈孝瞻）',
  dts: '《滴天髓》（劉基註、任鐵樵增註）',
  qt: '《窮通寶鑑》（余春台編）',
  sm: '《三命通會》（明．萬民英）',
  yh: '《淵海子平》（徐大升）',
  zw: '《紫微斗數全書》（題陳希夷）',
  xq: '熊崎健翁《姓名之神祕》（五格剖象法）',
  hd: 'Ra Uru Hu《The Definitive Book of Human Design》',
  astro: '2026 行星星曆（木星 6/30 入獅子、土星牡羊逆行 7/26–12/10、水星逆行 10/24–11/13）'
};
function cite(k) { return '<span class="cite">（參考：' + BOOKS[k] + '）</span>'; }

// ---------- 藏干（本氣、中氣、餘氣） ----------
const CANG = {
  '子': ['癸'], '丑': ['己', '癸', '辛'], '寅': ['甲', '丙', '戊'], '卯': ['乙'],
  '辰': ['戊', '乙', '癸'], '巳': ['丙', '戊', '庚'], '午': ['丁', '己'], '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'], '酉': ['辛'], '戌': ['戊', '辛', '丁'], '亥': ['壬', '甲']
};
const CANG_W = [1.0, 0.5, 0.3];

// ---------- 十神 ----------
function tenGod(dm, other) {
  const a = GAN.indexOf(dm), b = GAN.indexOf(other);
  const same = (a % 2) === (b % 2);
  const de = GAN_ELEM[dm], oe = GAN_ELEM[other];
  if (de === oe) return same ? '比肩' : '劫財';
  if (SHENG[de] === oe) return same ? '食神' : '傷官';
  if (KE[de] === oe) return same ? '偏財' : '正財';
  if (KE[oe] === de) return same ? '七殺' : '正官';
  return same ? '偏印' : '正印';
}
const TG_PLAIN = {
  '比肩': '自我、同輩、獨立', '劫財': '競爭、義氣、分享', '食神': '才華、享受、溫和表達', '傷官': '創意、叛逆、鋒芒',
  '偏財': '外財、交際、機會財', '正財': '正職收入、務實、守成', '七殺': '魄力、壓力、開創', '正官': '規矩、名位、責任',
  '偏印': '偏門學問、直覺、獨處', '正印': '長輩庇蔭、學習、包容'
};
const TG_DESC = {
  '比肩': '比肩重者主體意識強，重情義、講骨氣，凡事靠自己打拼。白話說：你不愛被安排，自己的路自己走，但要留意固執與單打獨鬥。',
  '劫財': '劫財重者果敢好勝、交遊廣闊，行動力強。白話說：你衝勁十足、朋友多，唯獨錢財容易「左手進右手出」，合夥與借貸要謹慎。',
  '食神': '食神為「壽星」，主溫厚聰明、口福與才藝。白話說：你懂得享受生活、表達柔和，是讓人放鬆的存在，靠才華自然帶財。',
  '傷官': '傷官主聰明秀發、才氣外露，不甘受拘束。白話說：你點子多、嘴巴快、看不慣就想改，適合創意與專業領域，說話留三分更順。',
  '偏財': '偏財主慷慨豪爽、善於交際，得財多由機會與人脈。白話說：你對賺錢機會很敏感、人緣好，適合業務、投資與多角經營。',
  '正財': '正財主勤儉踏實、重信守約，財來自正途穩定之源。白話說：你是務實派，靠專業與努力累積，理財保守但穩健。',
  '七殺': '七殺又稱偏官，主威權、魄力與壓力。《子平真詮》謂「殺以攻身，似非美物，而大貴之格多存七殺」。白話說：你抗壓性強、敢扛大事，逆境反而激發潛能。',
  '正官': '正官主端正守禮、重名譽責任，貴氣之神。白話說：你做事有原則、守規矩，適合組織與管理，是長官放心的人。',
  '偏印': '偏印又稱梟神，主領悟力強、偏好冷門學問與獨處思考。白話說：你直覺敏銳、想法獨特，適合研究、技術與身心靈領域。',
  '正印': '正印主仁慈寬厚、好學重名，得長輩貴人庇蔭。白話說：你溫和有涵養、學習力強，一路常有人照顧提攜。'
};
// 格局（子平真詮：「八字用神，專求月令」）
const GEJU_DESC = {
  '正官格': '正官格為貴格之首，《子平真詮》以「官以財生、以印護」為美。白話：一生重名譽與秩序，適合公職、大企業與管理職，循正途而上。',
  '七殺格': '七殺格喜食神制殺或印綬化殺，制化得宜則「殺化為權」。白話：人生起伏大但格局也大，適合開創、競爭激烈的舞台，學會節制鋒芒就能掌權。',
  '正財格': '正財格喜身強能任財，忌比劫奪財。白話：財運來自穩定本業與長期累積，適合財務、實業與經營，愈穩愈富。',
  '偏財格': '偏財格「財逢身旺而發」，主豪爽得人緣。白話：賺錢機會多、點子也多，適合業務、貿易與投資，但須量力而為。',
  '正印格': '正印格喜官生印，主清貴學問。白話：適合教育、學術、專業證照之路，貴人多、名聲好，財來得慢但穩。',
  '偏印格': '偏印格（梟印）喜偏財制梟，主特殊技藝。白話：你擅長冷門專業、技術或玄學，走別人沒走的路反而成功。',
  '食神格': '食神格《子平真詮》謂「食神生財，富格」，主福壽清秀。白話：以才華與口碑致富，適合創作、餐飲、服務與專業技藝。',
  '傷官格': '傷官格喜傷官生財或傷官佩印，忌見官。白話：才氣縱橫、不甘平凡，適合創意、技術、自媒體與自由業，避免硬碰權威。',
  '建祿格': '建祿格（月令為日主之祿），主白手起家，《子平真詮》謂「祿劫取用，須看透干」。白話：少依祖蔭、靠自己打天下，越做越穩。',
  '月刃格': '月刃格（陽刃格）氣勢剛強，喜官殺制刃。白話：意志堅決、行動力驚人，適合軍警、醫療、運動與開創型事業，需懂得收斂脾氣。'
};
// 納音（三命通會）
const NAYIN_NAME = ['海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火', '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土', '霹靂火', '松柏木', '長流水',
  '沙中金', '山下火', '平地木', '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金', '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水'];
// 流年（丙午）十神主題
const LIUNIAN_TG = {
  '比肩': '流年見比肩，主同儕競爭與自立：宜合作分工、不宜合夥投資。',
  '劫財': '流年見劫財，主破耗與人際拉扯：守好荷包，慎防借貸與作保。',
  '食神': '流年見食神，主才華發揮與口福：適合展現作品、進修技藝，心情愉快。',
  '傷官': '流年見傷官，主變革與表現慾：創意爆發，但言語易得罪人，職場宜低調。',
  '偏財': '流年見偏財，主機會財與交際：業務、副業、投資機會多，宜見好就收。',
  '正財': '流年見正財，主收入與務實：加薪、正職獲利有望，適合儲蓄置產。',
  '七殺': '流年見七殺，主壓力與挑戰：責任加重、競爭激烈，撐過即升級，注意身體。',
  '正官': '流年見正官，主名位與規範：升遷、考試、婚姻有利，行事守規矩最吉。',
  '偏印': '流年見偏印，主思考與轉向：適合學習新技能、沉澱規劃，避免孤立。',
  '正印': '流年見正印，主貴人與庇蔭：長輩助力、進修考證順利，也利購屋。'
};
const WANGXIANG = { '旺': '當令最旺', '相': '得月令生扶', '休': '洩氣於月令', '囚': '耗力於月令', '死': '受月令剋制' };

function seasonElem(zhi) { return { '寅': '木', '卯': '木', '巳': '火', '午': '火', '申': '金', '酉': '金', '亥': '水', '子': '水' }[zhi] || '土'; }
function wangState(dmE, sE) {
  if (dmE === sE) return '旺';
  if (SHENG[sE] === dmE) return '相';
  if (SHENG[dmE] === sE) return '休';
  if (KE[dmE] === sE) return '囚';
  return '死';
}

// 八字深度分析
function baziDeep(b, y, m, d, hourIdx, lateZi, gender) {
  const dm = b.dayMaster, dmE = GAN_ELEM[dm];
  const P = b.pillars;
  const keys = ['year', 'month', 'day', 'hour'];
  const stems = [], branches = [];
  for (const k of keys) {
    if (!P[k]) continue;
    stems.push({ pos: k, g: GAN[P[k].gan] });
    branches.push({ pos: k, z: ZHI[P[k].zhi] });
  }
  // 十神表
  const tgStem = stems.map(s => ({ pos: s.pos, g: s.g, tg: s.pos === 'day' ? '日主' : tenGod(dm, s.g) }));
  const tgHidden = branches.map(br => ({ pos: br.pos, z: br.z, list: CANG[br.z].map(h => ({ g: h, tg: tenGod(dm, h) })) }));
  // 強弱（月令加倍）
  let ally = 0, total = 0;
  const tgScore = {};
  const add = (g, w) => {
    const tg = tenGod(dm, g);
    tgScore[tg] = (tgScore[tg] || 0) + w;
    total += w;
    if (['比肩', '劫財', '正印', '偏印'].includes(tg)) ally += w;
  };
  stems.forEach(s => { if (s.pos !== 'day') add(s.g, 1); });
  branches.forEach(br => CANG[br.z].forEach((h, i) => add(h, CANG_W[i] * (br.pos === 'month' ? 2 : 1))));
  const ratio = total ? ally / total : 0.5;
  const monthZ = ZHI[P.month.zhi];
  const ws = wangState(dmE, seasonElem(monthZ));
  let level;
  if (ratio >= 0.62) level = '身強'; else if (ratio >= 0.5) level = '中和偏強'; else if (ratio >= 0.38) level = '中和偏弱'; else level = '身弱';
  const strong = ratio >= 0.5;
  // 扶抑用神
  const shengMe = Object.keys(SHENG).find(k => SHENG[k] === dmE);
  const keMe = Object.keys(KE).find(k => KE[k] === dmE);
  let fav = strong ? [SHENG[dmE], KE[dmE], keMe] : [shengMe, dmE];
  // 調候（窮通寶鑑：冬生重火暖局，夏生重水潤局）
  const winter = ['亥', '子', '丑'].includes(monthZ), summer = ['巳', '午', '未'].includes(monthZ);
  let tiaohou = null;
  if (winter) {
    tiaohou = { e: '火', txt: '生於冬月，寒氣當令，《窮通寶鑑》論冬生之命首重丙火暖局——白話：你的命盤偏「冷」，需要熱情、陽光與行動力來推動。' };
    fav = ['火'].concat(fav.filter(e => e !== '火'));
  } else if (summer) {
    tiaohou = { e: '水', txt: '生於夏月，火炎土燥，《窮通寶鑑》論夏生之命首重壬癸水潤局——白話：你的命盤偏「熱」，需要冷靜、休息與智慧來調和。' };
    fav = ['水'].concat(fav.filter(e => e !== '水'));
  }
  // 格局
  const mStems = [P.year, P.month, P.hour].filter(Boolean).map(p => GAN[p.gan]);
  const cang = CANG[monthZ];
  let geStem = cang.find(h => mStems.includes(h)) || cang[0];
  let geTg = tenGod(dm, geStem);
  let geju;
  if (geTg === '比肩') geju = '建祿格';
  else if (geTg === '劫財') geju = '月刃格';
  else geju = geTg + '格';
  const touchu = mStems.includes(geStem);
  // 主導十神
  const domTg = Object.keys(tgScore).filter(k => !['比肩', '劫財'].includes(k) || tgScore[k] > 0)
    .sort((a, b2) => tgScore[b2] - tgScore[a])[0];
  // 納音
  const yIdx = (() => { for (let i = 0; i < 60; i++) if (i % 10 === P.year.gan && i % 12 === P.year.zhi) return i; return 0; })();
  const nayin = NAYIN_NAME[Math.floor(yIdx / 2)];
  // 流年丙午
  const lnStem = tenGod(dm, '丙'), lnBranch = tenGod(dm, '丁');
  // 大運
  let dayun = null;
  if (gender === '男' || gender === '女') {
    const yangYear = P.year.gan % 2 === 0;
    const forward = (yangYear && gender === '男') || (!yangYear && gender === '女');
    const repHour = hourIdx == null ? 12 : (hourIdx === 0 ? (lateZi ? 23 : 0) : hourIdx * 2 - 1);
    const now = (epochDays(y, m, d) * 24 + repHour) * 60 + 30;
    const flat = [];
    for (const ty of [y - 1, y, y + 1]) { const arr = GEN.TERMS[ty]; if (arr) arr.forEach(t => { if (t) flat.push(termMinutes(ty, t)); }); }
    flat.sort((a, b2) => a - b2);
    let target = forward ? flat.find(t => t > now) : flat.filter(t => t <= now).pop();
    if (target != null) {
      const days = Math.abs(target - now) / 1440;
      const startAge = Math.max(1, Math.round(days / 3));
      const age = 2026 - y;
      const mIdx = (() => { for (let i = 0; i < 60; i++) if (i % 10 === P.month.gan && i % 12 === P.month.zhi) return i; return 0; })();
      const seq = [];
      for (let i = 1; i <= 8; i++) {
        const gi = ((mIdx + (forward ? i : -i)) % 60 + 60) % 60;
        seq.push({ gz: GAN[gi % 10] + ZHI[gi % 12], from: startAge + (i - 1) * 10, to: startAge + i * 10 - 1, tg: tenGod(dm, GAN[gi % 10]) });
      }
      const cur = seq.find(s => age >= s.from && age <= s.to) || null;
      dayun = { forward, startAge, seq, cur, age };
    }
  }
  return { tgStem, tgHidden, ratio, level, strong, ws, monthZ, fav, tiaohou, geju, geStem, geTg, touchu, domTg, nayin, lnStem, lnBranch, dayun };
}

// ---------- 紫微斗數深化 ----------
const PALACES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '交友', '官祿', '田宅', '福德', '父母'];
// 生年四化（祿權科忌）依《紫微斗數全書》
const SIHUA = {
  '甲': ['廉貞', '破軍', '武曲', '太陽'], '乙': ['天機', '天梁', '紫微', '太陰'], '丙': ['天同', '天機', '文昌', '廉貞'],
  '丁': ['太陰', '天同', '天機', '巨門'], '戊': ['貪狼', '太陰', '右弼', '天機'], '己': ['武曲', '貪狼', '天梁', '文曲'],
  '庚': ['太陽', '武曲', '太陰', '天同'], '辛': ['巨門', '太陽', '文曲', '文昌'], '壬': ['天梁', '紫微', '左輔', '武曲'],
  '癸': ['破軍', '巨門', '太陰', '貪狼']
};
const HUA_NAME = ['化祿', '化權', '化科', '化忌'];
const HUA_MEAN = { '化祿': '福分與資源流入', '化權': '掌控力與主導權', '化科': '名聲、貴人與好評', '化忌': '執著之處、人生功課' };
const KUIYUE = { '甲': [1, 7], '戊': [1, 7], '庚': [1, 7], '乙': [0, 8], '己': [0, 8], '丙': [11, 9], '丁': [11, 9], '壬': [3, 5], '癸': [3, 5], '辛': [6, 2] };
const LUCUN = { '甲': 2, '乙': 3, '丙': 5, '戊': 5, '丁': 6, '己': 6, '庚': 8, '辛': 9, '壬': 11, '癸': 0 };
const HUOLING = { 2: [1, 3], 6: [1, 3], 10: [1, 3], 8: [2, 10], 0: [2, 10], 4: [2, 10], 5: [3, 10], 9: [3, 10], 1: [3, 10], 11: [9, 10], 3: [9, 10], 7: [9, 10] };
const AUX_GOOD = ['文昌', '文曲', '左輔', '右弼', '天魁', '天鉞'];
const AUX_BAD = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];
const AUX_MEAN = {
  '文昌': '科甲文墨、考運', '文曲': '口才才藝、異路功名', '左輔': '助力、同輩相挺', '右弼': '助力、暗中貴人',
  '天魁': '陽貴人、長官提拔', '天鉞': '陰貴人、異性助力', '擎羊': '剛烈衝突、刑傷', '陀羅': '拖延糾纏、是非',
  '火星': '急躁爆發、突來變化', '鈴星': '悶燒壓抑、暗中阻力', '地空': '空想、錢財易空', '地劫': '劫耗、起伏波折'
};
// 主星入三方宮位（夫妻／財帛／官祿）簡斷
const STAR_PALACE = {
  '紫微': ['伴侶條件佳、有主見，宜相互尊重', '財源大且穩，重視體面，善用資源生財', '適合領導管理，事業格局大'],
  '天機': ['伴侶聰明機靈，感情多變化，溝通是關鍵', '財靠腦力與策劃，收入多元但起伏', '適合企劃、顧問、技術與變動型工作'],
  '太陽': ['伴侶熱情大方，男命得助、女命宜晚婚', '財來自名聲與付出，先施後得', '適合公職、公眾事務、教育與傳播'],
  '武曲': ['伴侶剛直務實，感情宜多表達柔情', '正財強，理財有方，屬實業致富型', '適合金融、財務、實業與執行型職務'],
  '天同': ['伴侶溫和體貼，感情和諧、宜防懶散', '財來自福氣與人緣，不愁吃穿但宜積極', '適合服務、福利、餐飲與輕鬆和諧環境'],
  '廉貞': ['感情濃烈、桃花較多，宜專一經營', '財來自專業與交際，需防是非', '適合專業技術、公關、法律與藝術'],
  '天府': ['伴侶穩重持家，婚姻安定', '財庫豐厚，善守財，理財保守穩健', '適合管理、行政、財務與穩定大機構'],
  '太陰': ['伴侶溫柔細膩，感情重浪漫與默契', '宜累積型財富，利不動產與儲蓄', '適合財務、房地產、設計與幕僚'],
  '貪狼': ['桃花旺、感情豐富，宜慎選對象', '財來自交際與多元經營，偏財運佳', '適合業務、娛樂、美學與多角經營'],
  '巨門': ['感情多口舌，溝通方式決定婚姻品質', '財靠口才與專業，勞心得財', '適合教學、法律、業務、媒體與評論'],
  '天相': ['伴侶正派可靠，婚姻重承諾', '財源穩定，量入為出', '適合幕僚、行政、服務與輔佐型職務'],
  '天梁': ['伴侶年長或成熟穩重，感情有照顧味', '財運穩中帶貴人，不宜投機', '適合醫療、教育、法律、公益與顧問'],
  '七殺': ['感情來得快，宜先了解再承諾', '財來自拚搏，大進大出', '適合開創、軍警、業務與挑戰型事業'],
  '破軍': ['感情變動較大，晚婚或磨合後更穩', '財先破後成，宜穩健理財', '適合改革、創業、技術與破舊立新的領域']
};

function ziweiDeep(zw, lun, hourIdx) {
  if (!zw || !lun || hourIdx == null) return null;
  const yGan = GAN[((lun.ly - 4) % 10 + 10) % 10];
  const yZhi = ((lun.ly - 4) % 12 + 12) % 12;
  const h = hourIdx, lm = lun.lm;
  const aux = {};
  const put = (i, n) => { const k = ((i % 12) + 12) % 12; (aux[k] = aux[k] || []).push(n); };
  put(10 - h, '文昌'); put(4 + h, '文曲'); put(4 + lm - 1, '左輔'); put(10 - (lm - 1), '右弼');
  put(KUIYUE[yGan][0], '天魁'); put(KUIYUE[yGan][1], '天鉞');
  const lc = LUCUN[yGan];
  put(lc + 1, '擎羊'); put(lc - 1, '陀羅');
  put(11 + h, '地劫'); put(11 - h, '地空');
  const hl = HUOLING[yZhi];
  put(hl[0] + h, '火星'); put(hl[1] + h, '鈴星');
  const palaceOf = idx => PALACES[((zw.ming - idx) % 12 + 12) % 12];
  const idxOfPalace = name => ((zw.ming - PALACES.indexOf(name)) % 12 + 12) % 12;
  const findStar = s => {
    for (const k of Object.keys(zw.stars)) if (zw.stars[k].includes(s)) return +k;
    for (const k of Object.keys(aux)) if (aux[k].includes(s)) return +k;
    return null;
  };
  const sihua = SIHUA[yGan].map((s, i) => ({ star: s, hua: HUA_NAME[i], palace: findStar(s) != null ? palaceOf(findStar(s)) : '—' }));
  const liunian = SIHUA['丙'].map((s, i) => ({ star: s, hua: HUA_NAME[i], palace: findStar(s) != null ? palaceOf(findStar(s)) : '—' }));
  const three = ['夫妻', '財帛', '官祿'].map((p, pi) => {
    const idx = idxOfPalace(p);
    let stars = zw.stars[idx] || [];
    let borrowed = false;
    if (!stars.length) { stars = zw.stars[(idx + 6) % 12] || []; borrowed = true; }
    return { p, zhi: ZHI[idx], stars, borrowed, aux: aux[idx] || [], txt: stars.map(s => s + '：' + STAR_PALACE[s][pi]).join('；') };
  });
  const mingAux = aux[zw.ming] || [];
  return { yGan, aux, sihua, liunian, three, mingAux };
}

// ---------- 今日運勢（流日干支 × 日主十神） ----------
const DAILY_TG = {
  '比肩': { s: 72, t: '今日比肩當值：適合獨立作業、做自己的決定；與同事朋友易有意見分歧，堅持但不硬碰。', yi: '健身、整理個人事務', ji: '合夥談錢' },
  '劫財': { s: 60, t: '今日劫財當值：人情與花費都多，荷包要顧；衝勁強，適合運動與行動派的事。', yi: '運動、團隊活動', ji: '借錢、衝動購物' },
  '食神': { s: 86, t: '今日食神當值：心情愉快、靈感豐富，是享受美食、創作與約會的好日子。', yi: '創作、聚餐、約會', ji: '過度放縱' },
  '傷官': { s: 68, t: '今日傷官當值：點子多、表達慾強，適合提案與發想；說話易直，留三分給人。', yi: '腦力激盪、學新東西', ji: '頂撞長官、網路筆戰' },
  '偏財': { s: 84, t: '今日偏財當值：人緣與機會財都旺，適合業務拜訪、社交與小試身手。', yi: '談生意、社交', ji: '貪心加碼' },
  '正財': { s: 80, t: '今日正財當值：適合處理帳務、談薪、踏實完成手上工作，努力看得到回報。', yi: '理財、完成工作', ji: '拖延正事' },
  '七殺': { s: 58, t: '今日七殺當值：壓力與挑戰上門，但也是展現魄力的時機；注意交通與情緒。', yi: '攻克難題', ji: '冒險、爭吵' },
  '正官': { s: 82, t: '今日正官當值：貴氣之日，適合面試、見長官、處理公文與正式場合。', yi: '面試、簽約、拜訪長輩', ji: '違規、遲到' },
  '偏印': { s: 66, t: '今日偏印當值：直覺敏銳、適合獨處思考與研究；人際上容易想太多。', yi: '閱讀、研究、冥想', ji: '疑神疑鬼' },
  '正印': { s: 88, t: '今日正印當值：貴人與長輩助力明顯，學習、考試、求助都順利。', yi: '讀書、請教、求援', ji: '固執己見' }
};
// ---------- 今日運勢（多重依據，逐項加減分，全部攤開給使用者看） ----------
const JIANCHU = ['建', '除', '滿', '平', '定', '執', '破', '危', '成', '收', '開', '閉'];
const JIANCHU_INFO = {
  '建': { d: 0, t: '建日：萬物初生，適合起頭、規劃、見長輩；不宜動土、搬遷。' },
  '除': { d: 3, t: '除日：除舊布新，適合打掃、斷捨離、看醫生、處理舊帳。' },
  '滿': { d: 0, t: '滿日：氣滿則溢，適合祈福、收成、聚餐；簽約大事宜保守。' },
  '平': { d: 0, t: '平日：平穩無波，適合例行事務、修補關係；不宜冒險。' },
  '定': { d: 3, t: '定日：安定之日，適合定案、簽約、訂婚、做長期決定。' },
  '執': { d: 2, t: '執日：執守之日，適合執行計畫、收款、整理；不宜搬家遠行。' },
  '破': { d: -6, t: '破日：黃曆「月破」大耗之日，諸事不宜開新局，宜收斂、只做例行。' },
  '危': { d: 1, t: '危日：居安思危，做事多一分謹慎，登高涉險宜避；適合反省檢討。' },
  '成': { d: 4, t: '成日：萬事易成，適合開業、簽約、告白、提案。' },
  '收': { d: 0, t: '收日：收穫收斂，適合收帳、存錢、收尾；不宜開始新事。' },
  '開': { d: 4, t: '開日：開通之日，適合開工、面試、出行、見新朋友。' },
  '閉': { d: -2, t: '閉日：閉藏之日，適合休息、存錢、獨處；不宜開張、大型社交。' }
};
const SHA_DIR = { 8: '南', 0: '南', 4: '南', 2: '北', 6: '北', 10: '北', 5: '東', 9: '東', 1: '東', 11: '西', 3: '西', 7: '西' };
const ZODIAC_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
const SIGN_ZH = ['牡羊座', '金牛座', '雙子座', '巨蟹座', '獅子座', '處女座', '天秤座', '天蠍座', '射手座', '魔羯座', '水瓶座', '雙魚座'];
// 2026 行星逆行（依 2026 星曆；陰影期為逆行前後的「回顧區」）
const RETRO_2026 = [
  { p: '水星', from: [2, 26], to: [3, 20], pre: [2, 12], post: [4, 8], sign: '雙魚座', d: -3, t: '溝通、合約、交通、3C 易出錯，重要訊息多確認一次' },
  { p: '水星', from: [6, 29], to: [7, 23], pre: [6, 13], post: [8, 7], sign: '巨蟹座', d: -3, t: '溝通、合約、交通、3C 易出錯，重要訊息多確認一次' },
  { p: '水星', from: [10, 24], to: [11, 13], pre: [10, 4], post: [11, 30], sign: '天蠍座', d: -3, t: '溝通、合約、交通、3C 易出錯，重要訊息多確認一次' },
  { p: '金星', from: [10, 3], to: [11, 14], pre: [9, 3], post: [12, 15], sign: '天蠍座→天秤座', d: -2, t: '感情與金錢價值觀重新檢視，舊情人舊帳可能回頭，大額消費與告白宜緩' },
  { p: '土星', from: [7, 26], to: [12, 10], sign: '牡羊座', d: 0, t: '舊問題回頭要你處理，適合補基礎、不適合硬衝' }
];
function md(m, d) { return m * 100 + d; }
function moonLongitude(y, m, d) {       // 台灣中午；低精度月球黃經（誤差約 1–2°）
  const n = (Date.UTC(y, m - 1, d, 4) / 86400000) - 10957.5;
  const r = Math.PI / 180;
  const L = 218.316 + 13.176396 * n, M = (134.963 + 13.064993 * n) * r, F = (93.272 + 13.229350 * n) * r;
  const D = (297.850 + 12.190749 * n) * r, Ms = (357.529 + 0.98560028 * n) * r;
  const lon = L + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F);
  return ((lon % 360) + 360) % 360;
}
function dailyFortune(dm, fav, date, ctx) {
  ctx = ctx || {};
  const dt = date || new Date();
  const Y = dt.getFullYear(), Mo = dt.getMonth() + 1, Dd = dt.getDate();
  const ed = epochDays(Y, Mo, Dd);
  const di = ((ed % 60) + GEN.DAY_K + 60) % 60;
  const gi = di % 10, zi = di % 12;
  const g = GAN[gi], z = ZHI[zi];
  const tg = tenGod(dm, g);
  const D = DAILY_TG[tg];
  const F = [];                                   // 依據清單 {k, h, t, d}
  F.push({ k: '十神', h: g + '日．' + tg, t: '今天是' + g + z + '日，天干「' + g + '」對你的日主「' + dm + '」是' + tg + '，定下今天的基調（基礎 ' + D.s + ' 分）', d: 0 });
  // 五行喜忌
  const ge = GAN_ELEM[g], ze = ZHI_ELEM[z];
  const gHit = fav.includes(ge), zHit = fav.includes(ze);
  F.push({ k: '五行', h: g + ge + '．' + z + ze, t: '今日天干屬' + ge + '、地支屬' + ze + '；你的喜用五行是' + fav.join('、') + '，' +
    (gHit && zHit ? '天干地支都是你需要的，順風日' : gHit ? '天干' + ge + '正是你的喜用' : zHit ? '地支' + ze + '正是你的喜用' : '兩者都不是你的喜用，氣場普通'), d: (gHit ? 5 : 0) + (zHit ? 4 : 0) + (!gHit && !zHit ? -2 : 0) });
  // 日支 × 你的日支（自身與伴侶宮）
  if (ctx.dayZhi != null) {
    const r = zhiRel(zi, ctx.dayZhi);
    const map = { liuhe: [6, '六合，人和、感情與合作都順'], sanhe: [4, '三合，容易得到助力'], same: [2, '比和，做自己最自在'], chong: [-8, '相沖，情緒、感情或身體易起波動，凡事慢半拍'], hai: [-4, '相害，小人口舌多，說話留三分'], po: [-3, '相破，計畫易被打斷，預留彈性'], none: [0, '無刑沖，平穩'] };
    const [dv, tx] = map[r.k];
    F.push({ k: '日支', h: z + '×' + ZHI[ctx.dayZhi], t: '今日地支「' + z + '」與你八字日支「' + ZHI[ctx.dayZhi] + '」（自身與伴侶宮）' + tx, d: dv });
  }
  // 黃曆沖煞 × 你的生肖
  const chongZ = (zi + 6) % 12;
  let sxD = 0, sxT = '黃曆：今日沖' + ZHI_ANIMAL[ZHI[chongZ]] + '、煞' + SHA_DIR[zi];
  if (ctx.yearZhi != null) {
    const r2 = zhiRel(zi, ctx.yearZhi);
    const an = ZHI_ANIMAL[ZHI[ctx.yearZhi]];
    if (r2.k === 'chong') { sxD = -6; sxT += '——正好沖你的生肖「' + an + '」，今天低調、不做重大決定'; }
    else if (r2.k === 'liuhe' || r2.k === 'sanhe') { sxD = 3; sxT += '；今日「' + ZHI_ANIMAL[z] + '」與你的生肖「' + an + '」' + r2.n + '，貴人運加分'; }
    else sxT += '；與你的生肖「' + an + '」無沖';
  }
  F.push({ k: '沖煞', h: '沖' + ZHI_ANIMAL[ZHI[chongZ]] + '煞' + SHA_DIR[zi], t: sxT, d: sxD });
  // 建除十二神（依節氣月建）
  let jc = null;
  try {
    const mp = bazi(Y, Mo, Dd, 6, false).pillars.month;
    if (mp) {
      jc = JIANCHU[((zi - mp.zhi) % 12 + 12) % 12];
      F.push({ k: '建除', h: jc + '日', t: '節氣月建為「' + ZHI[mp.zhi] + '」月，今日值「' + jc + '」——' + JIANCHU_INFO[jc].t, d: JIANCHU_INFO[jc].d });
    }
  } catch (e) {}
  // 流年太歲
  if (Y === 2026 && zi === 0) F.push({ k: '太歲', h: '日沖太歲', t: '2026 丙午年太歲在午，今日子水沖午，外在環境多變動，行事宜緩', d: -2 });
  // 行星逆行／陰影期
  const now = md(Mo, Dd);
  if (Y === 2026) for (const R of RETRO_2026) {
    if (now >= md(...R.from) && now <= md(...R.to)) F.push({ k: R.p + '逆行', h: R.p + '逆行中', t: R.p + '逆行於' + R.sign + '（' + R.from.join('/') + '–' + R.to.join('/') + '）：' + R.t, d: R.d });
    else if (R.pre && now >= md(...R.pre) && now < md(...R.from)) F.push({ k: R.p + '陰影', h: R.p + '逆行前陰影期', t: R.p + '將於 ' + R.from.join('/') + ' 逆行，現在進入前陰影期：' + R.t + '，提早把重要的事處理掉', d: Math.round(R.d / 2) });
    else if (R.post && now > md(...R.to) && now <= md(...R.post)) F.push({ k: R.p + '陰影', h: R.p + '逆行後陰影期', t: R.p + '已於 ' + R.to.join('/') + ' 順行，仍在後陰影期：逆行期間卡住的事慢慢鬆動', d: 0 });
  }
  // 月亮星座 × 你的太陽星座；月相
  const mLon = moonLongitude(Y, Mo, Dd);
  const ms = Math.floor(mLon / 30);
  const sLon = sunLongitude(Y, Mo, Dd, 12);
  const el = ((mLon - sLon) % 360 + 360) % 360;
  const phase = el < 12 || el > 348 ? '新月' : Math.abs(el - 180) < 12 ? '滿月' : el < 180 ? '月漸盈' : '月漸虧';
  if (ctx.sunKey) {
    const us = ZODIAC_ORDER.indexOf(ctx.sunKey);
    const asp = ((ms - us) % 12 + 12) % 12;
    const A = { 0: [3, '月亮回到你的星座，直覺與存在感變強，適合做自己想做的事'], 4: [2, '與你形成三分相（同元素），情緒順、人緣好'], 8: [2, '與你形成三分相（同元素），情緒順、人緣好'],
      6: [-2, '在你的對宮，容易被別人的情緒牽動，關係裡多聽少辯'], 3: [-2, '與你形成四分相，心浮氣躁，別在情緒上做決定'], 9: [-2, '與你形成四分相，心浮氣躁，別在情緒上做決定'],
      2: [1, '與你形成六分相，小小順利'], 10: [1, '與你形成六分相，小小順利'] }[asp] || [0, '與你的星座沒有主要相位'];
    F.push({ k: '月亮', h: '月亮' + SIGN_ZH[ms] + '．' + phase, t: '今天月亮行經' + SIGN_ZH[ms] + '（' + phase + '），' + A[1], d: A[0] });
  }
  let score = D.s + F.reduce((a, f) => a + f.d, 0);
  score = Math.max(35, Math.min(98, score));
  const luckyElem = fav[0];
  const basis = F.map(f => f.h).join('、');
  return { date: dt, gz: g + z, tg, score, base: D.s, factors: F, jc, text: D.t, yi: D.yi, ji: D.ji, basis,
    color: ELEM_INFO[luckyElem].color.split('、')[0], dir: ELEM_INFO[luckyElem].dir };
}

// ---------- 星座 2026 下半年行運 ----------
function transitNotes(key) {
  const out = [];
  const fire = ['aries', 'leo', 'sagittarius'], cardinal = ['aries', 'cancer', 'libra', 'capricorn'], fixed = ['taurus', 'leo', 'scorpio', 'aquarius'], mutable = ['gemini', 'virgo', 'sagittarius', 'pisces'];
  if (key === 'leo') out.push('木星自 6/30 進入你的星座，十二年一次的「幸運之星回歸」：自信、舞台與機會大開，是近年最值得放手一搏的時段。');
  else if (fire.includes(key)) out.push('木星 6/30 進入同屬火象的獅子座，與你形成和諧三分相：擴張、旅行、學習與人氣都順風。');
  else if (key === 'aquarius') out.push('木星 6/30 進入你的對宮獅子座，合作、婚姻與人際關係帶來機會，貴人多來自伴侶或夥伴。');
  else if (key === 'taurus' || key === 'scorpio') out.push('木星 6/30 進入獅子座，與你形成四分相：機會多但易過度擴張，財務與承諾量力而為。');
  if (key === 'aries') out.push('土星正行經你的星座（2026 年 2 月入境），7/26 起逆行至 12/10：這是扎根與自我負責的考驗期，打好基礎，成果會延續多年。');
  else if (cardinal.includes(key)) out.push('土星在牡羊座與你形成緊張相位，7/26–12/10 逆行期間，舊問題會回頭要你處理：放慢、盤點、把基礎補強。');
  if (fixed.includes(key)) out.push('水星 10/24–11/13 於天蠍座逆行，與你同屬固定星座：合約、溝通與電子設備多檢查，舊人舊事可能重逢。');
  else if (key === 'cancer') out.push('水星 7/23 結束在你星座的逆行，前半年卡住的溝通與計畫在 7 月下旬起逐漸解開。');
  if (mutable.includes(key)) out.push('天王星於 2026 年 4 月進入雙子座，變動星座首當其衝：生活與工作型態求新求變，彈性就是你的優勢。');
  return out;
}

// ---------- 姓名學深化（熊崎五格生剋＋八字喜用配名） ----------
// 人格數尾數性格（熊崎式人格五行）
const REN_PERSONA = {
  1: '人格屬陽木：主見強、有上進心，像大樹一樣要往上長，缺點是不太肯低頭。',
  2: '人格屬陰木：溫和有彈性，擅長配合與累積，外柔內韌，但容易想太多、下決定慢。',
  3: '人格屬陽火：熱情外放、反應快，天生帶氣場，但情緒來得快也去得快。',
  4: '人格屬陰火：心思細、有品味，熱情藏在內心，對人好但不輕易表露。',
  5: '人格屬陽土：穩重可靠、重信用，是大家的依靠，缺點是固執、變通慢。',
  6: '人格屬陰土：包容務實、會照顧人，做事踏實但容易委屈自己。',
  7: '人格屬陽金：果斷剛直、講義氣，執行力強，說話直接易得罪人。',
  8: '人格屬陰金：意志堅定、重原則，外表冷靜內心有火，做事一板一眼。',
  9: '人格屬陽水：聰明靈活、點子多、交遊廣，但定性不足、容易分心。',
  0: '人格屬陰水：思慮深、直覺敏銳，擅長觀察與謀略，內心世界豐富但易悶。'
};
// 五格生剋：人格對總格／外格／地格（關係以「對方 對 人格」論）
const GE_REL_TXT = {
  zong: { '生入': '總格生人格：中晚年有福報，努力容易被回報，後勁足。', '比和': '總格與人格同氣：人生目標與個性一致，做自己最有成就。', '生出': '人格生總格：一生多為家庭與事業付出，辛苦但有成果。', '剋入': '總格剋人格：中年後壓力較大，目標定得太高易累，宜量力。', '剋出': '人格剋總格：意志強、能掌控人生方向，但要防過度操勞。' },
  wai: { '生入': '外格生人格：人緣好、外面常有貴人幫，出門在外比在家順。', '比和': '外格與人格同氣：朋友同頻，人際和諧，合作順利。', '生出': '人格生外格：對朋友慷慨付出，人緣好但要防被佔便宜。', '剋入': '外格剋人格：外界壓力與是非較多，慎選朋友、少作保。', '剋出': '人格剋外格：在人群中有主導力，但易給人強勢感。' },
  di: { '生入': '地格生人格：家庭與部屬是後盾，基礎穩、少年運順。', '比和': '地格與人格同氣：家庭和睦，與晚輩部屬相處融洽。', '生出': '人格生地格：照顧家人與部屬不遺餘力，是家中支柱。', '剋入': '地格剋人格：家務或部屬事多煩心，早年基礎較辛苦。', '剋出': '人格剋地格：對家人部屬要求高，宜多些耐心。' }
};
// 關係：rel(a,b) 以「a 對 b」表示（a 生 b = 生出）；此處要「他格 對 人格」，換算成人格視角
function relToRen(otherE, renE) {
  if (otherE === renE) return '比和';
  if (SHENG[otherE] === renE) return '生入';
  if (SHENG[renE] === otherE) return '生出';
  if (KE[otherE] === renE) return '剋入';
  return '剋出';
}
function numElem(n) { const d = n % 10; return d === 1 || d === 2 ? '木' : d === 3 || d === 4 ? '火' : d === 5 || d === 6 ? '土' : d === 7 || d === 8 ? '金' : '水'; }
function nameDeep(name, strokes, grids, fav, surLen) {
  const chars = [...name];
  const perChar = chars.map((ch, i) => {
    const re = GEN.RADELEM && GEN.RADELEM[ch];
    return { ch, s: strokes[i], e: re || numElem(strokes[i]), src: re ? '字形' : '數理', yin: strokes[i] % 2 === 0 };
  });
  const renE = numElem(grids.ren);
  const rels = {
    zong: relToRen(numElem(grids.zong), renE),
    wai: relToRen(numElem(grids.wai), renE),
    di: relToRen(numElem(grids.di), renE)
  };
  // 陰陽配置（熊崎：全陽或全陰為偏枯）
  const yins = perChar.filter(c => c.yin).length;
  const yy = yins === 0 ? '全陽（筆畫皆奇數）：衝勁足但偏剛，宜學柔軟。' : yins === chars.length ? '全陰（筆畫皆偶數）：細膩內斂但偏柔，宜多主動。' : '陰陽相間：剛柔並濟，配置平衡。';
  // 名字（不含姓）與喜用對照
  const givenChars = perChar.slice(surLen || 1);
  const hit = givenChars.filter(c => fav.includes(c.e));
  const miss = givenChars.filter(c => !fav.includes(c.e));
  let favVerdict;
  if (hit.length === givenChars.length) favVerdict = '名字每個字都落在你的喜用五行（' + fav.join('、') + '），名字本身就在幫你補運，屬「名助命」的好名。';
  else if (hit.length) favVerdict = '「' + hit.map(c => c.ch).join('、') + '」屬' + [...new Set(hit.map(c => c.e))].join('、') + '，正是你的喜用，有補運之效；「' + miss.map(c => c.ch).join('、') + '」屬' + [...new Set(miss.map(c => c.e))].join('、') + '，對你較中性。';
  else favVerdict = '名字的五行（' + [...new Set(givenChars.map(c => c.e))].join('、') + '）都不是你的喜用（' + fav.join('、') + '），名字對命局助力有限，可用小名、筆名或日常配色補足喜用。';
  return { perChar, renE, renTail: grids.ren % 10, rels, yy, favVerdict, hitCount: hit.length, givenCount: givenChars.length };
}

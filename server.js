// 旺來開運所．線上命理分析 — 零依賴 Node.js 伺服器（靜態網站 + 瀏覽統計 API）
// 啟動：node server.js   （或雙擊 啟動網站.bat）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3300;
const PUB = path.join(__dirname, 'public');
// 統計存放：優先 DATA_DIR，其次 Railway 掛載 Volume 時自動提供的 RAILWAY_VOLUME_MOUNT_PATH
const DATA_DIR = process.env.DATA_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// ---------- 統計資料 ----------
// 無既有統計檔時的起始值（可用 BASE_TOTAL 環境變數覆蓋）
const BASE_TOTAL = parseInt(process.env.BASE_TOTAL || '112', 10);
let stats = { total: BASE_TOTAL, vids: {}, daily: {}, events: [] };
const BAK_FILE = STATS_FILE + '.bak';
function tryLoad(f) { try { if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('讀取失敗', f, e.message); } return null; }
const loaded = tryLoad(STATS_FILE) || tryLoad(BAK_FILE);
if (loaded) stats = Object.assign(stats, loaded);
else if (fs.existsSync(STATS_FILE)) { try { fs.copyFileSync(STATS_FILE, STATS_FILE + '.corrupt-' + Date.now()); } catch (e) {} }
console.log('統計載入：DATA_DIR=' + DATA_DIR + '，累計 ' + stats.total);

// 原子寫入：先寫暫存檔再改名，並保留上一版備份，避免部署中斷造成檔案損毀歸零
let lastSaveErr = null, lastSaveAt = null;
function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = STATS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(stats));
    if (fs.existsSync(STATS_FILE)) { try { fs.copyFileSync(STATS_FILE, BAK_FILE); } catch (e) {} }
    fs.renameSync(tmp, STATS_FILE);
    lastSaveAt = new Date().toISOString(); lastSaveErr = null;
  } catch (e) { lastSaveErr = e.message; console.log('統計儲存失敗', e.message); }
}
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; saveNow(); }, 1500);
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// 每日不重複訪客：只保留近 3 天的當日訪客清單以控制檔案大小
let dayVids = {};
// ---------- 行為事件（匿名計數：算命完成、分享、存圖…，不含任何個資） ----------
const EVENT_NAMES = ['calc', 'calc_return', 'share', 'save_image', 'compact', 'print', 'ai', 'friend'];
function recordEvent(name) {
  if (!EVENT_NAMES.includes(name)) return false;
  const day = todayStr();
  stats.ev = stats.ev || {};
  stats.ev[day] = stats.ev[day] || {};
  stats.ev[day][name] = (stats.ev[day][name] || 0) + 1;
  stats.evTotal = stats.evTotal || {};
  stats.evTotal[name] = (stats.evTotal[name] || 0) + 1;
  scheduleSave();
  return true;
}

function recordVisit(vid, ua) {
  const day = todayStr();
  stats.total++;
  if (!stats.daily[day]) stats.daily[day] = { v: 0, u: 0 };
  stats.daily[day].v++;
  if (vid) {
    if (!stats.vids[vid]) {
      if (Object.keys(stats.vids).length < 100000) stats.vids[vid] = day;
    }
    if (!dayVids[day]) dayVids[day] = new Set();
    if (!dayVids[day].has(vid)) { dayVids[day].add(vid); stats.daily[day].u++; }
    for (const k of Object.keys(dayVids)) { if (k !== day && Object.keys(dayVids).length > 3) delete dayVids[k]; }
  }
  stats.events.push({ t: Date.now(), ua: String(ua || '').slice(0, 80) });
  if (stats.events.length > 500) stats.events = stats.events.slice(-500);
  scheduleSave();
}

// ---------- 線上人數（心跳制，70 秒內有心跳視為在線） ----------
const online = {};
function markOnline(vid) { if (vid) online[vid] = Date.now(); }
function onlineCount() {
  const now = Date.now();
  let n = 0;
  for (const k of Object.keys(online)) {
    if (now - online[k] > 70000) delete online[k];
    else n++;
  }
  return n;
}

// ---------- AI 命理師解讀（Anthropic Claude API） ----------
// Railway Variables 設定：ANTHROPIC_API_KEY（必填）、AI_MODEL（選填）、AI_DAILY_LIMIT（選填，預設 300 次/日）
const AI_MODEL = process.env.AI_MODEL || 'claude-sonnet-5';
const AI_DAILY_LIMIT = parseInt(process.env.AI_DAILY_LIMIT || '300', 10);
const aiCache = new Map();          // 同一命盤同一天只算一次
const aiIpHits = {};                // 每 IP 每小時上限
let aiDay = '', aiDayCount = 0;
const AI_SYSTEM = [
  '你是「旺來開運所」的資深命理師，精通《子平真詮》《滴天髓》《窮通寶鑑》《三命通會》《紫微斗數全書》與西洋占星。',
  '使用者會提供一份已由程式依古法排好的命盤資料（八字十神、格局、旺衰、用神、大運、紫微主星與四化、星座與 2026 下半年行運等）。',
  '請只根據提供的資料解讀，不可自行更改或捏造命盤內容；資料沒有的就不要編。',
  '用台灣繁體中文，風格「專業典雅＋白話解釋」：先用命理術語下判斷，緊接一句白話說明。',
  '輸出結構固定為以下五段，每段以【標題】開頭：',
  '【命格總評】綜合八字格局、旺衰與紫微命宮，點出此人一生的核心特質與優勢（約 150 字）。',
  '【個性與處事】遇到事情的處理方式、決策習慣、人際互動與盲點（約 150 字）。',
  '【2026 下半年運勢】分財運、感情、事業、健康四小點，結合丙午流年十神、流年四化與行運（約 250 字）。',
  '【開運建議】3 條具體可執行的建議，對應其用神五行（約 120 字）。',
  '【一句話送你】一句溫暖有力量的結語。',
  '注意：語氣正向但誠實，凶象要說但給出化解方向；不提供醫療診斷、投資標的或保證性預言；結尾不要再加免責聲明。'
].join('\n');

function handleAI(req, res, body) {
  const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(503, { error: 'AI 解讀尚未開通' });
  let chart = '';
  try { chart = String(JSON.parse(body || '{}').chart || '').slice(0, 5000); } catch (e) {}
  if (chart.length < 50) return send(400, { error: '命盤資料不足' });
  const today = todayStr();
  const cacheKey = today + '|' + require('crypto').createHash('sha1').update(chart).digest('hex');
  if (aiCache.has(cacheKey)) return send(200, { text: aiCache.get(cacheKey), cached: true });
  if (aiDay !== today) { aiDay = today; aiDayCount = 0; }
  if (aiDayCount >= AI_DAILY_LIMIT) return send(429, { error: '今日 AI 解讀名額已滿，明天再來' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const hour = Math.floor(Date.now() / 3600000);
  const rec = aiIpHits[ip];
  if (rec && rec.h === hour && rec.n >= 5) return send(429, { error: '解讀次數太頻繁，請一小時後再試' });
  aiIpHits[ip] = rec && rec.h === hour ? { h: hour, n: rec.n + 1 } : { h: hour, n: 1 };
  aiDayCount++;
  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: AI_MODEL, max_tokens: 1800, system: AI_SYSTEM, messages: [{ role: 'user', content: '以下是命盤資料，請依規定格式解讀：\n' + chart }] })
  }).then(r => r.json().then(j => ({ ok: r.ok, j }))).then(({ ok, j }) => {
    if (!ok) { console.log('AI 錯誤', JSON.stringify(j).slice(0, 300)); aiDayCount--; return send(502, { error: 'AI 服務暫時無法使用' }); }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
    if (aiCache.size > 2000) aiCache.clear();
    aiCache.set(cacheKey, text);
    send(200, { text });
  }).catch(e => { console.log('AI 連線失敗', e.message); aiDayCount--; send(502, { error: 'AI 服務連線失敗' }); });
}

// ---------- 靜態檔案 ----------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};
function serveFile(res, fp) {
  fs.readFile(fp, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('404 找不到頁面'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  // API
  if (p === '/api/visit' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      let vid = null;
      try { vid = (JSON.parse(body || '{}').vid || '').slice(0, 40) || null; } catch (e) {}
      recordVisit(vid, req.headers['user-agent']);
      markOnline(vid);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: 1, total: stats.total, online: onlineCount() }));
    });
    return;
  }
  if (p === '/api/ai/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ enabled: !!process.env.ANTHROPIC_API_KEY, model: AI_MODEL }));
    return;
  }
  if (p === '/api/ai' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 8000) req.destroy(); });
    req.on('end', () => handleAI(req, res, body));
    return;
  }
  if (p === '/api/ping' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
    req.on('end', () => {
      let vid = null;
      try { vid = (JSON.parse(body || '{}').vid || '').slice(0, 40) || null; } catch (e) {}
      markOnline(vid);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: 1, online: onlineCount() }));
    });
    return;
  }
  // 給「旺來後台」跨站讀取（只開放彙總數字）
  const ALLOW = (process.env.ADMIN_ORIGINS || 'https://web-production-e1521.up.railway.app').split(',');
  const origin = req.headers.origin || '';
  if (ALLOW.includes(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') { res.setHeader('Access-Control-Allow-Methods', 'GET,POST'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.writeHead(204); res.end(); return; }
  if (p === '/api/event' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 512) req.destroy(); });
    req.on('end', () => { let n = ''; try { n = String(JSON.parse(body || '{}').name || ''); } catch (e) {} recordEvent(n); res.writeHead(204); res.end(); });
    return;
  }
  if (p === '/api/admin/summary' && req.method === 'GET') {
    const day = todayStr();
    const days = Object.keys(stats.daily).sort().slice(-30);
    const dev = { mobile: 0, desktop: 0, other: 0 };
    for (const e of stats.events) { const ua = e.ua || ''; if (/mobile|iphone|android/i.test(ua)) dev.mobile++; else if (/bot|spider|curl/i.test(ua)) dev.other++; else dev.desktop++; }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({
      site: '旺來開運所', url: 'https://aboutlife-production.up.railway.app',
      generatedAt: new Date().toISOString(),
      visits: { total: stats.total, unique: Object.keys(stats.vids).length, today: stats.daily[day] || { v: 0, u: 0 }, online: onlineCount() },
      events: { today: (stats.ev || {})[day] || {}, total: stats.evTotal || {} },
      daily: days.map(d => Object.assign({ d, v: stats.daily[d].v, u: stats.daily[d].u }, (stats.ev || {})[d] || {})),
      devices: dev,
      storage: { dataDir: DATA_DIR, envSet: !!process.env.DATA_DIR, volume: process.env.RAILWAY_VOLUME_MOUNT_PATH || null, fileExists: fs.existsSync(STATS_FILE), lastSaveAt, lastSaveErr, bootLoaded: !!loaded },
      ai: { enabled: !!process.env.ANTHROPIC_API_KEY, model: AI_MODEL, usedToday: aiDay === day ? aiDayCount : 0, limit: AI_DAILY_LIMIT }
    }));
    return;
  }
  if (p === '/api/stats' && req.method === 'GET') {
    const day = todayStr();
    const days = Object.keys(stats.daily).sort().slice(-60);
    const daily = days.map(d => ({ d, v: stats.daily[d].v, u: stats.daily[d].u }));
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      total: stats.total,
      uniqueTotal: Object.keys(stats.vids).length,
      today: stats.daily[day] || { v: 0, u: 0 },
      online: onlineCount(),
      daily,
      events: stats.events.slice(-50).reverse()
    }));
    return;
  }

  // 靜態
  let fp = path.normalize(path.join(PUB, p === '/' ? 'index.html' : p));
  if (!fp.startsWith(PUB)) { res.writeHead(403); res.end(); return; }
  if (!path.extname(fp)) fp += '.html';
  serveFile(res, fp);
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = require('os').networkInterfaces();
  console.log('==============================================');
  console.log('  旺來開運所．線上命理分析  已啟動');
  console.log('  本機開啟：http://localhost:' + PORT);
  for (const name of Object.keys(nets)) for (const n of nets[name]) {
    if (n.family === 'IPv4' && !n.internal) console.log('  區網分享：http://' + n.address + ':' + PORT);
  }
  console.log('  訪客統計：http://localhost:' + PORT + '/admin.html');
  console.log('  停止：按 Ctrl+C 或關閉此視窗');
  console.log('==============================================');
});
// Railway 重新部署時送 SIGTERM：先存檔再結束
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { saveNow(); process.exit(0); });

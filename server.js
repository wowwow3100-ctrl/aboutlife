// 玄機閣．線上命理分析 — 零依賴 Node.js 伺服器（靜態網站 + 瀏覽統計 API）
// 啟動：node server.js   （或雙擊 啟動網站.bat）
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3300;
const PUB = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data'); // Railway 掛 Volume 時設 DATA_DIR=/data
const STATS_FILE = path.join(DATA_DIR, 'stats.json');

// ---------- 統計資料 ----------
// 無既有統計檔時的起始值（可用 BASE_TOTAL 環境變數覆蓋）
const BASE_TOTAL = parseInt(process.env.BASE_TOTAL || '112', 10);
let stats = { total: BASE_TOTAL, vids: {}, daily: {}, events: [] };
try {
  if (fs.existsSync(STATS_FILE)) stats = Object.assign(stats, JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')));
} catch (e) { console.log('統計檔讀取失敗，重新開始', e.message); }

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
    } catch (e) { console.log('統計儲存失敗', e.message); }
  }, 1500);
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
// 每日不重複訪客：只保留近 3 天的當日訪客清單以控制檔案大小
let dayVids = {};
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
  console.log('  玄機閣．線上命理分析  已啟動');
  console.log('  本機開啟：http://localhost:' + PORT);
  for (const name of Object.keys(nets)) for (const n of nets[name]) {
    if (n.family === 'IPv4' && !n.internal) console.log('  區網分享：http://' + n.address + ':' + PORT);
  }
  console.log('  訪客統計：http://localhost:' + PORT + '/admin.html');
  console.log('  停止：按 Ctrl+C 或關閉此視窗');
  console.log('==============================================');
});
process.on('SIGINT', () => { try { fs.writeFileSync(STATS_FILE, JSON.stringify(stats)); } catch (e) {} process.exit(0); });

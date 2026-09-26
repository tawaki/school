// SPDX-License-Identifier: GPL-3.0-or-later
// 數學題目產生器。SKILLS[id].gen(參數字串) 回傳 {q, a, fig?}：
//   q 題目、a 答案（HTML，分數用 F()）、fig 看圖題的圖（SVG）。
// 單元對應的寫法是 "id" 或 "id:參數"，由 build_units.py 產生在 units.json。
"use strict";

/* ---------- 工具 ---------- */
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const coin = () => Math.random() < .5;
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = ri(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gcd = (a, b) => b ? gcd(b, a % b) : a;
const lcm = (a, b) => a / gcd(a, b) * b;
const N = n => Math.abs(n) >= 10000 ? n.toLocaleString("en-US") : String(n);  // 五位數以上加逗號
const F = (n, d) => `<span class="frac"><span>${n}</span><span>${d}</span></span>`;
const M = (w, n, d) => `${w}${F(n, d)}`;  // 帶分數
// 分數答案：預設約分；假分數另外寫成帶分數
function fracAns(n, d, reduce = true) {
  if (reduce) { const g = gcd(n, d); n /= g; d /= g; }
  if (n % d === 0) return String(n / d);
  return n > d ? `${F(n, d)} = ${M(Math.floor(n / d), n % d, d)}` : F(n, d);
}
// 小數：整數 n 除以 10 的 p 次方，去掉尾端的 0（不用浮點數，避免 0.30000000004）
function dec(n, p) {
  if (p <= 0) return N(n * 10 ** -p);
  const neg = n < 0, s = String(Math.abs(n)).padStart(p + 1, "0");
  return (neg ? "-" : "") + (s.slice(0, -p) + "." + s.slice(-p)).replace(/\.?0+$/, "");
}
const nz = v => v % 10 ? v : v + 1;  // 尾數不要是 0（小數題不要剛好變整數）
const cmp = (a, b) => a > b ? "&gt;" : a < b ? "&lt;" : "=";
const tables = p => (p || "2,3,4,5,6,7,8,9").split(",").map(Number);
const CNUM = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const MDAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const PLACE = ["個", "十", "百", "千", "萬", "十萬", "百萬", "千萬", "億", "十億", "百億", "千億"];
const UNIT = ["一", "十", "百", "千", "萬", "十萬", "百萬", "千萬", "億", "十億", "百億", "千億"];
const hm = (h, m) => m ? `${h} 小時 ${m} 分` : `${h} 小時`;
// 12 時制的時刻：0~23 時 -> 上午／下午／中午
function clock12(h, m) {
  const tag = h < 12 ? "上午" : "下午", hh = h % 12 === 0 ? 12 : h % 12;
  return `${h === 12 ? "中午" : tag} ${hh} 時${m ? ` ${m} 分` : ""}`;
}
const clock24 = (h, m) => `${h} 時${m ? ` ${m} 分` : ""}`;

/* ---------- 圖（SVG，顏色用頁面的 CSS 變數，深色模式也看得清楚） ---------- */
const svg = (w, h, body, cls = "") => `<svg class="fig ${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img">${body}</svg>`;
const T = (x, y, s, size = 14, anchor = "middle", extra = "") => `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" dominant-baseline="central" fill="currentColor" ${extra}>${s}</text>`;
const r1 = v => Math.round(v * 10) / 10;

function clockFig(h, m) {
  let s = `<circle cx="100" cy="100" r="94" fill="var(--tile)" stroke="currentColor" stroke-width="3"/>`;
  for (let i = 0; i < 60; i++) {
    const a = i * Math.PI / 30, l = i % 5 ? 5 : 10, sw = i % 5 ? 1 : 2.5;
    s += `<line x1="${r1(100 + 90 * Math.sin(a))}" y1="${r1(100 - 90 * Math.cos(a))}" x2="${r1(100 + (90 - l) * Math.sin(a))}" y2="${r1(100 - (90 - l) * Math.cos(a))}" stroke="currentColor" stroke-width="${sw}"/>`;
  }
  for (let i = 1; i <= 12; i++) { const a = i * Math.PI / 6; s += T(r1(100 + 68 * Math.sin(a)), r1(100 - 68 * Math.cos(a)), i, 18, "middle", 'font-weight="700"'); }
  const ha = ((h % 12) + m / 60) * Math.PI / 6, ma = m * Math.PI / 30;
  s += `<line x1="100" y1="100" x2="${r1(100 + 46 * Math.sin(ha))}" y2="${r1(100 - 46 * Math.cos(ha))}" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>`;
  s += `<line x1="100" y1="100" x2="${r1(100 + 76 * Math.sin(ma))}" y2="${r1(100 - 76 * Math.cos(ma))}" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/>`;
  s += `<circle cx="100" cy="100" r="6" fill="currentColor"/>`;
  return svg(200, 200, s, "clock");
}

function coinsFig(vals) {
  const size = v => ({1: 34, 5: 40, 10: 46, 50: 52})[v];
  let x = 6, y = 6, rowH = 0, s = "";
  const W = 330;
  for (const v of vals) {
    const bill = v >= 100, w = bill ? 78 : size(v), h = bill ? 40 : size(v);
    if (x + w > W) { x = 6; y += rowH + 8; rowH = 0; }
    if (bill) s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>` + T(x + w / 2, y + h / 2, `${v} 元`, 15, "middle", 'font-weight="700"');
    else s += `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${w / 2 - 1}" fill="var(--tile)" stroke="currentColor" stroke-width="2"/>` + T(x + w / 2, y + h / 2, v, w > 40 ? 17 : 15, "middle", 'font-weight="700"');
    x += w + 8; rowH = Math.max(rowH, h);
  }
  return svg(W + 6, y + rowH + 6, s);
}

// 圓形或長條分成 d 等分，塗滿 n 份（n 超過 d 就畫好幾個）
function fracFig(n, d, shape) {
  const wholes = Math.max(1, Math.ceil(n / d));
  let s = "", left = n;
  for (let k = 0; k < wholes; k++) {
    const fill = Math.min(d, left); left -= fill;
    if (shape === "bar") {
      const y = 8 + k * 46, w = 300 / d;
      for (let i = 0; i < d; i++) s += `<rect x="${10 + i * w}" y="${y}" width="${w}" height="36" fill="${i < fill ? "var(--accent)" : "var(--tile)"}" stroke="currentColor" stroke-width="2"/>`;
    } else {
      const cx = 60 + k * 128, cy = 60, r = 54;
      for (let i = 0; i < d; i++) {
        const a0 = i / d * 2 * Math.PI, a1 = (i + 1) / d * 2 * Math.PI;
        const p = d === 1 ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`
          : `M${cx},${cy}L${r1(cx + r * Math.sin(a0))},${r1(cy - r * Math.cos(a0))}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${r1(cx + r * Math.sin(a1))},${r1(cy - r * Math.cos(a1))}Z`;
        s += `<path d="${p}" fill="${i < fill ? "var(--accent)" : "var(--tile)"}" stroke="currentColor" stroke-width="2"/>`;
      }
    }
  }
  return shape === "bar" ? svg(320, wholes * 46 + 6, s) : svg(wholes * 128 - 8, 120, s);
}

function angleFig(deg) {
  const vx = deg > 95 ? 150 : 50, vy = 150, L = 130, a = deg * Math.PI / 180;
  const ex = r1(vx + L * Math.cos(a)), ey = r1(vy - L * Math.sin(a));
  let s = `<line x1="${vx}" y1="${vy}" x2="${vx + L}" y2="${vy}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
  s += `<line x1="${vx}" y1="${vy}" x2="${ex}" y2="${ey}" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>`;
  if (deg === 90) s += `<path d="M${vx + 22},${vy}V${vy - 22}H${vx}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
  else s += `<path d="M${vx + 28},${vy}A28,28 0 0,0 ${r1(vx + 28 * Math.cos(a))},${r1(vy - 28 * Math.sin(a))}" fill="none" stroke="var(--accent)" stroke-width="2.5"/>`;
  s += `<circle cx="${vx}" cy="${vy}" r="4" fill="currentColor"/>`;
  return svg(300, 160, s);
}

const poly = (pts, extra = "") => `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="var(--accent-soft)" stroke="currentColor" stroke-width="3" stroke-linejoin="round" ${extra}/>`;
// 等長邊的記號：在邊的中點畫短線
function sideMark(p, q, n = 1) {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
  const nx = -dy / L * 7, ny = dx / L * 7, tx = dx / L * 4, ty = dy / L * 4;
  let s = "";
  for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2); s += `<line x1="${r1(mx + o * tx - nx)}" y1="${r1(my + o * ty - ny)}" x2="${r1(mx + o * tx + nx)}" y2="${r1(my + o * ty + ny)}" stroke="currentColor" stroke-width="2"/>`; }
  return s;
}
const rightMark = (p, u, v) => `<path d="M${p[0] + u[0] * 16},${p[1] + u[1] * 16}L${p[0] + u[0] * 16 + v[0] * 16},${p[1] + u[1] * 16 + v[1] * 16}L${p[0] + v[0] * 16},${p[1] + v[1] * 16}" fill="none" stroke="currentColor" stroke-width="1.5"/>`;

function rulerFig(len, unit) {  // len：公分用整數；毫米用毫米數
  const px = 26, mm = unit === "mm", total = Math.max(6, Math.ceil((mm ? len / 10 : len) + 1));
  const W = total * px + 30;
  let s = `<rect x="10" y="44" width="${total * px + 10}" height="42" rx="3" fill="var(--tile)" stroke="currentColor" stroke-width="1.5"/>`;
  for (let i = 0; i <= total * 10; i++) {
    const x = r1(15 + i * px / 10), l = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
    if (i % 10 && !mm) continue;
    s += `<line x1="${x}" y1="44" x2="${x}" y2="${44 + l}" stroke="currentColor" stroke-width="${i % 10 ? 1 : 1.5}"/>`;
    if (i % 10 === 0) s += T(x, 74, i / 10, 12);
  }
  const end = 15 + (mm ? len / 10 : len) * px;
  s += `<rect x="15" y="18" width="${r1(end - 15)}" height="14" rx="2" fill="var(--accent)"/>`;
  s += `<line x1="15" y1="10" x2="15" y2="44" stroke="currentColor" stroke-dasharray="3 3"/><line x1="${r1(end)}" y1="10" x2="${r1(end)}" y2="44" stroke="currentColor" stroke-dasharray="3 3"/>`;
  return svg(W, 92, s);
}

// 數線：labels = [[位置 0~1, 文字]...]，箭頭指在 at（0~1）
function numlineFig(ticks, labels, at) {
  let s = `<line x1="20" y1="50" x2="330" y2="50" stroke="currentColor" stroke-width="2"/><path d="M330,44L340,50L330,56" fill="currentColor"/>`;
  for (let i = 0; i <= ticks; i++) { const x = r1(25 + i * 290 / ticks); s += `<line x1="${x}" y1="42" x2="${x}" y2="58" stroke="currentColor" stroke-width="1.5"/>`; }
  for (const [p, t] of labels) s += T(r1(25 + p * 290), 76, t, 14);
  const ax = r1(25 + at * 290);
  s += `<path d="M${ax},38L${ax - 7},22H${ax + 7}Z" fill="var(--accent)"/>` + T(ax, 12, "?", 15, "middle", 'fill="var(--accent)" font-weight="700"');
  return svg(346, 90, s);
}

function barFig(names, vals, step, unit) {
  const Y0 = 24, top = Math.ceil(Math.max(...vals) / step) * step + step, H = 150, W = 330, x0 = 40, bw = (W - x0 - 10) / names.length;
  let s = "";
  for (let v = 0; v <= top; v += step) {
    const y = r1(Y0 + H - v / top * H);
    s += `<line x1="${x0}" y1="${y}" x2="${W - 5}" y2="${y}" stroke="var(--line)"/>` + T(x0 - 6, y, v, 11, "end");
  }
  names.forEach((n, i) => {
    const h = vals[i] / top * H, x = x0 + i * bw + bw * .2;
    s += `<rect x="${r1(x)}" y="${r1(Y0 + H - h)}" width="${r1(bw * .6)}" height="${r1(h)}" fill="var(--accent)"/>` + T(r1(x + bw * .3), Y0 + H + 16, n, 12);
  });
  s += `<line x1="${x0}" y1="${Y0}" x2="${x0}" y2="${Y0 + H}" stroke="currentColor" stroke-width="1.5"/><line x1="${x0}" y1="${Y0 + H}" x2="${W - 5}" y2="${Y0 + H}" stroke="currentColor" stroke-width="1.5"/>`;
  s += T(x0 - 34, 8, `（${unit}）`, 11, "start");
  return svg(W, H + Y0 + 30, s);
}

function lineFig(names, vals, step, unit) {
  const Y0 = 24, top = Math.ceil(Math.max(...vals) / step) * step + step, H = 150, W = 330, x0 = 40, gap = (W - x0 - 20) / (names.length - 1);
  let s = "";
  for (let v = 0; v <= top; v += step) { const y = r1(Y0 + H - v / top * H); s += `<line x1="${x0}" y1="${y}" x2="${W - 5}" y2="${y}" stroke="var(--line)"/>` + T(x0 - 6, y, v, 11, "end"); }
  const pts = vals.map((v, i) => [r1(x0 + 10 + i * gap), r1(Y0 + H - v / top * H)]);
  s += `<polyline points="${pts.map(p => p.join(",")).join(" ")}" fill="none" stroke="var(--accent)" stroke-width="3"/>`;
  pts.forEach((p, i) => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="var(--accent)"/>` + T(p[0], Y0 + H + 16, names[i], 12); });
  s += `<line x1="${x0}" y1="${Y0}" x2="${x0}" y2="${Y0 + H}" stroke="currentColor" stroke-width="1.5"/><line x1="${x0}" y1="${Y0 + H}" x2="${W - 5}" y2="${Y0 + H}" stroke="currentColor" stroke-width="1.5"/>`;
  s += T(x0 - 34, 8, `（${unit}）`, 11, "start");
  return svg(W, H + Y0 + 30, s);
}

function pieFig(names, pcts) {
  let s = "", a0 = 0;
  const cx = 110, cy = 110, r = 96, shades = [1, .7, .45, .25, .12];
  names.forEach((n, i) => {
    const a1 = a0 + pcts[i] / 100 * 2 * Math.PI, mid = (a0 + a1) / 2;
    s += `<path d="M${cx},${cy}L${r1(cx + r * Math.sin(a0))},${r1(cy - r * Math.cos(a0))}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${r1(cx + r * Math.sin(a1))},${r1(cy - r * Math.cos(a1))}Z" fill="var(--accent)" fill-opacity="${shades[i]}" stroke="var(--panel)" stroke-width="2"/>`;
    s += T(r1(cx + r * .62 * Math.sin(mid)), r1(cy - r * .62 * Math.cos(mid)) - 8, n, 13, "middle", 'font-weight="700" paint-order="stroke" stroke="var(--panel)" stroke-width="3"');
    s += T(r1(cx + r * .62 * Math.sin(mid)), r1(cy - r * .62 * Math.cos(mid)) + 9, pcts[i] + "%", 13, "middle", 'paint-order="stroke" stroke="var(--panel)" stroke-width="3"');
    a0 = a1;
  });
  return svg(220, 220, s);
}

function gridFig(cells, cols, rows) {
  const c = 30, set = new Set(cells.map(([x, y]) => x + "," + y));
  let s = "";
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++)
    s += `<rect x="${5 + x * c}" y="${5 + y * c}" width="${c}" height="${c}" fill="${set.has(x + "," + y) ? "var(--accent)" : "var(--tile)"}" stroke="var(--dim)" stroke-width="1"/>`;
  return svg(cols * c + 10, rows * c + 10, s);
}

function calendarFig(month, start) {
  const days = MDAYS[month], c = 44;
  let s = T(154, 14, `${month} 月`, 16, "middle", 'font-weight="700"');
  WEEK.forEach((w, i) => { s += T(22 + i * c, 40, w, 13, "middle", i === 0 || i === 6 ? 'fill="var(--accent)"' : ""); });
  for (let d = 1; d <= days; d++) {
    const k = start + d - 1, x = k % 7, y = Math.floor(k / 7);
    s += `<rect x="${x * c + 1}" y="${54 + y * 34}" width="${c - 2}" height="32" rx="4" fill="var(--tile)" stroke="var(--line)"/>` + T(22 + x * c, 70 + y * 34, d, 14);
  }
  const rows = Math.ceil((start + days) / 7);
  return svg(7 * c, 58 + rows * 34, s);
}

function blocksFig(h, t, o) {  // 百格板、十條、一個
  let s = "", x = 4;
  for (let i = 0; i < h; i++) { s += `<rect x="${x}" y="4" width="70" height="70" fill="var(--accent-soft)" stroke="currentColor" stroke-width="1.5"/>`; for (let k = 1; k < 10; k++) s += `<line x1="${x + k * 7}" y1="4" x2="${x + k * 7}" y2="74" stroke="currentColor" stroke-width=".4"/><line x1="${x}" y1="${4 + k * 7}" x2="${x + 70}" y2="${4 + k * 7}" stroke="currentColor" stroke-width=".4"/>`; x += 76; }
  for (let i = 0; i < t; i++) { s += `<rect x="${x}" y="4" width="7" height="70" fill="var(--accent)" stroke="currentColor" stroke-width="1"/>`; x += 11; }
  x += 6;
  for (let i = 0; i < o; i++) { s += `<rect x="${x + (i % 3) * 10}" y="${54 - Math.floor(i / 3) * 10}" width="8" height="8" fill="var(--accent)" stroke="currentColor" stroke-width="1"/>`; }
  x += 34;
  return svg(Math.max(x, 60), 80, s);
}

function tableFig(head, rows) {  // head：第一列；rows：每列第一格是名稱
  const cols = head.length, cw = Math.min(90, Math.floor(330 / cols)), rh = 32;
  let s = "";
  [head, ...rows].forEach((r, y) => r.forEach((c, x) => {
    s += `<rect x="${1 + x * cw}" y="${1 + y * rh}" width="${cw}" height="${rh}" fill="${y === 0 || x === 0 ? "var(--accent-soft)" : "var(--tile)"}" stroke="currentColor" stroke-width="1"/>` + T(1 + x * cw + cw / 2, 1 + y * rh + rh / 2, c, 14, "middle", y === 0 || x === 0 ? 'font-weight="700"' : "");
  }));
  return svg(cols * cw + 2, (rows.length + 1) * rh + 2, s);
}

// 用小正方體堆成的長方體（斜投影）：a 長、b 深、c 高
function cubesFig(a, b, c) {
  const s = 26, dx = s * .5, dy = s * .45, ox = 8, oy = 8 + b * dy + c * s;
  const P = (x, y, z) => [r1(ox + x * s + y * dx), r1(oy - z * s - y * dy)];
  const face = (pts, fill, op = 1) => `<polygon points="${pts.map(p => p.join(",")).join(" ")}" fill="${fill}" fill-opacity="${op}" stroke="currentColor" stroke-width="1.5"/>`;
  const line = (p, q) => `<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" stroke="currentColor" stroke-width="1"/>`;
  let g = face([P(0, 0, 0), P(a, 0, 0), P(a, 0, c), P(0, 0, c)], "var(--accent-soft)")
    + face([P(0, 0, c), P(a, 0, c), P(a, b, c), P(0, b, c)], "var(--tile)")
    + face([P(a, 0, 0), P(a, b, 0), P(a, b, c), P(a, 0, c)], "var(--accent)", .35);
  for (let i = 1; i < a; i++) g += line(P(i, 0, 0), P(i, 0, c)) + line(P(i, 0, c), P(i, b, c));
  for (let k = 1; k < c; k++) g += line(P(0, 0, k), P(a, 0, k)) + line(P(a, 0, k), P(a, b, k));
  for (let j = 1; j < b; j++) g += line(P(0, j, c), P(a, j, c)) + line(P(a, j, 0), P(a, j, c));
  return svg(r1(ox * 2 + a * s + b * dx), r1(oy + 8), g);
}

function dotsFig(n) {  // 十格框：每 10 個一框，每框 2 排 5 個
  const frames = Math.ceil(n / 10), perRow = Math.min(frames, 3);
  let s = "";
  for (let f = 0; f < frames; f++) {
    const fx = 4 + (f % perRow) * 112, fy = 4 + Math.floor(f / perRow) * 52;
    s += `<rect x="${fx}" y="${fy}" width="104" height="44" rx="4" fill="var(--tile)" stroke="currentColor" stroke-width="1.5"/>`;
    for (let i = 0; i < 10; i++) {
      const k = f * 10 + i, cx = fx + 12 + (i % 5) * 20, cy = fy + 12 + Math.floor(i / 5) * 20;
      if (k < n) s += `<circle cx="${cx}" cy="${cy}" r="7.5" fill="var(--accent)"/>`;
    }
  }
  return svg(perRow * 112, Math.ceil(frames / perRow) * 52 + 4, s);
}

/* ---------- 文字題用的名字、東西 ---------- */
const WHO = ["小明", "小華", "小美", "哥哥", "姊姊", "弟弟", "妹妹", "媽媽", "爸爸", "阿姨"];
const THING = [["顆", "糖果"], ["張", "貼紙"], ["枝", "鉛筆"], ["本", "書"], ["個", "蘋果"], ["顆", "彈珠"]];
const two = () => { const [a, b] = shuffle(WHO.slice(0, 7)); return [a, b]; };

/* ---------- 題型 ---------- */
const SKILLS = {};
const def = (id, name, gen, visual = false) => { SKILLS[id] = {id, name, gen, visual}; };

/* 數與位值 */
def("count_on", "數的順序", p => {
  const max = +p || 100, a = ri(1, max - 1), k = ri(2, Math.min(5, max - a));
  switch (ri(0, 3)) {
    case 0: return {q: `${N(a)} 的下一個數是？`, a: N(a + 1)};
    case 1: return {q: `${N(a + 1)} 的前一個數是？`, a: N(a)};
    case 2: return a + k <= max ? {q: `從 ${N(a)} 往後數 ${k} 個是？`, a: N(a + k)} : {q: `${N(a)} 的下一個數是？`, a: N(a + 1)};
    default: return {q: `${N(a)} 和 ${N(a + 2)} 中間是哪個數？`, a: N(a + 1)};
  }
});
def("skip_count", "幾個一數", p => {
  const s = pick(tables(p || "2,5,10")), start = s * ri(0, 6), seq = [0, 1, 2, 3].map(i => start + i * s);
  return coin() ? {q: `${s} 個一數：${seq.join("、")}，下一個是？`, a: start + 4 * s}
                : {q: `${s} 個一數：${seq[0]}、${seq[1]}、□、${seq[3]}，□ 是？`, a: seq[2]};
});
def("place_value", "位值", p => {
  const max = +p || 1000, D = Math.round(Math.log10(max));
  let n = ri(10 ** (D - 1), max - 1);
  if (D >= 5) { n = (ri(1, 9)) * 10 ** (D - 1); for (const i of shuffle([...Array(D - 1).keys()]).slice(0, ri(1, 3))) n += ri(1, 9) * 10 ** i; }
  const ds = String(n).split("").reverse().map(Number);
  if (coin()) {
    const parts = ds.map((d, i) => d ? `${d} 個${UNIT[i]}` : null).filter(Boolean).reverse();
    return {q: `${parts.join("、")}，合起來是多少？`, a: N(n)};
  }
  const i = pick(ds.map((d, i) => d ? i : -1).filter(i => i >= 0));
  return coin() ? {q: `${N(n)} 的${PLACE[i]}位數字是幾？`, a: ds[i]}
                : {q: `${N(n)} 的${PLACE[i]}位數字代表多少？`, a: N(ds[i] * 10 ** i)};
});
def("compare_num", "比大小", p => {
  const max = +p || 100, a = ri(Math.max(1, max / 10), max - 1), s = String(a).split("");
  let b;
  if (s.length > 1 && coin()) { const i = ri(0, s.length - 2); [s[i], s[i + 1]] = [s[i + 1], s[i]]; b = +s.join(""); }
  if (!b || b === a || b >= max) { b = a + pick([-1, 1]) * ri(1, 9) * 10 ** ri(0, Math.max(0, String(a).length - 2)); }
  if (b <= 0 || b >= max || b === a) b = a === 1 ? 2 : a - 1;
  return {q: `${N(a)} 和 ${N(b)}，哪個比較大？`, a: N(Math.max(a, b))};
});
def("split", "分與合", p => {
  const max = +p || 10, t = coin() ? max : ri(2, max), a = ri(1, t - 1);
  return coin() ? {q: `${t} 可以分成 ${a} 和幾？`, a: t - a} : {q: `${a} 和 ${t - a} 合起來是幾？`, a: t};
});
def("odd_even", "奇數和偶數", () => { const n = ri(1, 999); return {q: `${n} 是奇數還是偶數？`, a: n % 2 ? "奇數" : "偶數"}; });
def("bignum", "大數", p => {
  const big = p === "big";
  if (big && coin()) {  // 億以上
    const y = ri(1, 999), w = ri(0, 9) * 1000;
    return {q: `${y} 億${w ? ` ${w} 萬` : ""}，寫成數字是？`, a: N(y * 1e8 + w * 1e4)};
  }
  const w = ri(1, 9999), g = coin() ? ri(1, 9) * 1000 : 0;
  if (coin()) return {q: `${w} 萬${g ? ` ${g}` : ""}，寫成數字是？`, a: N(w * 1e4 + g)};
  const n = w * 1e4 + g;
  return {q: `${N(n)} 讀作？`, a: `${w} 萬${g ? ` ${g}` : ""}`};
});
def("dec_struct", "十進位結構", () => {
  switch (ri(0, 3)) {
    case 0: { const k = ri(1, 3), from = pick([1, 2, 3]); return {q: `${dec(1, from)} 的 ${10 ** k} 倍是多少？`, a: dec(1, from - k)}; }
    case 1: { const a = pick([[1e4, "1 萬"], [1e5, "10 萬"], [1e8, "1 億"]]), b = pick([100, 1000, 1e4].filter(x => x < a[0])); return {q: `${a[1]} 是 ${N(b)} 的幾倍？`, a: N(a[0] / b)}; }
    case 2: { const n = ri(11, 999), k = ri(1, 3); return {q: `${N(n)} 個 ${dec(1, k)} 是多少？`, a: dec(n, k)}; }
    default: { const k = ri(1, 3); return {q: `1 是 ${dec(1, k)} 的幾倍？`, a: N(10 ** k)}; }
  }
});
def("round", "概數", p => {
  if (p === "dec") {
    const k = ri(1, 2), n = ri(1000, 99999), places = 3;
    const f = 10 ** (places - k), r = String(Math.round(n / f)).padStart(k + 1, "0");  // 取概數要保留尾端的 0（8.90）
    return {q: `${dec(n, places)} 用四捨五入法取到小數第${CNUM[k]}位是多少？`, a: r.slice(0, -k) + "." + r.slice(-k)};
  }
  const n = ri(1001, 99999), i = ri(1, Math.min(3, String(n).length - 1)), f = 10 ** i;
  const way = pick(["四捨五入法", "無條件捨去法", "無條件進入法"]);
  const r = way === "四捨五入法" ? Math.round(n / f) * f : way === "無條件捨去法" ? Math.floor(n / f) * f : Math.ceil(n / f) * f;
  return {q: `${N(n)} 用${way}取概數到${PLACE[i]}位是多少？`, a: N(r)};
});
def("seq", "數的規律", p => {
  if (p === "geo" && coin()) { const r = ri(2, 3), a = ri(1, 5), s = [0, 1, 2, 3].map(i => a * r ** i); return {q: `${s.join("、")}，下一個數是？`, a: a * r ** 4}; }
  const d = ri(2, 12) * (coin() || p === "up" ? 1 : -1), a = d > 0 ? ri(1, 30) : ri(60, 120), s = [0, 1, 2, 3].map(i => a + i * d);
  return {q: `${s.join("、")}，下一個數是？`, a: a + 4 * d};
});

/* 加減 */
function addPair(p) {
  switch (p) {
    case "10": { const a = ri(0, 9), b = ri(a ? 0 : 1, 10 - a); return [a, b]; }
    case "18": { const a = ri(2, 9), b = ri(Math.max(2, 11 - a), 9); return [a, b]; }
    case "20": { const a = ri(1, 18), b = ri(1, 20 - a); return [a, b]; }
    case "2d": { const a = ri(10, 89); return [a, 99 - a >= 10 && coin() ? ri(10, 99 - a) : ri(1, Math.min(9, 99 - a))]; }
    case "3d": { const a = ri(100, 899); return [a, ri(10, 999 - a)]; }
    case "4d": { const a = ri(1000, 8999); return [a, ri(100, 9999 - a)]; }
    default: { const a = ri(1, 60); return [a, ri(1, 99 - a)]; }
  }
}
def("add", "加法", p => {
  if (p === "big") { const a = ri(10, 5000), b = ri(10, 5000), u = pick(["萬", "億"]); return {q: `${a} ${u} + ${b} ${u}`, a: `${a + b} ${u}`}; }
  const [a, b] = addPair(p); return {q: `${N(a)} + ${N(b)}`, a: N(a + b)};
});
def("sub", "減法", p => {
  if (p === "big") { const a = ri(100, 9999), b = ri(10, a - 1), u = pick(["萬", "億"]); return {q: `${a} ${u} − ${b} ${u}`, a: `${a - b} ${u}`}; }
  const [x, y] = addPair(p === "18" ? "18" : p); return {q: `${N(x + y)} − ${N(p === "18" ? y : x)}`, a: N(p === "18" ? x : y)};
});
def("add_est", "加減估算", () => {
  const a = ri(101, 899), b = ri(101, 899), r = v => Math.round(v / 100) * 100;
  return coin() ? {q: `${a} + ${b} 大約是多少？（先估到百位再算）`, a: r(a) + r(b)}
                : {q: `${Math.max(a, b)} − ${Math.min(a, b)} 大約是多少？（先估到百位再算）`, a: r(Math.max(a, b)) - r(Math.min(a, b))};
});
def("inverse_add", "加減關係（找 □）", p => {
  const max = +p || 100, c = ri(5, max), a = ri(1, c - 1), b = c - a;
  switch (ri(0, 3)) {
    case 0: return {q: `□ + ${a} = ${c}，□ 是多少？`, a: b};
    case 1: return {q: `${a} + □ = ${c}，□ 是多少？`, a: b};
    case 2: return {q: `□ − ${a} = ${b}，□ 是多少？`, a: c};
    default: return {q: `${c} − □ = ${b}，□ 是多少？`, a: a};
  }
});
def("twostep_as", "兩步驟加減", p => {
  const max = +p || 100, a = ri(max / 5, max / 2), b = ri(1, max / 3), c = ri(1, Math.min(a + b - 1, max / 3));
  switch (ri(0, 2)) {
    case 0: return {q: `${a} + ${b} − ${c}`, a: a + b - c};
    case 1: return a - b - c > 0 ? {q: `${a} − ${b} − ${c}`, a: a - b - c} : {q: `${a} + ${b} − ${c}`, a: a + b - c};
    default: return a + b + c <= max ? {q: `${a} + ${b} + ${c}`, a: a + b + c} : {q: `${a} + ${b} − ${c}`, a: a + b - c};
  }
});
def("cmp_expr", "大於、小於、等於", () => {
  const a = ri(10, 80), b = ri(2, 19), c = a + b + pick([-1, 0, 1]) * ri(0, 3);
  return coin() ? {q: `${a} + ${b} ○ ${c}（填 &gt;、&lt; 或 =）`, a: cmp(a + b, c)} : {q: `${c + 20} − ${b} ○ ${a + 20 - (c - a - b)}（填 &gt;、&lt; 或 =）`, a: cmp(c + 20 - b, a + 20 - (c - a - b))};
});
def("word_diff", "多多少、少多少", p => {
  const max = +p || 20, [x, y] = two(), [u, t] = pick(THING), a = ri(3, max), b = ri(1, a - 1);
  switch (ri(0, 2)) {
    case 0: return {q: `${x}有 ${a} ${u}${t}，${y}有 ${b} ${u}。${x}比${y}多幾${u}？`, a: `${a - b} ${u}`};
    case 1: return {q: `${x}有 ${a} ${u}${t}，${y}比${x}少 ${a - b} ${u}。${y}有幾${u}？`, a: `${b} ${u}`};
    default: return {q: `${x}有 ${b} ${u}${t}，${y}比${x}多 ${a - b} ${u}。${y}有幾${u}？`, a: `${a} ${u}`};
  }
});

/* 乘法 */
def("mul", "乘法", p => {
  const ts = tables(p), a = pick(ts), b = ts.some(t => t <= 1 || t === 10) ? ri(0, 9) : ri(1, 9);
  return coin() || ts.length > 3 ? {q: `${a} × ${b}`, a: a * b} : {q: `${b} × ${a}`, a: a * b};
});
def("times_word", "幾的幾倍", p => { const a = pick(tables(p)), b = ri(2, 9); return {q: `${a} 的 ${b} 倍是多少？`, a: a * b}; });
def("mul_rel", "乘法的關係", () => {
  const a = ri(2, 9), b = ri(2, 9);
  switch (ri(0, 2)) {
    case 0: return {q: `${a} × ${b + 1} 比 ${a} × ${b} 多多少？`, a: a};
    case 1: return {q: `${a} × ${b} = ${a} × ${b - 1} + □，□ 是多少？`, a: a};
    default: return {q: `${a} × ${b} = ${b} × □，□ 是多少？`, a: a};
  }
});
def("mul21", "二位數乘以一位數", p => {
  const a = p === "teen" ? ri(11, 19) : nz(ri(11, 99)), b = p === "teen" ? ri(2, 3) : ri(2, 9);
  return {q: `${a} × ${b}`, a: a * b};
});
def("mul31", "三位數乘以一位數", () => { const a = ri(101, 999), b = ri(2, 9); return {q: `${a} × ${b}`, a: N(a * b)}; });
def("mul41", "四位數乘以一位數", () => { const a = ri(1001, 9999), b = ri(2, 9); return {q: `${N(a)} × ${b}`, a: N(a * b)}; });
def("mul22", "二位數乘以二位數", () => { const a = nz(ri(11, 99)), b = nz(ri(11, 99)); return {q: `${a} × ${b}`, a: N(a * b)}; });
def("mul32", "三位數乘以二位數", () => { const a = ri(101, 999), b = nz(ri(11, 99)); return {q: `${a} × ${b}`, a: N(a * b)}; });
def("mul33", "多位數乘以三位數", () => { const a = ri(101, 9999), b = ri(101, 999); return {q: `${N(a)} × ${b}`, a: N(a * b)}; });
def("mul_tens", "末幾位是 0 的乘法", p => {
  if (p === "1") { const a = pick([10, 100]) * ri(2, 9), b = ri(2, 9); return {q: `${a} × ${b}`, a: N(a * b)}; }
  const a = ri(2, 99) * pick([10, 100]), b = ri(2, 9) * pick([10, 100]);
  return {q: `${N(a)} × ${N(b)}`, a: N(a * b)};
});
def("mul_est", "乘法估算", () => { const a = ri(101, 999), b = ri(2, 9), r = Math.round(a / 100) * 100; return {q: `${a} × ${b} 大約是多少？（先把 ${a} 估到百位）`, a: N(r * b)}; });
def("inverse_mul", "乘除關係（找 □）", p => {
  const a = ri(2, p === "big" ? 30 : 9), b = ri(2, 9), c = a * b;
  switch (ri(0, 3)) {
    case 0: return {q: `□ × ${b} = ${c}，□ 是多少？`, a: a};
    case 1: return {q: `${a} × □ = ${c}，□ 是多少？`, a: b};
    case 2: return {q: `□ ÷ ${b} = ${a}，□ 是多少？`, a: c};
    default: return {q: `${c} ÷ □ = ${a}，□ 是多少？`, a: b};
  }
});
def("muladd", "乘法兩步驟", () => {
  const a = ri(2, 9), b = ri(2, 9), c = ri(1, 20);
  switch (ri(0, 3)) {
    case 0: return {q: `${a} × ${b} + ${c}`, a: a * b + c};
    case 1: { const c2 = ri(1, a * b - 1); return {q: `${a} × ${b} − ${c2}`, a: a * b - c2}; }
    case 2: { const s = ri(1, 6), t = ri(1, 9 - s); return {q: `(${s} + ${t}) × ${b}`, a: (s + t) * b}; }
    default: { const s = ri(4, 12), t = ri(1, s - 2); return (s - t) <= 9 ? {q: `(${s} − ${t}) × ${b}`, a: (s - t) * b} : {q: `${a} × ${b} + ${c}`, a: a * b + c}; }
  }
});
def("mulchain", "連乘", () => { const a = ri(2, 9), b = ri(2, 6), c = ri(2, 5); return {q: `${a} × ${b} × ${c}`, a: a * b * c}; });

/* 除法 */
def("share", "分裝與平分", p => {
  const [u, t] = pick(THING), b = ri(2, 9), q = ri(2, 9), r = p === "rem" ? ri(1, b - 1) : 0, a = b * q + r, who = pick(WHO);
  if (r) return {q: `${who}有 ${a} ${u}${t}，每 ${b} ${u}裝一袋，可以裝幾袋？還剩幾${u}？`, a: `${q} 袋，剩 ${r} ${u}`};
  return coin() ? {q: `${who}有 ${a} ${u}${t}，平分給 ${b} 個人，每人分到幾${u}？`, a: `${q} ${u}`}
                : {q: `${who}有 ${a} ${u}${t}，每 ${b} ${u}裝一袋，可以裝幾袋？`, a: `${q} 袋`};
});
def("div", "除法（用乘法表）", p => { const b = pick(tables(p).filter(x => x > 1)), c = ri(1, 9); return {q: `${b * c} ÷ ${b}`, a: c}; });
def("divr", "有餘數的除法", () => { const b = ri(2, 9), c = ri(1, 9), r = ri(1, b - 1); return {q: `${b * c + r} ÷ ${b}`, a: `${c} 餘 ${r}`}; });
function divAns(a, b) { const q = Math.floor(a / b), r = a % b; return r ? `${N(q)} 餘 ${r}` : N(q); }
function divGen(bmin, bmax, amin, amax) {
  for (;;) {
    const b = ri(bmin, bmax), q = ri(Math.ceil(amin / b), Math.floor(amax / b)), r = coin() ? 0 : ri(1, b - 1), a = b * q + r;
    if (q >= 1 && a >= amin && a <= amax) return {q: `${N(a)} ÷ ${b}`, a: divAns(a, b)};
  }
}
def("div21", "二位數除以一位數", () => divGen(2, 9, 20, 99));
def("div31", "三位數除以一位數", () => divGen(2, 9, 100, 999));
def("div41", "四位數除以一位數", () => divGen(2, 9, 1000, 9999));
def("div22", "除以二位數", () => coin() ? divGen(11, 49, 22, 99) : divGen(11, 99, 100, 999));
def("div42", "多位數除以二、三位數", () => coin() ? divGen(11, 99, 1000, 9999) : divGen(101, 999, 1000, 9999));
def("div_tens", "末幾位是 0 的除法", () => {
  const b = ri(2, 9) * pick([10, 100]), q = ri(2, 9) * pick([1, 10, 100]);
  return {q: `${N(b * q)} ÷ ${b}`, a: N(q)};
});
def("adddiv", "加減與除的兩步驟", () => {
  const b = ri(2, 9), q = ri(2, 9), c = ri(1, 20), a = b * q;
  switch (ri(0, 3)) {
    case 0: { const x = ri(1, a - 1); return {q: `(${x} + ${a - x}) ÷ ${b}`, a: q}; }
    case 1: return {q: `${a} ÷ ${b} + ${c}`, a: q + c};
    case 2: return {q: `(${a + c} − ${c}) ÷ ${b}`, a: q};
    default: { const c2 = ri(1, q - 1 || 1); return q > 1 ? {q: `${a} ÷ ${b} − ${c2}`, a: q - c2} : {q: `${a} ÷ ${b} + ${c}`, a: q + c}; }
  }
});
def("divchain", "連除", () => { const b = ri(2, 6), c = ri(2, 5), q = ri(2, 12); return {q: `${b * c * q} ÷ ${b} ÷ ${c}`, a: q}; });

/* 四則 */
def("order_ops", "四則混合（先乘除後加減、括號）", () => {
  const a = ri(2, 30), b = ri(2, 9), c = ri(2, 9);
  switch (ri(0, 5)) {
    case 0: return {q: `${a} + ${b} × ${c}`, a: a + b * c};
    case 1: { const x = b * c + ri(1, 30); return {q: `${x} − ${b} × ${c}`, a: x - b * c}; }
    case 2: { const s = ri(2, 12), t = ri(1, 9); return {q: `(${s} + ${t}) × ${c}`, a: (s + t) * c}; }
    case 3: { const q = ri(2, 9); return {q: `${b * q} ÷ ${b} + ${a}`, a: q + a}; }
    case 4: { const x = ri(30, 90), y = ri(1, x - 1), z = ri(1, x - y); return {q: `${x} − ${y} − ${z}`, a: x - y - z}; }
    default: { const q = ri(2, 9), s = ri(1, b * q - 1); return {q: `(${s} + ${b * q - s}) ÷ ${b} × ${c}`, a: q * c}; }
  }
});
def("simplify", "簡化計算", () => {
  const b = ri(3, 49);
  switch (ri(0, 5)) {
    case 0: return {q: `25 × ${b} × 4`, a: 100 * b};
    case 1: return {q: `125 × ${b} × 8`, a: N(1000 * b)};
    case 2: { const k = pick([99, 101, 999, 98]), m = ri(2, 9); return {q: `${k} × ${m}`, a: N(k * m)}; }
    case 3: { const x = ri(100, 800), y = pick([198, 299, 398, 499, 999]); return {q: `${x} + ${y}`, a: N(x + y)}; }
    case 4: { const x = ri(11, 89), k = ri(2, 9); return {q: `${x} × ${k} + ${100 - x} × ${k}`, a: 100 * k}; }
    default: { const x = ri(12, 48), y = ri(2, 9); return {q: `${x} × ${10 + y} − ${x} × ${y}`, a: 10 * x}; }
  }
});
def("avg", "平均", () => {
  const n = ri(3, 5), m = ri(5, 90), vals = Array.from({length: n}, () => m + ri(-5, 5));
  const s = vals.reduce((a, b) => a + b, 0), fix = n * m - s; vals[n - 1] += fix;
  if (vals.some(v => v <= 0)) return {q: `${m}、${m}、${m} 的平均是多少？`, a: m};
  return {q: `${vals.join("、")} 的平均是多少？`, a: m};
});

/* 分數 */
def("frac_unit_cmp", "幾分之一比大小", () => { let a = ri(2, 12), b = ri(2, 12); if (a === b) b = a + 1; return {q: `${F(1, a)} 和 ${F(1, b)}，哪個比較大？`, a: F(1, Math.min(a, b))}; });
def("frac_cmp", "分數比大小", p => {
  const d = ri(3, 12);
  if (p === "num") { const n = ri(1, 5), d1 = ri(n + 1, 12); let d2 = ri(n + 1, 12); if (d2 === d1) d2 = d1 === 12 ? 11 : d1 + 1; return {q: `${F(n, d1)} ○ ${F(n, d2)}`, a: cmp(d2, d1)}; }
  if (p === "mixed") { const w = ri(1, 3), n = ri(1, d - 1), m = w * d + n + pick([-1, 0, 1]); return {q: `${M(w, n, d)} ○ ${F(m, d)}`, a: cmp(w * d + n, m)}; }
  const a = ri(1, d - 1); let b = ri(1, d - 1); if (b === a) b = a === 1 ? 2 : a - 1;
  return {q: `${F(a, d)} ○ ${F(b, d)}`, a: cmp(a, b)};
});
def("frac_one", "和 1 一樣大的分數", () => { const d = ri(2, 12); return coin() ? {q: `1 = ${F("?", d)}`, a: F(d, d)} : {q: `${F(d, d)} = ?`, a: "1"}; });
def("frac_count", "幾個幾分之一", p => {
  const d = ri(2, 12), n = p === "any" ? ri(2, 2 * d) : ri(2, d);
  return coin() ? {q: `${n} 個 ${F(1, d)} 是多少？`, a: n === d ? `${F(d, d)} = 1` : fracAns(n, d, false)} : {q: `${F(n, d)} 是幾個 ${F(1, d)}？`, a: `${n} 個`};
});
def("frac_addsub", "同分母分數加減", p => {
  const d = ri(3, 12), big = p === "mixed";
  if (coin()) { const a = ri(1, big ? 2 * d : d - 2), b = ri(1, big ? 2 * d : d - a); return {q: `${F(a, d)} + ${F(b, d)}`, a: big ? fracAns(a + b, d, false) : a + b === d ? "1" : F(a + b, d)}; }
  if (big && coin()) { const w = ri(2, 4), b = ri(1, d - 1); return {q: `${w} − ${F(b, d)}`, a: fracAns(w * d - b, d, false)}; }
  const a = ri(2, big ? 2 * d : d - 1), b = ri(1, a - 1);
  return {q: `${F(a, d)} − ${F(b, d)}`, a: big ? fracAns(a - b, d, false) : F(a - b, d)};
});
def("improper", "假分數和帶分數互換", () => {
  const d = ri(2, 9), w = ri(1, 4), n = ri(1, d - 1);
  return coin() ? {q: `${M(w, n, d)} = ${F("?", d)}`, a: F(w * d + n, d)} : {q: `${F(w * d + n, d)} 化成帶分數`, a: M(w, n, d)};
});
def("frac_times_int", "分數的整數倍", () => { const d = ri(2, 9), n = ri(1, d - 1), m = ri(2, 9); return {q: `${F(n, d)} × ${m}`, a: fracAns(n * m, d, false)}; });
def("frac_equiv", "等值分數（擴分、約分）", () => {
  let a, b; do { b = ri(2, 9); a = ri(1, b - 1); } while (gcd(a, b) !== 1);
  const m = ri(2, 6);
  return coin() ? {q: `${F(a, b)} = ${F("?", b * m)}`, a: F(a * m, b * m)} : {q: `${F(a * m, b * m)} = ${F("?", b)}`, a: F(a, b)};
});
def("frac_reduce", "約成最簡分數", () => { let a, b; do { b = ri(2, 12); a = ri(1, b - 1); } while (gcd(a, b) !== 1); const m = ri(2, 6); return {q: `${F(a * m, b * m)} 約成最簡分數`, a: F(a, b)}; });
def("frac_unlike_simple", "簡單異分母分數", () => {
  const b = ri(2, 5), k = ri(2, 3), d = b * k, a = ri(1, b - 1), c = ri(1, d - 1);
  switch (ri(0, 2)) {
    case 0: return {q: `${F(a, b)} ○ ${F(c, d)}`, a: cmp(a * k, c)};
    case 1: return a * k + c <= d ? {q: `${F(a, b)} + ${F(c, d)}`, a: fracAns(a * k + c, d, false)} : {q: `${F(a, b)} ○ ${F(c, d)}`, a: cmp(a * k, c)};
    default: return a * k > c ? {q: `${F(a, b)} − ${F(c, d)}`, a: F(a * k - c, d)} : c > a * k ? {q: `${F(c, d)} − ${F(a, b)}`, a: F(c - a * k, d)} : {q: `${F(a, b)} ○ ${F(c, d)}`, a: "="};
  }
});
const FD = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [1, 25], [1, 50], [1, 8], [3, 8], [5, 8], [7, 20], [9, 25]];
def("frac_dec", "分數和小數互換", p => {
  if (coin()) {  // 小數 -> 分數
    const k = p === "simple" ? 1 : ri(1, 2), t = nz(ri(1, 10 ** k - 1));
    return {q: `${dec(t, k)} = ?（分數）`, a: p === "simple" ? F(t, 10 ** k) : fracAns(t, 10 ** k)};
  }
  const pool = p === "simple" ? FD.filter(([, d]) => d <= 10) : FD, [n, d] = pick(pool), w = p === "simple" ? 0 : ri(0, 2);
  return {q: `${w ? M(w, n, d) : F(n, d)} = ?（小數）`, a: dec(w * 1000 + n * 1000 / d, 3)};
});
def("frac_common_cmp", "異分母分數比大小（通分）", () => {
  let a, b, c, d; do { b = ri(2, 9); d = ri(2, 9); a = ri(1, b - 1); c = ri(1, d - 1); } while (b === d || a * d === b * c);
  return {q: `${F(a, b)} ○ ${F(c, d)}`, a: cmp(a * d, b * c)};
});
def("frac_unlike_addsub", "異分母分數加減", () => {
  let a, b, c, d; do { b = ri(2, 9); d = ri(2, 9); a = ri(1, b - 1); c = ri(1, d - 1); } while (b === d);
  if (coin()) return {q: `${F(a, b)} + ${F(c, d)}`, a: fracAns(a * d + b * c, b * d)};
  if (a * d < b * c) [a, b, c, d] = [c, d, a, b];
  if (a * d === b * c) return {q: `${F(a, b)} + ${F(c, d)}`, a: fracAns(a * d + b * c, b * d)};
  return {q: `${F(a, b)} − ${F(c, d)}`, a: fracAns(a * d - b * c, b * d)};
});
def("div_as_frac", "整數相除用分數表示", () => { const a = ri(1, 15), b = ri(2, 9); return a % b ? {q: `${a} ÷ ${b} 的商用分數表示`, a: fracAns(a, b, false)} : {q: `${a + 1} ÷ ${b} 的商用分數表示`, a: fracAns(a + 1, b, false)}; });
def("int_times_frac", "整數乘以分數", () => { const d = ri(2, 9), n = ri(1, d - 1), m = coin() ? d * ri(1, 6) : ri(2, 20); return {q: `${m} × ${F(n, d)}`, a: fracAns(m * n, d)}; });
def("frac_times_frac", "分數乘以分數", () => { const d = ri(2, 9), n = ri(1, d - 1), e = ri(2, 9), o = ri(1, e - 1); return {q: `${F(n, d)} × ${F(o, e)}`, a: fracAns(n * o, d * e)}; });
def("frac_div_int", "分數除以整數", () => {
  const d = ri(2, 9), m = ri(2, 6), n = coin() ? m * ri(1, Math.max(1, Math.floor((d - 1) / m))) : ri(1, d - 1);
  return {q: `${F(n, d)} ÷ ${m}`, a: fracAns(n, d * m)};
});
def("frac_div_frac", "分數除以分數", () => {
  const d = ri(2, 9), n = ri(1, d - 1), e = ri(2, 9), o = ri(1, e - 1), k = ri(1, 9);
  return coin() ? {q: `${F(n, d)} ÷ ${F(o, e)}`, a: fracAns(n * e, d * o)} : {q: `${k} ÷ ${F(o, e)}`, a: fracAns(k * e, o)};
});
/* 小數 */
def("dec_read", "認識小數", p => {
  if (p === "1") { const n = ri(1, 99); return coin() ? {q: `${dec(n, 1)} 是幾個 0.1？`, a: `${n} 個`} : {q: `${n} 個 0.1 是多少？`, a: dec(n, 1)}; }
  const k = p === "multi" ? 3 : 2, n = nz(ri(10 ** (k - 1), 10 ** (k + 1))), s = dec(n, k), parts = s.split(".")[1] || "";
  if (coin()) return {q: `${s} 是幾個 ${dec(1, k)}？`, a: `${N(n)} 個`};
  const names = ["十分位", "百分位", "千分位"], i = pick([...parts].map((c, i) => c !== "0" ? i : -1).filter(i => i >= 0));
  return {q: `${s} 的 ${parts[i]} 在哪一位？代表多少？`, a: `${names[i]}，${dec(+parts[i], i + 1)}`};
});
def("dec_cmp", "小數比大小", p => {
  const k = p === "1" ? 1 : p === "multi" ? 3 : 2, a = nz(ri(1, 10 ** (k + 1) - 1)), kb = p === "1" ? 1 : ri(1, k);
  let b = nz(ri(1, 10 ** (kb + 1) - 1));
  if (b * 10 ** (k - kb) === a) b = nz(b + 1);
  const va = a / 10 ** k, vb = b / 10 ** kb, [x, y] = coin() ? [dec(a, k), dec(b, kb)] : [dec(b, kb), dec(a, k)];
  return {q: `${x} 和 ${y}，哪個比較大？`, a: va > vb ? dec(a, k) : dec(b, kb)};
});
def("dec_addsub", "小數加減", p => {
  const k = p === "1" ? 1 : p === "multi" ? pick([2, 3]) : pick([1, 2]), top = 10 ** k * 5;
  let x = nz(ri(1, top)), y = nz(ri(1, top));
  if (k >= 2 && coin()) y = 10 * nz(ri(1, top / 10));
  if (coin()) return {q: `${dec(x, k)} + ${dec(y, k)}`, a: dec(x + y, k)};
  if (x < y) [x, y] = [y, x]; if (x === y) x += 1;
  return {q: `${dec(x, k)} − ${dec(y, k)}`, a: dec(x - y, k)};
});
def("dec_mul_int", "小數乘以整數", p => {
  const k = p === "1" ? 1 : p === "multi" ? pick([2, 3]) : 2, x = nz(ri(1, 10 ** k * 3)), m = p === "multi" || coin() ? ri(2, 30) : ri(2, 9);
  return {q: `${dec(x, k)} × ${m}`, a: dec(x * m, k)};
});
def("int_mul_dec", "整數乘以小數", () => { const k = ri(1, 2), x = nz(ri(1, 10 ** k)), m = ri(2, 60); return {q: `${m} × ${dec(x, k)}`, a: dec(x * m, k)}; });
def("dec_mul_dec", "小數乘以小數", () => { const a = nz(ri(1, 60)), b = nz(ri(1, 40)), ka = ri(1, 2), kb = 1; return {q: `${dec(a, ka)} × ${dec(b, kb)}`, a: dec(a * b, ka + kb)}; });
def("dec_div_int", "小數、整數除以整數", p => {
  if (p === "int" || coin()) { const b = pick([2, 4, 5, 8]), a = ri(1, 3 * b); if (a % b === 0) return {q: `${a + 1} ÷ ${b}`, a: dec((a + 1) * 1000 / b, 3)}; return {q: `${a} ÷ ${b} = ?（用小數表示）`, a: dec(a * 1000 / b, 3)}; }
  const b = ri(2, 9), k = ri(1, 2), q = nz(ri(1, 10 ** k * 5)); return {q: `${dec(q * b, k)} ÷ ${b}`, a: dec(q, k)};
});
def("dec_div_dec", "除以小數", () => {  // 只出除得盡的題目
  const kb = ri(1, 2), q = ri(2, 40);
  if (coin()) { const b = pick([2, 3, 4, 5, 6, 8, 25]); return {q: `${dec(b * q, kb)} ÷ ${dec(b, kb)}`, a: q}; }
  const b = pick([2, 4, 5, 8, 25]); return {q: `${N(q)} ÷ ${dec(b, kb)}`, a: dec(q * 10 ** kb * 1000 / b, 3)};
});
def("dec10", "乘、除以 10、100、1000", () => {
  const p = ri(0, 2); let n = ri(1, 999); if (p > 0 && n % 10 === 0) n += ri(1, 9);
  const k = ri(1, 3), u = 10 ** k;
  return coin() ? {q: `${dec(n, p)} × ${N(u)}`, a: dec(n, p - k)} : {q: `${dec(n, p)} ÷ ${N(u)}`, a: dec(n, p + k)};
});

/* 因數倍數 */
const NICE = [6, 8, 10, 12, 14, 15, 16, 18, 20, 21, 24, 27, 28, 30, 32, 36, 40, 42, 45, 48, 50, 54, 56, 60, 64, 72];
def("divisible", "整除", () => { const b = ri(2, 9), a = coin() ? b * ri(3, 20) : ri(20, 150); return {q: `${a} 能被 ${b} 整除嗎？`, a: a % b ? `不能（餘 ${a % b}）` : "能"}; });
def("factors", "找出所有因數", () => { const n = pick(NICE), f = []; for (let i = 1; i <= n; i++) if (n % i === 0) f.push(i); return {q: `${n} 的因數有哪些？`, a: f.join("、")}; });
def("multiples", "倍數", () => {
  const k = ri(2, 12);
  if (coin()) return {q: `${k} 的倍數，從小到大的前 5 個是？`, a: [1, 2, 3, 4, 5].map(i => i * k).join("、")};
  const n = coin() ? k * ri(3, 15) : ri(20, 150); return {q: `${n} 是 ${k} 的倍數嗎？`, a: n % k ? "不是" : "是"};
});
def("mult_rule", "2、3、5、9、10 的倍數", p => {
  const k = pick(tables(p || "2,3,5,9,10")), n = coin() ? k * ri(Math.ceil(100 / k), Math.floor(999 / k)) : ri(100, 999);
  return {q: `${n} 是 ${k} 的倍數嗎？`, a: n % k === 0 ? "是" : "不是"};
});
def("gcd", "最大公因數", () => {
  let x, y; do { x = ri(1, 7); y = ri(2, 8); } while (x === y || gcd(x, y) !== 1);
  const g = ri(2, 9); return coin() ? {q: `${g * x} 和 ${g * y} 的最大公因數`, a: g} : {q: `${g * x} 和 ${g * y} 的公因數有哪些？`, a: [...Array(g).keys()].map(i => i + 1).filter(i => g % i === 0).join("、")};
});
def("lcm", "最小公倍數", () => { let a, b; do { a = ri(2, 12); b = ri(2, 15); } while (a === b || lcm(a, b) > 90); return {q: `${a} 和 ${b} 的最小公倍數`, a: lcm(a, b)}; });
const isPrime = n => { if (n < 2) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
def("prime", "質數和合數", () => { const n = ri(2, 99); return {q: `${n} 是質數還是合數？`, a: isPrime(n) ? "質數" : "合數"}; });
def("prime_fact", "質因數分解", () => {
  let n; do { n = ri(12, 120); } while (isPrime(n));
  const f = []; let m = n; for (let p = 2; m > 1; p++) while (m % p === 0) { f.push(p); m /= p; }
  return {q: `把 ${n} 做質因數分解`, a: `${n} = ${f.join(" × ")}`};
});

/* 比、比率、百分率 */
def("ratio", "比與比值", () => {
  const a = ri(1, 9), b = ri(1, 9), k = ri(2, 6);
  switch (ri(0, 2)) {
    case 0: return {q: `${a}：${b} 的比值是多少？`, a: fracAns(a, b)};
    case 1: return {q: `${a}：${b} = ${a * k}：?`, a: b * k};
    default: { const g = gcd(a, b); return {q: `${a * k}：${b * k} 化成最簡整數比`, a: `${a / g}：${b / g}`}; }
  }
});
def("rate", "比率", () => { const n = pick([20, 24, 25, 30, 32, 40]), k = ri(1, n - 1); return {q: `全班 ${n} 人，其中 ${k} 人戴眼鏡。戴眼鏡的人占全班的幾分之幾？`, a: fracAns(k, n)}; });
def("pct", "分數、小數、百分率互換", () => {
  const [n, d] = pick(FD.slice(0, 17)), forms = [F(n, d), dec(n * 1000 / d, 3), dec(n * 1000 / d, 1) + "%"], names = ["分數", "小數", "百分率"];
  const i = ri(0, 2); let j = ri(0, 1); if (j >= i) j++;
  return {q: `${forms[i]} = ?（${names[j]}）`, a: forms[j]};
});
def("pct_of", "百分率的應用", () => {
  switch (ri(0, 2)) {
    case 0: { const b = pick([40, 80, 120, 200, 300, 400, 500, 600, 800]), p = pick([5, 10, 20, 25, 30, 40, 50, 60, 75]); return b * p % 100 ? {q: `200 的 ${p}% 是多少？`, a: 2 * p} : {q: `${b} 的 ${p}% 是多少？`, a: b * p / 100}; }
    case 1: { const price = ri(2, 20) * 50, off = pick([9, 8, 7, 75, 6, 85]); const pct = off < 10 ? off * 10 : off; return {q: `原價 ${price} 元的東西打${off < 10 ? CNUM[off] : off === 75 ? "七五" : "八五"}折，要付多少元？`, a: `${price * pct / 100} 元`}; }
    default: { const b = pick([20, 25, 50, 200]), a = ri(1, b - 1); return {q: `${a} 是 ${b} 的百分之幾？`, a: dec(a * 1000 / b, 1) + "%"}; }
  }
});
def("base_cmp", "基準量和比較量", p => {
  const [x, y] = two(), d = ri(2, 9), n = ri(1, d - 1), k = ri(2, 12), base = d * k;
  if (p === "sum" && coin()) return {q: `${y}的錢是${x}的 ${F(n, d)}，兩人合起來有 ${(d + n) * k} 元。${x}有幾元？`, a: `${base} 元`};
  if (p === "sum") return {q: `${y}的錢比${x}少 ${F(d - n, d)}，${x}有 ${base} 元。${y}有幾元？`, a: `${n * k} 元`};
  return coin() ? {q: `${y}的錢是${x}的 ${F(n, d)}，${x}有 ${base} 元。${y}有幾元？`, a: `${n * k} 元`}
                : {q: `${y}有 ${n * k} 元，是${x}的 ${F(n, d)}。${x}有幾元？`, a: `${base} 元`};
});

/* 速率 */
def("speed", "速率", () => {
  const v = ri(3, 12) * 10, t = ri(2, 6), unit = pick([["時速", "公里", "小時"], ["分速", "公尺", "分鐘"]]);
  switch (ri(0, 2)) {
    case 0: return {q: `${unit[0]} ${v} ${unit[1]}，${t} ${unit[2]}可以走多遠？`, a: `${v * t} ${unit[1]}`};
    case 1: return {q: `${t} ${unit[2]}走了 ${v * t} ${unit[1]}，${unit[0]}是多少？`, a: `${unit[0]} ${v} ${unit[1]}`};
    default: return {q: `${unit[0]} ${v} ${unit[1]}，走 ${v * t} ${unit[1]}要幾${unit[2]}？`, a: `${t} ${unit[2]}`};
  }
});
def("speed_conv", "速率單位換算", () => {
  switch (ri(0, 2)) {
    case 0: { const v = ri(1, 30); return {q: `時速 ${dec(v * 36, 1)} 公里 = 秒速幾公尺？`, a: `${v} 公尺`}; }
    case 1: { const m = ri(1, 30) * 50; return {q: `分速 ${m} 公尺 = 時速幾公里？`, a: `${dec(m * 60, 3)} 公里`}; }
    default: { const s = ri(2, 30); return {q: `秒速 ${s} 公尺 = 分速幾公尺？`, a: `${s * 60} 公尺`}; }
  }
});
def("speed_word", "相遇、追趕、流水問題", () => {
  const a = ri(4, 9) * 10, b = ri(2, 8) * 10, t = ri(2, 9);
  switch (ri(0, 2)) {
    case 0: return {q: `兩人相距 ${(a + b) * t} 公尺，同時相向走，分速各是 ${a} 和 ${b} 公尺。幾分鐘後相遇？`, a: `${t} 分鐘`};
    case 1: { const f = a + b, s = a; return {q: `哥哥先走了 ${(f - s) * t} 公尺，弟弟才出發追。哥哥分速 ${s} 公尺，弟弟分速 ${f} 公尺，幾分鐘追上？`, a: `${t} 分鐘`}; }
    default: { const v = ri(10, 20), w = ri(2, 5); return {q: `船在靜水中時速 ${v} 公里，水流時速 ${w} 公里。順流而下的時速是多少？逆流呢？`, a: `順流 ${v + w} 公里，逆流 ${v - w} 公里`}; }
  }
});

/* 量與實測：單位換算 */
const FAM = {
  m_cm: ["公尺", "公分", 100], cm_mm: ["公分", "毫米", 10], km_m: ["公里", "公尺", 1000], l_ml: ["公升", "毫升", 1000],
  kg_g: ["公斤", "公克", 1000], t_kg: ["公噸", "公斤", 1000], d_h: ["日", "小時", 24], h_min: ["小時", "分鐘", 60],
  min_s: ["分鐘", "秒", 60], yr_mo: ["年", "個月", 12], wk_d: ["星期", "天", 7],
};
def("conv", "單位換算", p => {
  const [fam, opt] = (p || "m_cm").split(".");
  if (fam === "area") {
    const f = pick([["公畝", "平方公尺", 100], ["公頃", "平方公尺", 10000], ["平方公里", "公頃", 100], ["公頃", "公畝", 100], ["平方公尺", "平方公分", 10000]]), a = ri(2, 30);
    return coin() ? {q: `${a} ${f[0]} = ? ${f[1]}`, a: `${N(a * f[2])} ${f[1]}`} : {q: `${N(a * f[2])} ${f[1]} = ? ${f[0]}`, a: `${a} ${f[0]}`};
  }
  if (fam === "vol") {
    const f = pick([["立方公尺", "立方公分", 1e6], ["公升", "立方公分", 1000], ["毫升", "立方公分", 1], ["立方公尺", "公升", 1000]]), a = ri(2, 20);
    return coin() ? {q: `${a} ${f[0]} = ? ${f[1]}`, a: `${N(a * f[2])} ${f[1]}`} : {q: `${N(a * f[2])} ${f[1]} = ? ${f[0]}`, a: `${a} ${f[0]}`};
  }
  const [big, small, r] = FAM[fam], a = ri(1, 9), b = ri(1, r - 1), tot = a * r + b;
  if (opt === "d" && coin()) {  // 小數：2.5 公斤 = ? 公克
    const k = r === 10 ? 1 : r === 100 ? 2 : 3, n = nz(ri(11, 10 ** k * 9));
    return coin() ? {q: `${dec(n, k)} ${big} = ? ${small}`, a: `${N(n * r / 10 ** k)} ${small}`} : {q: `${N(n * r / 10 ** k)} ${small} = ? ${big}`, a: `${dec(n, k)} ${big}`};
  }
  switch (ri(0, 2)) {
    case 0: return {q: `${a} ${big} ${b} ${small} = ? ${small}`, a: `${N(tot)} ${small}`};
    case 1: return {q: `${N(tot)} ${small} = ? ${big} ? ${small}`, a: `${a} ${big} ${b} ${small}`};
    default: return {q: `${a} ${big} = ? ${small}`, a: `${N(a * r)} ${small}`};
  }
});
def("meas_addsub", "複名數加減", p => {
  const [big, small, r] = FAM[p || "m_cm"], a = ri(1, 8), b = ri(1, r - 1), c = ri(1, 5), d = ri(1, r - 1);
  const fmt = t => { const x = Math.floor(t / r), y = t % r; return x && y ? `${x} ${big} ${y} ${small}` : x ? `${x} ${big}` : `${y} ${small}`; };
  const s = a * r + b, t = c * r + d;
  if (coin()) return {q: `${a} ${big} ${b} ${small} + ${c} ${big} ${d} ${small}`, a: fmt(s + t)};
  const [x, y] = s >= t ? [s, t] : [t, s];
  return {q: `${fmt(x)} − ${fmt(y)}`, a: fmt(x - y)};
});
def("days_month", "年、月、日", () => {
  switch (ri(0, 2)) {
    case 0: { const m = ri(1, 12); return {q: `${m} 月有幾天？${m === 2 ? "（平年）" : ""}`, a: `${MDAYS[m]} 天`}; }
    case 1: { const m = ri(1, 11), k = ri(1, 12 - m); let s = 0; for (let i = m; i < m + k; i++) s += MDAYS[i]; return k === 1 ? {q: `${m} 月 1 日到 ${m} 月底，一共有幾天？`, a: `${MDAYS[m]} 天`} : {q: `${m} 月和 ${m + 1} 月合起來有幾天？`, a: `${MDAYS[m] + MDAYS[m + 1]} 天`}; }
    default: return pick([{q: "平年一年有幾天？", a: "365 天"}, {q: "閏年一年有幾天？", a: "366 天"}, {q: "一年有幾個大月（31 天的月）？", a: "7 個"}, {q: "一年有幾個月？", a: "12 個月"}]);
  }
});
def("calendar_calc", "日期與星期", () => {
  const m = ri(1, 12), d = ri(1, MDAYS[m] - 14), w = ri(0, 6);
  if (coin()) { const k = ri(1, 14), d2 = d + k; return {q: `${m} 月 ${d} 日是星期${WEEK[w]}，${m} 月 ${d2} 日是星期幾？`, a: `星期${WEEK[(w + k) % 7]}`}; }
  const k = ri(3, 20); let mm = m, dd = MDAYS[m] - ri(0, 8) + k;
  const start = dd - k;
  while (dd > MDAYS[mm]) { dd -= MDAYS[mm]; mm = mm % 12 + 1; }
  return {q: `${m} 月 ${start} 日再過 ${k} 天是幾月幾日？`, a: `${mm} 月 ${dd} 日`};
});

/* 時間 */
def("time_after", "經過一段時間後的時刻", p => {
  if (p === "h") { const h = ri(1, 9), k = ri(1, 12 - h - 0); return k > 0 ? {q: `${h} 時再過 ${k} 小時是幾時？`, a: `${h + k} 時`} : {q: `${h} 時再過 1 小時是幾時？`, a: `${h + 1} 時`}; }
  if (p === "24") {
    const h = ri(5, 22), m = ri(0, 11) * 5, dh = ri(1, 9), dm = ri(0, 11) * 5, t = (h * 60 + m + dh * 60 + dm), nh = Math.floor(t / 60), nm = t % 60;
    return {q: `${clock12(h, m)}再過 ${hm(dh, dm)}，是幾時幾分？`, a: `${nh >= 24 ? "隔天" : ""}${clock12(nh % 24, nm)}（${clock24(nh % 24, nm)}）`};
  }
  const h = ri(7, 17), m = ri(0, 11) * 5, dm = ri(1, 11) * 5 + (p === "hm1" ? ri(0, 4) : 0), t = h * 60 + m + dm;
  return coin() ? {q: `${clock12(h, m)}再過 ${dm} 分鐘，是幾時幾分？`, a: clock12(Math.floor(t / 60), t % 60)}
                : {q: `${clock12(Math.floor(t / 60), t % 60)}的 ${dm} 分鐘前，是幾時幾分？`, a: clock12(h, m)};
});
def("time_between", "兩個時刻間的時間", p => {
  if (p === "h") { const a = ri(1, 8), b = ri(a + 1, 12); return {q: `從 ${a} 時到 ${b} 時，經過幾小時？`, a: `${b - a} 小時`}; }
  const a = ri(6, 18) * 60 + ri(0, 11) * 5, len = p === "24" ? ri(60, 14 * 60) : ri(10, 200), rl = Math.round(len / 5) * 5, b = a + rl;
  const bh = Math.floor(b / 60) % 24, bm = b % 60, day = b >= 24 * 60 ? "隔天" : "";
  return {q: `從${clock12(Math.floor(a / 60), a % 60)}到${day}${clock12(bh, bm)}，經過多久？`, a: rl >= 60 ? hm(Math.floor(rl / 60), rl % 60) : `${rl} 分鐘`};
});
def("time_24h", "12 時制和 24 時制", () => {
  const h = ri(1, 23), m = ri(0, 11) * 5;
  return coin() ? {q: `${clock12(h, m)}，用 24 時制怎麼說？`, a: clock24(h, m)} : {q: `${clock24(h, m)}（24 時制）是上午還是下午幾時？`, a: clock12(h, m)};
});
def("time_muldiv", "時間的乘除", () => {
  const per = ri(15, 75), n = ri(2, 6), tot = per * n;
  const f = t => t >= 60 ? hm(Math.floor(t / 60), t % 60) : `${t} 分鐘`;
  return coin() ? {q: `每次花 ${f(per)}，做 ${n} 次一共要多久？`, a: f(tot)} : {q: `${f(tot)}平分成 ${n} 段，每段多久？`, a: f(per)};
});

/* 幾何（口說） */
def("rect", "長方形、正方形的周長和面積", p => {
  const l = ri(3, 20), w = ri(2, l - 1), s = ri(2, 15);
  switch (p === "perim" ? pick([0, 2, 4]) : ri(0, 4)) {
    case 0: return {q: `長 ${l} 公分、寬 ${w} 公分的長方形，周長是多少？`, a: `${2 * (l + w)} 公分`};
    case 1: return {q: `長 ${l} 公分、寬 ${w} 公分的長方形，面積是多少？`, a: `${l * w} 平方公分`};
    case 2: return {q: `邊長 ${s} 公分的正方形，周長是多少？`, a: `${4 * s} 公分`};
    case 3: return {q: `邊長 ${s} 公分的正方形，面積是多少？`, a: `${s * s} 平方公分`};
    default: return {q: `正方形的周長是 ${4 * s} 公分，邊長是多少？`, a: `${s} 公分`};
  }
});
def("area_shapes", "平行四邊形、三角形、梯形面積", () => {
  const b = ri(3, 15), h = ri(2, 12), t = ri(2, 10);
  switch (ri(0, 2)) {
    case 0: return {q: `底 ${b} 公分、高 ${h} 公分的平行四邊形，面積是多少？`, a: `${b * h} 平方公分`};
    case 1: { const hh = b * h % 2 ? h + 1 : h; return {q: `底 ${b} 公分、高 ${hh} 公分的三角形，面積是多少？`, a: `${b * hh / 2} 平方公分`}; }
    default: { const hh = (b + t) * h % 2 ? h + 1 : h; return {q: `上底 ${t} 公分、下底 ${b} 公分、高 ${hh} 公分的梯形，面積是多少？`, a: `${(b + t) * hh / 2} 平方公分`}; }
  }
});
def("volume", "體積", p => {
  if (p === "prism" && coin()) { const base = ri(6, 40), h = ri(2, 12); return {q: `底面積 ${base} 平方公分、高 ${h} 公分的柱體，體積是多少？`, a: `${base * h} 立方公分`}; }
  const l = ri(2, 12), w = ri(2, 10), h = ri(2, 10), s = ri(2, 10);
  return coin() ? {q: `長 ${l}、寬 ${w}、高 ${h} 公分的長方體，體積是多少？`, a: `${l * w * h} 立方公分`} : {q: `邊長 ${s} 公分的正方體，體積是多少？`, a: `${s ** 3} 立方公分`};
});
def("surface", "表面積", () => {
  const l = ri(2, 10), w = ri(2, 8), h = ri(2, 8), s = ri(2, 10);
  return coin() ? {q: `邊長 ${s} 公分的正方體，表面積是多少？`, a: `${6 * s * s} 平方公分`} : {q: `長 ${l}、寬 ${w}、高 ${h} 公分的長方體，表面積是多少？`, a: `${2 * (l * w + w * h + l * h)} 平方公分`};
});
def("circle", "圓", p => {
  const r = ri(1, 10);
  if (p === "rd" || (!p && coin())) return coin() ? {q: `半徑 ${r} 公分的圓，直徑是多少？`, a: `${2 * r} 公分`} : {q: `直徑 ${2 * r} 公分的圓，半徑是多少？`, a: `${r} 公分`};
  const pi = 314;
  switch (p === "circ" ? 0 : p === "area" ? 1 : ri(0, 3)) {
    case 0: return {q: `半徑 ${r} 公分的圓，圓周長是多少？（圓周率 3.14）`, a: `${dec(2 * r * pi, 2)} 公分`};
    case 1: return {q: `半徑 ${r} 公分的圓，面積是多少？（圓周率 3.14）`, a: `${dec(r * r * pi, 2)} 平方公分`};
    case 2: { const k = pick([2, 4]); return {q: `半徑 ${r} 公分的 ${F(1, k)} 圓，面積是多少？（圓周率 3.14）`, a: `${dec(r * r * pi / k, 2)} 平方公分`}; }
    default: { const k = pick([2, 4]); return {q: `半徑 ${r} 公分的 ${F(1, k)} 圓，周長是多少？（圓周率 3.14）`, a: `${dec(2 * r * pi / k + 2 * r * 100, 2)} 公分`}; }
  }
});
def("angle_calc", "角度", () => {
  switch (ri(0, 3)) {
    case 0: return pick([{q: "1 個直角是幾度？", a: "90 度"}, {q: "平角是幾度？", a: "180 度"}, {q: "周角是幾度？", a: "360 度"}, {q: "3 個直角是幾度？", a: "270 度"}]);
    case 1: { const a = ri(1, 17) * 5, b = ri(1, 17) * 5; return {q: `${a} 度和 ${b} 度的角合起來是幾度？`, a: `${a + b} 度`}; }
    case 2: { const a = ri(1, 17) * 5; return {q: `${a} 度再加多少度，會變成一個直角？`, a: `${90 - a} 度`}; }
    default: { const h = ri(1, 6); return {q: `時鐘的分針轉了 ${h * 15} 分鐘，轉了幾度？`, a: `${h * 90} 度`}; }
  }
});
def("sector", "扇形與圓心角", () => {
  const k = pick([2, 3, 4, 6, 8, 12]), n = ri(1, k - 1), g = gcd(n, k);
  return coin() ? {q: `${F(n / g, k / g)} 圓的圓心角是幾度？`, a: `${360 * n / k} 度`} : {q: `圓心角 ${360 * n / k} 度的扇形，是幾分之幾圓？`, a: `${F(n / g, k / g)} 圓`};
});
def("tri_angle", "三角形內角", () => {
  const a = ri(3, 12) * 5, b = ri(3, 30 - a / 5 - 2) * 5;
  return coin() ? {q: `三角形的兩個角是 ${a} 度和 ${b} 度，第三個角是幾度？`, a: `${180 - a - b} 度`}
                : (() => { const t = ri(2, 16) * 10; return {q: `等腰三角形的頂角是 ${t} 度，一個底角是幾度？`, a: `${(180 - t) / 2} 度`}; })();
});
def("poly_sum", "多邊形內角和", () => {
  const n = ri(4, 8), names = ["", "", "", "三角形", "四邊形", "五邊形", "六邊形", "七邊形", "八邊形"];
  return coin() ? {q: `${names[n]}的內角和是幾度？`, a: `${(n - 2) * 180} 度`} : n === 7 ? {q: "正六邊形的一個內角是幾度？", a: "120 度"} : {q: `正${names[n]}的一個內角是幾度？`, a: `${(n - 2) * 180 / n} 度`};
});
def("tri_side", "三角形邊長關係", () => {
  const a = ri(2, 9), b = ri(2, 9), c = ri(1, 18);
  return {q: `三根小棒長 ${a}、${b}、${c} 公分，可以圍成三角形嗎？`, a: a + b > c && a + c > b && b + c > a ? "可以" : "不可以"};
});
def("solid_parts", "柱體、錐體的面、邊、頂點", p => {
  if (p === "box") return pick([{q: "正方體有幾個面？", a: "6 個"}, {q: "長方體有幾條邊？", a: "12 條"}, {q: "正方體有幾個頂點？", a: "8 個"},
    {q: "正方體的每一個面是什麼形狀？", a: "正方形"}, {q: "長方體最多有幾個面是長方形？", a: "6 個"}, {q: "長方體有幾個頂點？", a: "8 個"}]);
  const n = ri(3, 8), nm = ["", "", "", "三", "四", "五", "六", "七", "八"][n];
  return coin() ? {q: `${nm}角柱有幾個面、幾條邊、幾個頂點？`, a: `${n + 2} 個面、${3 * n} 條邊、${2 * n} 個頂點`}
                : {q: `${nm}角錐有幾個面、幾條邊、幾個頂點？`, a: `${n + 1} 個面、${2 * n} 條邊、${n + 1} 個頂點`};
});
def("scale", "放大、縮小與比例尺", () => {
  if (coin()) { const s = pick([100, 500, 1000, 2000, 10000]), c = ri(2, 12); return {q: `比例尺 1：${N(s)} 的地圖上是 ${c} 公分，實際是幾公尺？`, a: `${dec(c * s, 2)} 公尺`}; }
  const a = ri(2, 12), k = ri(2, 4); return {q: `一個邊長 ${a} 公分的圖形放大 ${k} 倍，這個邊變成幾公分？`, a: `${a * k} 公分`};
});
def("word", "解題", p => {
  switch (p || pick(["sumdiff", "age", "cr", "tree", "combo"])) {
    case "sumdiff": { const b = ri(5, 40), d = ri(2, 20); return {q: `兩個數的和是 ${2 * b + d}，差是 ${d}。大的數是多少？`, a: b + d}; }
    case "age": { const c = ri(5, 12), dad = c * ri(3, 5), n = ri(2, 10); return {q: `今年爸爸 ${dad} 歲，小明 ${c} 歲。${n} 年後，爸爸比小明大幾歲？`, a: `${dad - c} 歲`}; }
    case "cr": { const r = ri(1, 9), c = ri(1, 9); return {q: `雞和兔子一共 ${r + c} 隻，腳一共 ${2 * c + 4 * r} 隻。兔子有幾隻？`, a: `${r} 隻`}; }
    case "tree": { const g = pick([2, 5, 10]), n = ri(3, 12); return coin() ? {q: `一條路長 ${g * n} 公尺，每 ${g} 公尺種一棵樹，兩端都要種，一共要種幾棵？`, a: `${n + 1} 棵`} : {q: `一條路長 ${g * n} 公尺，每 ${g} 公尺種一棵樹，兩端都不種，一共要種幾棵？`, a: `${n - 1} 棵`}; }
    default: { const a = ri(2, 5), b = ri(2, 4); return {q: `有 ${a} 件上衣和 ${b} 件褲子，一件上衣配一件褲子，一共有幾種穿法？`, a: `${a * b} 種`}; }
  }
});

/* ---------- 看圖題 ---------- */
def("v_count", "數一數有幾個", p => { const max = +p || 10, n = ri(Math.max(1, Math.floor(max / 3)), max); return {q: "一共有幾個？", a: n, fig: dotsFig(n)}; }, true);
def("v_blocks", "看積木說數字", p => {
  const max = +p || 100, h = max >= 1000 ? ri(1, 4) : 0, t = ri(max >= 1000 ? 0 : 1, 9), o = ri(0, 9);
  return {q: max >= 1000 ? "一共是多少？（大方塊是 100，長條是 10，小方塊是 1）" : "一共是多少？（長條是 10，小方塊是 1）", a: h * 100 + t * 10 + o, fig: blocksFig(h, t, o)};
}, true);
def("v_clock", "看時鐘", p => {
  const h = ri(1, 12), m = p === "half" ? pick([0, 30]) : p === "5" ? ri(0, 11) * 5 : ri(0, 59);
  return {q: "現在是幾時幾分？", a: m === 0 ? `${h} 時（${h} 點鐘）` : m === 30 && p === "half" ? `${h} 時 30 分（${h} 點半）` : `${h} 時 ${m} 分`, fig: clockFig(h, m)};
}, true);
def("v_coins", "數錢", p => {
  const max = +p || 100, kinds = max >= 1000 ? [1, 5, 10, 50, 100, 500, 1000] : max >= 500 ? [1, 5, 10, 50, 100] : [1, 5, 10, 50];
  const vals = [];
  let total = 0;
  for (let i = 0, n = ri(3, 8); i < n; i++) { const v = pick(kinds); if (total + v > max) continue; vals.push(v); total += v; }
  if (!vals.length) vals.push(10), total = 10;
  vals.sort((a, b) => b - a);
  return {q: "一共是幾元？", a: `${total} 元`, fig: coinsFig(vals)};
}, true);
def("v_frac", "塗色部分是幾分之幾", p => {
  const d = ri(2, p === "unit" ? 8 : 10), n = p === "unit" ? 1 : p === "improper" ? ri(d + 1, 2 * d - 1) : ri(1, d - 1);
  const shape = coin() ? "pie" : "bar";
  return {q: "塗色的部分是幾分之幾？（一個圖形是 1）", a: fracAns(n, d, false), fig: fracFig(n, d, shape)};
}, true);
def("v_angle", "認識角", p => {
  const kind = pick(["直角", "銳角", "鈍角"].concat(p === "deg" ? ["平角"] : []));
  const deg = kind === "直角" ? 90 : kind === "銳角" ? ri(3, 16) * 5 : kind === "鈍角" ? ri(20, 34) * 5 : 180;
  if (p === "deg" && kind !== "直角" && kind !== "平角" && coin()) return {q: "這個角大約是幾度？（說出最接近的 10 度）", a: `約 ${Math.round(deg / 10) * 10} 度（${kind}）`, fig: angleFig(deg)};
  return {q: "這是直角、銳角還是鈍角？", a: kind === "平角" ? "平角（180 度）" : kind, fig: angleFig(deg)};
}, true);
function triangle() {
  const k = pick(["正", "等腰銳", "等腰直角", "等腰鈍", "直角", "鈍角", "銳角"]);
  let pts, marks = "", name;
  switch (k) {
    case "正": pts = [[40, 150], [200, 150], [120, r1(150 - 160 * .866)]]; name = "正三角形（也是銳角三角形）"; marks = sideMark(pts[0], pts[1]) + sideMark(pts[1], pts[2]) + sideMark(pts[2], pts[0]); break;
    case "等腰銳": pts = [[60, 150], [180, 150], [120, 20]]; name = "等腰三角形（銳角三角形）"; marks = sideMark(pts[1], pts[2]) + sideMark(pts[2], pts[0]); break;
    case "等腰直角": pts = [[40, 150], [200, 150], [120, 70]]; name = "等腰直角三角形"; marks = sideMark(pts[1], pts[2]) + sideMark(pts[2], pts[0]) + rightMark([120, 70], [-.707, .707], [.707, .707]); break;
    case "等腰鈍": pts = [[20, 140], [220, 140], [120, 90]]; name = "等腰三角形（鈍角三角形）"; marks = sideMark(pts[1], pts[2]) + sideMark(pts[2], pts[0]); break;
    case "直角": pts = [[50, 150], [210, 150], [50, 40]]; name = "直角三角形"; marks = rightMark([50, 150], [1, 0], [0, -1]); break;
    case "鈍角": pts = [[20, 150], [150, 150], [220, 60]]; name = "鈍角三角形"; break;
    default: pts = [[40, 150], [210, 150], [90, 30]]; name = "銳角三角形"; break;
  }
  return {fig: svg(240, 160, poly(pts) + marks), name};
}
function quad(want) {
  const k = want || pick(["正方形", "長方形", "菱形", "平行四邊形", "梯形"]);
  const P = {正方形: [[70, 20], [190, 20], [190, 140], [70, 140]], 長方形: [[30, 40], [230, 40], [230, 130], [30, 130]],
    菱形: [[130, 20], [225, 80], [130, 140], [35, 80]], 平行四邊形: [[70, 30], [240, 30], [190, 140], [20, 140]], 梯形: [[80, 30], [180, 30], [235, 140], [15, 140]]}[k];
  let marks = "";
  if (k === "正方形" || k === "菱形") marks = P.map((p, i) => sideMark(p, P[(i + 1) % 4])).join("");
  if (k === "正方形" || k === "長方形") marks += rightMark(P[3], [1, 0], [0, -1]);
  return {fig: svg(250, 160, poly(P) + marks), name: k};
}
def("v_shape", "認識圖形", p => {
  if (p === "tri") { const t = triangle(); return {q: "這是什麼三角形？（有記號的邊一樣長）", a: t.name, fig: t.fig}; }
  if (p === "quad") { const t = quad(); return {q: "這是什麼四邊形？（有記號的邊一樣長）", a: t.name, fig: t.fig}; }
  const k = pick(["三角形", "正方形", "長方形", "圓形"]);
  let fig;
  if (k === "圓形") fig = svg(240, 160, `<circle cx="120" cy="80" r="70" fill="var(--accent-soft)" stroke="currentColor" stroke-width="3"/>`);
  else if (k === "三角形") fig = svg(240, 160, poly(pick([[[40, 150], [200, 150], [120, 20]], [[30, 140], [210, 140], [60, 30]]])));
  else fig = quad(k).fig;
  return {q: "這是什麼形狀？", a: k, fig};
}, true);
def("v_ruler", "量長度", p => {
  if (p === "mm") { const n = nz(ri(11, 109)); return {q: "這條線有多長？", a: `${Math.floor(n / 10)} 公分 ${n % 10} 毫米（${n} 毫米）`, fig: rulerFig(n, "mm")}; }
  const n = ri(2, 11); return {q: "這條線有幾公分？", a: `${n} 公分`, fig: rulerFig(n, "cm")};
}, true);
def("v_numline", "數線", p => {
  if (p === "frac") { const d = ri(2, 6), k = ri(1, 2 * d - 1); if (k === d) return SKILLS.v_numline.gen(p); return {q: "箭頭指的是多少？", a: fracAns(k, d, false), fig: numlineFig(2 * d, [[0, "0"], [.5, "1"], [1, "2"]], k / (2 * d))}; }
  if (p === "dec") {
    if (coin()) { const k = ri(1, 9); return {q: "箭頭指的是多少？", a: dec(k, 1), fig: numlineFig(10, [[0, "0"], [1, "1"]], k / 10)}; }
    const a = ri(1, 49), k = ri(1, 9); return {q: "箭頭指的是多少？", a: dec(a * 10 + k, 2), fig: numlineFig(10, [[0, dec(a, 1)], [1, dec(a + 1, 1)]], k / 10)};
  }
  const step = pick(tables(p || "1,10,100")), a = ri(0, 20) * step * 10, k = ri(1, 9);
  return {q: "箭頭指的是多少？", a: N(a + k * step), fig: numlineFig(10, [[0, N(a)], [1, N(a + 10 * step)]], k / 10)};
}, true);
const FRUIT = ["蘋果", "香蕉", "葡萄", "西瓜", "芒果", "橘子"];
def("v_bar", "報讀長條圖", p => {
  if (p === "line") {
    const n = 6, step = pick([2, 5, 10]), vals = Array.from({length: n}, () => ri(1, 9) * step), names = [1, 2, 3, 4, 5, 6].map(m => `${m}月`), fig = lineFig(names, vals, step, "本");
    const i = ri(0, n - 1), j = ri(1, n - 1);
    switch (ri(0, 2)) {
      case 0: return {q: `圖書館${names[i]}借出幾本書？`, a: `${vals[i]} 本`, fig};
      case 1: { const mx = Math.max(...vals), who = names.filter((_, k) => vals[k] === mx); return {q: "哪個月借出的書最多？", a: who.join("、"), fig}; }
      default: return {q: `${names[j - 1]}到${names[j]}，借出的書增加還是減少？差幾本？`, a: vals[j] === vals[j - 1] ? "一樣多" : `${vals[j] > vals[j - 1] ? "增加" : "減少"} ${Math.abs(vals[j] - vals[j - 1])} 本`, fig};
    }
  }
  const k = ri(4, 5), names = shuffle(FRUIT.slice()).slice(0, k), step = pick([1, 2, 5]), vals = names.map(() => ri(1, 9) * step);
  const fig = barFig(names, vals, step, "人"), i = ri(0, k - 1); let j = ri(0, k - 1); if (j === i) j = (i + 1) % k;
  switch (ri(0, 2)) {
    case 0: return {q: `喜歡${names[i]}的有幾人？`, a: `${vals[i]} 人`, fig};
    case 1: { const mx = Math.max(...vals); return {q: "喜歡哪一種水果的人最多？", a: names.filter((_, t) => vals[t] === mx).join("、"), fig}; }
    default: return {q: `喜歡${names[i]}的比喜歡${names[j]}的多幾人？（少的話說少幾人）`, a: vals[i] === vals[j] ? "一樣多" : vals[i] > vals[j] ? `多 ${vals[i] - vals[j]} 人` : `少 ${vals[j] - vals[i]} 人`, fig};
  }
}, true);
def("v_table", "報讀統計表", p => {
  const fr = shuffle(FRUIT.slice()).slice(0, 3);
  if (p === "1") {
    const vals = fr.map(() => ri(2, 15)), fig = tableFig(["水果", ...fr], [["人數", ...vals]]), i = ri(0, 2);
    switch (ri(0, 2)) {
      case 0: return {q: `喜歡${fr[i]}的有幾人？`, a: `${vals[i]} 人`, fig};
      case 1: { const mx = Math.max(...vals); return {q: "喜歡哪一種水果的人最多？", a: fr.filter((_, k) => vals[k] === mx).join("、"), fig}; }
      default: return {q: "一共有幾人？", a: `${vals.reduce((a, b) => a + b, 0)} 人`, fig};
    }
  }
  const cls = ["甲班", "乙班", "丙班"], v = cls.map(() => fr.map(() => ri(2, 15))), fig = tableFig(["", ...fr], cls.map((c, i) => [c, ...v[i]]));
  const i = ri(0, 2), j = ri(0, 2);
  switch (ri(0, 2)) {
    case 0: return {q: `${cls[i]}喜歡${fr[j]}的有幾人？`, a: `${v[i][j]} 人`, fig};
    case 1: return {q: `三個班喜歡${fr[j]}的一共有幾人？`, a: `${v[0][j] + v[1][j] + v[2][j]} 人`, fig};
    default: return {q: `${cls[i]}一共有幾人？`, a: `${v[i].reduce((a, b) => a + b, 0)} 人`, fig};
  }
}, true);
def("v_cubes", "數積木算體積", () => {
  const a = ri(2, 5), b = ri(1, 3), c = ri(1, 3);
  return {q: "這個長方體是用幾個 1 立方公分的小正方體堆成的？體積是多少？", a: `${a * b * c} 個，${a * b * c} 立方公分`, fig: cubesFig(a, b, c)};
}, true);
def("v_pie", "報讀圓形圖", () => {
  const k = ri(3, 4), names = shuffle(["騎車", "走路", "坐公車", "家長接送"]).slice(0, k);
  let left = 100; const pcts = names.map((_, i) => { if (i === k - 1) return left; const v = ri(2, Math.min(9, left / 5 - (k - 1 - i) * 2)) * 5; left -= v; return v; });
  const total = pick([20, 40, 60, 80, 200]), i = ri(0, k - 1), fig = pieFig(names, pcts);
  return total * pcts[i] % 100 ? {q: `${names[i]}上學的占全部的百分之幾？`, a: `${pcts[i]}%`, fig} : {q: `全校有 ${total} 人，${names[i]}上學的有幾人？`, a: `${total * pcts[i] / 100} 人`, fig};
}, true);
def("v_area", "數格子算面積", () => {
  const cols = 8, rows = 5, target = ri(5, 16), cells = [[ri(2, 5), ri(1, 3)]], has = (x, y) => cells.some(c => c[0] === x && c[1] === y);
  while (cells.length < target) {
    const [x, y] = pick(cells), [dx, dy] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nx = x + dx, ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && !has(nx, ny)) cells.push([nx, ny]);
  }
  return {q: "塗色部分的面積是幾平方公分？（每一格是 1 平方公分）", a: `${target} 平方公分`, fig: gridFig(cells, cols, rows)};
}, true);
def("v_calendar", "看月曆", () => {
  const m = ri(1, 12), start = ri(0, 6), days = MDAYS[m], fig = calendarFig(m, start);
  switch (ri(0, 3)) {
    case 0: { const d = ri(1, days); return {q: `${m} 月 ${d} 日是星期幾？`, a: `星期${WEEK[(start + d - 1) % 7]}`, fig}; }
    case 1: { const w = ri(0, 6), first = (w - start + 7) % 7 + 1, cnt = Math.floor((days - first) / 7) + 1; return {q: `這個月有幾個星期${WEEK[w]}？`, a: `${cnt} 個`, fig}; }
    case 2: { const w = ri(0, 6), k = ri(1, 4), first = (w - start + 7) % 7 + 1; return {q: `這個月第 ${k} 個星期${WEEK[w]}是幾日？`, a: `${m} 月 ${first + (k - 1) * 7} 日`, fig}; }
    default: { const d = ri(1, days - 7); return {q: `${m} 月 ${d} 日的下一個星期同一天是幾日？`, a: `${m} 月 ${d + 7} 日`, fig}; }
  }
}, true);

// 各題型的名稱（顯示在單元旁邊），參數不同時補充說明
const PARAM_LABEL = {
  "solid_parts:box": "正方體和長方體", "v_shape:tri": "三角形的分類", "v_shape:quad": "四邊形的分類", "v_bar:line": "報讀折線圖",
  "rect:perim": "周長", "word:sumdiff": "和差問題", "word:age": "年齡問題", "word:cr": "雞兔問題", "word:tree": "間隔問題", "word:combo": "組合問題",
  "v_table:2": "報讀二維表格", "v_ruler:mm": "量長度（毫米）", "v_angle:deg": "量角度", "circle:rd": "半徑和直徑", "circle:circ": "圓周長",
  "circle:area": "圓面積", "base_cmp:sum": "兩量和、兩量差", "round:dec": "小數取概數", "conv:area": "面積單位換算", "conv:vol": "體積、容積單位換算",
  "time_after:h": "再過幾小時是幾時", "time_between:h": "經過幾小時", "frac_cmp:num": "分子相同的分數比大小", "frac_cmp:mixed": "帶分數和假分數比大小", "volume:prism": "柱體體積", "seq:geo": "數的規律", "share:rem": "分裝（有剩下）",
  "dec_div_int:int": "整數除以整數（商是小數）", "v_frac:improper": "塗色部分（假分數）", "frac_count:any": "幾個幾分之一",
};
function skillLabel(ref) {
  const [id, p] = ref.split(":"), s = SKILLS[id];
  if (!s) return ref;
  if (PARAM_LABEL[ref]) return PARAM_LABEL[ref];
  if (id === "mul" || id === "div" || id === "times_word") return p ? `${s.name}（${tables(p).join("、")}）` : s.name;
  if ((id === "conv" || id === "meas_addsub") && FAM[(p || "").split(".")[0]]) { const [b, sm] = FAM[p.split(".")[0]]; return id === "conv" ? `${b}和${sm}的換算` : `${b}、${sm}的加減`; }
  return s.name;
}
function makeItem(ref) {
  const [id, p] = ref.split(":"), s = SKILLS[id];
  const g = s.gen(p);
  return {q: g.q, a: String(g.a), fig: g.fig || "", visual: s.visual, ref, key: ref + "|" + g.q + "|" + (g.fig ? g.a : "")};
}

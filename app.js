/* ============================================================
   app.js — 地球と月のダンス
   北極の真上から見た、写真つきの地球と月。太陽は右にあり、光は右から左へ進む。
   地球・月とも、写真（等距円筒図法）を、北極から見た球に貼って描く。
   月の位置は astro.js（本物の離角）、地球の向きは太陽時から求める。
   ============================================================ */
(function () {
  "use strict";

  var A = window.Astro;
  var R = Math.PI / 180;
  var DAY = 86400000;
  var JST = 9 * 3600000;
  var TOKYO = { lat: 35.7, lon: 139.7 };

  var cv = document.getElementById("scene"), ctx = cv.getContext("2d");
  var EX = 360, EY = 300, ER = 105, MR = 38, ORB = 250;       // 地球の中心・半径、月の半径、軌道の半径
  var t = Date.now(), speed = 21600000, playing = true, last = 0, visible = true;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function jst(ms) {
    var d = new Date(ms + JST);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
  }
  function eotMin(ms) {               // 均時差（分）
    var j = jst(ms), n = (Date.UTC(j.y, j.m - 1, j.d) - Date.UTC(j.y, 0, 0)) / DAY, B = 360 / 365 * (n - 81) * R;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }
  function phaseName(e) {
    var names = ["新月", "三日月", "上弦の月", "満ちていく凸月", "満月", "欠けていく凸月", "下弦の月", "欠けていく細い月"];
    return names[Math.floor(((e + 22.5) % 360) / 45)];
  }

  /* ---------- 写真を、北極から見た球に貼る ---------- */
  function Sphere(img, r, gain) {
    var tw = img.width, th = img.height, oc = document.createElement("canvas");
    oc.width = tw; oc.height = th;
    var octx = oc.getContext("2d");
    octx.drawImage(img, 0, 0);
    this.tex = octx.getImageData(0, 0, tw, th).data;        // file:// では、ここで例外になる
    this.tw = tw; this.th = th; this.gain = gain;
    var N = Math.ceil(2 * r) + 4, c = N / 2, n = N * N;
    this.N = N;
    this.cv = document.createElement("canvas"); this.cv.width = N; this.cv.height = N;
    this.ctx = this.cv.getContext("2d");
    this.img = this.ctx.createImageData(N, N);
    this.psi = new Float32Array(n); this.vy = new Float32Array(n); this.shade = new Float32Array(n); this.alpha = new Uint8ClampedArray(n);
    for (var py = 0; py < N; py++) {
      for (var px = 0; px < N; px++) {
        var x = (px - c) / r, y = (c - py) / r, q = x * x + y * y, i = py * N + px;
        if (q >= 1) continue;
        this.psi[i] = Math.atan2(y, x);                      // 中心から見た向き（右が0、反時計回り）
        this.vy[i] = (0.5 - Math.asin(Math.sqrt(1 - q)) / Math.PI) * (th - 1);    // 中心が北極、縁が赤道
        var s = Math.max(0, Math.min(1, (x + 0.08) / 0.5));  // 太陽は右。右半分が昼
        this.shade[i] = 0.06 + 0.94 * s * s * (3 - 2 * s);
        this.alpha[i] = Math.max(0, Math.min(1, (1 - Math.sqrt(q)) * r / 1.5)) * 255;
      }
    }
  }
  Sphere.prototype.draw = function (lon0) {   // lon0：右向き（太陽の方向）にある経度（ラジアン）
    var d = this.img.data, tex = this.tex, tw = this.tw, th = this.th, n = this.N * this.N, i, o;
    for (i = 0; i < n; i++) {
      o = i * 4;
      if (!this.alpha[i]) { d[o + 3] = 0; continue; }
      var u = ((lon0 + this.psi[i]) / (2 * Math.PI) + 0.5) % 1; if (u < 0) u += 1;
      u *= tw;
      var x0 = Math.floor(u), fx = u - x0, x1 = (x0 + 1) % tw, y0 = Math.floor(this.vy[i]), fy = this.vy[i] - y0, y1 = Math.min(th - 1, y0 + 1);
      var a = (y0 * tw + x0) * 4, b = (y0 * tw + x1) * 4, e = (y1 * tw + x0) * 4, f = (y1 * tw + x1) * 4;
      var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy, g = this.shade[i] * this.gain;
      d[o]     = Math.min(255, (tex[a] * w00 + tex[b] * w10 + tex[e] * w01 + tex[f] * w11) * g);
      d[o + 1] = Math.min(255, (tex[a + 1] * w00 + tex[b + 1] * w10 + tex[e + 1] * w01 + tex[f + 1] * w11) * g);
      d[o + 2] = Math.min(255, (tex[a + 2] * w00 + tex[b + 2] * w10 + tex[e + 2] * w01 + tex[f + 2] * w11) * g);
      d[o + 3] = this.alpha[i];
    }
    this.ctx.putImageData(this.img, 0, 0);
  };

  var earth, moon;

  /* ---------- 1コマ ---------- */
  function label(s, x, y, color, anchor) {
    ctx.fillStyle = color || "#9098b0"; ctx.textAlign = anchor || "center";
    ctx.fillText(s, x, y);
  }
  function scene() {
    var mo = A.moon(t), th = mo.elong * R;                    // 月の向き（太陽の方向から、反時計回りに）
    var H0 = ((t % DAY) / 3600000 - 12) * 15 + eotMin(t) / 4, subLon = -H0 * R;   // 太陽の真下の経度
    var mx = EX + ORB * Math.cos(th), my = EY - ORB * Math.sin(th);

    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.font = "15px 'Segoe UI','Hiragino Sans','Yu Gothic UI',sans-serif";

    // 軌道
    ctx.strokeStyle = "#262c4c"; ctx.lineWidth = 1.5; ctx.setLineDash([4, 7]);
    ctx.beginPath(); ctx.arc(EX, EY, ORB, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    [["新月", 0], ["上弦", 90], ["満月", 180], ["下弦", 270]].forEach(function (p) {
      var a = p[1] * R, lx = EX + (ORB + 26) * Math.cos(a), ly = EY - (ORB + 26) * Math.sin(a);
      label(p[0], lx, ly + 5, "#9098b0");
      ctx.fillStyle = "#9098b0"; ctx.beginPath(); ctx.arc(EX + ORB * Math.cos(a), EY - ORB * Math.sin(a), 3, 0, 2 * Math.PI); ctx.fill();
    });

    // 太陽と光
    ctx.fillStyle = "rgba(224,192,128,.9)"; ctx.beginPath(); ctx.arc(1010, EY, 100, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = "#e0c080"; ctx.fillStyle = "#e0c080"; ctx.lineWidth = 1.5;
    [130, 215, 300, 385, 470].forEach(function (y) {
      ctx.beginPath(); ctx.moveTo(900, y); ctx.lineTo(742, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(742, y); ctx.lineTo(752, y - 5); ctx.lineTo(752, y + 5); ctx.closePath(); ctx.fill();
    });
    label("太陽の光", 820, 100, "#9098b0");

    // 地球
    earth.draw(subLon);
    ctx.drawImage(earth.cv, EX - earth.N / 2, EY - earth.N / 2);
    var tp = (TOKYO.lon * R - subLon), tr = Math.cos(TOKYO.lat * R) * ER;      // 東京
    var tx = EX + tr * Math.cos(tp), ty = EY - tr * Math.sin(tp);
    ctx.fillStyle = "#e0c080"; ctx.strokeStyle = "#0a0c18"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    label("東京", tx + 9, ty - 8, "#e0c080", "left");
    label("地球", EX, EY + ER + 28, "#e0e0e8");

    // 月：近い側（経度0）の中心が、いつも地球を向く
    moon.draw(th + Math.PI);
    ctx.drawImage(moon.cv, mx - moon.N / 2, my - moon.N / 2);
    var fx = mx + MR * Math.cos(th + Math.PI), fy = my - MR * Math.sin(th + Math.PI);
    ctx.fillStyle = "#e0c080"; ctx.strokeStyle = "#0a0c18"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fx, fy, 5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    label("月", mx + (MR + 16) * Math.cos(th), my - (MR + 16) * Math.sin(th) + 5, "#e0e0e8");

    // 数字
    var j = jst(t), age = A.age(t);
    $("info").innerHTML = "<dt>日時（日本時間）</dt><dd>" + j.m + "月" + j.d + "日 " + pad(j.h) + ":" + pad(j.mi) + "</dd>" +
      "<dt>月齢</dt><dd>" + age.toFixed(1) + "（" + phaseName(mo.elong) + "）</dd>" +
      "<dt>月までの距離</dt><dd>" + Math.round(mo.dist).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " km（図は縮尺を変えています）</dd>";
  }

  function loop(ts) {
    if (visible && !document.hidden && ts - last > 33) {
      if (playing && last) t += Math.min(100, ts - last) * speed / 1000;
      last = ts;
      scene();
    }
    requestAnimationFrame(loop);
  }

  function load(src, done) {
    var im = new Image();
    im.onload = function () { done(im); };
    im.onerror = function () { fail(); };
    im.src = src;
  }
  function fail() {
    $("note").innerHTML = "<strong>写真を読み込めませんでした。</strong>このページは、サーバー（またはローカルサーバー）経由で開いてください。";
  }

  var got = {};
  function ready() {
    if (!got.earth || !got.moon) return;
    try {
      earth = new Sphere(got.earth, ER, 1.7);
      moon = new Sphere(got.moon, MR, 1.45);
    } catch (e) { fail(); return; }
    $("play").onclick = function () { playing = !playing; this.textContent = playing ? "一時停止" : "再生"; };
    $("speed").onchange = function () { speed = +this.value; };
    $("now").onclick = function () { t = Date.now(); };
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    scene();
    requestAnimationFrame(loop);
  }
  load("img/earth.jpg", function (im) { got.earth = im; ready(); });
  load("img/moon.jpg", function (im) { got.moon = im; ready(); });
})();

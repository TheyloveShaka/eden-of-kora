(function () {
  const INK = "#4A1C2A";
  const TAU = Math.PI * 2;
  let uid = 0;

  const r1 = (n) => Math.round(n * 10) / 10;
  const deg = (d) => (d * Math.PI) / 180;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];
  const M = (p) => "M" + r1(p[0]) + " " + r1(p[1]);
  const L = (p) => "L" + r1(p[0]) + " " + r1(p[1]);

  function curve(pts) {
    const n = pts.length;
    const P = (i) => pts[Math.max(0, Math.min(n - 1, i))];
    let d = "";
    for (let i = 0; i < n - 1; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      d += "C" + r1(p1[0] + (p2[0] - p0[0]) / 6) + " " + r1(p1[1] + (p2[1] - p0[1]) / 6) + " " +
        r1(p2[0] - (p3[0] - p1[0]) / 6) + " " + r1(p2[1] - (p3[1] - p1[1]) / 6) + " " + r1(p2[0]) + " " + r1(p2[1]);
    }
    return d;
  }

  const open = (pts) => M(pts[0]) + curve(pts);
  const poly = (pts) => pts.map((p, i) => (i ? L(p) : M(p))).join("") + "Z";
  const at = (q, k) => add(q.p, q.n, q.s * k);
  const tangent = (q) => [q.n[1], -q.n[0]];
  const face = (d) => '<path style="fill:var(--ribbon-face)" d="' + d + '"/>';
  const back = (d) => '<path style="fill:var(--ribbon-back)" d="' + d + '"/>';
  const shade = (d, o) => '<path fill="' + INK + '" fill-opacity="' + o + '" d="' + d + '"/>';

  function between(a, b) {
    const rb = b.slice().reverse();
    return M(a[0]) + curve(a) + L(rb[0]) + curve(rb) + "Z";
  }

  function runs(samples) {
    const out = [];
    let run = [samples[0]];
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1], b = samples[i];
      if (a.s !== 0 && b.s !== 0 && Math.sign(a.s) !== Math.sign(b.s)) {
        const t = a.s / (a.s - b.s);
        const zero = { p: [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t], n: a.n, s: 0, fold: true };
        run.push(zero);
        out.push(run);
        run = [zero];
      }
      run.push(b);
    }
    out.push(run);
    return out.map((r) => ({ front: r[Math.floor(r.length / 2)].s > 0, samples: r }));
  }

  function body(samples, line, backShade) {
    let out = "";
    runs(samples).forEach((run) => {
      const s = run.samples;
      const d = between(s.map((q) => at(q, -1)), s.map((q) => at(q, 1)));
      if (!run.front) {
        out += back(d) + shade(d, backShade);
        return;
      }
      out += face(d);
      out += '<path fill="#fff" fill-opacity=".22" d="' + between(s.map((q) => at(q, -0.66)), s.map((q) => at(q, -0.28))) + '"/>';
      out += '<path fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="' + line + '" d="' + open(s.map((q) => at(q, -0.84))) + '"/>';
      out += '<path fill="none" stroke="' + INK + '" stroke-opacity=".16" stroke-width="' + line + '" d="' + open(s.map((q) => at(q, 0.84))) + '"/>';
      const near = s.filter((q) => q.fold);
      if (near.length > 2) out += shade(between(near.map((q) => at(q, -1)), near.map((q) => at(q, 1))), 0.1);
    });
    return out;
  }

  function endCap(o) {
    const start = add(add(o.p, o.u, -o.tuck), o.n, o.shift);
    const mid = add(add(o.p, o.u, o.len * 0.5), o.n, o.shift + o.droop * 0.3);
    const end = add(add(o.p, o.u, o.len), o.n, o.shift + o.droop);
    const top = [add(start, o.n, -o.hw), add(mid, o.n, -o.hw), add(end, o.n, -o.hw * 1.1)];
    const bot = [add(start, o.n, o.hw), add(mid, o.n, o.hw), add(end, o.n, o.hw * 1.1)];
    const notch = add(end, o.u, -o.hw * 1.15);
    const tail = M(top[0]) + curve(top) + L(notch) + L(bot[2]) + curve(bot.slice().reverse()) + "Z";
    const side = Math.sign(o.shift) || 1;
    const corner = add(o.p, o.n, o.hw * side);
    const inner = add(corner, o.u, -o.tuck);
    const fold = poly([corner, inner, add(inner, o.n, o.shift)]);
    return face(tail) + shade(tail, 0.13) + face(fold) + shade(fold, 0.45);
  }

  function drawBand(W, H, id) {
    const hw = H * 0.2;
    const l1 = clamp(W * 0.9, 420, 1500);
    const l2 = l1 * 0.41;
    const c = (x) => H * 0.5 + H * 0.09 * Math.sin((TAU * x) / l1 + 0.6) + H * 0.04 * Math.sin((TAU * x) / l2 + 2.1);
    const margin = clamp(W * 0.022, 8, 36);
    const tail = H * 0.44;
    const xL = margin + tail;
    const xR = W - margin - tail * 0.82;

    const xs = new Set([xL, xR]);
    for (let x = xL; x < xR; x += Math.max(18, l2 / 12)) xs.add(x);
    const samples = Array.from(xs).sort((p, q) => p - q).map((x) => {
      const dy = c(x + 1) - c(x - 1);
      const len = Math.hypot(2, dy);
      return { p: [x, c(x)], n: [-dy / len, 2 / len], s: hw, fold: false };
    });
    const first = samples[0];
    const last = samples[samples.length - 1];
    const tf = tangent(first);
    const caps =
      endCap({ p: first.p, u: [-tf[0], -tf[1]], n: first.n, hw: hw, shift: hw * 0.58, tuck: hw * 0.8, len: tail, droop: H * 0.035 }) +
      endCap({ p: last.p, u: tangent(last), n: last.n, hw: hw, shift: -hw * 0.58, tuck: hw * 0.8, len: tail * 0.82, droop: -H * 0.02 });

    const size = clamp(H * 0.175, 17, 25);
    const pad = hw * 0.7;
    const line = [];
    for (let x = xL + pad; x <= xR - pad; x += 20) line.push([x, c(x) + size * 0.34]);

    return (
      '<svg class="ribbon-band__art" viewBox="0 0 ' + r1(W) + " " + r1(H) + '" width="' + r1(W) + '" height="' + r1(H) + '" aria-hidden="true" focusable="false"><defs>' +
      '<path id="' + id + '-line" d="' + open(line) + '"/>' +
      "</defs>" + caps + body(samples, 1.4, 0.22) +
      '<text class="ribbon-band__text" font-size="' + r1(size) + '" text-anchor="middle" data-room="' + r1(xR - xL - 2 * pad - 12) + '"><textPath href="#' + id + '-line" startOffset="50%"></textPath></text></svg>'
    );
  }

  function strip(o) {
    const total = Math.hypot(o.to[0] - o.from[0], o.to[1] - o.from[1]);
    const dir = [(o.to[0] - o.from[0]) / total, (o.to[1] - o.from[1]) / total];
    const nrm = [-dir[1], dir[0]];
    const us = new Set([0, total]);
    for (let u = 0; u < total; u += 16) us.add(u);
    if (o.twist) for (let u = o.twist.at; u <= o.twist.at + o.twist.len; u += 5) us.add(u);
    const samples = Array.from(us).sort((a, b) => a - b).map((u) => {
      const w = (TAU * u) / o.lambda + o.phase;
      const slope = o.amp * (TAU / o.lambda) * Math.cos(w);
      const tl = Math.hypot(1, slope);
      const tan = [(dir[0] + nrm[0] * slope) / tl, (dir[1] + nrm[1] * slope) / tl];
      const inTwist = Boolean(o.twist) && u > o.twist.at && u < o.twist.at + o.twist.len;
      const phi = inTwist ? TAU * smoothstep((u - o.twist.at) / o.twist.len) : 0;
      return {
        p: add(add(o.from, dir, u), nrm, o.amp * Math.sin(w)),
        n: [-tan[1], tan[0]],
        s: o.hw * (1 + 0.1 * Math.sin(u / 31 + o.phase * 2)) * Math.cos(phi),
        fold: inTwist,
      };
    });
    let caps = "";
    const first = samples[0];
    const last = samples[samples.length - 1];
    if (o.capStart) {
      const t = tangent(first);
      caps += endCap({ p: first.p, u: [-t[0], -t[1]], n: first.n, hw: o.hw, shift: o.capStart.shift, tuck: 8, len: o.capStart.len, droop: o.capStart.droop || 0 });
    }
    if (o.capEnd) {
      caps += endCap({ p: last.p, u: tangent(last), n: last.n, hw: o.hw, shift: o.capEnd.shift, tuck: 8, len: o.capEnd.len, droop: o.capEnd.droop || 0 });
    }
    return { caps: caps, body: body(samples, 1, 0.08) };
  }

  function tail(pk, t) {
    const dir = [Math.cos(t.angle), Math.sin(t.angle)];
    const perp = [-dir[1], dir[0]];
    const up = [], lo = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const k = i / steps;
      const mid = add(add(pk, dir, t.len * k), perp, t.sway * Math.sin(Math.PI * k * 1.25 + t.phase) * k);
      const half = t.width * (0.8 + 0.4 * k);
      up.push(add(mid, perp, half));
      lo.push(add(mid, perp, -half));
    }
    const notch = add([(up[steps][0] + lo[steps][0]) / 2, (up[steps][1] + lo[steps][1]) / 2], dir, -t.width * 1.35);
    const rl = lo.slice().reverse();
    const d = M(up[0]) + curve(up) + L(notch) + L(rl[0]) + curve(rl) + "Z";
    if (t.back) return back(d) + shade(d, 0.08);
    return face(d) + '<path fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1" d="' + open(up.slice(0, -1).map((p) => add(p, perp, -2.4))) + '"/>';
  }

  function knot(pk, hw, rot) {
    const w = hw * 2.5, h = hw * 2.9;
    const box = 'x="' + r1(-w / 2) + '" y="' + r1(-h / 2) + '" width="' + r1(w) + '" height="' + r1(h) + '" rx="' + r1(hw * 0.85) + '"';
    return (
      '<g transform="translate(' + r1(pk[0]) + " " + r1(pk[1]) + ") rotate(" + rot + ')">' +
      "<rect " + box + ' style="fill:var(--ribbon-face)"/><rect ' + box + ' fill="' + INK + '" fill-opacity=".16"/>' +
      '<rect x="' + r1(-w * 0.26) + '" y="' + r1(-h * 0.34) + '" width="' + r1(w * 0.2) + '" height="' + r1(h * 0.68) + '" rx="' + r1(w * 0.1) + '" fill="#fff" fill-opacity=".3"/></g>'
    );
  }

  const HW = 10;
  const FRAMES = {
    a: {
      w: 400, h: 500, knot: [366, 430], knotRot: 42,
      tails: [
        { angle: deg(101), len: 66, width: 8.5, sway: 9, phase: 0.4, back: false },
        { angle: deg(58), len: 42, width: 8, sway: -7, phase: 1.1, back: true },
      ],
      strips: [
        { from: [34, 24], to: [34, 444], amp: 4.2, lambda: 210, phase: 0.9, capStart: { len: 20, shift: 6, droop: 2 }, capEnd: { len: 24, shift: 6, droop: -3 }, twist: { at: 236, len: 74 } },
        { from: [366, 22], to: [366, 430], amp: 3.6, lambda: 176, phase: 2.6, capStart: { len: 18, shift: -6, droop: -2 } },
        { from: [22, 34], to: [378, 34], amp: 4.4, lambda: 236, phase: 4.0, capStart: { len: 19, shift: -6, droop: -2 }, capEnd: { len: 17, shift: 6, droop: 3 } },
        { from: [26, 430], to: [366, 430], amp: 3.8, lambda: 190, phase: 1.7, capStart: { len: 21, shift: 6, droop: 3 } },
      ],
    },
    b: {
      w: 500, h: 400, knot: [34, 330], knotRot: -40,
      tails: [
        { angle: deg(82), len: 58, width: 8.5, sway: -9, phase: 0.2, back: false },
        { angle: deg(121), len: 36, width: 8, sway: 6, phase: 1.3, back: true },
      ],
      strips: [
        { from: [34, 22], to: [34, 330], amp: 3.8, lambda: 168, phase: 3.3, capStart: { len: 18, shift: 6, droop: 2 } },
        { from: [466, 24], to: [466, 342], amp: 4.2, lambda: 214, phase: 0.5, capStart: { len: 20, shift: -6, droop: -2 }, capEnd: { len: 22, shift: -6, droop: 3 } },
        { from: [22, 34], to: [478, 34], amp: 4.4, lambda: 248, phase: 2.2, capStart: { len: 18, shift: -6, droop: -2 }, capEnd: { len: 19, shift: 6, droop: 3 }, twist: { at: 290, len: 74 } },
        { from: [34, 330], to: [476, 330], amp: 3.8, lambda: 196, phase: 5.1, capEnd: { len: 21, shift: 6, droop: 3 } },
      ],
    },
  };
  const frameCache = {};

  function drawFrame(kind) {
    if (frameCache[kind]) return frameCache[kind];
    const f = FRAMES[kind];
    const parts = f.strips.map((s) => strip(Object.assign({ hw: HW }, s)));
    frameCache[kind] =
      '<svg class="ribbon-frame__art" viewBox="0 0 ' + f.w + " " + f.h + '" aria-hidden="true" focusable="false">' +
      parts.map((p) => p.caps).join("") + f.tails.map((t) => tail(f.knot, t)).join("") +
      parts.map((p) => p.body).join("") + knot(f.knot, HW, f.knotRot) + "</svg>";
    return frameCache[kind];
  }

  function mountFrame(figure) {
    if (!figure.querySelector("img") || figure.querySelector(".ribbon-frame__art")) return;
    figure.insertAdjacentHTML("beforeend", drawFrame(figure.dataset.ribbonFrame === "b" ? "b" : "a"));
    figure.classList.add("is-ready");
  }

  function mountBand(el) {
    const items = Array.from(el.querySelectorAll("li")).map((li) => li.textContent.trim()).filter(Boolean);
    if (!items.length || el.querySelector(".ribbon-band__stage")) return;
    const id = "ribbon" + ++uid;
    const stage = document.createElement("div");
    stage.className = "ribbon-band__stage";
    el.insertBefore(stage, el.firstChild);
    el.classList.add("is-ready");

    const gap = " • ";
    let width = 0;
    let timer = 0;

    function render(force) {
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      if (!W || !H || (!force && W === width)) return;
      width = W;
      stage.innerHTML = drawBand(W, H, id);
      const text = stage.querySelector("text");
      const textPath = stage.querySelector("textPath");
      const room = parseFloat(text.dataset.room);
      const base = parseFloat(text.getAttribute("font-size"));
      const measure = (list, size) => {
        text.setAttribute("font-size", size.toFixed(1));
        textPath.textContent = list.join(gap);
        return textPath.getComputedTextLength();
      };
      let size = base;
      let length = measure(items, size);
      if (length > room) {
        size = Math.max(13, base * 0.64, (base * room * 0.97) / length);
        length = measure(items, size);
      }
      if (length > room) {
        const kept = [];
        items.forEach((item) => {
          if (measure(kept.concat(item), size) <= room) kept.push(item);
        });
        measure(kept.length ? kept : [items[0]], size);
      }
    }

    render(true);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => render(true));
    new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => render(false), 150);
    }).observe(stage);
  }

  function init() {
    document.querySelectorAll("[data-ribbon-frame]").forEach(mountFrame);
    document.querySelectorAll("[data-ribbon-band]").forEach(mountBand);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

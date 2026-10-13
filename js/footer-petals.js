(function () {
  const hook = document.querySelector("[data-footer-petals]");
  if (!hook) return;

  const ABOVE = 240;
  const BELOW = 4;
  const HEIGHT = ABOVE + BELOW;
  const STEP = 2;
  const FADE_MS = 700;
  const BASE_RATIO = 0.5;
  const SHAPES = ["a", "b", "c", "d"];
  const motionQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  const canAnimate = typeof hook.animate === "function" && "IntersectionObserver" in window;

  let seed = parseInt(hook.getAttribute("data-seed"), 10);
  if (!(seed >= 0)) seed = Math.floor(Math.random() * 4294967296);
  const heavyLeft = ((seed >>> 3) & 1) === 0;

  function makeRng(s) {
    let a = s >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rt = makeRng(seed ^ 0x9e3779b9);
  const layer = document.createElement("div");
  layer.className = "footer-petals__layer";
  const base = document.createElement("div");
  base.className = "footer-petals__base";
  layer.appendChild(base);
  hook.appendChild(layer);

  let width = 0;
  let cap = 0;
  let profile = null;
  let plan = [];
  let nextIdx = 0;
  let seq = 0;
  let settled = [];
  let landed = 0;
  let active = [];
  let pending = 0;
  let timer = 0;
  let resizeTimer = 0;
  let running = false;
  let visible = false;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  function shuffle(list, rand) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const tmp = list[i];
      list[i] = list[j];
      list[j] = tmp;
    }
    return list;
  }

  function capFor(w) {
    return Math.round(clamp(36 + ((w - 375) * 54) / 1065, 36, 90));
  }

  function buildProfile(w, rand) {
    const n = Math.max(2, Math.round(w / 230));
    const ph1 = rand() * 6.283;
    const ph2 = rand() * 6.283;
    const floorAt = (px) => 6 + 1.6 * Math.sin((px / 380) * 6.283 + ph1) + 0.6 * Math.sin((px / 130) * 6.283 + ph2);
    const peaks = [];
    for (let i = 0; i < n; i++) {
      const r = (i + 0.2 + 0.6 * rand()) / n;
      const u = 0.04 + 0.8 * Math.pow(r, 1.6);
      const un = (u - 0.04) / 0.8;
      const peak = 17 + 13 * Math.pow(1 - un, 1.6) * (0.86 + 0.14 * rand());
      const px = (heavyLeft ? u : 1 - u) * w;
      peaks.push({ x: px, a: peak - floorAt(px), s: Math.min(70 + 50 * rand(), w * 0.15) });
    }
    const count = Math.floor(w / STEP) + 1;
    const h = new Float32Array(count);
    const cdf = new Float32Array(count);
    let total = 0;
    for (let k = 0; k < count; k++) {
      const x = k * STEP;
      let v = floorAt(x);
      for (let j = 0; j < peaks.length; j++) {
        const d = (x - peaks[j].x) / peaks[j].s;
        v += peaks[j].a * Math.exp(-d * d);
      }
      h[k] = Math.min(v, 31);
      total += h[k] + 8;
      cdf[k] = total;
    }
    return { h: h, cdf: cdf, total: total, count: count };
  }

  function heightAt(x) {
    return profile.h[clamp(Math.round(x / STEP), 0, profile.count - 1)];
  }

  function sampleX(r) {
    const target = r * profile.total;
    let lo = 0;
    let hi = profile.count - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (profile.cdf[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return clamp(lo * STEP, 4, width - 4);
  }

  function makePetal(rand, x, phi, rose) {
    const w = 12 + (10 * (rand() + rand())) / 2;
    const h = w * (1.08 + 0.2 * rand());
    const q = clamp(0.7 - 0.7 * phi + (rand() - 0.5) * 0.25, 0, 1);
    const top = heightAt(x) * (1 - 0.8 * q) + (rand() - 0.5) * 3;
    const centre = Math.max(top - h / 2, rose ? -2 : -9);
    return {
      left: x - w / 2,
      top: ABOVE - centre - h / 2,
      w: w,
      h: h,
      rot: rand() * 360,
      rose: rose,
      shape: SHAPES[Math.floor(rand() * SHAPES.length)],
    };
  }

  function makePlan(rand, count) {
    const strata = shuffle(Array.from({ length: count }, (_, i) => i), rand);
    const phase = rand();
    const roses = Array.from({ length: count }, (_, i) => Math.floor((i + 1) * 0.25 + phase) > Math.floor(i * 0.25 + phase));
    const items = [];
    for (let i = 0; i < count; i++) {
      const x = sampleX((strata[i] + 0.15 + 0.7 * rand()) / count);
      items.push(makePetal(rand, x, i / Math.max(1, count - 1), roses[i]));
    }
    return items;
  }

  function paintBase(rand) {
    const pts = ["0px " + HEIGHT + "px"];
    let x = 0;
    while (x < width) {
      const sw = 11 + 9 * rand();
      const bump = 2.5 + 3.5 * rand();
      const skew = 0.7 + 0.8 * rand();
      const end = Math.min(width, x + sw);
      for (let px = x; px < end; px += 2) {
        const t = (px - x) / sw;
        const body = Math.max(0, heightAt(px) * BASE_RATIO - 2);
        pts.push(px.toFixed(0) + "px " + (ABOVE - body - bump * Math.sin(Math.PI * Math.pow(t, skew))).toFixed(1) + "px");
      }
      x = end;
    }
    pts.push(width + "px " + HEIGHT + "px");
    base.style.clipPath = "polygon(" + pts.join(",") + ")";
  }

  function createEl(p) {
    const el = document.createElement("span");
    el.className = "footer-petal footer-petal--" + (p.rose ? "rose" : "pink") + " footer-petal--" + p.shape;
    const s = el.style;
    s.left = p.left.toFixed(1) + "px";
    s.top = p.top.toFixed(1) + "px";
    s.width = p.w.toFixed(1) + "px";
    s.height = p.h.toFixed(1) + "px";
    s.transform = "rotate(" + p.rot.toFixed(1) + "deg)";
    s.zIndex = ++seq;
    return el;
  }

  function track(anim, done) {
    active.push(anim);
    anim.onfinish = function () {
      const i = active.indexOf(anim);
      if (i > -1) active.splice(i, 1);
      if (done) done();
    };
    if (!running) anim.pause();
  }

  function drop(p, el, onLand) {
    const N = 15;
    const startY = 4 + rt() * 22;
    const dist = Math.max(120, p.top + p.h / 2 - startY);
    const dur = 6200 + rt() * 3800;
    const drift = (rt() < 0.5 ? -1 : 1) * (24 + rt() * 50);
    const amp = 9 + rt() * 15;
    const cycles = 1.4 + rt() * 1.2;
    const ph = rt() * 6.283;
    const spin = (rt() < 0.5 ? -1 : 1) * (110 + rt() * 150);
    const wob = 10 + rt() * 14;
    const frames = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N;
      const inv = 1 - t;
      const e = 0.72 * t + 0.28 * Math.sin(t * (Math.PI / 2));
      const sway = Math.sin(6.283 * cycles * t + ph) * Math.pow(inv, 0.7);
      const x = drift * (1 - e) * 0.5 + amp * sway;
      const y = -dist * (1 - e);
      const r = p.rot + spin * (1 - e) + wob * Math.sin(6.283 * cycles * t + ph + 1.3) * inv;
      const f = 1 - 0.3 * (0.5 + 0.5 * Math.sin(6.283 * cycles * 1.7 * t + ph * 2)) * Math.pow(inv, 0.8);
      frames.push({
        offset: t,
        transform:
          "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + r.toFixed(1) + "deg) scale(" + f.toFixed(3) + ",1)",
      });
    }
    frames[0].opacity = 0;
    frames[N / 3].opacity = 1;
    frames[N].opacity = 1;
    track(el.animate(frames, { duration: dur, easing: "linear", fill: "backwards" }), onLand);
  }

  function spawnPlanned() {
    const p = plan[nextIdx++];
    const el = createEl(p);
    layer.appendChild(el);
    drop(p, el, function () {
      settled.push({ el: el, rose: p.rose });
      landed++;
    });
  }

  function trickle() {
    if (pending > 2 || !settled.length) return;
    const old = settled.shift();
    const p = makePetal(rt, sampleX(rt()), 0.9 + rt() * 0.1, old.rose);
    const el = createEl(p);
    layer.appendChild(el);
    pending++;
    drop(p, el, function () {
      pending--;
      settled.push({ el: el, rose: p.rose });
      track(old.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, easing: "ease-out", fill: "forwards" }), function () {
        old.el.remove();
      });
    });
  }

  function tick() {
    timer = 0;
    if (!running) return;
    if (nextIdx < plan.length) spawnPlanned();
    else trickle();
    schedule();
  }

  function schedule() {
    if (!running || timer) return;
    const gap = nextIdx < plan.length ? 180 + rt() * 160 : 2600 + rt() * 1800;
    timer = setTimeout(tick, gap);
  }

  function sync() {
    const reduced = !!(motionQuery && motionQuery.matches);
    const next = canAnimate && visible && !document.hidden && !reduced;
    if (next === running) return;
    running = next;
    if (running) {
      active.slice().forEach((a) => a.play());
      schedule();
    } else {
      clearTimeout(timer);
      timer = 0;
      active.forEach((a) => a.pause());
    }
  }

  let prevCap = 0;

  function build() {
    const w = hook.clientWidth;
    if (!w) return;
    const fraction = prevCap ? landed / prevCap : 1 / 3;
    active.forEach((a) => a.cancel());
    active = [];
    clearTimeout(timer);
    timer = 0;
    pending = 0;
    layer.textContent = "";
    layer.appendChild(base);

    width = w;
    cap = capFor(w);
    const rand = makeRng(seed);
    profile = buildProfile(w, rand);
    plan = makePlan(rand, cap);
    paintBase(rand);

    const reduced = !!(motionQuery && motionQuery.matches);
    const seeded = reduced || !canAnimate ? cap : Math.round(cap * clamp(fraction, 1 / 3, 1));
    seq = 0;
    settled = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < seeded; i++) {
      const el = createEl(plan[i]);
      frag.appendChild(el);
      settled.push({ el: el, rose: plan[i].rose });
    }
    layer.appendChild(frag);
    nextIdx = seeded;
    landed = seeded;
    prevCap = cap;
    if (running) schedule();
  }

  build();
  if (!width) return;

  if (canAnimate) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[entries.length - 1].isIntersecting;
        sync();
      },
      { threshold: 0 }
    ).observe(layer);
    document.addEventListener("visibilitychange", sync);
  }

  if (motionQuery) {
    const onMotion = function () {
      build();
      sync();
    };
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", onMotion);
    else if (motionQuery.addListener) motionQuery.addListener(onMotion);
  }

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (hook.clientWidth !== width) build();
    }, 220);
  });
})();

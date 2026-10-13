/* ==========================================================================
   Eden of Kora: Home-only behaviour (index.html only).
   The "Recent arrangements" filmstrip: counter and progress follow the
   native horizontal scroll, and video tiles get a real <video> only while
   they are in view, one playing at a time. Loaded after js/main.js.
   ========================================================================== */

function initGalleryFilmstrip() {
  const filmstrip = document.querySelector("[data-filmstrip]");
  const track = document.querySelector("[data-filmstrip-track]");
  if (!filmstrip || !track) return;

  const tiles = Array.from(track.querySelectorAll("[data-filmstrip-tile]"));
  const total = tiles.length;
  const counterEl = document.querySelector("[data-filmstrip-counter]");
  const progressBar = document.querySelector("[data-filmstrip-progress-bar]");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function setCounter(i) {
    if (counterEl) counterEl.textContent = pad(i + 1) + " / " + pad(total);
  }

  function onScroll() {
    const max = track.scrollWidth - track.clientWidth;
    const progress = max > 0 ? track.scrollLeft / max : 0;
    if (progressBar) progressBar.style.width = progress * 100 + "%";
    setCounter(Math.min(total - 1, Math.round(progress * (total - 1))));
  }
  track.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  let currentVideo = null;
  function playVideo(video) {
    if (currentVideo && currentVideo !== video) currentVideo.pause();
    currentVideo = video;
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked: poster stands */ });
  }
  function pauseVideo(video) {
    if (!video.paused) video.pause();
    if (currentVideo === video) currentVideo = null;
  }

  const videoTiles = tiles.filter((t) => t.hasAttribute("data-video-tile"));
  if (!videoTiles.length || !("IntersectionObserver" in window)) return;

  const videoIo = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const tile = entry.target;
        let video = tile.querySelector("video");
        if (entry.intersectionRatio > 0.6 && !reduced) {
          if (!video) {
            video = document.createElement("video");
            video.muted = true;
            video.playsInline = true;
            video.loop = true;
            video.preload = "none";
            video.setAttribute("aria-hidden", "true");
            video.poster = tile.getAttribute("data-poster");
            video.src = tile.getAttribute("data-src");
            tile.insertBefore(video, tile.querySelector(".filmstrip__play"));
          }
          playVideo(video);
        } else if (video) {
          pauseVideo(video);
        }
      });
    },
    { threshold: [0, 0.6, 1] }
  );
  videoTiles.forEach((t) => videoIo.observe(t));
}

document.addEventListener("DOMContentLoaded", initGalleryFilmstrip);

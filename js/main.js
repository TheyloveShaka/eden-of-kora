/* ==========================================================================
   Nineteen Twenty One Flowers: Shared site behaviour (every page loads this file).
   Everything below is guarded by element existence so pages that don't
   contain a given hook simply skip that block: nothing throws.
   ========================================================================== */

const WHATSAPP_NUMBER = "256778371038";

// All prices in products.js are Ugandan Shillings; UGX has no cents, so
// amounts render as whole numbers with thousands separators.
const fmtUGX = (n) => "UGX " + Math.round(n).toLocaleString("en-US");

/* ---------- Cart --------------------------------------------------------- */
const Cart = {
  KEY: "cn_cart",

  _data() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || {};
    } catch (e) {
      return {};
    }
  },

  _save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
    renderCart();
  },

  add(id, qty = 1) {
    const data = this._data();
    data[id] = (data[id] || 0) + qty;
    this._save(data);
  },

  remove(id) {
    const data = this._data();
    delete data[id];
    this._save(data);
  },

  setQty(id, qty) {
    const data = this._data();
    if (qty <= 0) delete data[id];
    else data[id] = qty;
    this._save(data);
  },

  items() {
    const data = this._data();
    const catalog = window.PRODUCTS || [];
    return Object.keys(data)
      .map((id) => {
        const product = catalog.find((p) => p.id === id);
        return product ? Object.assign({}, product, { qty: data[id] }) : null;
      })
      .filter(Boolean);
  },

  total() {
    // Price-null items (DATA CONTRACT: "Ask for price") never carry an
    // Add control, so they can't reach the cart, but guard anyway.
    return this.items().reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
  },

  count() {
    const data = this._data();
    return Object.values(data).reduce((sum, q) => sum + q, 0);
  },

  // Dialog contract (cart drawer): role="dialog" + aria-modal live in the
  // markup; here we move focus in, trap Tab inside the drawer while open,
  // and hand focus back to whatever opened it on close.
  _opener: null,
  _trapHandler: null,

  _focusables(container) {
    return Array.from(
      container.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])')
    ).filter((el) => el.offsetParent !== null);
  },

  open(opener) {
    const drawer = document.querySelector(".cart-drawer");
    const overlay = document.querySelector(".cart-overlay");
    if (!drawer) return;
    this._opener = opener instanceof HTMLElement ? opener : document.activeElement;
    drawer.classList.add("is-open");
    if (overlay) overlay.classList.add("is-open");
    document.body.style.overflow = "hidden";

    const focusables = this._focusables(drawer);
    (focusables[0] || drawer).focus();

    this._trapHandler = (e) => {
      if (e.key === "Escape") {
        this.close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = this._focusables(drawer);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this._trapHandler);
  },

  close() {
    const drawer = document.querySelector(".cart-drawer");
    const overlay = document.querySelector(".cart-overlay");
    if (drawer) drawer.classList.remove("is-open");
    if (overlay) overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    if (this._trapHandler) {
      document.removeEventListener("keydown", this._trapHandler);
      this._trapHandler = null;
    }
    if (this._opener && typeof this._opener.focus === "function") this._opener.focus();
    this._opener = null;
  }
};
window.Cart = Cart;

/* ---------- Cart aria-live announcer --------------------------------------
   One polite live region inside the drawer (data-cart-live). Re-set with a
   trailing space toggle so two identical messages in a row both announce. */
function announceCart(message) {
  const live = document.querySelector("[data-cart-live]");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = message;
  }, 30);
}

/* ---------- Cart rendering ------------------------------------------------ */
function renderCartBadge() {
  document.querySelectorAll(".cart-count").forEach((badge) => {
    badge.textContent = String(Cart.count());
  });
}

function renderCart() {
  renderCartBadge();
  const itemsEl = document.querySelector("[data-cart-items]");
  const subtotalEl = document.querySelector("[data-cart-subtotal]");
  const checkoutBtn = document.querySelector("[data-wa-checkout]");
  const copyBtn = document.querySelector("[data-copy-order]");
  if (!itemsEl) return;

  const items = Cart.items();

  if (checkoutBtn) checkoutBtn.disabled = !items.length;
  if (copyBtn) copyBtn.disabled = !items.length;

  if (!items.length) {
    itemsEl.innerHTML =
      '<div class="cart-empty">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4">' +
      '<path d="M12 21s-7-4.5-9.5-9C.8 8.2 2 4 6 4c2 0 3.4 1 4 2 .6-1 2-2 4-2 4 0 5.2 4.2 3.5 8-2.5 4.5-5.5 9-5.5 9Z"/>' +
      "</svg>" +
      "<p>Your cart is empty.</p>" +
      '<a href="shop.html">Shop bouquets and add something worth giving.</a>' +
      "</div>";
    if (subtotalEl) subtotalEl.textContent = "UGX 0";
    return;
  }

  itemsEl.innerHTML = items
    .map(
      (item) => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item__thumb"><img src="${item.imgSm || item.img}" alt="${escapeHtml(item.name)}" loading="lazy" width="58" height="58"></div>
      <div>
        <div class="cart-item__name">${escapeHtml(item.name)}</div>
        <div class="cart-item__price">${fmtUGX(item.price)}${item.unit ? " / " + escapeHtml(item.unit) : ""}</div>
        <div class="cart-item__qty">
          <button type="button" data-qty-down aria-label="Decrease quantity of ${escapeHtml(item.name)}">&minus;</button>
          <span>${item.qty}</span>
          <button type="button" data-qty-up aria-label="Increase quantity of ${escapeHtml(item.name)}">+</button>
        </div>
      </div>
      <div class="cart-item__right">
        <span class="cart-item__line">${fmtUGX(item.price * item.qty)}</span>
        <button type="button" class="cart-item__remove" data-remove aria-label="Remove ${escapeHtml(item.name)}">&times;</button>
      </div>
    </div>`
    )
    .join("");

  if (subtotalEl) subtotalEl.textContent = fmtUGX(Cart.total());
}

function initCartItemEvents() {
  const itemsEl = document.querySelector("[data-cart-items]");
  if (!itemsEl) return;
  itemsEl.addEventListener("click", (e) => {
    const row = e.target.closest(".cart-item");
    if (!row) return;
    const id = row.dataset.id;
    const data = Cart._data();
    const product = (window.PRODUCTS || []).find((p) => p.id === id);
    const name = product ? product.name : "item";
    if (e.target.closest("[data-qty-up]")) {
      Cart.setQty(id, (data[id] || 0) + 1);
      announceCart(`${name} quantity updated.`);
    } else if (e.target.closest("[data-qty-down]")) {
      Cart.setQty(id, (data[id] || 0) - 1);
      announceCart((data[id] || 0) - 1 <= 0 ? `${name} removed from cart.` : `${name} quantity updated.`);
    } else if (e.target.closest("[data-remove]")) {
      Cart.remove(id);
      announceCart(`${name} removed from cart.`);
    }
  });
}

function initCartDrawerControls() {
  const drawer = document.querySelector(".cart-drawer");
  const overlay = document.querySelector(".cart-overlay");
  if (!drawer && !overlay) return;

  document.querySelectorAll("[data-cart-open]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      Cart.open(btn);
    });
  });
  document.querySelectorAll("[data-cart-close]").forEach((btn) => {
    btn.addEventListener("click", () => Cart.close());
  });
  // Escape-to-close and focus trapping while open are wired inside
  // Cart.open()/close() themselves (only listening while the drawer is
  // actually open), so no extra global keydown listener is needed here.
}

function initAddToCart() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-to-cart]");
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute("data-add-to-cart");
    const product = (window.PRODUCTS || []).find((p) => p.id === id);
    Cart.add(id, 1);
    announceCart(`${product ? product.name : "Item"} added to your order.`);

    document.querySelectorAll(".cart-count").forEach((badge) => {
      badge.classList.remove("pulse");
      void badge.offsetWidth; // restart animation
      badge.classList.add("pulse");
    });

    // ART-DIRECTION "press" micro-interaction: 120ms, ease-snap (--dur-micro,
    // --ease-snap), distinct from the ":active" mouse-only state so keyboard
    // (Enter/Space) and touch activation get the same feedback.
    btn.classList.add("is-pressing");
    window.setTimeout(() => btn.classList.remove("is-pressing"), 120);

    btn.classList.add("is-added");
    window.clearTimeout(btn._addedTimeout);
    btn._addedTimeout = window.setTimeout(() => btn.classList.remove("is-added"), 1200);

    Cart.open(btn);
  });
}

/* ---------- Cart add-ons: "A Little Something Extra?" ---------------------
   Astra section 5. Rendered once at boot (the add-on catalog itself never
   changes); added add-ons flow into the normal cart-item list above like
   any other product. Add-ons with no photo (img null/undefined) fall back
   to a hand-drawn line icon in the twine colour instead of a greybox. */
function addonIconSvg(p) {
  const key = `${p.id} ${p.name}`.toLowerCase();
  if (key.includes("teddy") || key.includes("bear")) {
    return `<svg class="addon-icon" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="23" r="10"/>
      <circle cx="14" cy="12" r="4.5"/>
      <circle cx="34" cy="12" r="4.5"/>
      <circle cx="19.5" cy="21" r="1.1" fill="var(--gold)" stroke="none"/>
      <circle cx="28.5" cy="21" r="1.1" fill="var(--gold)" stroke="none"/>
      <path d="M20 27c1.6 1.6 6.4 1.6 8 0" stroke-linecap="round"/>
      <path d="M24 31v7" stroke-linecap="round"/>
      <path d="M15 35c3-2 15-2 18 0" stroke-linecap="round"/>
    </svg>`;
  }
  if (key.includes("balloon")) {
    return `<svg class="addon-icon" viewBox="0 0 48 48" aria-hidden="true">
      <path d="M24 6c8 0 12 6.5 12 13 0 8-6 13-12 15-6-2-12-7-12-15C12 12.5 16 6 24 6Z" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M22 34l2 3 2-3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M24 37c-2 4 3 5 1 9" stroke-linecap="round"/>
    </svg>`;
  }
  // Default: chocolate box / gift, also the generic add-on fallback.
  return `<svg class="addon-icon" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="8" y="18" width="32" height="22" rx="3" stroke-linejoin="round"/>
    <path d="M8 26h32" stroke-linecap="round"/>
    <path d="M24 18v22" stroke-linecap="round"/>
    <path d="M24 18c-4-6-12-6-12 0 4 2 9 1 12 0Z" stroke-linejoin="round"/>
    <path d="M24 18c4-6 12-6 12 0-4 2-9 1-12 0Z" stroke-linejoin="round"/>
  </svg>`;
}

// docs/COPY.md's add-on descriptions (8-word cap each); products.js does not
// carry them yet (subtitle is null on all three add-ons). Read p.subtitle
// first so a future content update wins automatically once it lands.
const ADDON_COPY_FALLBACK = {
  "addon-chocolates": "A sweet add-on to go with the flowers.",
  "addon-teddy-bear": "A soft keepsake to sit beside the bouquet.",
  "addon-balloons": "A few balloons to make it bigger."
};

function addonTileHTML(p) {
  const name = escapeHtml(p.name);
  const media = p.img
    ? `<img src="${p.imgSm || p.img}" alt="${name}" loading="lazy" width="144" height="144">`
    : addonIconSvg(p);
  const description = p.subtitle || ADDON_COPY_FALLBACK[p.id];
  const descriptionHtml = description ? `<p class="addon-tile__desc">${escapeHtml(description)}</p>` : "";
  const priceOrAction =
    p.price == null
      ? `<span class="addon-tile__price">Ask for price</span>
         <a class="addon-tile__request" href="${requestSimilarUrl(p.name)}" target="_blank" rel="noopener">Request similar</a>`
      : `<span class="addon-tile__price">${fmtUGX(p.price)}</span>
         <button type="button" class="addon-tile__add" data-add-to-cart="${p.id}" aria-label="Add ${name} to cart">Add</button>`;

  return `
    <div class="addon-tile" data-id="${p.id}">
      <div class="addon-tile__frame">${media}</div>
      <p class="addon-tile__name">${name}</p>
      ${descriptionHtml}
      ${priceOrAction}
    </div>`;
}

function renderCartAddons() {
  const row = document.querySelector("[data-cart-addons]");
  if (!row) return;
  const addons = (window.PRODUCTS || []).filter((p) => p.category === "addon");
  row.innerHTML = addons.length
    ? addons.map(addonTileHTML).join("")
    : "";
  row.closest(".cart-addons").hidden = !addons.length;
}

/* ---------- Copy order fallback -------------------------------------------- */
function initCopyOrder() {
  document.querySelectorAll("[data-copy-order]").forEach((btn) => {
    const defaultLabel = btn.textContent;
    btn.addEventListener("click", async () => {
      if (!Cart.items().length) return;
      const msg = buildWhatsAppMessage();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(msg);
        } else {
          const ta = document.createElement("textarea");
          ta.value = msg;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        announceCart("Order copied. Paste it into WhatsApp.");
        btn.textContent = "Copied";
        window.setTimeout(() => {
          btn.textContent = defaultLabel;
        }, 1600);
      } catch (e) {
        announceCart("Could not copy automatically. Select and copy the order text instead.");
      }
    });
  });
}

/* ---------- Escaping ---------------------------------------------------------
   Product/add-on names are interpolated into HTML strings below; escape them
   so a stray & or " in client-supplied copy can never break the markup. */
function escapeHtml(str) {
  return String(str == null ? "" : str).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* ---------- Label tilt -------------------------------------------------------
   ART-DIRECTION: badge/label rotation capped at 3deg, a static layout value
   set once per card (not an animation) and deterministic so the same
   product always tilts the same way rather than reflowing on re-render. */
function labelTilt(id) {
  const sum = String(id || "").split("").reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const steps = [-3, -1.5, 1.5, 3];
  return steps[sum % steps.length];
}

function requestSimilarUrl(name) {
  const text = `Hi Eden of Kora, I'd like something similar to ${name}.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const WHATSAPP_GLYPH =
  '<svg class="product-card__request-icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.560 6.560 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.560 6.560 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>';

/* ---------- Product grid rendering (shared by home + shop) ----------------
   DATA CONTRACT (docs and PROJECT root CLAUDE.md): {id, name, subtitle,
   price|null, unit, img, imgSm, category, occasion?, badge?, standIn?}.
   Coach borderless portrait tile (docs/REFERENCES.md move 2): 4:5 image,
   radius on the image mask only, no card border/shadow, DM Sans 600 name.
   price null renders "Ask for price" + a "Request similar" WhatsApp pill
   instead of the "Add to cart" pill. Optional focus ("x% y%") becomes the
   image object-position so floor and shelves stay out of the 4:5 crop. */
function productCardHTML(p) {
  const name = escapeHtml(p.name);
  const badge = p.badge
    ? `<span class="product-card__badge" style="--tilt:${labelTilt(p.id)}deg">${escapeHtml(p.badge)}</span>`
    : "";
  const subtitle = p.subtitle ? `<p class="product-card__subtitle">${escapeHtml(p.subtitle)}</p>` : "";
  const img = p.imgSm || p.img;
  const focusStyle = p.focus ? ` style="object-position:${escapeHtml(p.focus)}"` : "";

  const priceBlock =
    p.price == null
      ? `<span class="product-card__ask">Ask for price</span>
         <a class="product-card__request" href="${requestSimilarUrl(p.name)}" target="_blank" rel="noopener">${WHATSAPP_GLYPH}<span>Request similar</span></a>`
      : `<span class="product-card__price">${fmtUGX(p.price)}</span>
         <button type="button" class="add-btn" data-add-to-cart="${p.id}" aria-label="Add ${name} to cart">Add to cart</button>`;

  return `
    <article class="product-card reveal" data-id="${p.id}" data-category="${p.category}"${p.occasion ? ` data-occasion="${p.occasion}"` : ""}>
      <div class="product-card__frame">
        <img src="${img}" alt="${name}" loading="lazy" width="320" height="400"${focusStyle}>
        ${badge}
      </div>
      <h3 class="product-card__name">${name}</h3>
      ${subtitle}
      <div class="product-card__footer">
        ${priceBlock}
      </div>
    </article>`;
}

// Addons never render in normal grids (DATA CONTRACT + CLAUDE.md): they
// only appear inside the cart drawer's add-on row (renderCartAddons).
function renderProductGrids() {
  document.querySelectorAll("[data-product-grid]").forEach((grid) => {
    const idsAttr = grid.getAttribute("data-ids");
    const catalog = (window.PRODUCTS || []).filter((p) => p.category !== "addon");
    let list;
    if (idsAttr) {
      const ids = idsAttr.split(",").map((s) => s.trim());
      list = ids.map((id) => catalog.find((p) => p.id === id)).filter(Boolean);
    } else {
      list = catalog;
    }
    grid.innerHTML = list.length
      ? list.map(productCardHTML).join("")
      : `<p class="product-grid__empty">Nothing here yet. Message Ndikora on WhatsApp and ask what&rsquo;s in stock.</p>`;
  });
}

/* ---------- Shop filter chips ----------------------------------------------
   An All chip (selected by default) plus two top-level toggles (Bouquets, Occasions, aria-pressed). Occasions
   reveals Birthday/Sympathy sub-chips. Any chip with zero matching products
   is hidden at init (ASTRA "only populated choices appear") rather than
   just disabled, so it never appears as a dead control. */
function setCardVisible(card, visible) {
  if (visible) {
    card.classList.remove("is-hidden");
    requestAnimationFrame(() => card.classList.remove("is-fading"));
  } else {
    card.classList.add("is-fading");
    window.setTimeout(() => card.classList.add("is-hidden"), 200);
  }
}

function initShopFilters() {
  const root = document.querySelector("[data-shop-filters]");
  const grid = document.querySelector("#shop-grid[data-product-grid]");
  if (!root || !grid) return;

  const catalog = (window.PRODUCTS || []).filter((p) => p.category !== "addon");
  const hasBouquets = catalog.some((p) => p.category === "bouquets");
  const hasOccasions = catalog.some((p) => p.category === "occasions");
  const hasBirthday = catalog.some((p) => p.category === "occasions" && p.occasion === "birthday");
  const hasSympathy = catalog.some((p) => p.category === "occasions" && p.occasion === "sympathy");

  const allBtn = root.querySelector("[data-filter-all]");
  const bouquetsBtn = root.querySelector('[data-filter-category="bouquets"]');
  const occasionsBtn = root.querySelector('[data-filter-category="occasions"]');
  const subRow = root.querySelector("[data-occasion-chips]");
  const birthdayBtn = root.querySelector('[data-filter-occasion="birthday"]');
  const sympathyBtn = root.querySelector('[data-filter-occasion="sympathy"]');

  if (bouquetsBtn) bouquetsBtn.hidden = !hasBouquets;
  if (occasionsBtn) occasionsBtn.hidden = !hasOccasions;
  if (birthdayBtn) birthdayBtn.hidden = !hasBirthday;
  if (sympathyBtn) sympathyBtn.hidden = !hasSympathy;

  let category = null; // null = all
  let occasion = null;

  function emptyMessage() {
    const custom = grid.getAttribute("data-empty-message") || "Nothing here yet. Message Ndikora on WhatsApp and ask what's in stock.";
    return `<p class="product-grid__empty">${escapeHtml(custom)}</p>`;
  }

  function apply() {
    const cards = Array.from(grid.querySelectorAll(".product-card"));
    let visibleCount = 0;
    cards.forEach((card) => {
      const matchesCategory = !category || card.getAttribute("data-category") === category;
      const matchesOccasion = !occasion || card.getAttribute("data-occasion") === occasion;
      const match = matchesCategory && matchesOccasion;
      setCardVisible(card, match);
      if (match) visibleCount++;
    });

    let empty = grid.querySelector(".product-grid__empty");
    if (!visibleCount && cards.length) {
      if (!empty) grid.insertAdjacentHTML("beforeend", emptyMessage());
    } else if (empty) {
      empty.remove();
    }
    if (allBtn) allBtn.setAttribute("aria-pressed", String(!category && !occasion));
  }

  if (allBtn) {
    allBtn.addEventListener("click", () => {
      category = null;
      occasion = null;
      [bouquetsBtn, occasionsBtn, birthdayBtn, sympathyBtn].forEach((b) => b && b.setAttribute("aria-pressed", "false"));
      if (occasionsBtn) occasionsBtn.setAttribute("aria-expanded", "false");
      if (subRow) subRow.hidden = true;
      apply();
    });
  }

  if (bouquetsBtn) {
    bouquetsBtn.addEventListener("click", () => {
      const nowActive = category !== "bouquets";
      category = nowActive ? "bouquets" : null;
      occasion = null;
      bouquetsBtn.setAttribute("aria-pressed", String(nowActive));
      if (occasionsBtn) occasionsBtn.setAttribute("aria-pressed", "false");
      if (occasionsBtn) occasionsBtn.setAttribute("aria-expanded", "false");
      if (subRow) subRow.hidden = true;
      apply();
    });
  }

  if (occasionsBtn) {
    occasionsBtn.addEventListener("click", () => {
      const nowActive = category !== "occasions";
      category = nowActive ? "occasions" : null;
      occasion = null;
      occasionsBtn.setAttribute("aria-pressed", String(nowActive));
      occasionsBtn.setAttribute("aria-expanded", String(nowActive));
      if (bouquetsBtn) bouquetsBtn.setAttribute("aria-pressed", "false");
      if (subRow) subRow.hidden = !nowActive;
      if (birthdayBtn) birthdayBtn.setAttribute("aria-pressed", "false");
      if (sympathyBtn) sympathyBtn.setAttribute("aria-pressed", "false");
      apply();
    });
  }

  [
    [birthdayBtn, "birthday"],
    [sympathyBtn, "sympathy"]
  ].forEach(([btn, value]) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      const nowActive = occasion !== value;
      occasion = nowActive ? value : null;
      [birthdayBtn, sympathyBtn].forEach((b) => b && b.setAttribute("aria-pressed", "false"));
      btn.setAttribute("aria-pressed", String(nowActive));
      apply();
    });
  });
}

/* ---------- WhatsApp checkout ------------------------------------------------
   Astra section 5 "Cart add-ons and WhatsApp": item lines with qty and line
   totals, Items subtotal, "Delivery fee: confirmed by area", the 8 existing
   customer/recipient/delivery/card/request blanks, then the confirm line.
   Never label the subtotal the final total (delivery is unconfirmed). */
function buildWhatsAppMessage() {
  const items = Cart.items();
  const lines = items.map(
    (item) => `${item.qty}x ${item.name} - ${fmtUGX(item.price * item.qty)}`
  );
  const subtotal = fmtUGX(Cart.total());
  return [
    "Hello Eden of Kora! I'd like to order:",
    ...lines,
    `Items subtotal: ${subtotal}`,
    "Delivery fee: confirmed by area",
    "",
    "Your name: ",
    "Your phone: ",
    "Recipient's name: ",
    "Recipient's phone: ",
    "Delivery address: ",
    "Delivery date & time: ",
    "Card message: ",
    "Special requests: ",
    "",
    "Please confirm availability, delivery fee and payment details."
  ].join("\n");
}

function initWhatsAppCheckout() {
  document.querySelectorAll("[data-wa-checkout]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!Cart.items().length) {
        announceCart("Add something to your cart first.");
        return;
      }
      const msg = buildWhatsAppMessage();
      const win = window.open("https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(msg), "_blank");
      if (!win) announceCart("Couldn't open WhatsApp. Copy your order instead and send it manually.");
    });
  });
}

/* ---------- Scroll reveal ----------------------------------------------------- */
function initReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("js-reveal");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px -6% 0px" }
  );
  els.forEach((el) => io.observe(el));
}

/* ---------- Petals ------------------------------------------------------------- */
function initPetals(container) {
  if (!container) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const field = document.createElement("div");
  field.className = "petal-field";
  container.appendChild(field);

  const COUNT = 12;
  for (let i = 0; i < COUNT; i++) {
    const petal = document.createElement("span");
    petal.className = "petal";
    const size = 6 + Math.random() * 8;
    petal.style.width = size + "px";
    petal.style.height = size * 0.8 + "px";
    petal.style.left = Math.random() * 100 + "%";
    petal.style.opacity = (0.3 + Math.random() * 0.4).toFixed(2);
    const duration = 6 + Math.random() * 8;
    petal.style.animationDuration = duration + "s";
    petal.style.animationDelay = -(Math.random() * duration) + "s";
    field.appendChild(petal);
  }
}
window.initPetals = initPetals;

/* ---------- Mobile nav toggle ---------------------------------------------------
   The centred pill nav doubles as the 375px dropdown (styles.css absolutely
   positions it under the header below 820px). This wires the accessible
   dropdown contract: aria-expanded on the trigger, Escape closes and returns
   focus to it, and the links drop out of the tab order while hidden so
   keyboard users cannot tab into an invisible menu. */
function initNavToggle() {
  const header = document.querySelector(".site-header");
  const toggle = header ? header.querySelector(".nav-toggle") : null;
  const nav = header ? header.querySelector(".nav-pill") : null;
  if (!header || !toggle || !nav) return;

  const links = Array.from(nav.querySelectorAll("a"));
  const isMobile = () => window.matchMedia("(max-width: 820px)").matches;

  function setOpen(open) {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (isMobile()) links.forEach((a) => { a.tabIndex = open ? 0 : -1; });
  }

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));

  links.forEach((a) => a.addEventListener("click", () => setOpen(false)));

  document.addEventListener("click", (e) => {
    if (!header.classList.contains("nav-open")) return;
    if (e.target === header || !header.contains(e.target)) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header.classList.contains("nav-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      links.forEach((a) => a.removeAttribute("tabindex"));
      header.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  if (isMobile()) setOpen(false);
}

/* ---------- Hero video (index.html only) -----------------------------------------
   The poster paints first and the source attaches after first paint: the wide
   file for landscape viewports, the tall file for portrait. The poster fades
   out only once "playing" fires. Reduced motion and Save-Data keep the poster
   alone. An IntersectionObserver pauses playback while the hero is off screen. */
function initHeroVideo() {
  const media = document.querySelector("[data-hero-media]");
  const video = media ? media.querySelector("[data-hero-video]") : null;
  if (!media || !video) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  if (reduced || saveData) return;

  const SOURCES = { wide: "assets/media/hero/hero-wide.mp4?v=3", tall: "assets/media/hero/hero.mp4?v=3" };
  const portrait = window.matchMedia("(orientation: portrait)");

  let attached = "";
  let ready = false;
  let visible = true;

  function play() {
    const src = portrait.matches ? SOURCES.tall : SOURCES.wide;
    if (attached !== src) {
      attached = src;
      media.classList.remove("is-playing");
      video.src = src;
      video.load();
    }
    const p = video.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked: poster stands */ });
  }

  video.addEventListener("playing", () => media.classList.add("is-playing"));

  portrait.addEventListener("change", () => {
    if (ready && visible) play();
  });

  requestAnimationFrame(() => requestAnimationFrame(() => {
    ready = true;
    if (visible) play();
  }));

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible = entry.isIntersecting;
          if (!ready) return;
          if (visible) play();
          else if (!video.paused) video.pause();
        });
      },
      { threshold: 0.2 }
    ).observe(media);
  }
}

/* ---------- Hero tagline carousel (index.html only) ------------------------------
   Slide data lives in hidden, non-heading <li data-hero-slide> items so the page
   keeps exactly one real <h1>/<p>: main.js swaps their text and crossfades. */
function initHeroTaglines() {
  const root = document.querySelector("[data-hero-slides]");
  const titleEl = document.querySelector("[data-hero-title]");
  const bodyEl = document.querySelector("[data-hero-body]");
  if (!root || !titleEl || !bodyEl) return;

  const slides = Array.from(root.querySelectorAll("[data-hero-slide]"));
  if (!slides.length) return;

  const counter = document.querySelector("[data-hero-counter]");
  const prevBtn = document.querySelector("[data-hero-prev]");
  const nextBtn = document.querySelector("[data-hero-next]");
  const hoverTarget = document.querySelector(".hero") || root;

  let index = 0;
  let timer;

  function render(i) {
    const slide = slides[i];
    [titleEl, bodyEl].forEach((el) => {
      el.classList.remove("is-fading");
      void el.offsetWidth; // restart animation
      el.classList.add("is-fading");
    });
    titleEl.textContent = slide.dataset.title;
    bodyEl.textContent = slide.dataset.body;
    if (counter) counter.textContent = String(i + 1).padStart(2, "0");
  }
  function show(i) {
    index = (i + slides.length) % slides.length;
    render(index);
  }
  function next() {
    show(index + 1);
  }
  function prev() {
    show(index - 1);
  }
  function start() {
    stop();
    timer = window.setInterval(next, 6000);
  }
  function stop() {
    if (timer) window.clearInterval(timer);
  }

  if (nextBtn)
    nextBtn.addEventListener("click", () => {
      next();
      start();
    });
  if (prevBtn)
    prevBtn.addEventListener("click", () => {
      prev();
      start();
    });
  hoverTarget.addEventListener("mouseenter", stop);
  hoverTarget.addEventListener("mouseleave", start);

  if (counter) counter.textContent = "01";
  start();
}

/* ---------- Loading screen (every page) ----------------------------------------
   Only runs when the inline <head> script flagged this as the first page view
   of the session (html.is-loading). The img gets its src here rather than in
   the markup so the 930KB animation isn't downloaded on views that skip the
   loader. The SMIL clock inside the img starts at the img's own load event, so
   waiting MOTION_MS after that lets the florist finish her hug before the site
   is revealed. Tapping the loader skips it. Resolves once the loader is gone. */
function initLoader() {
  const root = document.documentElement;
  const loader = document.querySelector(".site-loader");
  if (!loader || !root.classList.contains("is-loading")) return Promise.resolve();

  const anim = loader.querySelector(".site-loader__anim");
  const MOTION_MS = 3067;

  const pageLoaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  const animPlayed = new Promise((resolve) => {
    if (!anim) return resolve();
    anim.addEventListener("load", () => window.setTimeout(resolve, MOTION_MS), { once: true });
    anim.addEventListener("error", resolve, { once: true });
    anim.src = anim.getAttribute("data-src");
  });
  const skipped = new Promise((resolve) => loader.addEventListener("click", resolve, { once: true }));

  return Promise.race([Promise.all([pageLoaded, animPlayed]), skipped]).then(
    () =>
      new Promise((resolve) => {
        try {
          sessionStorage.setItem("loaderSeen", "1");
        } catch (e) {}
        loader.classList.add("is-done");
        window.setTimeout(() => {
          root.classList.remove("is-loading");
          resolve();
        }, 300);
      })
  );
}

/* ---------- Boot ------------------------------------------------------------------ */
document.addEventListener("DOMContentLoaded", () => {
  renderProductGrids();
  renderCartAddons();
  renderCart();
  initCartItemEvents();
  initCartDrawerControls();
  initAddToCart();
  initWhatsAppCheckout();
  initCopyOrder();
  initNavToggle();
  initShopFilters();
  initHeroTaglines();
  initHeroVideo();
  document.querySelectorAll("[data-petals]").forEach(initPetals);
  // Reveal waits for the loader so above-the-fold sections animate in as it lifts.
  initLoader().then(initReveal);
});

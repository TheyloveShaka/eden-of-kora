/* Eden of Kora product catalog. window.PRODUCTS is the single source of
   truth for shop, home tiles, signature section and cart.
   Confirmed products render at launch; standIn:true items are placeholders
   for layout only and are blocked by the launch sweep (docs/PLAN.md). */

const PRODUCTS = [
  // ---------- confirmed ----------
  {
    id: "red-rose-large",
    name: "Red Rose Bouquet",
    subtitle: "Large",
    price: 200000,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-05.webp",
    imgSm: "assets/media/photos/eok-photo-05-sm.webp",
    category: "bouquets"
  },

  // ---------- stand-ins (price unconfirmed) ----------
  {
    id: "deep-pink-rose",
    name: "Deep Pink Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-01.webp",
    imgSm: "assets/media/photos/eok-photo-01-sm.webp",
    category: "bouquets",
    standIn: true
  },
  {
    id: "ivory-rose",
    name: "Ivory Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-03.webp",
    imgSm: "assets/media/photos/eok-photo-03-sm.webp",
    category: "occasions",
    occasion: "sympathy",
    standIn: true
  },
  {
    id: "white-garden-rose",
    name: "White Garden Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-06.webp",
    imgSm: "assets/media/photos/eok-photo-06-sm.webp",
    category: "occasions",
    occasion: "sympathy",
    standIn: true
  },
  {
    id: "blush-pink-rose",
    name: "Blush Pink Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-08.webp",
    imgSm: "assets/media/photos/eok-photo-08-sm.webp",
    category: "bouquets",
    standIn: true
  },
  {
    id: "red-white-rose-box",
    name: "Red and White Rose Box",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-10.webp",
    imgSm: "assets/media/photos/eok-photo-10-sm.webp",
    category: "bouquets",
    standIn: true
  },
  {
    id: "sunset-mixed-rose",
    name: "Sunset Mixed Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-11.webp",
    imgSm: "assets/media/photos/eok-photo-11-sm.webp",
    category: "occasions",
    occasion: "birthday",
    standIn: true
  },
  {
    id: "red-rose-babys-breath",
    name: "Red Rose and Baby's Breath",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-12.webp",
    imgSm: "assets/media/photos/eok-photo-12-sm.webp",
    category: "bouquets",
    standIn: true
  },
  {
    id: "pink-mixed-bouquet",
    name: "Pink Mixed Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-20.webp",
    imgSm: "assets/media/photos/eok-photo-20-sm.webp",
    category: "occasions",
    occasion: "birthday",
    standIn: true
  },
  {
    id: "orange-rose",
    name: "Orange Rose Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-21.webp",
    imgSm: "assets/media/photos/eok-photo-21-sm.webp",
    category: "bouquets",
    standIn: true
  },
  {
    id: "garden-mix-bouquet",
    name: "Garden Mix Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-22.webp",
    imgSm: "assets/media/photos/eok-photo-22-sm.webp",
    category: "occasions",
    occasion: "birthday",
    standIn: true
  },
  {
    id: "daisy-statice-bouquet",
    name: "Daisy and Statice Bouquet",
    subtitle: null,
    price: null,
    unit: "bouquet",
    img: "assets/media/photos/eok-photo-23.webp",
    imgSm: "assets/media/photos/eok-photo-23-sm.webp",
    category: "bouquets",
    standIn: true
  },

  // ---------- add-ons ----------
  {
    id: "addon-chocolates",
    name: "Chocolates",
    subtitle: null,
    price: 20000,
    unit: "box",
    img: null,
    imgSm: null,
    category: "addon"
  },
  {
    id: "addon-teddy-bear",
    name: "Teddy Bear",
    subtitle: null,
    price: 110000,
    unit: "piece",
    img: null,
    imgSm: null,
    category: "addon"
  },
  {
    id: "addon-balloons",
    name: "Balloons",
    subtitle: null,
    price: 25000,
    unit: "set",
    img: null,
    imgSm: null,
    category: "addon"
  }
];

// Expose globally for main.js and every page (no bundler/build step in this project).
window.PRODUCTS = PRODUCTS;

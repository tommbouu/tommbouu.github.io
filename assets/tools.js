// AutoLawn UK decision tools — vanilla JS, no tracking, no dependencies.
// Recommendation logic mirrors products.mjs (verified 2026-07-05). Update both together.
// Outputs recommend a CATEGORY first, then specific verified models.

function el(id){ return document.getElementById(id); }

// ---- Tool 1: Garden size selector ----
const sizeBands = [
  { max: 150, cat: "compact drop-and-mow or entry wire-free models", pick: "LawnMaster OcuMow 16 (~£292, needs a defined lawn edge) or Segway Navimow i105E (£699) if you want app control and self-docking", link: "/best-robot-lawn-mower-small-garden-uk/" },
  { max: 400, cat: "standard wire-free models rated 500m²+", pick: "Segway Navimow i105E (£699, rated 500m²) — comfortable headroom at your size", link: "/best-robot-mower-300m2-garden-uk/" },
  { max: 650, cat: "800m²-rated models (never buy at your exact size)", pick: "Navimow i208 AWD (£899, 800m²) or Mammotion Yuka mini 2 800 (£799)", link: "/best-robot-mower-500m2-garden-uk/" },
  { max: 1300, cat: "large-lawn models with 1,500m²+ ratings", pick: "Navimow i215 LiDAR (£1,099, 1,500m²) — the current coverage-per-pound leader", link: "/best-robot-lawn-mower-large-garden-uk/" },
  { max: Infinity, cat: "paddock-scale AWD machines", pick: "Mammotion Luba 2 AWD (£1,699, rated 3,000–10,000m²) or Navimow i220 LiDAR (£1,399, 2,000m²)", link: "/best-robot-lawn-mower-large-garden-uk/" },
];
window.runSize = function(){
  const v = parseFloat(el("size-m2").value);
  const out = el("size-result");
  if (!v || v <= 0) { out.classList.add("show"); out.innerHTML = "Enter your lawn size in m² (tip: pace it out — one big stride ≈ 1m, or measure on Google Maps)."; return; }
  const band = sizeBands.find(b => v <= b.max);
  out.classList.add("show");
  out.innerHTML = `<strong>Start with:</strong> ${band.cat}.<br><strong>Verified picks:</strong> ${band.pick}.<br><span class="muted">Rule of thumb: buy a coverage rating ~25% above your actual size so the mower isn't running flat-out daily.</span><br><a href="${band.link}">See the full guide for this size →</a>`;
};

// ---- Tool 2: Boundary wire vs wire-free chooser ----
window.runWire = function(){
  const budget = el("w-budget").value, trees = el("w-trees").value, diy = el("w-diy").value;
  const out = el("wire-result"); out.classList.add("show");
  let rec, why;
  if (budget === "low" && diy === "yes") {
    rec = "Boundary wire (Flymo EasiLife GO 250 ~£424, Gardena Sileno Minimo ~£429) — or the LawnMaster OcuMow 16 (~£292) if you want cheap AND wire-free";
    why = "Under ~£450 the wired mowers are mature and reliable; the wire install is a one-afternoon DIY job on a small lawn.";
  } else if (trees === "heavy") {
    rec = "Camera or LiDAR wire-free — Worx Landroid Vision Cloud (£699.99, no base station at all) or Navimow i208 LiDAR (£1,099) — or a wired Husqvarna/Gardena";
    why = "Heavy tree cover blocks the satellite signal pure-RTK mowers depend on. Camera and LiDAR models don't rely on it; wired mowers never did.";
  } else {
    rec = "Wire-free RTK (Segway Navimow i-series from £699, Mammotion Luba/Yuka from £799)";
    why = "No wire to lay, no wire to break, and remapping your garden takes minutes in the app instead of a day with a spade.";
  }
  out.innerHTML = `<strong>${rec}</strong><br><span class="muted">${why}</span><br><a href="/robot-lawn-mower-installation-cost-uk/">Compare setup costs →</a>`;
};

// ---- Tool 3: Which robot mower should I buy? (quiz) ----
window.runQuiz = function(){
  const size = parseFloat(el("q-size").value) || 300;
  const slope = el("q-slope").value, budget = el("q-budget").value, pets = el("q-pets").value,
        trees = el("q-trees").value, tech = el("q-tech").value;
  const out = el("quiz-result"); out.classList.add("show");
  let pick, why, link;
  if (slope === "steep") {
    pick = "AWD slope specialists — Mammotion Luba Mini AWD (£1,199)"; link = "/mammotion-luba-mini-awd-review-uk/";
    why = "All-wheel drive is the only sensible category for genuinely steep gardens. The Luba Mini's 80% (38.6°) climb rating is confirmed on Mammotion's official UK spec sheet.";
  } else if (budget === "under500") {
    pick = "entry-level machines — LawnMaster OcuMow 16 (~£292, wire-free, needs a defined edge) or Flymo EasiLife GO 250 (~£424, wired)"; link = "/cheapest-robot-lawn-mowers-uk/";
    why = "Both are honest budget machines for small, simple lawns. Skip anything cheaper from unknown brands.";
  } else if (trees === "heavy") {
    pick = "camera/LiDAR navigation — Worx Landroid Vision Cloud (£699.99, ≤300m²) or Navimow i208 LiDAR (£1,099, ≤800m²)"; link = "/best-robot-lawn-mower-without-boundary-wire-uk/";
    why = "Your tree cover risks blocking RTK satellite signal — pick navigation that doesn't depend on it.";
  } else if (tech === "low" && budget === "over1200") {
    pick = "the simplest-setup camera models — Eufy E15 (£1,499)"; link = "/eufy-e15-review-uk/";
    why = "Reviewers consistently rate its ~15-minute, no-antenna setup as the easiest in class. Best on flat, even, well-drained lawns (official slope limit: 18°).";
  } else if (size > 650) {
    pick = "large-lawn models — Navimow i215 LiDAR (£1,099, 1,500m²) or, above ~1,500m², Mammotion Luba 2 AWD (£1,699)"; link = "/best-robot-lawn-mower-large-garden-uk/";
    why = "You need coverage headroom above your lawn size — the large-garden guide compares the current line-up.";
  } else if (size > 400) {
    pick = "800m²-rated all-rounders — Navimow i208 AWD (£899) or Mammotion Yuka mini 2 800 (£799)"; link = "/best-robot-mower-500m2-garden-uk/";
    why = "At your size you want an 800m² rating for headroom; both picks were price-verified against official UK stores.";
  } else {
    pick = "standard wire-free RTK — Segway Navimow i105E (£699)"; link = "/navimow-i105e-review-uk/";
    why = "The default recommendation for typical UK gardens up to ~400m²: wire-free, proven (2,000+ reviews averaging 4.4★), rated 500m².";
  }
  let petNote = pets === "yes" ? "<br><span class='muted'>🐾 Pets: favour models with camera/LiDAR obstacle avoidance (the Eufy E15 leads here per professional reviews) and mow while pets are indoors.</span>" : "";
  out.innerHTML = `<strong>Start with: ${pick}</strong><br><span class="muted">${why}</span>${petNote}<br><a href="${link}">Read the full guide →</a>`;
};

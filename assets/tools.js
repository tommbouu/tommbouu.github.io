// AutoLawn UK decision tools — vanilla JS, no tracking, no dependencies.
// Product logic mirrors the Product Database (Airtable). Update both together.

function el(id){ return document.getElementById(id); }

// ---- Tool 1: Garden size selector ----
const sizeBands = [
  { max: 150, pick: "LawnMaster OcuMow 16 (budget) or Segway Navimow i105E (best experience)", why: "Tiny lawns don't need big coverage ratings — pay for reliability and easy setup, not capacity.", link: "/best-robot-lawn-mower-small-garden-uk/" },
  { max: 400, pick: "Segway Navimow i105E", why: "Rated to 500m², so a 150–400m² lawn leaves healthy headroom for daily cuts and awkward shapes.", link: "/best-robot-mower-300m2-garden-uk/" },
  { max: 600, pick: "Navimow i108E or Eufy E15", why: "At ~500m² you want a mower rated above your actual size — running at 100% of rated capacity means long mowing windows.", link: "/best-robot-mower-500m2-garden-uk/" },
  { max: 1200, pick: "Navimow i208E or Mammotion (larger Luba/Yuka models)", why: "Bigger batteries and faster coverage matter from ~800m² up.", link: "/best-robot-lawn-mower-large-garden-uk/" },
  { max: Infinity, pick: "Mammotion Luba 2 AWD 5000 or Husqvarna Automower 535 AWD", why: "Above ~1,500m² you're in flagship territory — multi-zone mapping and AWD earn their price.", link: "/best-robot-lawn-mower-large-garden-uk/" },
];
window.runSize = function(){
  const v = parseFloat(el("size-m2").value);
  const out = el("size-result");
  if (!v || v <= 0) { out.classList.add("show"); out.innerHTML = "Enter your lawn size in m² (tip: pace it out — one big stride ≈ 1m, or measure on Google Maps)."; return; }
  const band = sizeBands.find(b => v <= b.max);
  out.classList.add("show");
  out.innerHTML = `<strong>Suggested shortlist:</strong> ${band.pick}<br><span class="muted">${band.why}</span><br><a href="${band.link}">See the full guide for this size →</a>`;
};

// ---- Tool 2: Boundary wire vs wire-free chooser ----
window.runWire = function(){
  const budget = el("w-budget").value, trees = el("w-trees").value, diy = el("w-diy").value;
  const out = el("wire-result"); out.classList.add("show");
  let rec, why;
  if (budget === "low" && diy === "yes") {
    rec = "Boundary wire (e.g. Flymo EasiLife, Gardena Sileno) — or the LawnMaster OcuMow if you want cheap AND wire-free";
    why = "Under ~£450 the wired mowers are mature and reliable; the wire install is a one-afternoon DIY job.";
  } else if (trees === "heavy") {
    rec = "LiDAR or camera-vision wire-free (Navimow i208E, Worx Landroid Vision) — or a wired Husqvarna/Gardena";
    why = "Heavy tree cover can block RTK satellite signal. LiDAR and camera models don't depend on it; wired mowers never did.";
  } else {
    rec = "Wire-free RTK (Segway Navimow i-series, Mammotion Luba/Yuka)";
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
    pick = "Mammotion Luba Mini AWD"; link = "/best-robot-lawn-mower-slopes-uk/";
    why = "All-wheel drive is the only sensible answer for genuinely steep UK gardens (manufacturer-claimed climbing up to ~80% — verify against your slope).";
  } else if (budget === "under500") {
    pick = "LawnMaster OcuMow 16 (wire-free, ~£292) or Flymo EasiLife GO 250 (wired, ~£424)"; link = "/cheapest-robot-lawn-mowers-uk/";
    why = "Both are honest budget machines for small, simple lawns. Skip anything cheaper from unknown brands.";
  } else if (trees === "heavy") {
    pick = "Navimow i208E (LiDAR) or Worx Landroid Vision"; link = "/best-robot-lawn-mower-without-boundary-wire-uk/";
    why = "Your tree cover risks blocking RTK GPS signal — pick navigation that doesn't rely on satellites.";
  } else if (tech === "low" && budget === "over1200") {
    pick = "Eufy E15"; link = "/eufy-e15-vs-navimow-i105e/";
    why = "Reviewers consistently rate its ~15-minute, no-antenna setup as the easiest in class. Best for flat, even lawns.";
  } else if (size > 700) {
    pick = "Navimow i208E or a larger Mammotion"; link = "/best-robot-lawn-mower-large-garden-uk/";
    why = "You need coverage headroom above your lawn size — see the large-garden guide for the current line-up.";
  } else {
    pick = "Segway Navimow i105E"; link = "/best-wire-free-robot-lawn-mower-uk/";
    why = "The default recommendation for typical UK gardens up to ~400m²: wire-free, proven (2,000+ reviews averaging 4.4★), and around £699.";
  }
  let petNote = pets === "yes" ? "<br><span class='muted'>🐾 Pets: favour models with camera/LiDAR obstacle avoidance and mow while pets are indoors. See our dog-owners guidance in the FAQs.</span>" : "";
  out.innerHTML = `<strong>Our suggestion: ${pick}</strong><br><span class="muted">${why}</span>${petNote}<br><a href="${link}">Read the full guide →</a>`;
};

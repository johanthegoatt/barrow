// Tip, the wheelbarrow who helps you order. Tip offers a hint when tapped,
// smiles when the order looks sensible, strains when the load is heavy enough to
// need a delivery, and looks unsure when the depth is off. Tap five times fast
// and a little soil spills. Everything Tip says goes through the bubble's live
// region, so a screen reader hears it too. Moods are driven by the app, never on
// a timer of its own.
(function () {
  "use strict";
  var btn = document.getElementById("tip");
  var bubble = document.getElementById("tip-bubble");
  var dock = document.getElementById("tip-dock");
  var hide = document.getElementById("tip-hide");
  if (!btn) { window.Tip = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var baseMood = "calm", tipKey = "start";
  var bubbleTimer = null, flashTimer = null, taps = [], tipAt = {};

  var TIPS = {
    start: [
      "Hi, I'm Tip! Tell me the patch and how deep you want it, and I'll say how much to buy.",
      "Mulch, soil, gravel, it's all area times depth. I turn that into bags, loads and a weight.",
      "Measure the ground you're covering. A border is just a long thin rectangle."
    ],
    area: [
      "Length and width of the bed, or the diameter if it's round.",
      "Got an odd shape? Split it into rectangles, do each, and add them up.",
      "A border strip is the same as a rectangle: its length and how wide the bed is."
    ],
    material: [
      "Pick what you're laying. Each one has a sensible depth and a typical weight.",
      "Mulch about 5–8 cm, gravel about 5 cm, fresh topsoil 10 cm and up.",
      "Too thin and weeds come through; too deep can smother roots. I'll flag it."
    ],
    price: [
      "Put in a bag price and a bulk price and I'll tell you which is cheaper.",
      "A pile of small bags often costs more than one bulk load once you add them up.",
      "Bag and bulk sizes vary; I use 50 L bags and a 0.7 m³ bulk bag unless you change them."
    ],
    result: [
      "Order a touch over if in doubt; topping up a thin bed later is a faff.",
      "Heavy load? That's a delivery, not the back seat of the car.",
      "Confirm the weight per cubic metre with your yard; suppliers differ."
    ]
  };

  function setMood(m) { btn.setAttribute("data-mood", m); }

  function say(text, ms) {
    if (dock.classList.contains("tucked")) return;
    bubble.textContent = text;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ""; }, ms || 7000);
  }

  function flash(m, ms) {
    setMood(m);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setMood(baseMood); }, ms || 1500);
  }

  function hint() {
    var list = TIPS[tipKey] || TIPS.start;
    var i = tipAt[tipKey] || 0;
    say(list[i % list.length]);
    tipAt[tipKey] = i + 1;
  }

  function spill() {
    if (still.matches) return;
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 7; i++) {
      (function (n) {
        var s = document.createElement("span");
        s.className = "crumb";
        s.style.left = (rect.left + 30) + "px";
        s.style.top = (rect.top + 24) + "px";
        s.style.setProperty("--dx", (Math.random() * 120 - 60) + "px");
        s.style.setProperty("--dy", (-30 - Math.random() * 70) + "px");
        s.style.setProperty("--dr", (Math.random() * 500 - 250) + "deg");
        s.style.animationDelay = (n * 0.05) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200);
      })(i);
    }
  }

  btn.addEventListener("click", function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 900; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; spill(); say("Whoops, spilled a bit! Right, where were we?"); flash("happy"); return; }
    hint();
    flash("think", 900);
  });

  hide.addEventListener("click", function () {
    var tucked = dock.classList.toggle("tucked");
    hide.textContent = tucked ? "" : "tuck away";
    if (!tucked) { say("Back! Tap me any time for a hint."); }
  });

  // Eyes track the pointer a little, so Tip feels awake. Cheap, eyes only.
  if (!still.matches) {
    document.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = Math.max(-1.6, Math.min(1.6, (e.clientX - (r.left + r.width / 2)) / 60));
      var face = btn.querySelector(".tip-face");
      if (face) face.style.transform = "translateX(" + dx + "px)";
    }, { passive: true });
  }

  // Public hooks the page calls.
  window.Tip = {
    // Where the user is, so the next hint fits: "area", "material", "price".
    context: function (key) { tipKey = TIPS[key] ? key : "start"; baseMood = "calm"; setMood(baseMood); },
    // React to a result: "ok" (sensible), "heavy" (needs a delivery),
    // "thin"/"deep" (depth off), "bad".
    react: function (kind) {
      tipKey = "result";
      if (kind === "heavy") { flash("strain"); say("That's a heavy load, order a delivery rather than the car boot."); }
      else if (kind === "thin") { flash("think"); say("That layer's on the thin side; weeds will push through."); }
      else if (kind === "deep") { flash("think"); say("That's piling it on deep, careful not to smother the roots."); }
      else if (kind === "ok") { flash("happy"); say("Looks a sensible order. Buy a touch over if you're unsure."); }
      else if (kind === "bad") { flash("think"); say("I couldn't read that. Check the measurements and the depth?"); }
    },
    say: say
  };

  setTimeout(function () { if (!dock.classList.contains("tucked")) say(TIPS.start[0]); }, 900);
})();

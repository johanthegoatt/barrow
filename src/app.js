// Barrow page glue: read the form, run the engine in core.js, draw the order,
// keep the share link in sync, and tell Tip what's going on. All the real work
// lives in core.js so it can be tested without a browser.
(function () {
  "use strict";
  var B = window.Barrow;
  var $ = function (id) { return document.getElementById(id); };

  var ids = ["shape", "len", "wid", "dia", "area-unit", "material", "depth", "depth-unit",
    "bag-size", "bag-price", "bulk-size", "bulk-price", "density", "barrow"];
  var el = {};
  ids.forEach(function (id) { el[id] = $(id); });
  var out = $("out");

  function readState() {
    return {
      sh: el.shape.value,
      l: el.len.value.trim(), w: el.wid.value.trim(), d: el.dia.value.trim(), au: el["area-unit"].value,
      m: el.material.value, dp: el.depth.value.trim(), du: el["depth-unit"].value,
      bs: el["bag-size"].value.trim(), bp: el["bag-price"].value.trim(),
      ks: el["bulk-size"].value.trim(), kp: el["bulk-price"].value.trim(),
      dn: el.density.value.trim(), br: el.barrow.value.trim()
    };
  }

  function writeState(s) {
    if (!s) return;
    if (s.sh) el.shape.value = s.sh;
    if (s.l != null) el.len.value = s.l;
    if (s.w != null) el.wid.value = s.w;
    if (s.d != null) el.dia.value = s.d;
    if (s.au) el["area-unit"].value = s.au;
    if (s.m) el.material.value = s.m;
    if (s.dp != null) el.depth.value = s.dp;
    if (s.du) el["depth-unit"].value = s.du;
    if (s.bs != null) el["bag-size"].value = s.bs;
    if (s.bp != null) el["bag-price"].value = s.bp;
    if (s.ks != null) el["bulk-size"].value = s.ks;
    if (s.kp != null) el["bulk-price"].value = s.kp;
    if (s.dn != null) el.density.value = s.dn;
    if (s.br != null) el.barrow.value = s.br;
  }

  function cell(k, v, u, big) {
    return '<div class="cell' + (big ? " big" : "") + '"><span class="k">' + k + '</span><span class="v">' + v +
      (u ? '<span class="u"> ' + u + '</span>' : "") + '</span></div>';
  }

  function render(r) {
    if (!r || !r.ok) {
      var msg = r && r.reason === "bad-depth" ? "Enter how deep you want the material."
        : r && r.reason === "bad-area" ? "Enter the size of the area to cover."
        : "Fill in the area and the depth to start.";
      out.innerHTML = '<div class="result bad"><h3>Nothing to work out yet</h3><p class="msg">' + msg + '</p></div>';
      return "bad";
    }

    var imp = r.system === "imperial";
    var volMain = imp ? r.cuft : r.volume;
    var volUnit = imp ? "cu ft" : "m³";
    var volSub = imp ? (r.cuyd + " cu yd") : (r.litres + " L");

    var grid =
      cell("You need", volMain, volUnit, true) +
      cell("Weighs", r.weightT >= 0.1 ? r.weightT : "<0.1", "t") +
      cell("Bags", r.bags, "× " + r.bagM3 + "L") +
      cell("Barrow", r.barrowLoads, "loads");

    var areaLine = '<p class="opt-sub">' +
      (imp ? r.areaFt2 + " sq ft" : r.area + " m²") + " at " +
      (imp ? r.depthIn + " in" : r.depthCm + " cm") + " deep" +
      (r.settle > 0 ? ", plus " + Math.round(r.settle * 100) + "% so it beds down to depth" : "") +
      " — " + volSub + " to buy.</p>";

    var depthPill = r.depthFlag === "low"
      ? '<span class="tagpill warn">thin layer</span>'
      : r.depthFlag === "high"
        ? '<span class="tagpill warn">deep layer</span>'
        : '<span class="tagpill good">good depth</span>';
    var depthNote = r.depthFlag === "low"
      ? "At " + r.depthCm + " cm it's under the usual " + r.depthLo + "–" + r.depthHi + " cm; weeds get through a thin layer and it dries out."
      : r.depthFlag === "high"
        ? "At " + r.depthCm + " cm it's over the usual " + r.depthLo + "–" + r.depthHi + " cm; too deep can smother roots."
        : "At " + r.depthCm + " cm it's within the usual " + r.depthLo + "–" + r.depthHi + " cm for this material.";

    var priceBlock = "";
    if (r.compare) {
      var c = r.compare;
      var pill = c.cheaper === "bulk"
        ? '<span class="tagpill good">bulk is cheaper</span>'
        : c.within ? '<span class="tagpill">bags, just</span>' : '<span class="tagpill good">bags are cheaper</span>';
      var line = c.cheaper === "bulk"
        ? c.bulkCount + " bulk load" + (c.bulkCount === 1 ? "" : "s") + " at " + c.bulkCost + " beats " + r.bags + " bags at " + c.bagsCost + ", saving about " + c.saving + "."
        : c.within
          ? "Bags come to " + c.bagsCost + " and " + c.bulkCount + " bulk to " + c.bulkCost + " — close, and one load is far less lifting for about " + c.saving + " more."
          : r.bags + " bags at " + c.bagsCost + " beats " + c.bulkCount + " bulk at " + c.bulkCost + ", saving about " + c.saving + ".";
      priceBlock = '<div class="result"><h3>Bags or bulk</h3>' +
        '<div class="opt"><div class="opt-h">Cheaper way ' + pill + '</div><p class="opt-sub">' + line + '</p></div></div>';
    }

    var advice = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";

    out.innerHTML =
      '<div class="result">' +
        '<h3>' + r.materialLabel + '</h3>' +
        '<div class="opt pick">' +
          '<div class="opt-h">What to order</div>' +
          '<div class="grid">' + grid + '</div>' +
          areaLine +
        '</div>' +
      '</div>' +
      '<div class="result"><h3>Depth check</h3><div class="opt"><div class="opt-h">Layer ' + depthPill +
        '</div><p class="opt-sub">' + depthNote + '</p></div></div>' +
      priceBlock +
      '<div class="result"><h3>What to do</h3>' + advice + '</div>';

    if (r.depthFlag === "low") return "thin";
    if (r.depthFlag === "high") return "deep";
    if (r.weightT >= 0.5) return "heavy";
    return "ok";
  }

  function recompute() {
    var s = readState();
    var opts = {
      shape: s.sh,
      length: { value: s.l, unit: s.au }, width: { value: s.w, unit: s.au }, diameter: { value: s.d, unit: s.au },
      depth: { value: s.dp, unit: s.du },
      material: s.m,
      density: s.dn === "" ? undefined : s.dn,
      bagSize: s.bs === "" ? undefined : { value: s.bs, unit: "L" },
      bagPrice: s.bp,
      bulkSize: s.ks === "" ? undefined : { value: s.ks, unit: "m3" },
      bulkPrice: s.kp,
      barrow: s.br === "" ? undefined : { value: s.br, unit: "L" },
      system: s.au === "ft" || s.au === "yd" ? "imperial" : "metric"
    };
    var r = B.estimate(opts);
    var kind = render(r);
    if (window.Tip && r.ok) window.Tip.react(kind);
    else if (window.Tip) window.Tip.react("bad");
    syncLink(s);
  }

  var linkState = "";
  function syncLink(s) {
    linkState = B.pack(s);
    try { history.replaceState(null, "", "#" + linkState); } catch (e) { /* ignore */ }
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#" + linkState;
    var done = $("share-done");
    function ok() { done.textContent = "Link copied"; setTimeout(function () { done.textContent = ""; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { done.textContent = url; });
    else { done.textContent = url; }
  });

  // Show only the fields the shape needs.
  function onShape() {
    var round = el.shape.value === "circle";
    $("f-length").hidden = round;
    $("f-width").hidden = round;
    $("f-diameter").hidden = !round;
    $("l-label").textContent = el.shape.value === "strip" ? "Length of run" : "Length";
    $("w-label").textContent = el.shape.value === "strip" ? "Width of bed" : "Width";
  }

  // Set the depth hint and a sensible depth placeholder for the material.
  function onMaterial() {
    var m = B.MATERIALS[el.material.value] || B.MATERIALS.mulch;
    var mid = Math.round((m.depthLo + m.depthHi) / 2);
    el.depth.placeholder = "e.g. " + mid;
    $("depth-hint").textContent = "A " + m.depthLo + "–" + m.depthHi + " cm layer suits " +
      m.label.toLowerCase() + ". Barrow nudges you if the depth looks thin or heavy.";
  }

  // Hints follow where the eye is.
  ["shape", "len", "wid", "dia", "area-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Tip) window.Tip.context("area"); });
  });
  ["material", "depth", "depth-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Tip) window.Tip.context("material"); });
  });
  ["bag-size", "bag-price", "bulk-size", "bulk-price", "density", "barrow"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Tip) window.Tip.context("price"); });
  });

  el.shape.addEventListener("change", function () { onShape(); recompute(); });
  el.material.addEventListener("change", function () { onMaterial(); recompute(); });

  ids.forEach(function (id) {
    el[id].addEventListener("input", recompute);
    el[id].addEventListener("change", recompute);
  });

  // Open on a shared link if there is one, otherwise a sensible starting point.
  var frag = location.hash.replace(/^#/, "");
  var initial = frag ? B.unpack(frag) : null;
  if (initial) { writeState(initial); }
  onShape();
  onMaterial();
  recompute();
})();

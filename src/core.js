// Barrow core: how much mulch, topsoil, compost, gravel or sand to buy for a
// bed or a patch of ground, and whether bags or a bulk load works out cheaper.
// No DOM in here, so the same file runs in the page and under `node --test`.
//
// The whole job is volume: the area you're covering times how deep you want it.
// The traps a quick guess misses are (1) loose material settles or compacts, so
// you order a bit more than the finished depth, (2) it's sold by volume (litres,
// cubic feet, bags, bulk bags) but delivered by weight, so you need the weight
// to know if the car will take it, and (3) a pile of small bags is often dearer
// than one bulk load once you add them up. Barrow works out the volume, the
// weight from a typical density, the number of bags or barrow-loads, and does
// the bags-vs-bulk sum. Densities and bag sizes vary by supplier, so every one
// is a typical figure you can edit; confirm with your own yard before ordering.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Barrow = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IN = 0.0254;        // m per inch
  var FT = 0.3048;        // m per foot
  var YD = 0.9144;        // m per yard
  var CUFT = 0.3048 * 0.3048 * 0.3048; // m^3 per cubic foot (exact from ft)
  var CUYD = 0.9144 * 0.9144 * 0.9144; // m^3 per cubic yard (exact from yd)
  var L = 0.001;          // m^3 per litre

  // Typical materials. density is tonnes per cubic metre (loose, as delivered);
  // settle is the fraction a loose load loses when it beds in or is compacted to
  // the finished depth, so you order volume / (1 - settle); depthLo/depthHi are a
  // sensible finished-depth band in cm, used only to nudge, never to refuse.
  // The depth bands follow garden-extension guidance: beds mulched 2-3 in
  // (5-8 cm), coarse mulch up to 4 in (10 cm) (UF/IFAS, Illinois Extension);
  // gravel paths laid about 2 in (5 cm); new topsoil 4 in (10 cm) and up.
  // Densities are mid-range typical values; a supplier's own figure wins.
  var MATERIALS = {
    mulch:    { label: "Mulch / wood chips", density: 0.40, settle: 0,    depthLo: 5,  depthHi: 10, soldBy: "volume" },
    bark:     { label: "Bark / play bark",   density: 0.35, settle: 0,    depthLo: 5,  depthHi: 15, soldBy: "volume" },
    compost:  { label: "Compost / soil improver", density: 0.60, settle: 0, depthLo: 3, depthHi: 8, soldBy: "volume" },
    topsoil:  { label: "Topsoil",            density: 1.30, settle: 0.10, depthLo: 10, depthHi: 20, soldBy: "both" },
    gravel:   { label: "Gravel / aggregate", density: 1.60, settle: 0.20, depthLo: 4,  depthHi: 8,  soldBy: "weight" },
    sand:     { label: "Sand",               density: 1.60, settle: 0.10, depthLo: 2,  depthHi: 10, soldBy: "weight" }
  };

  function num(v) {
    var n = typeof v === "number" ? v : parseFloat(String(v == null ? "" : v).replace(",", "."));
    return isFinite(n) ? n : NaN;
  }

  // Any length into metres.
  function toM(value, unit) {
    var n = num(value);
    if (!isFinite(n)) return NaN;
    switch (unit) {
      case "mm": return n / 1000;
      case "cm": return n / 100;
      case "in": return n * IN;
      case "ft": return n * FT;
      case "yd": return n * YD;
      default:   return n; // metres
    }
  }

  // A bag/bulk size into cubic metres. Volume units only.
  function toM3(value, unit) {
    var n = num(value);
    if (!isFinite(n)) return NaN;
    switch (unit) {
      case "L":    return n * L;
      case "cuft": return n * CUFT;
      case "cuyd": return n * CUYD;
      default:     return n; // m^3
    }
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round0(x) { return Math.round(x); }

  // Area of the patch in square metres.
  //   shape "rect" / "strip": length x width
  //   shape "circle":         pi r^2 from the diameter
  function areaM2(opts) {
    var shape = opts.shape || "rect";
    if (shape === "circle") {
      var d = toM(opts.diameter && opts.diameter.value, opts.diameter && opts.diameter.unit);
      if (!(d > 0)) return NaN;
      var r = d / 2;
      return Math.PI * r * r;
    }
    var l = toM(opts.length && opts.length.value, opts.length && opts.length.unit);
    var w = toM(opts.width && opts.width.value, opts.width && opts.width.unit);
    if (!(l > 0) || !(w > 0)) return NaN;
    return l * w;
  }

  // The whole estimate.
  function estimate(opts) {
    opts = opts || {};
    var matKey = MATERIALS[opts.material] ? opts.material : "mulch";
    var mat = MATERIALS[matKey];
    var system = opts.system === "imperial" ? "imperial" : "metric";

    var area = areaM2(opts);
    if (!(area > 0)) return { ok: false, reason: "bad-area" };

    var depthM = toM(opts.depth && opts.depth.value, opts.depth && opts.depth.unit);
    if (!(depthM > 0)) return { ok: false, reason: "bad-depth" };
    var depthCm = depthM * 100;

    // Density and settle: a typed override, else the material's typical figure.
    var density = num(opts.density);
    if (!(density > 0)) density = mat.density;
    var settle = num(opts.settle);
    if (!(settle >= 0 && settle < 0.9)) settle = mat.settle;

    var volumeNet = area * depthM;                 // m^3 at the finished depth
    var volumeOrder = volumeNet / (1 - settle);    // m^3 to actually buy
    var weightT = volumeOrder * density;           // tonnes

    // Bag and barrow counts. Defaults match how each system is usually sold.
    var bagDefault = system === "imperial" ? { value: 2, unit: "cuft" } : { value: 50, unit: "L" };
    var bagM3 = opts.bagSize && opts.bagSize.value != null
      ? toM3(opts.bagSize.value, opts.bagSize.unit)
      : toM3(bagDefault.value, bagDefault.unit);
    if (!(bagM3 > 0)) bagM3 = toM3(bagDefault.value, bagDefault.unit);
    var bags = Math.ceil(volumeOrder / bagM3 - 1e-6);

    // A builder's/garden barrow holds roughly 65 L heaped; editable.
    var barrowM3 = opts.barrow && opts.barrow.value != null ? toM3(opts.barrow.value, opts.barrow.unit) : 0.065;
    if (!(barrowM3 > 0)) barrowM3 = 0.065;
    var barrowLoads = Math.ceil(volumeOrder / barrowM3 - 1e-6);

    var depthFlag = depthCm < mat.depthLo ? "low" : depthCm > mat.depthHi ? "high" : "ok";

    var out = {
      ok: true,
      material: matKey,
      materialLabel: mat.label,
      soldBy: mat.soldBy,
      system: system,
      shape: opts.shape || "rect",
      area: round2(area),
      areaFt2: round1(area / (FT * FT)),
      depthCm: round1(depthCm),
      depthIn: round1(depthCm / 2.54),
      density: round2(density),
      settle: settle,
      volumeNet: round2(volumeNet),
      volume: round2(volumeOrder),
      litres: round0(volumeOrder / L),
      cuft: round1(volumeOrder / CUFT),
      cuyd: round2(volumeOrder / CUYD),
      weightT: round2(weightT),
      weightKg: round0(weightT * 1000),
      bagM3: round0(bagM3 / L),          // bag size shown in litres
      bagCuft: round1(bagM3 / CUFT),
      bags: bags,
      barrowLoads: barrowLoads,
      depthLo: mat.depthLo,
      depthHi: mat.depthHi,
      depthFlag: depthFlag
    };

    out.compare = comparePrice(opts, out, bagM3);
    out.advice = advise(out);
    return out;
  }

  // Bags vs a bulk load. Needs a bag price and a bulk size + price to compare;
  // otherwise returns null. "within" marks the case where bulk is only a little
  // dearer but saves a lot of lifting, the way RoomCoat flags a bigger tin.
  function comparePrice(opts, r, bagM3) {
    var bagPrice = num(opts.bagPrice);
    var bulkPrice = num(opts.bulkPrice);
    var bulkM3 = opts.bulkSize && opts.bulkSize.value != null ? toM3(opts.bulkSize.value, opts.bulkSize.unit) : NaN;
    if (!(bagPrice > 0) || !(bulkPrice > 0) || !(bulkM3 > 0)) return null;

    var bagsCost = r.bags * bagPrice;
    var bulkCount = Math.ceil(r.volume / bulkM3 - 1e-6);
    var bulkCost = bulkCount * bulkPrice;
    var cheaper = bulkCost <= bagsCost ? "bulk" : "bags";
    var saving = round2(Math.abs(bagsCost - bulkCost));
    // If bags are cheaper but bulk is within 10%, point out the one load.
    var within = cheaper === "bags" && bulkCost <= bagsCost * 1.10;
    return {
      bagsCost: round2(bagsCost),
      bulkCount: bulkCount,
      bulkCost: round2(bulkCost),
      bulkM3: round2(bulkM3),
      cheaper: cheaper,
      saving: saving,
      within: within
    };
  }

  function advise(r) {
    var tips = [];
    var vol = r.system === "imperial" ? (r.cuft + " cu ft (" + r.cuyd + " cu yd)") : (r.volume + " m³ (" + r.litres + " litres)");
    tips.push("You need about " + vol + " of " + r.materialLabel.toLowerCase() + " to cover " +
      (r.system === "imperial" ? r.areaFt2 + " sq ft" : r.area + " m²") + " at " +
      (r.system === "imperial" ? r.depthIn + " in" : r.depthCm + " cm") + " deep.");

    if (r.settle > 0) {
      tips.push("That already adds " + Math.round(r.settle * 100) + "% so it beds down to depth; a loose load settles once it's spread and walked on.");
    }
    tips.push("It'll weigh roughly " + r.weightT + " tonne" + (r.weightT === 1 ? "" : "s") + " (" + r.weightKg +
      " kg). " + (r.weightT >= 0.5 ? "That's a delivery or several car trips, not one boot-load." : "Light enough for a few bags in the car."));

    if (r.depthFlag === "low") {
      tips.push("At " + r.depthCm + " cm this is thinner than the usual " + r.depthLo + "–" + r.depthHi +
        " cm for " + r.materialLabel.toLowerCase() + "; a thin layer of mulch lets weeds through and dries out fast.");
    } else if (r.depthFlag === "high") {
      tips.push("At " + r.depthCm + " cm this is deeper than the usual " + r.depthLo + "–" + r.depthHi +
        " cm; piling mulch too deep can smother roots, so check that's what you want.");
    }

    tips.push("That's about " + r.bags + " bag" + (r.bags === 1 ? "" : "s") + " (at " + r.bagM3 +
      " L each) or " + r.barrowLoads + " barrow-load" + (r.barrowLoads === 1 ? "" : "s") + " to move it.");

    if (r.compare) {
      var c = r.compare;
      if (c.cheaper === "bulk") {
        tips.push("A bulk load works out cheaper here: " + c.bulkCount + " × bulk at " + c.bulkCost +
          " beats " + r.bags + " bags at " + c.bagsCost + ", saving about " + c.saving + ".");
      } else if (c.within) {
        tips.push("Bags are a touch cheaper (" + c.bagsCost + " vs " + c.bulkCost + " for " + c.bulkCount +
          " bulk), but one bulk load is far less lifting for about " + c.saving + " more.");
      } else {
        tips.push("Bags are cheaper here: " + r.bags + " bags at " + c.bagsCost + " beats " + c.bulkCount +
          " bulk at " + c.bulkCost + ", saving about " + c.saving + ".");
      }
    }
    tips.push("Densities and bag sizes vary by supplier, so treat these as planning figures and confirm the weight and bag size with your yard before ordering.");
    return tips;
  }

  // The whole input packs into the URL fragment, which the browser never sends
  // to a server, so a shared link reopens on the same job with nothing uploaded.
  function pack(state) {
    var json = JSON.stringify(state);
    var b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function unpack(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
      var o = JSON.parse(json);
      return o && typeof o === "object" ? o : null;
    } catch (e) { return null; }
  }

  return {
    IN: IN, FT: FT, YD: YD, CUFT: CUFT, CUYD: CUYD, MATERIALS: MATERIALS,
    toM: toM, toM3: toM3, round1: round1, round2: round2,
    areaM2: areaM2, estimate: estimate, comparePrice: comparePrice, advise: advise,
    pack: pack, unpack: unpack
  };
});

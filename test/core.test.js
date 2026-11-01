"use strict";
var test = require("node:test");
var assert = require("node:assert");
var B = require("../src/core.js");

// A rectangular bed, mulch at a normal depth: straight area x depth, no settle.
test("rectangle of mulch is area x depth", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 4, unit: "m" }, width: { value: 2.5, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch"
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.area, 10);        // 4 x 2.5
  assert.strictEqual(r.volume, 0.5);     // 10 x 0.05
  assert.strictEqual(r.weightT, 0.2);    // 0.5 x 0.40 t/m3
  assert.strictEqual(r.litres, 500);
  assert.strictEqual(r.bags, 10);        // 500 L / 50 L bag
  assert.strictEqual(r.barrowLoads, 8);  // 0.5 / 0.065, rounded up
  assert.strictEqual(r.depthFlag, "ok"); // 5 cm is in the 5-10 band
});

// Gravel: the settle allowance means you order more than the finished volume,
// and a cubic metre of it weighs well over a tonne.
test("gravel adds a compaction allowance and is heavy", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 5, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "gravel"
  });
  assert.strictEqual(r.volumeNet, 0.5);
  assert.strictEqual(r.settle, 0.2);
  assert.strictEqual(r.volume, 0.63);    // 0.5 / 0.8 = 0.625 -> 0.63
  assert.strictEqual(r.weightT, 1);      // 0.625 x 1.60 t/m3
  assert.strictEqual(r.cuyd, 0.82);      // 0.625 m3 in cubic yards
  assert.strictEqual(r.soldBy, "weight");
});

// A circular bed uses pi r^2 from the diameter.
test("circle area uses the diameter", function () {
  var r = B.estimate({
    shape: "circle",
    diameter: { value: 4, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch"
  });
  assert.strictEqual(r.area, 12.57);     // pi * 2^2
});

// Imperial: feet and inches in, cubic feet out, 2 cu ft bags.
test("imperial bed gives cubic feet and 2 cu ft bags", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 10, unit: "ft" }, width: { value: 8, unit: "ft" },
    depth: { value: 3, unit: "in" }, material: "mulch", system: "imperial"
  });
  assert.strictEqual(r.areaFt2, 80);     // 10 x 8
  assert.strictEqual(r.depthIn, 3);
  assert.strictEqual(r.cuft, 20);        // 80 sq ft x 0.25 ft
  assert.strictEqual(r.bags, 10);        // 20 cu ft / 2 cu ft bag
});

// Topsoil carries a 10% settle by default.
test("topsoil orders 10 percent over the finished depth", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 2, unit: "m" }, width: { value: 1, unit: "m" },
    depth: { value: 10, unit: "cm" }, material: "topsoil"
  });
  assert.strictEqual(r.volumeNet, 0.2);
  assert.strictEqual(r.settle, 0.1);
  assert.strictEqual(r.volume, 0.22);    // 0.2 / 0.9 = 0.2222 -> 0.22
});

// A bulk load that costs less than the pile of bags is flagged as cheaper.
test("bulk is flagged cheaper when it beats the bags", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 4, unit: "m" }, width: { value: 2.5, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch",
    bagPrice: 6, bulkSize: { value: 0.7, unit: "m3" }, bulkPrice: 45
  });
  assert.strictEqual(r.bags, 10);
  assert.strictEqual(r.compare.bagsCost, 60);   // 10 x 6
  assert.strictEqual(r.compare.bulkCount, 1);   // 0.5 m3 fits one 0.7 m3 bag
  assert.strictEqual(r.compare.bulkCost, 45);
  assert.strictEqual(r.compare.cheaper, "bulk");
  assert.strictEqual(r.compare.saving, 15);
});

// Bags a touch cheaper, but bulk within 10%: the "one load, less lifting" nudge.
test("flags bulk within 10 percent even when bags win", function () {
  var r = B.estimate({
    shape: "rect",
    length: { value: 4, unit: "m" }, width: { value: 2.5, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch",
    bagPrice: 4, bulkSize: { value: 0.7, unit: "m3" }, bulkPrice: 43
  });
  assert.strictEqual(r.compare.bagsCost, 40);
  assert.strictEqual(r.compare.bulkCost, 43);
  assert.strictEqual(r.compare.cheaper, "bags");
  assert.strictEqual(r.compare.within, true);
  assert.strictEqual(r.compare.saving, 3);
});

// No price comparison without both a bag price and a bulk size + price.
test("no comparison without prices", function () {
  var r = B.estimate({
    shape: "rect", length: { value: 2, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch"
  });
  assert.strictEqual(r.compare, null);
});

// Depth below the material's band is nudged, not refused.
test("too-thin mulch is flagged low", function () {
  var r = B.estimate({
    shape: "rect", length: { value: 2, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 2, unit: "cm" }, material: "mulch"
  });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.depthFlag, "low");
});

test("too-deep mulch is flagged high", function () {
  var r = B.estimate({
    shape: "rect", length: { value: 2, unit: "m" }, width: { value: 2, unit: "m" },
    depth: { value: 15, unit: "cm" }, material: "mulch"
  });
  assert.strictEqual(r.depthFlag, "high");
});

// A typed density overrides the material default (a supplier's own figure).
test("a typed density overrides the default", function () {
  var r = B.estimate({
    shape: "rect", length: { value: 2, unit: "m" }, width: { value: 1, unit: "m" },
    depth: { value: 10, unit: "cm" }, material: "mulch", density: 0.5
  });
  assert.strictEqual(r.density, 0.5);
  assert.strictEqual(r.weightT, 0.1); // 0.2 m3 x 0.5
});

// A typed bag size changes the bag count.
test("a typed bag size changes the bag count", function () {
  var r = B.estimate({
    shape: "rect", length: { value: 4, unit: "m" }, width: { value: 2.5, unit: "m" },
    depth: { value: 5, unit: "cm" }, material: "mulch", bagSize: { value: 100, unit: "L" }
  });
  assert.strictEqual(r.bagM3, 100);
  assert.strictEqual(r.bags, 5); // 500 L / 100 L
});

// Bad inputs are refused, not guessed.
test("refuses a missing area or depth", function () {
  assert.strictEqual(B.estimate({ shape: "rect", length: { value: 0, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 5, unit: "cm" } }).reason, "bad-area");
  assert.strictEqual(B.estimate({ shape: "rect", length: { value: 2, unit: "m" }, width: { value: 2, unit: "m" }, depth: { value: 0, unit: "cm" } }).reason, "bad-depth");
});

// The share link round-trips the job.
test("pack and unpack round-trip the state", function () {
  var state = { shape: "rect", l: "4", w: "2.5", d: "5", m: "mulch" };
  assert.deepStrictEqual(B.unpack(B.pack(state)), state);
  assert.strictEqual(B.unpack("not valid base64 @@@"), null);
});

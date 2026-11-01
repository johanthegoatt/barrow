# Barrow

**How much mulch, topsoil, compost, gravel or sand to buy for a bed or a patch of ground.**

Live: [barrow.johanthegoat.xyz](https://barrow.johanthegoat.xyz)

Bulk garden materials are sold a dozen ways, by the litre, the bag, the cubic foot, the cubic yard or the bulk bag, but underneath it's one sum: the **area** you're covering times how **deep** you want it. Barrow does that, then the parts people trip on.

Put in the area (a rectangle, a border strip or a circle), the depth, and what you're laying. It tells you:

- the **volume to buy**, in m³ and litres (or cubic feet and cubic yards),
- what it'll **weigh**, so you know if it's a car-boot job or a delivery,
- how many **bags** or **barrow-loads** that is,
- a **depth check** against the sensible band for that material, and
- if you add prices, whether a **pile of bags or one bulk load** comes out cheaper.

Everything is worked out in your browser. Nothing you type is uploaded, and a shareable link keeps the whole job in the URL fragment (which the browser never sends to a server).

## The numbers behind it

- **Volume = area × depth**, then divided by `1 − settle` so a loose load beds down to the finished depth. Gravel carries the biggest settle allowance (it compacts), topsoil and sand a little, mulch and compost none.
- **Depth bands** follow garden-extension guidance: most beds are mulched **2–3 in (5–8 cm)**, coarse mulch up to **4 in (10 cm)** ([UF/IFAS](https://ffl.ifas.ufl.edu/about-ffl/9-principles/principle-4-mulch), [Illinois Extension](https://extension.illinois.edu/)); fresh topsoil goes **4 in (10 cm)** and up; gravel paths are laid about **2 in (5 cm)**. Barrow only nudges you outside the band, it never refuses a figure.
- **Weight = volume × density.** Typical loose densities: mulch ~0.40, bark ~0.35, compost ~0.60, topsoil ~1.30, gravel/sand ~1.60 tonnes per m³. A cubic metre of gravel is well over a tonne, so Barrow flags the heavy loads.
- **Bags vs bulk:** the bag count × a bag price against the bulk loads needed × a bulk price. When bags win but a single bulk load is within 10%, Barrow still mentions it, because one load is far less lifting.

Densities and bag sizes vary from yard to yard (bulk-bag volumes especially), so these are **planning figures**. Every density and bag size is editable, and the tool says to confirm the weight and the bag size with your own supplier before ordering.

## Running it

It's a static page. Open `index.html`, or serve the folder with any static server.

```
npm test   # runs the engine tests with node --test, no dependencies
```

The engine (`src/core.js`) has no DOM in it, so the same file runs in the page and under the tests. The page glue is in `src/app.js`, and Tip the wheelbarrow lives in `src/tip.js`.

## Tip

Tip is the wheelbarrow in the corner. Tap for a hint that fits where you are in the form; Tip smiles at a sensible order, strains at a load heavy enough to need a delivery, and looks unsure when the depth is thin or piled on too deep. Tap away and Tip tucks out of the way; everything Tip says also goes to a screen reader, and the animation stops under reduced-motion.

## Licence

MIT.

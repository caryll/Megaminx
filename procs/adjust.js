"use strict";

const Transform = require("../geometry/transform");

async function adjustGlyphs(ctx, demand, _tfm) {
	const font = this.items[demand];
	for (const gid in font.glyf) {
		let glyph = font.glyf[gid];
		if (!glyph.contours) continue;
		glyph.transform(Transform.from(_tfm instanceof Function ? _tfm(glyph) : _tfm));
	}
}

module.exports = adjustGlyphs;

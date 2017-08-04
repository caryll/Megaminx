"use strict";

const Transform = require("../geometry/transform");

async function adjustGlyphs(ctx, demand, _tfm) {
	const font = this.items[demand];
	const tfm = Transform.from(_tfm);
	for (const gid in font.glyf) {
		let glyph = font.glyf[gid];
		if (!glyph.contours) continue;
		for (var j = 0; j < glyph.contours.length; j++) {
			let contour = glyph.contours[j];
			for (var k = 0; k < contour.length; k++) {
				tfm.applyTo(contour[k]);
			}
		}
	}
}

module.exports = adjustGlyphs;

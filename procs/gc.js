"use strict";

// Garbage collection

const mark = require("./mark");
const { kvfilter } = require("../support/kvfns");

module.exports = async function(ctx, target, options) {
	const font = this.items[target];
	for (let passes = 0; passes < 16; passes++) {
		let lut = mark.call(
			this,
			ctx,
			target,
			Object.assign({}, options, { cmap: () => true, cmap_uvs: () => true })
		);

		let na = 0;
		let nk = 0;
		for (let g in font.glyf) {
			na++;
		}
		let g1 = {};
		for (let g in font.glyf) {
			if (lut[g] === true) {
				g1[g] = font.glyf[g];
				nk++;
			}
		}
		font.glyf = g1;
		if (nk >= na) break;
	}
	if (font.TSI_23) {
		font.TSI_23.glyphs = kvfilter(font.TSI_23.glyphs, (k, v) => font.glyf[k]);
	}
	if (font.TSI5) {
		font.TSI5 = kvfilter(font.TSI5, (k, v) => font.glyf[k]);
	}
};

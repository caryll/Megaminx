"use strict";

// Garbage collection

function mark(lut, obj) {
	if (!obj) return;
	if (typeof obj === "string") {
		lut[obj] = true;
	} else if (Array.isArray(obj)) {
		for (let j = 0; j < obj.length; j++) {
			mark(lut, obj[j]);
		}
	} else if (typeof obj === "object") {
		for (let k in obj) {
			mark(lut, k);
			mark(lut, obj[k]);
		}
	}
}

module.exports = async function(ctx, target) {
	const font = this.items[target];
	for (let passes = 0; passes < 16; passes++) {
		let lut = {};
		mark(lut, font.cmap);
		mark(lut, font.cmap_uvs);
		mark(lut, font.GSUB);
		// mark(lut, font.GPOS);
		if (font.glyph_order) {
			mark(lut, font.glyph_order[0]);
		}

		let na = 0;
		let nk = 0;
		for (let g in font.glyf) {
			if (!font.glyf[g]) continue;
			mark(lut, font.glyf[g].references);
			na++;
		}
		let g1 = {};
		for (let g in font.glyf) {
			if (lut[g] === true) {
				g1[g] = font.glyf[g];
				nk++;
			} else {
				console.log("    Megaminx Glyph GC : Removed unreachable glyph", g, ".");
			}
		}
		console.log("  Megaminx Glyph GC :", na, "->", nk);
		font.glyf = g1;
		if (nk >= na) break;
	}
};

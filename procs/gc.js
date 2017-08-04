"use strict";

// Garbage collection

const { kvfilter, vmap, kvmap } = require("../support/kvfns");

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

function markSubtable(lut, type, st) {
	switch (type) {
		case "gsub_single":
		case "gsub_multi":
		case "gsub_alternate":
			for (let k in st) if (lut[k]) mark(lut, st[k]);
			break;
		default:
			mark(lut, st);
			break;
	}
}

module.exports = async function(ctx, target) {
	const font = this.items[target];
	for (let passes = 0; passes < 16; passes++) {
		let lut = {};
		let lutn = 0;
		do {
			lutn = Object.keys(lut).length;
			if (font.glyph_order) {
				mark(lut, font.glyph_order[0]);
			}
			mark(lut, font.cmap);
			mark(lut, font.cmap_uvs);
			if (font.GSUB) {
				for (let l in font.GSUB.lookups) {
					const lookup = font.GSUB.lookups[l];
					if (lookup && lookup.subtables) {
						for (let st of lookup.subtables) {
							markSubtable(lut, lookup.type, st);
						}
					}
				}
			}
			let lutn1 = Object.keys(lut).length;
			if (lutn1 === lutn) break;
		} while (true);

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
				process.stderr.write(`    Megaminx Glyph GC : Removed unreachable glyph ${g}\n`);
			}
		}
		process.stderr.write(`  Megaminx Glyph GC : ${na} -> ${nk}\n`);
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

"use strict";

// Glyph marker

const { kvfilter, vmap, kvmap } = require("../support/kvfns");
function mark(lut, obj, f) {
	if (!obj) return;
	if (typeof obj === "string") {
		if (f && !f(obj)) return;
		lut[obj] = true;
	} else if (Array.isArray(obj)) {
		for (let j = 0; j < obj.length; j++) {
			if (f && !f(j, obj[j])) continue;
			mark(lut, obj[j]);
		}
	} else if (typeof obj === "object") {
		for (let k in obj) {
			if (f && !f(k, obj[k])) continue;
			mark(lut, k);
			mark(lut, obj[k]);
		}
	}
}

function markSubtable(lut, type, st, options) {
	switch (type) {
		case "gsub_single":
		case "gsub_multi":
			for (let k in st) if (lut[k]) mark(lut, st[k]);
			break;
		case "gsub_alternate":
			if (options.ignoreAltSub) break;
			for (let k in st) if (lut[k]) mark(lut, st[k]);
			break;
		case "gsub_ligature":
			for (let sub of st.substitutions) {
				let check = true;
				for (let g of sub.from) {
					if (!lut[g]) {
						check = false;
					}
				}
				if (check) mark(lut, sub.to);
			}
			break;
		case "gsub_chaining":
			// gsub-chaining uses external LUTs
			// so ignore glyphs in the <match> part
			break;
		default:
			mark(lut, st);
			break;
	}
}

module.exports = function(ctx, target, options) {
	const font = this.items[target];

	options = options || {};
	let lut = {};
	let lutn = 0;
	do {
		lutn = Object.keys(lut).length;
		if (font.glyph_order) {
			mark(lut, font.glyph_order[0]);
		}
		mark(lut, font.cmap, options.cmap || (() => false));
		mark(lut, font.cmap_uvs, options.cmap_uvs || (() => false));
		if (font.GSUB) {
			for (let l in font.GSUB.lookups) {
				const lookup = font.GSUB.lookups[l];
				if (lookup && lookup.subtables) {
					for (let st of lookup.subtables) {
						markSubtable(lut, lookup.type, st, options || {});
					}
				}
			}
		}
		if (options && options.mustKeep) {
			mark(lut, options.mustKeep);
		}
		let lutn1 = Object.keys(lut).length;
		if (lutn1 === lutn) break;
	} while (true);
	for (let g in font.glyf) {
		if (!font.glyf[g]) continue;
		mark(lut, font.glyf[g].references);
	}
	return lut;
};

"use strict";

exports.subset = async function(ctx, target, f) {
	const font = this.items[target];
	font.GSUB = {
		languages: {},
		features: {},
		lookups: {}
	};
	font.GPOS = {
		languages: {},
		features: {},
		lookups: {}
	};
	font.GDEF = {};

	let glyf = {};
	let cmap = {};

	for (let k in font.cmap) {
		const u = k - 0;
		if (!f(u)) continue;
		let gid = font.cmap[k];
		if (!font.glyf[gid]) continue;
		cmap[k] = gid;
		glyf[gid] = font.glyf[gid];
	}

	const gid0 = font.glyph_order[0];
	if (!glyf[gid0]) {
		if (font.glyf[gid0]) {
			glyf[gid0] = font.glyf[gid0];
		} else {
			glyf[gid0] = {
				advanceWidth: 0,
				contours: []
			};
		}
	}
	font.glyf = glyf;
	font.cmap = cmap;
	font.glyph_order = [gid0];
};

exports.accept = x => true;
exports.not = f => x => !f(x);
exports.all = (...fs) => x => {
	for (let f of fs)
		if (!f(x)) return false;
	return true;
};
exports.either = (...fs) => x => {
	for (let f of fs)
		if (f(x)) return true;
	return false;
};
exports.between = (begin, end) => x => x >= begin && x <= end;
exports.oneof = items => x => {
	for (let item of items) {
		let u = typeof item === "string" ? item.codePointAt(0) : item;
		if (x === u) return true;
	}
	return false;
};

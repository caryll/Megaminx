"use strict";
const mergeOTLTables = require("./mergeOTL");

async function CompositeAbove(ctx, target, majorName, sideName, config) {
	config = config || {};
	const major = this.items[majorName];
	const side = this.items[sideName];
	if (!major) {
		this.remove(sideName);
		this.remove(majorName);
		this.introduce(target, side);
		return;
	}
	const gid0 = side.glyph_order[0];
	// Add new cmaps
	for (const unicode in side.cmap) {
		if (unicode - 0 <= 0x20 || !side.cmap[unicode] || side.cmap[unicode] === gid0) continue;
		major.cmap[unicode] = side.cmap[unicode];
	}
	// Add new cmap UVS assignments
	if (side.cmap_uvs) {
		if (!major.cmap_uvs) major.cmap_uvs = {};
		for (const key in side.cmap_uvs) {
			if (!side.cmap_uvs[key] || side.cmap_uvs[key] === gid0) continue;
			major.cmap_uvs[key] = side.cmap_uvs[key];
		}
	}
	// Add new glyphs
	for (const gid in side.glyf) {
		if (gid === gid0) continue;
		major.glyf[gid] = side.glyf[gid];
		if (major.TSI_23 && major.TSI_23.glyphs && side.TSI_23 && side.TSI_23.glyphs) {
			major.TSI_23.glyphs[gid] = side.TSI_23.glyphs[gid];
		}
	}
	if (config.mergeOTL) {
		mergeOTLTables(major.GSUB, side.GSUB, true);
		mergeOTLTables(major.GPOS, side.GPOS, true);
	}
	// Change name
	this.remove(side);
	this.remove(major);
	this.introduce(target, major);
}

module.exports = CompositeAbove;

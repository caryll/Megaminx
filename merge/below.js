"use strict";
const mergeOTLTables = require("./mergeOTL");

async function CompositeBelow(ctx, target, majorName, sideName, config) {
	config = config || {};
	const major = this.items[majorName];
	const side = this.items[sideName];
	if (!major) {
		this.remove(sideName);
		this.remove(majorName);
		this.introduce(target, side);
		return;
	}
	// Add new cmaps
	for (const unicode in side.cmap) {
		if (major.cmap[unicode]) continue;
		major.cmap[unicode] = side.cmap[unicode];
	}
	// Add new cmap UVS assignments
	if (side.cmap_uvs) {
		if (!major.cmap_uvs) major.cmap_uvs = {};
		for (const key in side.cmap_uvs) {
			if (major.cmap_uvs[key]) continue;
			major.cmap_uvs[key] = side.cmap_uvs[key];
		}
	}
	// Add new glyphs
	for (const gid in side.glyf) {
		major.glyf[gid] = side.glyf[gid];
		if (major.TSI_23 && major.TSI_23.glyphs && side.TSI_23 && side.TSI_23.glyphs) {
			major.TSI_23.glyphs[gid] = side.TSI_23.glyphs[gid];
		}
	}
	if (config.mergeOTL) {
		mergeOTLTables(major.GSUB, side.GSUB, false);
		mergeOTLTables(major.GPOS, side.GPOS, false);
	}
	// Change name
	this.remove(sideName);
	this.remove(majorName);
	this.introduce(target, major);
}

module.exports = CompositeBelow;

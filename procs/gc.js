"use strict";

// Garbage collection

const mark = require("./mark");
const { kvfilter } = require("../support/kvfns");

// markFeature
function filterFeature(table, options) {
	if (!table) return;
	options = options || {};
	const visibleLanguages = new Set();
	const visibleFeatures = new Set();
	const visibleLookups = new Set();
	for (let lid in table.languages) {
		const lang = table.languages[lid];
		if (!lang) continue;
		if (options.isValidLang && !options.isValidLang(lid, lang)) continue;
		visibleLanguages.add(lid);
		if (lang.requiredFeature && table.features[lang.requiredFeature]) {
			visibleFeatures.add(lang.requiredFeature);
		}
		if (!lang.features) lang.features = [];
		for (let f of lang.features) {
			if (!table.features[f]) continue;
			visibleFeatures.add(f);
		}
	}
	table.languages = kvfilter(table.languages, k => visibleLanguages.has(k));
	table.features = kvfilter(table.features, k => visibleFeatures.has(k));
	for (let fid in table.features) {
		if (!table.features[fid]) continue;
		if (options.isValidFeature && !options.isValidFeature(fid, table.features[fid])) continue;
		for (let lutid of table.features[fid]) {
			if (!table.lookups[lutid]) continue;
			visibleLookups.add(lutid);
		}
	}
	do {
		const nA = visibleLookups.size;
		for (let lid in table.lookups) {
			const lut = table.lookups[lid];
			if (!lut || !visibleLookups.has(lid)) continue;
			switch (lut.type) {
				case "gsub_chaining":
				case "gpos_chaining":
					for (let rule of lut.subtables) {
						for (let application of rule.apply) {
							visibleLookups.add(application.lookup);
						}
					}
					break;
				default:
					break;
			}
		}
		const nK = visibleLookups.size;
		if (nK >= nA) break;
	} while (true);
	table.lookups = kvfilter(table.lookups, k => visibleLookups.has(k));
}

module.exports = async function(ctx, target, options) {
	const font = this.items[target];
	filterFeature(font.GSUB, options);
	filterFeature(font.GPOS, options);
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

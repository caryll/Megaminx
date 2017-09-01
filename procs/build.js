"use strict";

const child_process = require("child_process");
const stringifyToStream = require("../support/stringifyToStream");
const which = require("which");
const fs = require("fs-extra");
const path = require("path");

function cppm(cp) {
	return new Promise(function(resolve, reject) {
		cp.on("close", code => {
			if (code !== 0) {
				reject(code);
			} else {
				resolve(code);
			}
		});
	});
}

function sanityFeatures(table) {
	if (!table) return;
	const allfeats = {};
	for (let lid in table.languages) {
		const lang = table.languages[lid];
		if (lang.requiredFeature && table.features[lang.requiredFeature]) {
			allfeats[lang.requiredFeature + "#RF#" + lid] = table.features[lang.requiredFeature];
			lang.requiredFeature = lang.requiredFeature + "#RF#" + lid;
		}
		let tagmap = {};
		if (!lang.features) lang.features = [];
		for (let f of lang.features) {
			if (!table.features[f]) continue;
			const tag = f.slice(0, 4);
			if (!tagmap[tag]) tagmap[tag] = [];
			tagmap[tag] = [...tagmap[tag], ...table.features[f]];
		}
		lang.features = [];
		for (let tag in tagmap) {
			const fn = tag + "#FEAT#" + lid;
			allfeats[fn] = tagmap[tag];
			lang.features.push(fn);
		}
	}
	table.features = allfeats;
}

class Ordering {
	constructor(gname, pri, val) {
		this.gname = gname;
		this.pri = pri;
		this.val = val;
	}
	compareTo(that) {
		if (this.pri === that.pri) {
			return this.val - that.val;
		} else {
			return this.pri - that.pri;
		}
	}
}

function assignOrder(m, gid, pri, val) {
	if (!m.has(gid)) {
		m.set(gid, new Ordering(gid, pri, val));
	}
}

const PRI_GORD = 0;
const PRI_CMAP = 1;
const PRI_GLYF = 2;

function decideGlyphOrder(font, ignoreOld) {
	const m = new Map();
	// priority 0 : existing GlyphOrder
	if (font.glyph_order && !ignoreOld) {
		for (let j = 0; j < font.glyph_order.length; j++) {
			if (!font.glyph_order[j]) continue;
			if (!font.glyf[font.glyph_order[j]]) continue;
			assignOrder(m, font.glyph_order[j], PRI_GORD, j);
		}
	}
	if (font.cmap) {
		for (let u in font.cmap) {
			if (!font.cmap[u]) continue;
			if (!font.glyf[font.cmap[u]]) continue;
			assignOrder(m, font.cmap[u], PRI_CMAP, u - 0);
		}
	}
	{
		let n = 0;
		for (let g in font.glyf) {
			assignOrder(m, g, PRI_GLYF, n);
			n += 1;
		}
	}
	const gord = [...m]
		.map(a => a[1])
		.sort((a, b) => a.compareTo(b))
		.map(x => x.gname);
	const gmap = new Map(gord.map((gname, j) => [gname, j]));
	return [gord, gmap];
}

function isStandardMatrix(r) {
	return r.a === 1 && r.b === 0 && r.c === 0 && r.d === 1;
}

function createTSI1(font, gmap, tsi1) {
	const tsi1_ = {};
	for (let [gname, gid] of gmap) {
		if (!font.glyf[gname].references) continue;
		if (!tsi1[gname]) continue;
		const refs = font.glyf[gname].references;
		const tsi1str = tsi1[gname]
			.replace(/\r\n?/g, "\n")
			.replace(
				/^\s*(OFFSET|SOFFSET|ANCHOR|SANCHOR|OVERLAP|NONOVERLAP|USEMYMETRICS)\[r?\].*$/gim,
				""
			)
			.replace(/^\/\* Megaminx Composite TT compiler \*\/$/gm, "")
			.replace(/\n([ \t]*\n)+/g, "\n");
		let ans = "/* Megaminx Composite TT compiler */\n";
		for (let r of refs) {
			if (r.useMyMetrics) ans += `USEMYMETRICS[]\n`;
			if (isStandardMatrix(r)) {
				ans += `OFFSET[${r.roundToGrid ? "R" : "r"}],${gmap.get(r.glyph)},${r.x},${r.y}\n`;
			} else {
				ans += `SOFFSET[${r.roundToGrid ? "R" : "r"}],${gmap.get(
					r.glyph
				)},${r.x},${r.y},${r.a},${r.b},${r.c},${r.d}\n`;
			}
		}
		ans += tsi1str;
		tsi1_[gname] = ans.replace(/\n/g, "\r");
	}
	return tsi1_;
}

async function Build(ctx, demand, options) {
	const destination = options.to;
	let t = this;
	const font = t.items[demand];
	if (font.TSI_01) {
		font.cvt_ = null;
		font.prep = null;
		font.fpgm = null;
		if (options.ignoreOrder) {
			font.TSI_01.glyphs = {};
		} else {
			// There may be VTT Talks in TSI1 for composite glyphs.
			// In this case we must generate a glyph order for it.
			const [gord, gmap] = decideGlyphOrder(font, options.optimize);
			font.glyph_order = gord;
			font.TSI_01.glyphs = createTSI1(font, gmap, font.TSI_01.glyphs || {});
		}
	}
	sanityFeatures(font.GSUB);
	sanityFeatures(font.GPOS);
	if (destination === "|") {
		if (process.stdout.setEncoding instanceof Function) process.stdout.setEncoding("utf8");
		await stringifyToStream(font, process.stdout, true);
	} else {
		const ext = path.parse(destination).ext;
		if (ext === ".ttf" || ext === ".otf") {
			const cp = child_process.spawn(which.sync("otfccbuild"), [
				...["-o", destination],
				...(options.optimize ? ["-O3"] : []),
				...(options.sign ? ["-s"] : []),
				...(options.ignoreOrder ? [] : ["-k"]),
				...(options.recalculateCharWidth ? [] : ["--keep-average-char-width"])
			]);
			cp.stderr.on("data", function(data) {
				if (options.verbose) process.stderr.write(data);
			});
			stringifyToStream(font, cp.stdin);
			await cppm(cp);
		} else {
			const out = fs.createWriteStream(destination);
			await stringifyToStream(font, out);
		}
	}
}

module.exports = Build;

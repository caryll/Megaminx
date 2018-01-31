"use strict";

const clone = require("clone");
const Point = require("../geometry/point");
const Transform = require("../geometry/transform");
const { mix } = require("../support/calc");
const Glyph = require("../types/glyph");

function unicodeOf(_u) {
	if (typeof _u === "number") {
		return _u;
	} else if (typeof _u === "string") {
		return _u.codePointAt(0);
	} else {
		throw new TypeError("UnicodeOf : must be string or number.");
	}
}

class GlyphNameFinder {
	constructor(font) {
		this.font = font;
	}
	unicode(_u, v) {
		let u = unicodeOf(_u);
		if (v) {
			if (
				this.font.cmap_uvs &&
				this.font.cmap_uvs[u + " " + v] &&
				this.font.glyf[this.font.cmap_uvs[u + " " + v]]
			) {
				return this.font.cmap_uvs[u + " " + v];
			}
		} else {
			if (this.font.cmap[u] && this.font.glyf[this.font.cmap[u]]) {
				return this.font.cmap[u];
			}
		}
	}
	u(u, v) {
		return this.unicode(u, v);
	}
	subst(feature, gn) {
		const font = this.font;
		if (!font.GSUB) return gn;
		let candidateLookups = [];
		for (let k in font.GSUB.features) {
			if (k.slice(0, 4) === feature && font.GSUB.features[k]) {
				for (let lookupid of font.GSUB.features[k]) candidateLookups.push(lookupid);
			}
		}
		for (let tid of candidateLookups) {
			let lookup = font.GSUB.lookups[tid];
			if (!lookup || lookup.type != "gsub_single" || !lookup.subtables) continue;
			for (let subtable of lookup.subtables) {
				if (subtable[gn]) {
					return subtable[gn];
				}
			}
		}
		return gn;
	}
}

class GlyphFinder {
	constructor(font, findName) {
		this.font = font;
		this.gname = findName;
	}
	glyph(gname) {
		return this.font.glyf[gname];
	}
	glyph$(gname) {
		return Glyph.fromCopy(this.font, this.glyph(gname), gname);
	}
	unicode(u, v) {
		const gn = this.gname.unicode(u, v);
		if (gn) return this.glyph(gn);
	}
	unicode$(u, v) {
		const gn = this.gname.unicode(u, v);
		if (gn) return this.glyph$(gn);
	}
	u(u, v) {
		return this.unicode(u, v);
	}
	u$(u, v) {
		return this.unicode$(u, v);
	}
}

const vsData = (function() {
	let data = {};
	for (let j = 0; j <= 16; j++) {
		data["VS" + j] = 0xfe00 + j - 1;
		data["VS0" + j] = 0xfe00 + j - 1;
		data["VS00" + j] = 0xfe00 + j - 1;
	}
	for (let j = 17; j <= 256; j++) {
		data["VS" + j] = 0xe0100 + j - 17;
		data["VS0" + j] = 0xe0100 + j - 17;
		data["VS00" + j] = 0xe0100 + j - 17;
	}
	return data;
})();

class GlyphSaver {
	constructor(font) {
		this.font = font;
	}
	_generateGlyphName() {
		return "#saver#GID#" + Object.keys(this.font.glyf).length;
	}
	async to(gname, unicode, glyph) {
		if (!gname) {
			gname = "#saver#GID#" + Object.keys(this.font.glyf).length;
		}
		this.font.glyf[gname] = glyph;
		if (unicode) {
			this.font.cmap[unicodeOf(unicode)] = gname;
		}
		return gname;
	}
	_saveN(gname) {
		if (typeof gname === "string") {
			return gname;
		} else {
			const name = this._generateGlyphName();
			this.font.glyf[name] = gname;
			return name;
		}
	}
	async encode(unicode, item) {
		const name = this._saveN(item);
		this.font.cmap[unicodeOf(unicode)] = name;
		return name;
	}
	async variant(unicode, selector, item) {
		if (!this.font.cmap_uvs) this.font.cmap_uvs = {};
		if (vsData[selector]) selector = vsData[selector];
		const name = this._saveN(item);
		this.font.cmap_uvs[unicodeOf(unicode) + " " + selector] = name;
		return name;
	}
}

class DrawingContext {
	constructor(font) {
		this.font = font;
		this.find = new GlyphFinder(font, new GlyphNameFinder(font));
		this.save = new GlyphSaver(font);
		this.em = font.head.unitsPerEm;
		this.GSUB = font.GSUB;
		this.GPOS = font.GPOS;
		this.coZ = {
			rz: (u, v) => g => g.rz(u, v),
			vrz: (u, v) => g => g.vrz(u, v),
			GlyphCenter: Glyph.prototype.center
		};
	}
	createGlyph() {
		return new Glyph(this.em);
	}
	z(x, y) {
		return new Point(x, y);
	}
	rz(rx, ry) {
		return new Point(this.em * rx, this.em * ry);
	}
	async runProc(f, ...args) {
		const r = await f.apply(this, args);
		return r;
	}
}

module.exports = async function(ctx, demand, f, ...args) {
	const font = ctx.items[demand];
	const drawingCtx = new DrawingContext(font);
	await drawingCtx.runProc(f, ...args);
};

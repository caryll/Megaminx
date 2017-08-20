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
	unicode(_u) {
		let u = unicodeOf(_u);
		if (this.font.cmap[u] && this.font.glyf[this.font.cmap[u]]) {
			return this.font.cmap[u];
		}
	}
	u(u) {
		return this.unicode(u);
	}
	subst(feature, gn) {
		const font = this.font;
		if (!font.GSUB) return gn;
		let candidateLookups = [];
		for (let k in font.GSUB.features) {
			if (k.slice(0, 4) === feature) {
				for (let lookupid of font.GSUB.features[k]) candidateLookups.push(lookupid);
			}
		}
		for (let tid of candidateLookups) {
			let lookup = font.GSUB.lookups[tid];
			if (!lookup || lookup.type != "gsub_single") continue;
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
	unicode(u) {
		const gn = this.gname.unicode(u);
		if (gn) return this.glyph(gn);
	}
	unicode$(u) {
		const gn = this.gname.unicode(u);
		if (gn) return this.glyph$(gn);
	}
	u(u) {
		return this.unicode(u);
	}
	u$(u) {
		return this.unicode$(u);
	}
}

class GlyphSaver {
	constructor(font) {
		this.font = font;
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
	async encode(unicode, gname) {
		this.font.cmap[unicodeOf(unicode)] = gname;
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

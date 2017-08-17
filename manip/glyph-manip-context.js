"use strict";

const clone = require("clone");
const Point = require("../geometry/point");
const Transform = require("../geometry/transform");
const { mix } = require("../support/calc");

class Glyph {
	constructor(em) {
		this.em = em;
		this.advanceWidth = 0;
		this.advanceHeight = 0;
		this.verticalOrigin = 0;
		this.contours = [];
		this.references = [];
	}
	unhint() {
		this.instructions = [];
	}
	transform(tfm) {
		for (let c of this.contours) {
			for (let j = 0; j < c.length; j++) {
				c[j] = tfm.applyTo(c[j]);
			}
		}
		this.unhint();
		return this;
	}
	createPoint(Z) {
		if (Z instanceof Function) {
			return Z.call(this, this);
		} else {
			return Z;
		}
	}
	rz(rx, ry) {
		return new Point(this.advanceWidth * rx, this.em * ry);
	}
	cbox() {
		let xmin = 0xffff,
			xmax = -0xffff,
			ymin = 0xffff,
			ymax = -0xffff;
		for (let contour of this.contours) {
			for (let point of contour) {
				if (point.x < xmin) xmin = point.x;
				if (point.x > xmax) xmax = point.x;
				if (point.y < ymin) ymin = point.y;
				if (point.y > ymax) ymax = point.y;
			}
		}
		return { xmin, xmax, ymin, ymax };
	}
	mixz(u, v) {
		const { xmin, xmax, ymin, ymax } = this.cbox();
		return new Point(mix(xmin, xmax, u), mix(ymin, ymax, v));
	}
	center() {
		return this.mixz(1 / 2, 1 / 2);
	}
	setWidth(w) {
		this.advanceWidth = w;
		return this;
	}
	setVerticalLayout(top, adh) {
		this.verticalOrigin = top;
		this.advanceHeight = adh;
		return this;
	}
	overlay(...thats) {
		for (let that of thats) this.contours = this.contours.concat(clone(that.contours));
		return this;
	}
	clone() {
		return clone(this);
	}
}

Glyph.from = function(font, glyph, name) {
	if (!glyph) return glyph;
	const g = new Glyph(font.head.unitsPerEm);
	Object.assign(g, copyglyph(glyph, font));
	g.sourceName = name;
	return g;
};

function copyglyph(g, f) {
	const g1 = clone(g);
	if (f && g1.references) {
		if (!g1.contours) g1.contours = [];
		for (let ref of g1.references) {
			let g2 = Glyph.from(f, f.glyf[ref.glyph], ref.glyph);
			g2.transform(new Transform(ref.a, ref.b, ref.c, ref.d, ref.x, ref.y));
			g1.contours = [...g1.contours, ...g2.contours];
		}
		g1.references = [];
	}
	return g1;
}

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
	glyph$(gname) {
		return this.font.glyf[gname];
	}
	glyph(gname) {
		return Glyph.from(this.font, this.glyph$(gname), gname);
	}
	unicode(u) {
		const gn = this.gname.unicode(u);
		if (gn) return this.glyph(gn);
	}
	u(u) {
		return this.unicode(u);
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

"use strict";

const clone = require("clone");
const Point = require("../geometry/point");
const Transform = require("../geometry/transform");
const { mix } = require("../support/calc");

class Glyph {
	constructor(em, format) {
		this.em = em;
		this.tag = null;
		this.format = format;
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
	vrz(rx, ry) {
		return new Point(this.advanceWidth * rx, this.verticalOrigin - this.advanceHeight * ry);
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
	assign(o) {
		Object.assign(this, o);
		return this;
	}
}

Glyph.from = function(font, glyph, name, format) {
	if (!glyph) return glyph;
	const g = new Glyph(font.head.unitsPerEm, format);
	Object.assign(g, glyph);
	g.sourceName = name;
	return g;
};
Glyph.fromCopy = function(font, glyph, name, format) {
	if (!glyph) return glyph;
	const g = new Glyph(font.head.unitsPerEm);
	Object.assign(g, copyglyph(glyph, font));
	g.sourceName = name;
	return g;
};

function copyglyph(g, f) {
	const g1 = clone(g);
	g1.tag = null;
	if (f && g1.references) {
		if (!g1.contours) g1.contours = [];
		for (let ref of g1.references) {
			let g2 = Glyph.fromCopy(f, f.glyf[ref.glyph], ref.glyph);
			g2.transform(new Transform(ref.a, ref.b, ref.c, ref.d, ref.x, ref.y));
			g1.contours = [...g1.contours, ...g2.contours];
		}
		g1.references = [];
	}
	return g1;
}

Glyph.formats = { CUBIC: 3, QUADRATIC: 2 };

module.exports = Glyph;

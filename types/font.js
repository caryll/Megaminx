"use strict";

const Glyph = require("./glyph");
const typoGeom = require("typo-geom");
const Z = typoGeom.OnOffGlyphPoint;

class Font {
	constructor(data) {
		data = data || {};
		Object.assign(this, data);
	}
	createGlyph(name, data, tag) {
		data = data || {};
		if (!data.contours) data.contours = [];
		if (!data.references) data.references = [];
		for (let contour of data.contours) {
			for (let j = 0; j < contour.length; j++) {
				contour[j] = new Z(contour[j].x, contour[j].y, contour[j].on);
			}
		}
		const g = Glyph.from(
			this,
			data,
			name,
			this.CFF_ ? Glyph.formats.CUBIC : Glyph.formats.QUADRATIC
		);
		g.tag = tag;
		return g;
	}
}

module.exports = Font;

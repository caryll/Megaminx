"use strict";

const Point = require("./point");

class GlyphPoint extends Point {
	constructor(x, y, on) {
		super(x, y);
		this.on = on;
	}
	clone() {
		return new GlyphPoint(this.x, this.y, this.on);
	}
}

GlyphPoint.from = function(z) {
	return new GlyphPoint(z.x, z.y, z.on);
};

module.exports = GlyphPoint;

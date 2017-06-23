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

module.exports = GlyphPoint;

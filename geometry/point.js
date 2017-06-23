"use strict";

class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	clone() {
		return new Point(this.x, this.y);
	}
}

module.exports = Point;

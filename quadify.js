"use strict";

const c2q = require("otfcc-c2q");

const arrayRotate = (function() {
	// save references to array functions to make lookup faster
	var push = Array.prototype.push, splice = Array.prototype.splice;

	return function(count) {
		var len = this.length >>> 0, // convert to uint
			count = count >> 0; // convert to int

		// convert count to value in range [0, len)
		count = (count % len + len) % len;

		// use splice.call() instead of this.splice() to make function generic
		push.apply(this, splice.call(this, 0, count));
		return this;
	};
})();

function canonicalStart(font) {
	for (const gid in font.glyf) {
		let glyph = font.glyf[gid];
		if (!glyph.contours) continue;
		for (let c of glyph.contours) {
			let zj = 0;
			for (let j = 0; j < c.length; j++) {
				if (c[j].x < c[zj].x) zj = j;
				if (c[j].x === c[zj].x && c[j].y < c[zj].y) zj = j;
			}
			arrayRotate.call(c, zj);
		}
	}
}

async function Quadify(ctx, demand) {
	const font = this.items[demand];
	c2q(font, false, true, 1);
	canonicalStart(font);
}

module.exports = Quadify;

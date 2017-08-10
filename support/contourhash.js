"use strict";
const crypto = require("crypto");
function getSHA1(text) {
	return crypto.createHash("sha1").update(text).digest("hex");
}
function hashContours(input) {
	let buf = "";
	let x = 0;
	let y = 0;
	for (let j = 0; j < input.length; j++) {
		buf += "a";
		const c = input[j];
		for (let k = 0; k < c.length; k++) {
			if (c[k].on) {
				buf += "l";
			} else {
				buf += "c";
			}
			buf += c[k].x - x + " " + (c[k].y - y);
			x = c[k].x;
			y = c[k].y;
		}
	}
	return getSHA1(buf);
}
function hashContoursVTT(input) {
	let buf = "";
	let s = false;
	let x = 0;
	let y = 0;
	for (let j = 0; j < input.length; j++) {
		buf += "a";
		const c = input[j];
		for (let k = 0; k < c.length; k++) {
			if (c[k].on) {
				buf += "l";
			} else {
				buf += "c";
			}
			if (s) {
				buf += c[k].x - x + " " + (c[k].y - y);
			} else {
				buf += "$" + (c[k].y - y);
				s = true;
			}
			x = c[k].x;
			y = c[k].y;
		}
	}
	return getSHA1(buf);
}

function HashGlyph(font, gid, cf, ir) {
	const glyph = font.glyf[gid];
	if (!glyph) return "";
	let buf = "";
	if (glyph.contours) {
		buf += "C{" + cf(glyph.contours) + "}";
	}
	if (glyph.references) {
		for (let r of glyph.references) {
			buf += "R{" + HashGlyph(font, r.glyph, cf, ir) + "}";
			buf += `[${r.x} ${r.y} ${r.a} ${r.b} ${r.c} ${r.d} ${!!r.useMyMetrics} ${ir ||
				!!r.roundToGrid}]`;
		}
	}
	return buf;
}

module.exports.hashContours = hashContours;
module.exports.hashContoursVTT = hashContoursVTT;
module.exports.HashGlyph = HashGlyph;

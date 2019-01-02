"use strict";

const typoGeom = require("typo-geom");
const Z = typoGeom.OnOffGlyphPoint;

function removeMids(contour, err) {
	for (let rounds = 0; rounds < 255; rounds++) {
		const n0 = contour.length;
		let last = contour.length - 1;
		for (let j = 0; j < contour.length - 1; j++) {
			if (
				Math.abs(contour[j].x - contour[j + 1].x) < 1 &&
				Math.abs(contour[j].y - contour[j + 1].y) < 1
			) {
				contour[j + 1].rem = true;
				contour[j].on = true;
			}
		}
		while (
			last > 0 &&
			Math.abs(contour[0].x - contour[last].x) < 1 &&
			Math.abs(contour[0].y - contour[last].y) < 1
		) {
			contour[last].rem = true;
			contour[0].on = true;
			last -= 1;
		}
		contour = contour.filter(x => !x.rem);

		last = contour.length - 1;
		for (let j = 1; j < contour.length - 1; j++) {
			if (!contour[j - 1].on && contour[j].on && !contour[j + 1].on) {
				const mx = contour[j - 1].x + contour[j + 1].x;
				const my = contour[j - 1].y + contour[j + 1].y;
				const dy = contour[j - 1].y - contour[j + 1].y;
				if (
					Math.abs(dy) >= 1 &&
					Math.abs(contour[j].x * 2 - mx) < err &&
					Math.abs(contour[j].y * 2 - my) < err
				) {
					contour[j].rem = true;
				}
			}
		}
		if (!contour[last].rem && !contour[last].on && contour[0].on && !contour[1].on) {
			const mx = contour[last].x + contour[1].x;
			const my = contour[last].y + contour[1].y;
			if (Math.abs(contour[0].x * 2 - mx) < err && Math.abs(contour[0].y * 2 - my) < err) {
				contour[0].rem = true;
			}
		}
		contour = contour.filter(x => !x.rem);
		const n = contour.length;
		if (n >= n0) break;
	}
	return contour;
}
function xprior(a, b) {
	return a.y < b.y || (a.y === b.y && ((a.on && !b.on) || (a.on === b.on && a.x < b.x)));
}

function canonicalStart(_points) {
	const points = _points.reverse().map(z => {
		z.x = Math.round(z.x * 1024) / 1024;
		z.y = Math.round(z.y * 1024) / 1024;
		return z;
	});
	let jm = 0;
	for (var j = 0; j < points.length * 2; j++) {
		if (xprior(points[j % points.length], points[jm])) {
			jm = j % points.length;
		}
	}
	return points.slice(jm).concat(points.slice(0, jm));
}

function colinear(x1, y1, x2, y2, x3, y3, err) {
	const det = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
	return det <= err && det >= -err;
}

function inspan(a, b, c) {
	if (a > c) return inspan(c, b, a);
	return a <= b && b <= c;
}

function handle(z1, z2, z3, z4, err) {
	if (
		colinear(z1.x, z1.y, z2.x, z2.y, z4.x, z4.y, err) &&
		colinear(z1.x, z1.y, z3.x, z3.y, z4.x, z4.y, err) &&
		inspan(z1.x, z2.x, z4.x) &&
		inspan(z1.y, z2.y, z4.y) &&
		inspan(z1.x, z3.x, z4.x) &&
		inspan(z1.y, z3.y, z4.y)
	) {
		return [];
	}

	const curve = new typoGeom.Curve.Bez3(z1, z2, z3, z4);
	const offPoints = typoGeom.Quadify.auto(curve, err);
	const ans = [];
	for (const z of offPoints) {
		ans.push(new Z(z.x, z.y, false));
	}
	return ans;
}

function toquad(contour, err) {
	if (contour.length === 0) return [];
	if (contour.length === 1) return [contour[0]];
	let newcontour = [];
	contour.push(new Z(contour[0].x, contour[0].y, true));
	for (let j = 0; j < contour.length; j++) {
		if (contour[j].on) {
			newcontour.push(Z.from(contour[j], !!contour[j].on));
		} else {
			const z1 = newcontour[newcontour.length - 1];
			const z2 = contour[j];
			const z3 = contour[j + 1];
			const z4 = contour[j + 2];
			const quadzs = handle(z1, z2, z3, z4, err);
			if (!quadzs) console.log(z1, z2, z3, z4);
			for (const z of quadzs) newcontour.push(z);
			newcontour.push(new Z(z4.x, z4.y, true));
			j += 2;
		}
	}
	return canonicalStart(removeMids(newcontour, err));
}

function haspt(c) {
	return c && c.length > 1;
}
function byFirstPointCoord(a, b) {
	if (!a.length) return -1;
	if (!b.length) return 1;
	let z1 = a[0];
	let z2 = b[0];
	return z1.y !== z2.y
		? z1.y - z2.y
		: z1.x !== z2.x
		? z1.x - z2.x
		: byFirstPointCoord(a.slice(1), b.slice(1));
}

function c2qContours(contours, err) {
	let ans = [];
	for (let c of contours) {
		const c1 = toquad(c, err || 1);
		if (haspt(c1)) ans.push(c1);
	}
	return ans.sort(byFirstPointCoord);
}

module.exports = function(font, err) {
	font.CFF_ = null;
	for (var k in font.glyf) {
		var g = font.glyf[k];
		if (g.contours) {
			g.contours = c2qContours(g.contours, err);
		}
		g.stemH = null;
		g.stemV = null;
		g.hintMasks = null;
		g.contourMasks = null;
	}
	font.maxp.version = 1.0;
};

module.exports.contours = c2qContours;

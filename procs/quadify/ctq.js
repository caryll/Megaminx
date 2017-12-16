const cubicToQuad = require("./ctqcore");
const Z = require("../../geometry/glyph-point");

function removeMids(contour, err) {
	for (let rounds = 0; rounds < 255; rounds++) {
		const n0 = contour.length;
		var last = contour.length - 1;
		for (var j = 0; j < contour.length - 1; j++) {
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
		for (var j = 1; j < contour.length - 1; j++) {
			if (!contour[j - 1].on && contour[j].on && !contour[j + 1].on) {
				var mx = contour[j - 1].x + contour[j + 1].x;
				var my = contour[j - 1].y + contour[j + 1].y;
				var dy = contour[j - 1].y - contour[j + 1].y;
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
			mx = contour[last].x + contour[1].x;
			my = contour[last].y + contour[1].y;
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

function quadSolve(a, b, c) {
	// a*x^2 + b*x + c = 0
	if (a === 0) {
		return b === 0 ? [] : [-c / b];
	}
	var D = b * b - 4 * a * c;
	if (D < 0) {
		return [];
	} else if (D === 0) {
		return [-b / (2 * a)];
	}
	var DSqrt = Math.sqrt(D);
	return [(-b - DSqrt) / (2 * a), (-b + DSqrt) / (2 * a)];
}

function colinear(x1, y1, x2, y2, x3, y3, err) {
	const det = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2);
	return det <= err && det >= -err;
}

function inspan(a, b, c) {
	if (a > c) return inspan(c, b, a);
	return a <= b && b <= c;
}

function splitAt(x1, y1, x2, y2, x3, y3, x4, y4, t) {
	var u = 1 - t,
		v = t;

	var bx = x1 * u + x2 * v;
	var sx = x2 * u + x3 * v;
	var fx = x3 * u + x4 * v;
	var cx = bx * u + sx * v;
	var ex = sx * u + fx * v;
	var dx = cx * u + ex * v;

	var by = y1 * u + y2 * v;
	var sy = y2 * u + y3 * v;
	var fy = y3 * u + y4 * v;
	var cy = by * u + sy * v;
	var ey = sy * u + fy * v;
	var dy = cy * u + ey * v;

	return [[x1, y1, bx, by, cx, cy, dx, dy], [dx, dy, ex, ey, fx, fy, x4, y4]];
}
function splitAtTs(x1, y1, x2, y2, x3, y3, x4, y4, ts) {
	if (!ts.length) return [[x1, y1, x2, y2, x3, y3, x4, y4]];
	let s = splitAt(x1, y1, x2, y2, x3, y3, x4, y4, ts[0]);
	if (ts.length === 1) {
		return s;
	} else {
		return [s[0]].concat(splitAtTs(...s[1], ts.slice(1)));
	}
}

function fin(t) {
	return t > 0.001 && t < 0.999;
}
function substraction(x, y) {
	return x - y;
}

function getSplitAtXY(x1, y1, x2, y2, x3, y3, x4, y4, splitAtX, splitAtY) {
	const ax = 3 * (-x1 + 3 * x2 - 3 * x3 + x4);
	const bx = 6 * (x1 - 2 * x2 + x3);
	const cx = 3 * (x2 - x1);
	const ay = 3 * (-y1 + 3 * y2 - 3 * y3 + y4);
	const by = 6 * (y1 - 2 * y2 + y3);
	const cy = 3 * (y2 - y1);
	let ts = [];
	if (splitAtX) {
		ts = ts.concat(quadSolve(ax, bx, cx));
	}
	if (splitAtY) {
		ts = ts.concat(quadSolve(ay, by, cy));
	}
	return splitAtTs(x1, y1, x2, y2, x3, y3, x4, y4, ts.filter(fin).sort(substraction));
}

function handle(z1, z2, z3, z4, splitAtX, splitAtY, err) {
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
	const segs = getSplitAtXY(z1.x, z1.y, z2.x, z2.y, z3.x, z3.y, z4.x, z4.y, splitAtX, splitAtY);
	const ss = [];
	for (let s of segs) {
		let a = cubicToQuad(...s, err);
		for (let j = ss.length ? 2 : 0; j < a.length; j++) {
			ss.push(a[j]);
		}
	}
	return ss;
}

function toquad(contour, splitAtX, splitAtY, err) {
	if (contour.length === 0) return [];
	if (contour.length === 1) return [contour[0]];
	var newcontour = [];
	contour.push(new Z(contour[0].x, contour[0].y, true));
	for (var j = 0; j < contour.length; j++) {
		if (contour[j].on) {
			newcontour.push(Z.from(contour[j]));
		} else {
			var z1 = newcontour[newcontour.length - 1];
			var z2 = contour[j];
			var z3 = contour[j + 1];
			var z4 = contour[j + 2];
			var quadzs = handle(z1, z2, z3, z4, splitAtX, splitAtY, err);
			var on = false;

			var mx = (z1.x + z4.x) / 2;
			var my = (z1.y + z4.y) / 2;
			var bw = Math.abs(z4.x - z1.x);
			var bh = Math.abs(z4.y - z1.y);
			for (var k = 2; k < quadzs.length - 2; k += 2) {
				var cx = quadzs[k];
				var cy = quadzs[k + 1];
				newcontour.push(new Z(cx, cy, on));
				on = !on;
			}
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
		: z1.x !== z2.x ? z1.x - z2.x : byFirstPointCoord(a.slice(1), b.slice(1));
}

function c2qContours(contours, splitAtX, splitAtY, err) {
	let ans = [];
	for (let c of contours) {
		const c1 = toquad(c, splitAtX, splitAtY, err || 1);
		if (haspt(c1)) ans.push(c1);
	}
	return ans.sort(byFirstPointCoord);
}

module.exports = function(font, splitAtX, splitAtY, err) {
	font.CFF_ = null;
	for (var k in font.glyf) {
		var g = font.glyf[k];
		if (g.contours) {
			g.contours = c2qContours(g.contours, splitAtX, splitAtY, err);
		}
		g.stemH = null;
		g.stemV = null;
		g.hintMasks = null;
		g.contourMasks = null;
	}
	font.maxp.version = 1.0;
};

module.exports.contours = c2qContours;

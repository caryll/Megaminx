/****

(The MIT License)

Copyright (C) 2015 by Vitaly Puzrin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

****/

"use strict";

function Point(x, y) {
	this.x = x;
	this.y = y;
}

Point.prototype.add = function(point) {
	return new Point(this.x + point.x, this.y + point.y);
};

Point.prototype.sub = function(point) {
	return new Point(this.x - point.x, this.y - point.y);
};

Point.prototype.mul = function(value) {
	return new Point(this.x * value, this.y * value);
};

Point.prototype.div = function(value) {
	return new Point(this.x / value, this.y / value);
};

Point.prototype.dist = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};

Point.prototype.sqr = function() {
	return this.x * this.x + this.y * this.y;
};

Point.prototype.dot = function(point) {
	return this.x * point.x + this.y * point.y;
};

function calcPowerCoefficients(p1, c1, c2, p2) {
	// point(t) = p1*(1-t)^3 + c1*t*(1-t)^2 + c2*t^2*(1-t) + p2*t^3 = a*t^3 + b*t^2 + c*t + d
	// for each t value, so
	// a = (p2 - p1) + 3 * (c1 - c2)
	// b = 3 * (p1 + c2) - 6 * c1
	// c = 3 * (c1 - p1)
	// d = p1
	let a = p2.sub(p1).add(c1.sub(c2).mul(3));
	let b = p1
		.add(c2)
		.mul(3)
		.sub(c1.mul(6));
	let c = c1.sub(p1).mul(3);
	let d = p1;
	return [a, b, c, d];
}

function calcPoint(a, b, c, d, t) {
	// a*t^3 + b*t^2 + c*t + d = ((a*t + b)*t + c)*t + d
	return a
		.mul(t)
		.add(b)
		.mul(t)
		.add(c)
		.mul(t)
		.add(d);
}

function calcPointQuad(a, b, c, t) {
	// a*t^2 + b*t + c = (a*t + b)*t + c
	return a
		.mul(t)
		.add(b)
		.mul(t)
		.add(c);
}

function calcPointDerivative(a, b, c, d, t) {
	// d/dt[a*t^3 + b*t^2 + c*t + d] = 3*a*t^2 + 2*b*t + c = (3*a*t + 2*b)*t + c
	return a
		.mul(3 * t)
		.add(b.mul(2))
		.mul(t)
		.add(c);
}

function quadSolve(a, b, c) {
	// a*x^2 + b*x + c = 0
	if (a === 0) {
		return b === 0 ? [] : [-c / b];
	}
	let D = b * b - 4 * a * c;
	if (D < 0) {
		return [];
	} else if (D === 0) {
		return [-b / (2 * a)];
	}
	let DSqrt = Math.sqrt(D);
	return [(-b - DSqrt) / (2 * a), (-b + DSqrt) / (2 * a)];
}

function cubicRoot(x) {
	return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3);
}

function cubicSolve(a, b, c, d) {
	// a*x^3 + b*x^2 + c*x + d = 0
	if (a === 0) {
		return quadSolve(b, c, d);
	}
	// solve using Cardan's method, which is described in paper of R.W.D. Nickals
	// http://www.nickalls.org/dick/papers/maths/cubic1993.pdf (doi:10.2307/3619777)
	let xn = -b / (3 * a); // point of symmetry x coordinate
	let yn = ((a * xn + b) * xn + c) * xn + d; // point of symmetry y coordinate
	let deltaSq = (b * b - 3 * a * c) / (9 * a * a); // delta^2
	let hSq = 4 * a * a * Math.pow(deltaSq, 3); // h^2
	let D3 = yn * yn - hSq;
	if (D3 > 0) {
		// 1 real root
		let D3Sqrt = Math.sqrt(D3);
		return [xn + cubicRoot((-yn + D3Sqrt) / (2 * a)) + cubicRoot((-yn - D3Sqrt) / (2 * a))];
	} else if (D3 === 0) {
		// 2 real roots
		let delta1 = cubicRoot(yn / (2 * a));
		return [xn - 2 * delta1, xn + delta1];
	}
	// 3 real roots
	let theta = Math.acos(-yn / Math.sqrt(hSq)) / 3;
	let delta = Math.sqrt(deltaSq);
	return [
		xn + 2 * delta * Math.cos(theta),
		xn + 2 * delta * Math.cos(theta + Math.PI * 2 / 3),
		xn + 2 * delta * Math.cos(theta + Math.PI * 4 / 3)
	];
}

function minDistanceToQuad(point, p1, c1, p2) {
	// f(t) = (1-t)^2 * p1 + 2*t*(1 - t) * c1 + t^2 * p2 = a*t^2 + b*t + c, t in [0, 1],
	// a = p1 + p2 - 2 * c1
	// b = 2 * (c1 - p1)
	// c = p1; a, b, c are vectors because p1, c1, p2 are vectors too
	// The distance between given point and quadratic curve is equal to
	// sqrt((f(t) - point)^2), so these expression has zero derivative by t at points where
	// (f'(t), (f(t) - point)) = 0.
	// Substituting quadratic curve as f(t) one could obtain a cubic equation
	// e3*t^3 + e2*t^2 + e1*t + e0 = 0 with following coefficients:
	// e3 = 2 * a^2
	// e2 = 3 * a*b
	// e1 = (b^2 + 2 * a*(c - point))
	// e0 = (c - point)*b
	// One of the roots of the equation from [0, 1], or t = 0 or t = 1 is a value of t
	// at which the distance between given point and quadratic Bezier curve has minimum.
	// So to find the minimal distance one have to just pick the minimum value of
	// the distance on set {t = 0 | t = 1 | t is root of the equation from [0, 1] }.

	let a = p1.add(p2).sub(c1.mul(2));
	let b = c1.sub(p1).mul(2);
	let c = p1;
	let e3 = 2 * a.sqr();
	let e2 = 3 * a.dot(b);
	let e1 = b.sqr() + 2 * a.dot(c.sub(point));
	let e0 = c.sub(point).dot(b);
	let candidates = cubicSolve(e3, e2, e1, e0)
		.filter(function(t) {
			return t > 0 && t < 1;
		})
		.concat([0, 1]);

	let minDistance = 1e9;
	for (let i = 0; i < candidates.length; i++) {
		let distance = calcPointQuad(a, b, c, candidates[i])
			.sub(point)
			.dist();
		if (distance < minDistance) {
			minDistance = distance;
		}
	}
	return minDistance;
}

function processSegment(a, b, c, d, t1, t2, check) {
	// Find a single control point for given segment of cubic Bezier curve
	// These control point is an interception of tangent lines to the boundary points
	// Let's denote that f(t) is a vector function of parameter t that defines the cubic Bezier curve,
	// f(t1) + f'(t1)*z1 is a parametric equation of tangent line to f(t1) with parameter z1
	// f(t2) + f'(t2)*z2 is the same for point f(t2) and the vector equation
	// f(t1) + f'(t1)*z1 = f(t2) + f'(t2)*z2 defines the values of parameters z1 and z2.
	// Defining fx(t) and fy(t) as the x and y components of vector function f(t) respectively
	// and solving the given system for z1 one could obtain that
	//
	//      -(fx(t2) - fx(t1))*fy'(t2) + (fy(t2) - fy(t1))*fx'(t2)
	// z1 = ------------------------------------------------------.
	//            -fx'(t1)*fy'(t2) + fx'(t2)*fy'(t1)
	//
	// Let's assign letter D to the denominator and note that if D = 0 it means that the curve actually
	// is a line. Substituting z1 to the equation of tangent line to the point f(t1), one could obtain that
	// cx = [fx'(t1)*(fy(t2)*fx'(t2) - fx(t2)*fy'(t2)) + fx'(t2)*(fx(t1)*fy'(t1) - fy(t1)*fx'(t1))]/D
	// cy = [fy'(t1)*(fy(t2)*fx'(t2) - fx(t2)*fy'(t2)) + fy'(t2)*(fx(t1)*fy'(t1) - fy(t1)*fx'(t1))]/D
	// where c = (cx, cy) is the control point of quadratic Bezier curve.

	const as = calcPoint(a, b, c, d, t1);
	const bs = calcPoint(a, b, c, d, t2);
	const ad = calcPointDerivative(a, b, c, d, t1);
	const bd = calcPointDerivative(a, b, c, d, t2);
	const D = ad.x * bd.y - ad.y * bd.x;
	if (check) {
		if (Math.abs(D) < 1e-8) return null;
		const dx = bs.x - as.x;
		const dy = bs.y - as.y;
		const u = -(dy * bd.x - dx * bd.y) / D;
		const v = -(dy * ad.x - dx * ad.y) / D;
		if (u > 0 && v < 0) {
			return [as, as.add(ad.mul(u)), bs];
		} else {
			return null;
		}
	} else {
		if (Math.abs(D) < 1e-8) return [as, as.add(bs).div(2), bs];
		const u = (as.y * bd.x + bd.y * bs.x - bs.y * bd.x - bd.y * as.x) / D;
		return [as, as.add(ad.mul(u)), bs];
	}
}

const SAMPLES = 16;

function isSegmentApproximationClose(a, b, c, d, tmin, tmax, p1, c1, p2, errorBound) {
	// a,b,c,d define cubic curve
	// tmin, tmax are boundary points on cubic curve
	// p1, c1, p2 define quadratic curve
	// errorBound is maximum allowed distance
	// Try to find maximum distance between one of N points segment of given cubic
	// and corresponding quadratic curve that estimates the cubic one, assuming
	// that the boundary points of cubic and quadratic points are equal.
	//
	// The distance calculation method comes from Hausdorff distance defenition
	// (https://en.wikipedia.org/wiki/Hausdorff_distance), but with following simplifications
	// * it looks for maximum distance only for finite number of points of cubic curve
	// * it doesn't perform reverse check that means selecting set of fixed points on
	//   the quadratic curve and looking for the closest points on the cubic curve
	// But this method allows easy estimation of approximation error, so it is enough
	// for practical purposes.

	const dt = (tmax - tmin) / SAMPLES;
	for (let t = tmin + dt; t < tmax - dt; t += dt) {
		// don't check distance on boundary points
		// because they should be the same
		const point = calcPoint(a, b, c, d, t);
		if (minDistanceToQuad(point, p1, c1, p2) > errorBound) {
			return false;
		}
	}
	return true;
}

function _isApproximationClose(a, b, c, d, quadCurves, errorBound) {
	let dt = 1 / quadCurves.length;
	for (let i = 0; i < quadCurves.length; i++) {
		let p1 = quadCurves[i][0];
		let c1 = quadCurves[i][1];
		let p2 = quadCurves[i][2];
		if (
			!isSegmentApproximationClose(a, b, c, d, i * dt, (i + 1) * dt, p1, c1, p2, errorBound)
		) {
			return false;
		}
	}
	return true;
}

function fromFlatArray(points) {
	let result = [];
	let segmentsNumber = (points.length - 2) / 4;
	for (let i = 0; i < segmentsNumber; i++) {
		result.push([
			new Point(points[4 * i], points[4 * i + 1]),
			new Point(points[4 * i + 2], points[4 * i + 3]),
			new Point(points[4 * i + 4], points[4 * i + 5])
		]);
	}
	return result;
}

function toFlatArray(quadsList) {
	let result = [];
	result.push(quadsList[0][0].x);
	result.push(quadsList[0][0].y);
	for (let i = 0; i < quadsList.length; i++) {
		result.push(quadsList[i][1].x);
		result.push(quadsList[i][1].y);
		result.push(quadsList[i][2].x);
		result.push(quadsList[i][2].y);
	}
	return result;
}

function isApproximationClose(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, quads, errorBound) {
	// TODO: rewrite it in C-style and remove _isApproximationClose
	let pc = calcPowerCoefficients(
		new Point(p1x, p1y),
		new Point(c1x, c1y),
		new Point(c2x, c2y),
		new Point(p2x, p2y)
	);
	return _isApproximationClose(pc[0], pc[1], pc[2], pc[3], fromFlatArray(quads), errorBound);
}

/*
 * Split cubic bézier curve into two cubic curves, see details here:
 * https://math.stackexchange.com/questions/877725
 */
function subdivideCubic(x1, y1, x2, y2, x3, y3, x4, y4, t) {
	let u = 1 - t,
		v = t;

	let bx = x1 * u + x2 * v;
	let sx = x2 * u + x3 * v;
	let fx = x3 * u + x4 * v;
	let cx = bx * u + sx * v;
	let ex = sx * u + fx * v;
	let dx = cx * u + ex * v;

	let by = y1 * u + y2 * v;
	let sy = y2 * u + y3 * v;
	let fy = y3 * u + y4 * v;
	let cy = by * u + sy * v;
	let ey = sy * u + fy * v;
	let dy = cy * u + ey * v;

	return [[x1, y1, bx, by, cx, cy, dx, dy], [dx, dy, ex, ey, fx, fy, x4, y4]];
}

function byNumber(x, y) {
	return x - y;
}

/*
 * Find inflection points on a cubic curve, algorithm is similar to this one:
 * http://www.caffeineowl.com/graphics/2d/vectorial/cubic-inflexion.html
 */
function solveInflections(x1, y1, x2, y2, x3, y3, x4, y4) {
	let p =
		-(x4 * (y1 - 2 * y2 + y3)) +
		x3 * (2 * y1 - 3 * y2 + y4) +
		x1 * (y2 - 2 * y3 + y4) -
		x2 * (y1 - 3 * y3 + 2 * y4);
	let q =
		x4 * (y1 - y2) +
		3 * x3 * (-y1 + y2) +
		x2 * (2 * y1 - 3 * y3 + y4) -
		x1 * (2 * y2 - 3 * y3 + y4);
	let r = x3 * (y1 - y2) + x1 * (y2 - y3) + x2 * (-y1 + y3);

	return quadSolve(p, q, r)
		.filter(function(t) {
			return t > 1e-8 && t < 1 - 1e-8;
		})
		.sort(byNumber);
}

const SEGMENT_COUNT_MIN = 1;
const SEGMENT_COUNT_MAX = 8;

/*
 * Approximate cubic Bezier curve defined with base points p1, p2 and control points c1, c2 with
 * with a few quadratic Bezier curves.
 * The function uses tangent method to find quadratic approximation of cubic curve segment and
 * simplified Hausdorff distance to determine number of segments that is enough to make error small.
 * In general the method is the same as described here: https://fontforge.github.io/bezier.html.
 */
function _cubicToQuad(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, errorBound, check) {
	let p1 = new Point(p1x, p1y);
	let c1 = new Point(c1x, c1y);
	let c2 = new Point(c2x, c2y);
	let p2 = new Point(p2x, p2y);
	let pc = calcPowerCoefficients(p1, c1, c2, p2);
	let a = pc[0],
		b = pc[1],
		c = pc[2],
		d = pc[3];

	let approximation;
	for (
		let segmentsCount = SEGMENT_COUNT_MIN;
		segmentsCount <= SEGMENT_COUNT_MAX;
		segmentsCount++
	) {
		approximation = [];
		let bad = false;
		for (let t = 0; t < segmentsCount; t += 1) {
			const seg = processSegment(
				a,
				b,
				c,
				d,
				t / segmentsCount,
				(t + 1) / segmentsCount,
				check
			);
			if (seg || !check) {
				approximation.push(seg);
			} else {
				bad = true;
				break;
			}
		}
		if (bad) continue;
		if (
			segmentsCount === 1 &&
			(approximation[0][1].sub(p1).dot(c1.sub(p1)) < 0 ||
				approximation[0][1].sub(p2).dot(c2.sub(p2)) < 0)
		) {
			// approximation concave, while the curve is convex (or vice versa)
			continue;
		}
		if (_isApproximationClose(a, b, c, d, approximation, errorBound)) {
			return toFlatArray(approximation);
		}
	}
	if (check) {
		return null;
	} else {
		return approximation;
	}
}

/*
 * If this curve has any inflection points, split the curve and call
 * _cubicToQuad function on each resulting curve.
 */
function cubicToQuad(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, errorBound) {
	const appro0 = _cubicToQuad(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, errorBound, true);
	if (appro0) return appro0;

	let inflections = solveInflections(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y);

	if (!inflections.length) {
		return _cubicToQuad(p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y, errorBound);
	}

	let result = [];
	let curve = [p1x, p1y, c1x, c1y, c2x, c2y, p2x, p2y];
	let prevPoint = 0;
	let quad, split;

	for (let inflectionIdx = 0; inflectionIdx < inflections.length; inflectionIdx++) {
		split = subdivideCubic(
			curve[0],
			curve[1],
			curve[2],
			curve[3],
			curve[4],
			curve[5],
			curve[6],
			curve[7],
			// we make a new curve, so adjust inflection point accordingly
			1 - (1 - inflections[inflectionIdx]) / (1 - prevPoint)
		);

		quad = _cubicToQuad(
			split[0][0],
			split[0][1],
			split[0][2],
			split[0][3],
			split[0][4],
			split[0][5],
			split[0][6],
			split[0][7],
			errorBound
		);

		result = result.concat(quad.slice(0, -2));
		curve = split[1];
		prevPoint = inflections[inflectionIdx];
	}

	quad = _cubicToQuad(
		curve[0],
		curve[1],
		curve[2],
		curve[3],
		curve[4],
		curve[5],
		curve[6],
		curve[7],
		errorBound
	);

	return result.concat(quad);
}

module.exports = cubicToQuad;
// following exports are for testing purposes
module.exports.isApproximationClose = isApproximationClose;
module.exports.cubicSolve = cubicSolve;

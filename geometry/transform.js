"use strict";

class Transform {
	constructor(xx, yx, xy, yy, x, y) {
		this.xx = xx;
		this.yx = yx;
		this.xy = xy;
		this.yy = yy;
		this.x = x;
		this.y = y;
	}
	applyTo(z) {
		let x = z.x;
		let y = z.y;
		z.x = x * this.xx + y * this.yx + this.x;
		z.y = x * this.xy + y * this.yy + this.y;
		return z;
	}
	inverse() {
		const denom = tfm.xx * tfm.yy - tfm.xy * tfm.yx;
		return new Transform(
			tfm.yy / denom,
			-tfm.yx / denom,
			-tfm.xy / denom,
			tfm.xx / denom,
			-(tfm.x * tfm.yy - tfm.y * tfm.yx) / denom,
			-(-tfm.x * tfm.xy + tfm.y * tfm.xx) / denom
		);
	}
	then(that) {
		return Transform.learn(
			that.applyTo(this.applyTo({ x: 0, y: 0 })),
			that.applyTo(this.applyTo({ x: 1, y: 0 })),
			that.applyTo(this.applyTo({ x: 0, y: 1 }))
		);
	}
}

Transform.from = function(obj) {
	return new Transform(
		obj.xx || 1,
		obj.yx || 0,
		obj.xy || 0,
		obj.yy || 1,
		obj.x || 0,
		obj.y || 0
	);
};

Transform.learn = function(zero, x1, y1) {
	return new Transform(
		x1.x - zero.x,
		x1.y - zero.y,
		y1.x - zero.x,
		y1.y - zero.y,
		zero.x,
		zero.y
	);
};
Transform.neutral = new Transform(1, 0, 0, 1, 0, 0);
Transform.shift = (x, y) => new Transform(1, 0, 0, 1, x, y);

module.exports = Transform;

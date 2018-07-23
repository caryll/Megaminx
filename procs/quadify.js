"use strict";

const c2q = require("./quadify/ctq");

async function Quadify(ctx, demand, options) {
	const font = this.items[demand];
	options = options || {};
	c2q(font, options.error || 1);
}

module.exports = Quadify;
